import { useEffect, useState } from 'react';

/* ========================================================================== */

export interface GetData<D = Record<string, string>> {
    status: 'loading' | 'failed' | 'ok';
    data: D | null;
}

/* ========================================================================== */

export function useGetData<D>(path: string, defaultData: D | null = null): GetData<D> {
    const [data, setData] = useState<GetData<D>>({ status: 'loading', data: defaultData });

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const rsp = await fetch(path);
                if(!mounted) {
                    return;
                }
                if (!rsp.ok) {
                    setData({ status: 'failed', data: defaultData });
                }
                const data = await rsp.json();
                if(!mounted) {
                    return;
                }
                setData({ status: 'ok', data });
            } catch(e) {
                setData({ status: 'failed', data: defaultData });
            }
        })();
        return () => {
            mounted = false;
        };
    }, [path]);

    return data;
}

export async function doDelete(path: string): Promise<'failed' | 'ok'> {
    try {
        const rsp = await fetch(path, {
            method: 'DELETE',
        });
        if (!rsp.ok) {
            return 'ok';
        }
    } catch(e) {
        console.error('failed to delete ' + path, e);
    }
    return 'failed';
}