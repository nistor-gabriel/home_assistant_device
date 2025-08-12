import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Radio } from 'lucide-react';
import { useGetData, cn } from '@/lib';
import * as ep from '@/lib/endpoints';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';

/* ========================================================================== */

const DashboardMqtt: React.FC = () => {
    const rsp = useGetData<ep.Mqtt>(ep.PATH_MQTT);
    const isLoading = rsp.status === 'loading';
    const isError = rsp.status === 'failed';
    const isOk = rsp.status === 'ok';

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className={cn('text-lg font-semibold', isLoading && 'text-gray-300', isError && 'text-red-400', isOk && 'text-gray-900')}>MQTT Status</CardTitle>
                <Radio className={cn('h-8 w-8', isLoading && 'text-gray-300', !isLoading && 'text-red-400')} />
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {isOk ? (
                        <p className={cn('text-sm mt-2 mb-1', rsp.data?.isConnected ? 'text-gray-600' : 'text-red-400')}>
                            {rsp.data?.server ? (
                                <>{rsp.data?.isConnected ? 'Connected to' : 'Cannot connect to'} <b>{rsp.data?.server}</b></>
                            ) : 'No server configured'}
                        </p>
                    ) : isError ? null : (
                        <Skeleton className="h-[20px] w-[140px] mt-2 mb-2" />
                    )}
                    {isOk ? (
                        <Table className="ml-2 w-[10%] text-nowrap">
                            <TableBody>
                                {[
                                    { label: 'Client Id', value: <>{rsp.data?.clientId ? rsp.data?.clientId : rsp.data?.defaultClientId ? <i className="text-gray-500">{rsp.data?.defaultClientId}</i> : '-'}</> },
                                    { label: 'Using Port', value: <>{rsp.data?.port === 0 ? <i className="text-gray-500">default</i> : rsp.data?.port || '-'}</> },
                                    { label: rsp.data?.ssl ? <b className="text-green-800">Using SSL</b>: <i className="text-red-800">Not Using SSL</i>, value: null },
                                ].map(({ label, value }, key) => (
                                    <TableRow key={key}>
                                        <TableCell className="p-2 text-xs text-gray-500" colSpan={value === null ? 2 : 1}>
                                            <span className="mr-1">{label}</span>
                                        </TableCell>
                                        { value !== null ? <TableCell className="p-2 text-xs text-gray-900 font-medium">{value}</TableCell> : null }
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : isError ? null : (
                        <Table className="ml-2 w-[10%] text-nowrap">
                            <TableBody>
                                {new Array(3).fill('').map((_, key) => (
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
    );
}

export default DashboardMqtt;