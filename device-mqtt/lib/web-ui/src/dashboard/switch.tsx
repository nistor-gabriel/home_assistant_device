import React, { useState } from 'react';
import Moment from 'react-moment';
import { Skeleton } from '@/components/ui/skeleton';
import { Lightbulb } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useGetData, cn, doModify, useTimelyRefresh, useDeltaTimeCompensation } from '@/lib';
import * as ep from '@/lib/endpoints';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow, TableHeader, TableHead } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { SpinnerBars } from '@/components/ui/shadcn-io/spinner';
import { toast } from 'sonner';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { AlertUpdateFailed } from '@/components/common';

/* ========================================================================== */

const DashboardSwitch: React.FC = () => {
    const [rsp, refreshSwitches] = useGetData<ep.Switch>(ep.PATH_SWITCH, 'refresh');
    const refresh = useTimelyRefresh(5, refreshSwitches);

    const isLoading = rsp.status === 'loading';
    const isError = rsp.status === 'failed';
    const isOk = rsp.status === 'ok';
    const [targetSwitch, setTargetSwitch] = useState<ep.SwitchItem | false>(false);
    const [isProcessing, setProcessing] = useState<boolean>(false);
    const [selectTimeout, setSelectTimeout] = useState<string>('none');
    const [hourTimeout, setHourTimeout] = useState<number | string>('');
    const [minuteTimeout, setMinuteTimeout] = useState<number | string>('');

    const compensateDate = useDeltaTimeCompensation();

    const isCustom = selectTimeout === 'custom';

    const normalize = (value: string, limit: boolean) => {
        if (value === '') {
            return value;
        }
        const val = parseInt(value);
        if (isNaN(val)) {
            return '';
        }
        if (val < 0) {
            return Math.abs(val);
        }
        if (!limit) {
            return val;
        }
        if (val > 59) {
            return 59;
        }
        return val;
    };

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
        if (selectTimeout === 'custom') {
            on = (typeof hourTimeout === 'number' ? hourTimeout : 0) * 60 +
                (typeof minuteTimeout === 'number' ? minuteTimeout : 0)
        } else if (selectTimeout !== 'none') {
            on = parseInt(selectTimeout);
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
                            <Select value={selectTimeout} onValueChange={setSelectTimeout}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a switch timeout" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="custom">Custom</SelectItem>
                                    <SelectItem value="none">Don't stop</SelectItem>
                                    <SelectItem value="5">5 minutes</SelectItem>
                                    <SelectItem value="10">10 minutes</SelectItem>
                                    <SelectItem value="15">15 minutes</SelectItem>
                                    <SelectItem value="20">20 minutes</SelectItem>
                                    <SelectItem value="30">30 minutes</SelectItem>
                                    <SelectItem value="40">40 minutes</SelectItem>
                                    <SelectItem value="50">50 minutes</SelectItem>
                                    <SelectItem value="60">1 hour</SelectItem>
                                    <SelectItem value="90">1 hour and half</SelectItem>
                                    <SelectItem value="120">2 hours</SelectItem>
                                </SelectContent>
                            </Select>
                            <div className="flex space-x-4 mt-6">
                                <Input type="number" value={hourTimeout} onChange={(e) => setHourTimeout(normalize(e.target.value, false))} placeholder="hours" min={0} step={1} disabled={!isCustom} />
                                <Input type="number" value={minuteTimeout} onChange={(e) => setMinuteTimeout(normalize(e.target.value, true))} placeholder="minutes" min={0} max={59} step={1} disabled={!isCustom} />
                            </div>
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