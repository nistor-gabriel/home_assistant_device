import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Wifi } from 'lucide-react';
import { useGetData, cn, ep, useTimelyRefresh } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';

/* ========================================================================== */

const DashboardWlan: React.FC = () => {
    const [rsp, refreshWlan] = useGetData<ep.Wlan>(ep.PATH_WLAN, 'refresh');
    const isLoading = rsp.status === 'loading';
    const isError = rsp.status === 'failed';
    const isOk = rsp.status === 'ok';

    useTimelyRefresh(45, refreshWlan);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className={cn('text-lg font-semibold', isLoading && 'text-gray-300', isError && 'text-red-400', isOk && 'text-gray-900')}>WiFi Status</CardTitle>
                <Wifi className={cn('h-8 w-8', isLoading && 'text-gray-300', isError && 'text-red-400', isOk && 'text-green-500')} />
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {isOk ? (
                        <p className="text-sm mt-2 mb-1 text-gray-600">Connected to <b>{rsp.data?.ssid}</b></p>
                    ) : isError ? null : (
                        <Skeleton className="h-[20px] w-[140px] mt-2 mb-2" />
                    )}
                    {isOk ? (
                        <Table className="ml-2 w-[10%] text-nowrap">
                            <TableBody>
                                {[
                                    { label: 'Signal', value: <>{rsp.data?.signal ? (rsp.data.signal).toFixed(0) + ' %' : '-'}</> },
                                    { label: 'Ip', value: <>{rsp.data?.ip ? rsp.data.ip : '-'}</> },
                                    { label: 'DNS', value: <>{rsp.data?.dns ? rsp.data.dns : '-'}</> },
                                    { label: 'Gateway', value: <>{rsp.data?.gateway ? rsp.data.gateway : '-'}</> },
                                ].map(({ label, value }, key) => (
                                    <TableRow key={key}>
                                        <TableCell className="p-2 text-xs text-gray-500"><span className="mr-1">{label}</span></TableCell>
                                        <TableCell className="p-2 text-xs text-gray-900 font-medium">{value}</TableCell>
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
                </div>
            </CardContent>
        </Card>
    );
}

export default DashboardWlan;