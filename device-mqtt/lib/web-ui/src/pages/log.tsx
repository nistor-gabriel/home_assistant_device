import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import * as ep from '@/lib/endpoints';
import { doDelete } from '@/lib';
import { AlertUpdateFailed, AlertUpdateSuccess } from '@/components/common';
import { toast } from 'sonner';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { SpinnerBars } from '@/components/ui/shadcn-io/spinner';

/* ========================================================================== */

function processLog(txt: string): string {
    let color: string = 'gray';
    txt = txt.replace(/^(\w+:)?([^\n]+)\n/gm, (_txt, txt1, txt2) => {
        if (txt1 === 'INFO:') {
            color = 'gray';
        } else if (txt1 === 'ERROR:') {
            color = 'indianred';
        } else if (txt1) {
            txt2 = txt1 + txt2;
            txt1 = '';
        }
        txt2 = txt2.replace(/\s/gm, '&nbsp;');
        return `<p style="color:${color};">${txt1 ? `<b>${txt1}</b>` : ''}${txt2}</p>`;
    });
    return txt;
}

const Log: React.FC = () => {
    const [txt, setTxt] = useState('');
    const [showDialog, setShowDialog] = useState<'confirm-clear' | false>(false);
    const [isProcessing, setProcessing] = useState<boolean>(false);

    useEffect(() => {
        let mounted = true;
        const fetchLog = (async () => {
            if (!mounted) {
                return;
            }
            try {
                const rsp = await fetch(ep.PATH_LOG);
                if (mounted) {
                    if (rsp.ok) {
                        const txt = await rsp.text();
                        if (mounted) {
                            setTxt(processLog(txt));
                        }
                    } else {
                        setTxt('');
                    }
                    setTimeout(fetchLog, 5000);
                }
            } catch (e) {
                console.error('failed to get log', e);
            }
        });
        fetchLog();
        return () => {
            mounted = false;
        };
    });

    const cancel = (): void => {
        setShowDialog(false);
    };

    const confirmClear = async () => {
        setShowDialog(false);
        setProcessing(true);
        const result = await doDelete(ep.PATH_LOG);
        setProcessing(false);
        if (result === 'ok') {
            toast((
                <AlertUpdateSuccess>
                    <p>Successfuly cleared the log.</p>
                </AlertUpdateSuccess>
            ));
        } else {
            toast((<AlertUpdateFailed />));
        }
    };

    return (
        <>
            <div className="space-y-6">
                <Card>
                    <CardContent className="space-y-6 mt-4">
                        <div dangerouslySetInnerHTML={{ __html: txt }}></div>
                        <div className="flex space-x-3">
                            <Button type="submit" variant="secondary" disabled={!txt} onClick={(event) => {
                                event.preventDefault();
                                setShowDialog('confirm-clear');
                            }}>
                                Clear Logs
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <AlertDialog open={showDialog !== false} onOpenChange={setShowDialog as any}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        {showDialog === 'confirm-clear' ? (
                            <AlertDialogTitle>Clear Logs!</AlertDialogTitle>
                        ) : null}

                        {showDialog === 'confirm-clear' ? (
                            <AlertDialogDescription>
                                Are you sure you want to clear the logs?
                            </AlertDialogDescription>
                        ) : null}
                    </AlertDialogHeader>

                    {showDialog === 'confirm-clear' ? (
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={cancel}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={confirmClear} className="bg-red-600 hover:bg-red-700">
                                Reset
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    ) : null}
                </AlertDialogContent>
            </AlertDialog>

            {isProcessing ? (
                <div className="fixed flex justify-center items-center inset-0 z-50 bg-black/30">
                    <SpinnerBars className="text-blue-500" size={64} />
                </div>
            ) : null}
        </>
    );
};

export default Log;