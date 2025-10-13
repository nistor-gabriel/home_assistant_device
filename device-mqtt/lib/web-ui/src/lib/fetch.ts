import { useEffect, useState } from 'react';

import { Stats, PATH_STATS } from './endpoints';

/* ========================================================================== */

export interface GetData<D = Record<string, string>> {
    status: 'loading' | 'failed' | 'ok';
    data: D | null;
}

export type Refresh = () => void;

const INVALID = Symbol('INVALID');

/* ========================================================================== */

export function useTimelyRefresh(interval: number, refresh: Refresh, ...refreshes: Refresh[]): Refresh;
export function useTimelyRefresh(interval: number, ...refreshes: Refresh[]): Refresh {
    // const [count, setCount] = useState<number>(1);

    const refresh = () => {
        refreshes.forEach((ref) => ref());
        // setCount(count + 1);
    };

    useEffect(() => {
        const timeout = setTimeout(refresh, interval * 1000);
        return () => {
            clearTimeout(timeout);
        };
    }, [interval, ...refreshes]);

    return refresh;
}

export function useGetData<D = Record<string, string>>(path: string, use: 'refresh', defaultData?: D | null): [GetData<D>, Refresh];
export function useGetData<D = Record<string, string>>(path: string, defaultData?: D | null): GetData<D>;
export function useGetData<D = Record<string, string>>(path: string, ...args: any[]): [GetData<D>, Refresh] | GetData<D> {
    const useRefresh = args[0] === 'refresh';
    const defaultData = useRefresh ? args[1] : args[0];
    const [data, setData] = useState<GetData<D>>({ status: 'loading', data: defaultData });

    const refresh: Refresh = useGetEffect<D>(path, (data) => {
        if (data === INVALID) {
            setData({ status: 'failed', data: defaultData });
        } else {
            setData({ status: 'ok', data });
        }
    }, ...(useRefresh ? ['refresh', INVALID as D] : [INVALID as D]) as any) as any;

    if (useRefresh) {
        return [data, refresh];
    }
    return data;
}

export function useGetEffect<D = Record<string, string>>(path: string, cb: ((data: D | null) => any), use: 'refresh', bcb: ((data: D | null) => any), defaultData?: D | null): Refresh;
export function useGetEffect<D = Record<string, string>>(path: string, cb: ((data: D | null) => any), use: 'refresh', defaultData?: D | null): Refresh;
export function useGetEffect<D = Record<string, string>>(path: string, cb: ((data: D | null) => any), defaultData?: D | null): void;
export function useGetEffect<D = Record<string, string>>(path: string, cb: ((data: D | null) => any), ...args: any[]): any {
    const useRefresh = args[0] === 'refresh';
    const bcb = useRefresh && typeof args[1] === 'function' ? args.splice(1, 1)[0] : null;
    const defaultData = useRefresh ? args[1] : args[0];
    let refCount: number = 0, setRefCount: (count: number) => void;
    if (useRefresh) {
        [refCount, setRefCount] = useState<number>(1);
    }

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                bcb && bcb();
                const data = await doGet<D>(path, defaultData);
                if (!mounted) {
                    return;
                }
                cb(data);
            } catch (e) {
                cb(defaultData);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [path, refCount]);

    if (useRefresh) {
        return () => setRefCount(refCount + 1);
    }
}

export async function doPing(path: string): Promise<'failed' | 'ok'> {
    try {
        const rsp = await fetch(path);
        if (rsp.ok) {
            return 'ok';
        }
    } catch (e) {
        console.error('failed to get ' + path, e);
    }
    return 'failed';
}

export async function doGet<D = Record<string, string>>(path: string, defaultData: D | null = null): Promise<D | null> {
    try {
        const rsp = await fetch(path);
        if (rsp.ok) {
            const data = await rsp.json();
            return data;
        }
    } catch (e) {
        console.error('failed to get ' + path, e);
    }
    return defaultData;
}

export async function doModify(method: 'PUT' | 'POST', path: string, body: any, { headers }: {
    headers: Record<string, string>;
} = {
        headers: { 'Content-Type': 'application/json; charset=utf8' }
    }): Promise<'failed' | 'ok'> {
    if (headers['Content-Type']?.includes('application/json')) {
        body = JSON.stringify(body);
    }
    try {
        const rsp = await fetch(path, { method, headers, body });
        if (rsp.ok) {
            return 'ok';
        }
    } catch (e) {
        console.error('failed to put ' + path, e);
    }
    return 'failed';
}

export async function doDelete(path: string): Promise<string | 'ok'> {
    try {
        const rsp = await fetch(path, {
            method: 'DELETE',
        });
        if (rsp.ok) {
            return 'ok';
        }

        return rsp.statusText;
    } catch (e) {
        console.error('failed to delete ' + path, e);
        return e + '';
    }
}

export function useDeltaTimeCompensation() {
    const [deltaTime, setDeltaTime] = useState<number>(0);

    useGetEffect<Stats>(PATH_STATS, (data) => {
        if (data) {
            setDeltaTime(Date.now() - new Date(data.time).getTime());
        }
    });

    return (sdate: string | Date) => {
        return deltaTime + new Date(sdate).getTime();
    };
}