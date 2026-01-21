import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import * as ep from '@/lib/endpoints';
import { doDelete } from '@/lib';
import { AlertUpdateFailed, AlertUpdateSuccess } from '@/components/common';
import { toast } from 'sonner';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useGetEffect, doModify } from '@/lib';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { SpinnerBars } from '@/components/ui/shadcn-io/spinner';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';

/* ========================================================================== */

const FormSchema = z.object({
    logToFile: z.boolean(),
    maxFileSize: (z.union([
        z.preprocess((val) => {
            if (typeof val === 'string') {
                return Number.parseInt(val);
            }
            return val;
        }, z.int().min(4096, {
            message: 'maximum file size needs to be at least 4096.',
        }).max(50 * 4096, {
            message: 'maximum file size needs to be less then 204800.',
        })),
        z.string().max(0),
    ]) as any) as z.ZodString,
});

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

/* ========================================================================== */

const Log: React.FC = () => {
    const [txt, setTxt] = useState('');
    const [showDialog, setShowDialog] = useState<'confirm-clear' | false>(false);
    const [isProcessing, setProcessing] = useState<boolean>(false);

    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            logToFile: false,
            maxFileSize: '',
        },
    });

    const refresh = useGetEffect<ep.Log>(ep.PATH_LOG, (data) => {
        if (data) {
            form.resetField('logToFile', {
                defaultValue: data.logToFile,
            });
            form.resetField('maxFileSize', {
                defaultValue: data.maxFileSize ? data.maxFileSize.toString() : '',
            });
        }
    }, 'refresh');

    const handleUpdate = async (data: z.infer<typeof FormSchema>) => {
        const timeout = setTimeout(() => setProcessing(true), 300);
        const result = await doModify('PUT', ep.PATH_LOG, data);
        clearTimeout(timeout);
        setProcessing(false);

        if (result === 'ok') {
            toast((
                <AlertUpdateSuccess>
                    <p>Successfuly updated the Log configuration.</p>
                </AlertUpdateSuccess>
            ));
            refresh();
        } else {
            toast((<AlertUpdateFailed />));
        }
    };


    useEffect(() => {
        let mounted = true;
        const fetchLog = (async () => {
            if (!mounted) {
                return;
            }
            try {
                const rsp1 = await fetch(ep.PATH_LOG_FILE_1);
                const rsp2 = await fetch(ep.PATH_LOG_FILE_2);
                const txt: string[] = [];
                if (mounted && rsp2.ok) {
                    txt.push(await rsp2.text());
                }
                if (mounted && rsp1.ok) {
                    txt.push(await rsp1.text());
                }

                if (mounted) {
                    setTxt(processLog(txt.join('/n')));
                    setTimeout(fetchLog, 30000);
                }
            } catch (e) {
                console.error('failed to get log', e);
            }
        });
        setTimeout(fetchLog, 500);
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
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(handleUpdate)} className="w-full space-y-1">

                                <FormField
                                    control={form.control}
                                    name="maxFileSize"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Maximum log file size (bytes)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="enter the switch name" type="number" {...field} />
                                            </FormControl>
                                            <FormMessage className="text-xs">&nbsp;</FormMessage>
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="logToFile"
                                    render={({ field }) => (
                                        <FormItem className="h-16">
                                            <div className="space-y-2">
                                                <FormLabel>Log to file</FormLabel>
                                            </div>
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <div className="flex space-x-3">
                                    <Button type="submit" disabled={!form.formState.isDirty}>
                                        Update
                                    </Button>
                                    <Button type="submit" variant="secondary" disabled={!txt} onClick={(event) => {
                                        event.preventDefault();
                                        setShowDialog('confirm-clear');
                                    }}>
                                        Clear Logs
                                    </Button>
                                </div>
                            </form>
                        </Form>


                        <div dangerouslySetInnerHTML={{ __html: txt }}></div>
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