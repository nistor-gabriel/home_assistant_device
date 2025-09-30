import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Fan as Pump } from 'lucide-react';
import { useGetData, cn, useTimelyRefresh } from '@/lib';
import * as gep from '@/gardencore/lib';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';

/* ========================================================================== */

const DashboardPump: React.FC = () => {
    const [pump, refreshPump] = useGetData<gep.Pump>(gep.PATH_PUMP, 'refresh');
    const [pressure, refreshPressure] = useGetData<gep.PumpPressure>(gep.PATH_PUMP_PRESSURE, 'refresh');
    const isLoading = pump.status === 'loading';
    const isError = pump.status === 'failed';
    const isOk = pump.status === 'ok';

    useTimelyRefresh(45, refreshPump);
    useTimelyRefresh(10, refreshPressure);

    // pump.data && (pump.data.lastIssue = 'pressureHigh');

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className={cn('text-lg font-semibold', isLoading && 'text-gray-300', isError && 'text-red-400', isOk && 'text-gray-900')}>Pump Status</CardTitle>
                <Pump className={cn('h-8 w-8', isLoading && 'text-gray-300', isError && 'text-red-400', isOk && (pump.data?.lastIssue && 'text-red-600' || 'text-cyan-600'))} />
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {isOk ? (
                        <p className={cn('text-sm mt-2 mb-1', pressure.data?.pressure ? 'text-gray-600' : 'text-red-400')}>
                            Current presure is <b>{pressure.data?.pressure}</b> Bar
                        </p>
                    ) : isError ? null : (
                        <Skeleton className="h-[20px] w-[140px] mt-2 mb-2" />
                    )}
                    {isOk ? (
                        <Table className="ml-2 w-[10%] text-nowrap">
                            <TableBody>
                                {[
                                    {
                                        label: pump.data?.disabledHighWatchdog ?
                                            <i className="text-red-800">High Watchdog Disabled</i> :
                                            <b className="text-green-800">High Watchdog Enabled</b>, value: null
                                    }, {
                                        label: 'High Off Pressure', value: <><i className="text-gray-500">{pump.data?.offHighPressure}</i></>
                                    }, {
                                        label: pump.data?.disabledLowWatchdog ?
                                            <i className="text-red-800">Low Watchdog Disabled</i> :
                                            <b className="text-green-800">Low Watchdog Enabled</b>, value: null
                                    }, {
                                        label: 'Low Off Pressure', value: <><i className="text-gray-500">{pump.data?.offLowPressure}</i></>
                                    },
                                ].map(({ label, value }, key) => (
                                    <TableRow key={key}>
                                        <TableCell className="p-2 text-xs text-gray-500" colSpan={value === null ? 2 : 1}>
                                            <span className="mr-1">{label}</span>
                                        </TableCell>
                                        {value !== null ? <TableCell className="p-2 text-xs text-gray-900 font-medium">{value}</TableCell> : null}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : isError ? null : (
                        <Table className="ml-2 w-[10%] text-nowrap">
                            <TableBody>
                                {new Array(4).fill('').map((_, key) => (
                                    <TableRow key={key}>
                                        <TableCell className="p-2 text-xs text-gray-500"><Skeleton key={key} className="h-[12px] w-[120px] mt-1" /></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                    {isOk ? (
                        <p className={cn('text-sm mt-2 mb-1', pump.data?.lastIssue && 'text-red-600')}>
                            {
                                pump.data?.lastIssue === 'pressureLow' ? <>Pressure was to <b>LOW</b>, so the pump was stopped!</> :
                                    pump.data?.lastIssue === 'pressureHigh' ? <>Pressure was to <b>HIGH</b>, so the pump was stopped!</> : null
                            }
                        </p>
                    ) : isError ? null : (
                        <Skeleton className="h-[20px] w-[140px] mt-2 mb-2" />
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

export default DashboardPump;