import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Wifi } from 'lucide-react';
import { useGetData, cn, ep } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"

/* ========================================================================== */

const DashboardWlan: React.FC = () => {
    const wlan = useGetData<ep.Wlan>(ep.PATH_WLAN);
    const isLoading = wlan.status === 'loading';
    const isError = wlan.status === 'failed';
    const isOk = wlan.status === 'ok';

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className={cn('text-lg font-semibold', isLoading && 'text-gray-300', isError && 'text-red-400', isOk && 'text-gray-900')}>WiFi Status</CardTitle>
                <Wifi className={cn('h-8 w-8', isLoading && 'text-gray-300', isError && 'text-red-400', isOk && 'text-green-500')} />
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {isOk ? (
                        <p className="text-sm mt-2 mb-1 text-gray-600">Connected to <b>{wlan.data?.ssid}</b></p>
                    ) : isError ? null : (
                        <Skeleton className="h-[20px] w-[140px] mt-2 mb-2" />
                    )}
                    {isOk ? (
                        <Table className="ml-2 w-[10%] text-nowrap">
                            <TableBody>
                                {[
                                    { label: 'Signal', value: <>{wlan.data?.signal ? (wlan.data.signal).toFixed(0) + ' %' : '-'}</> },
                                    { label: 'Ip', value: <>{wlan.data?.ip ? wlan.data.ip : '-'}</> },
                                    { label: 'DNS', value: <>{wlan.data?.dns ? wlan.data.dns : '-'}</> },
                                    { label: 'Gateway', value: <>{wlan.data?.gateway ? wlan.data.gateway : '-'}</> },
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