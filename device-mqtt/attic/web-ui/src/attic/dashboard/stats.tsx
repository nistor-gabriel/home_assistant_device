import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Fan as Pump } from 'lucide-react';
import { useGetData, cn, useTimelyRefresh } from '@/lib';
import * as aep from '@/attic/lib';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';

/* ========================================================================== */

const DashboardStats: React.FC = () => {
    const [attic, refreshAttic] = useGetData<aep.Attic>(aep.PATH_ATTIC, 'refresh');
    const isLoading = attic.status === 'loading';
    const isError = attic.status === 'failed';
    const isOk = attic.status === 'ok';

    useTimelyRefresh(60, refreshAttic);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className={cn('text-lg font-semibold', isLoading && 'text-gray-300', isError && 'text-red-400', isOk && 'text-gray-900')}>Status</CardTitle>
                <Pump className={cn('h-8 w-8', isLoading && 'text-gray-300', isError && 'text-red-400', isOk && 'text-cyan-600')} />
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {isOk ? (
                        <>
                            <p className={cn('text-sm mt-2 mb-1', attic.data?.temperature ? 'text-gray-600' : 'text-red-400')}>
                                Attic
                            </p>
                            <Table className="ml-2 w-[10%] text-nowrap">
                                <TableBody>
                                    {[
                                        { label: 'Temperature', value: <><b>{attic.data?.temperature?.toFixed(1)}</b> °C</>},
                                        { label: 'Humidity', value: <><b>{attic.data?.humidity?.toFixed(1)}</b> %</> },
                                        { label: 'Humidity Absolute', value: <><b>{attic.data?.humidityAbsolute}</b> g/m³</> },
                                        { label: 'Humidity Absolute in Exterior', value: <><b>{attic.data?.humidityAbsoluteExterior}</b> g/m³</> },
                                        { label: attic.data?.on ? <b className="text-green-800">Ventilation On</b> : <i className="text-gray-500">Ventilation Off</i>,
                                            value: <></> },
                                    ].map(({ label, value }, key) => (
                                        <TableRow key={key}>
                                            <TableCell className="p-2 text-xs text-gray-500">{label}</TableCell>
                                            <TableCell className="p-2 text-xs text-gray-900 font-medium">{value}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            </>
                    ) : isError ? null : (
                        <>
                            <Skeleton className="h-[20px] w-[140px] mt-2 mb-2" />
                            <Table className="ml-2 w-[10%] text-nowrap">
                                <TableBody>
                                    {new Array(5).fill('').map((_, key) => (
                                        <TableRow key={key}>
                                            <TableCell className="p-2 text-xs text-gray-500"><Skeleton key={key} className="h-[12px] w-[120px] mt-1" /></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <Skeleton className="h-[20px] w-[140px] mt-2 mb-2" />
                            <Table className="ml-2 w-[10%] text-nowrap">
                                <TableBody>
                                    {new Array(1).fill('').map((_, key) => (
                                        <TableRow key={key}>
                                            <TableCell className="p-2 text-xs text-gray-500"><Skeleton key={key} className="h-[12px] w-[120px] mt-1" /></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

export default DashboardStats;