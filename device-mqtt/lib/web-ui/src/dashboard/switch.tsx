import React, { useState } from 'react';
import Moment from 'react-moment';
import { Skeleton } from '@/components/ui/skeleton';
import { Lightbulb } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useGetData, cn, doModify, useTimelyRefresh, useDeltaTimeCompensation } from '@/lib';
import * as ep from '@/lib/endpoints';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow, TableHeader, TableHead } from '@/components/ui/table';
import { SpinnerBars } from '@/components/ui/shadcn-io/spinner';
import { toast } from 'sonner';
import TimeoutSelect from '@/components/timeout';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { AlertUpdateFailed } from '@/components/common';

/* ========================================================================== */

const DashboardSwitch: React.FC = () => {
    const [rsp, refresh] = useGetData<ep.Switch>(ep.PATH_SWITCH, 'refresh');
    useTimelyRefresh(5, refresh);

    const isLoading = rsp.status === 'loading';
    const isError = rsp.status === 'failed';
    const isOk = rsp.status === 'ok';
    const [targetSwitch, setTargetSwitch] = useState<ep.SwitchItem | false>(false);
    const [isProcessing, setProcessing] = useState<boolean>(false);
    const [selectTimeout, setSelectTimeout] = useState<number>(0);

    const compensateDate = useDeltaTimeCompensation();

    const handleSwitch = async (sw: ep.SwitchItem) => {
        if (!sw.on) {
            setTargetSwitch(sw);
            return;
        }
        const timeout = setTimeout(() => setProcessing(true), 500);
        const result = await doModify('PUT', ep.pathSwitchItem(sw), { on: false });
        clearTimeout(timeout);
        setProcessing(false);
        if (result === 'ok') {
            refresh();
        } else {
            toast((<AlertUpdateFailed />));
        }
    };

    const cancel = (): void => {
        setTargetSwitch(false);
    };

    const handleTurnOn = async () => {
        if (!targetSwitch) {
            return;
        }
        let on: boolean | number = true;
        if (selectTimeout !== 0) {
            on = selectTimeout;
        }

        const path = ep.pathSwitchItem(targetSwitch);
        setTargetSwitch(false);

        const timeout = setTimeout(() => setProcessing(true), 300);
        const result = await doModify('PUT', path, { on });
        clearTimeout(timeout);
        setProcessing(false);
        if (result === 'ok') {
            refresh();
        } else {
            toast((<AlertUpdateFailed />));
        }
    };

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className={cn('text-lg font-semibold', isLoading && 'text-gray-300', isError && 'text-red-400', isOk && 'text-gray-900')}>Switches Status</CardTitle>
                    <Lightbulb className={cn('h-8 w-8', isLoading && 'text-gray-300', isError && 'text-red-400', isOk && 'text-yellow-400')} />
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {isOk ? (
                            <Table className="ml-2 w-[90%] text-nowrap">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="h-0 w-1"></TableHead>
                                        <TableHead className="h-0 w-10 text-center"></TableHead>
                                        <TableHead className="h-0"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rsp.data?.items.map((sw, key) => (
                                        <TableRow key={key}>
                                            <TableCell className="text-gray-600"><span className="mr-1">{sw.name}</span></TableCell>
                                            <TableCell className="text-gray-900 ">
                                                <Switch checked={sw.on} onCheckedChange={() => handleSwitch(sw)} disabled={sw.disabled} />
                                            </TableCell>
                                            <TableCell className="text-xs text-gray-900">{sw.on ? (
                                                <>
                                                    <Moment date={compensateDate(sw.onSince)} fromNow />
                                                    {sw.stopTimeout ? (
                                                        <> and stops <Moment date={compensateDate(sw.onSince) + sw.stopTimeout * 1000} fromNow /></>
                                                    ) : null}
                                                </>
                                            ) : sw.disabled ? 'currently disabled' : null }</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : isError ? null : (
                            <Table className="ml-2 w-[10%] text-nowrap">
                                <TableBody>
                                    {new Array(2).fill('').map((_, key) => (
                                        <TableRow key={key}>
                                            <TableCell className="p-2 text-xs text-gray-500"><Skeleton key={key} className="h-[12px] w-[120px] mt-1" /></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={targetSwitch !== false} onOpenChange={setTargetSwitch as any}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Turn Switch On?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Provide the automatic stop time for <b>{targetSwitch !== false ? targetSwitch.name : ''}</b> the switch if applicable.
                        </AlertDialogDescription>
                        <div className="space-y-4 mt-6">
                            <TimeoutSelect options={[
                                {value: 0, label: 'Don\'t stop'},
                                {value: 5, label: '5 minutes'},
                                {value: 10, label: '10 minutes'},
                                {value: 15, label: '15 minutes'},
                                {value: 20, label: '20 minutes'},
                                {value: 30, label: '30 minutes'},
                                {value: 40, label: '40 minutes'},
                                {value: 50, label: '50 minutes'},
                                {value: 60, label: '1 hour'},
                                {value: 90, label: '1 and half hours'},
                                {value: 120, label: '2 hours'},
                            ]} onChange={setSelectTimeout} value={selectTimeout} variant="minutes"/>
                        </div>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={cancel}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleTurnOn} className="bg-red-600 hover:bg-red-700">
                            Turn On
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {isProcessing ? (
                <div className="fixed flex justify-center items-center inset-0 z-50 bg-black/30">
                    <SpinnerBars className="text-blue-500" size={64} />
                </div>
            ) : null}

        </>
    );
}

export default DashboardSwitch;