import { useEffect, useState } from 'react';

/* ========================================================================== */

export interface GetData<D = Record<string, string>> {
    status: 'loading' | 'failed' | 'ok';
    data: D | null;
}

const INVALID = Symbol('INVALID');

/* ========================================================================== */

export function useGetData<D = Record<string, string>>(path: string, defaultData: D | null = null): GetData<D> {
    const [data, setData] = useState<GetData<D>>({ status: 'loading', data: defaultData });

    useGetEffect<D>(path, (data) => {
        if (data === INVALID) {
            setData({ status: 'failed', data: defaultData });
        } else {
            setData({ status: 'ok', data });
        }
    }, INVALID as D);

    return data;
}

export function useGetEffect<D = Record<string, string>>(path: string, cb: ((data: D | null) => any), useRefresh: true, defaultData?: D | null): () => void;
export function useGetEffect<D = Record<string, string>>(path: string, cb: ((data: D | null) => any), defaultData?: D | null): void;
export function useGetEffect<D = Record<string, string>>(path: string, cb: ((data: D | null) => any), ...args: any[]): any {
    const useRefresh = args[0] === true;
    const defaultData = useRefresh? args[1] : args[0];
    let refCount: number = 0, setRefCount: (count: number) => void;
    if(useRefresh) {
        [refCount, setRefCount] = useState<number>(1);
    }

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const data = await doGet<D>(path, defaultData);
                if(!mounted) {
                    return;
                }
                cb(data);
            } catch(e) {
                cb(defaultData);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [path, refCount]);

    if(useRefresh) {
        return () => setRefCount(refCount + 1);
    }
}

export async function doPing(path: string): Promise<'failed' | 'ok'> {
    try {
        const rsp = await fetch(path);
        if (rsp.ok) {
            return 'ok';
        }
    } catch(e) {
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
    } catch(e) {
        console.error('failed to get ' + path, e);
    }
    return defaultData;
}

export async function doPut(path: string, content: any): Promise<'failed' | 'ok'> {
    try {
        const rsp = await fetch(path, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json; charset=utf8'},
            body: JSON.stringify(content),
        });
        if (rsp.ok) {
            return 'ok';
        }
    } catch(e) {
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
    } catch(e) {
        console.error('failed to delete ' + path, e);
        return e + '';
    }
}