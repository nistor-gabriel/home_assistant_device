import React from 'react';
import Moment from 'react-moment';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings } from 'lucide-react';
import { useGetData, cn, useTimelyRefresh } from '@/lib';
import * as ep from '@/lib/endpoints';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';

/* ========================================================================== */

const DashboardSystem: React.FC = () => {
    const [api, refreshApi] = useGetData<ep.Api>(ep.PATH_API, 'refresh');
    const [stats, refreshStats] = useGetData<ep.Stats>(ep.PATH_STATS, 'refresh');
    const isLoading = api.status === 'loading' || stats.status === 'loading';
    const isError = api.status === 'failed' || stats.status === 'failed';
    const isOk = api.status === 'ok' && stats.status === 'ok';

    useTimelyRefresh(30, refreshApi, refreshStats);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className={cn('text-lg font-semibold', isLoading && 'text-gray-300', isError && 'text-red-400', isOk && 'text-gray-900')}>System</CardTitle>
                <Settings className={cn('h-8 w-8', isLoading && 'text-gray-300', isError && 'text-red-400', isOk && 'text-blue-500')} />
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {isOk ? (
                        <p className="text-sm mt-2 mb-1 text-gray-600">System <b>{api.data?.name}</b> of type <i>{api.data?.type}</i> <i>{api.data?.version}</i> is operational</p>
                    ) : isError ? null : (
                        <Skeleton className="h-[20px] w-[140px] mt-2 mb-2" />
                    )}
                    {isOk ? (
                        <Table className="ml-2 w-[10%] text-nowrap">
                            <TableBody>
                                {[
                                    { label: 'Time Zone', value: stats.data?.tzone },
                                    { label: 'Now is', value: (<Moment date={stats.data?.time} parse="YYYY-MM-DDTHH:mm:ss" format="YYYY-MM-DD HH:mm:ss" />) },
                                    { label: 'Uptime', value: (<Moment subtract={{ seconds: stats.data?.uptime || 0 }} fromNow />) },
                                    { label: 'Free RAM', value: <>{stats.data?.memoryFree ? (stats.data.memoryFree / 1024).toFixed(1) + ' Kb' : '-'}</> },
                                    { label: 'Used RAM', value: <>{stats.data?.memoryUsed ? (stats.data.memoryUsed / 1024).toFixed(1) + ' Kb' : '-'}</> },
                                    { label: 'Free Flash', value: <>{stats.data?.flashFree ? (stats.data.flashFree / 1024).toFixed(1) + ' Kb' : '-'}</> },
                                    { label: 'Used Flash', value: <>{stats.data?.flashUsed ? (stats.data.flashUsed / 1024).toFixed(1) + ' Kb' : '-'}</> },
                                ].map(({ label, value }, key) => (
                                    <TableRow key={key}>
                                        <TableCell className="p-2 text-xs text-gray-500">{label}</TableCell>
                                        <TableCell className="p-2 text-xs text-gray-900 font-medium">{value}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : isError ? null : (
                        <Table className="ml-2 w-[10%] text-nowrap">
                            <TableBody>
                                {new Array(6).fill('').map((_, key) => (
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

export default DashboardSystem;