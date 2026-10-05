import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Fan as Pump } from 'lucide-react';
import { useGetData, cn, useTimelyRefresh } from '@/lib';
import * as sep from '@/shed/lib';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';

/* ========================================================================== */

const DashboardStats: React.FC = () => {
    const [shed, refreshShed] = useGetData<sep.Shed>(sep.PATH_SHED, 'refresh');
    const isLoading = shed.status === 'loading';
    const isError = shed.status === 'failed';
    const isOk = shed.status === 'ok';

    useTimelyRefresh(60, refreshShed);

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
                            <p className={cn('text-sm mt-2 mb-1', shed.data?.temperature ? 'text-gray-600' : 'text-red-400')}>
                                Exterior
                            </p>
                            <Table className="ml-2 w-[10%] text-nowrap">
                                <TableBody>
                                    {[
                                        { label: 'Temperature', value: <><b>{shed.data?.temperature}</b> °C</>},
                                        { label: 'Humidity', value: <><b>{shed.data?.humidity}</b> %</> },
                                        { label: 'Humidity Absolute', value: <><b>{shed.data?.humidityAbsolute}</b> g/m³</> },
                                    ].map(({ label, value }, key) => (
                                        <TableRow key={key}>
                                            <TableCell className="p-2 text-xs text-gray-500">{label}</TableCell>
                                            <TableCell className="p-2 text-xs text-gray-900 font-medium">{value}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <p className={cn('text-sm mt-2 mb-1', shed.data?.temperatureBox1 ? 'text-gray-600' : 'text-red-400')}>
                                 {shed.data?.nameBox1 ? <b>{shed.data?.nameBox1}</b> : 'Box 1?'}
                            </p>
                            <Table className="ml-2 w-[10%] text-nowrap">
                                <TableBody>
                                    {[
                                        { label: 'Temperature', value: <><b>{shed.data?.temperatureBox1}</b> °C</>},
                                        { label: 'Humidity', value: <><b>{shed.data?.humidityBox1}</b> %</> },
                                        { label: 'Humidity Absolute', value: <><b>{shed.data?.humidityAbsoluteBox1}</b> g/m³</> },
                                        { label: shed.data?.box1Disabled ? <i className="text-red-800">Auto Dry Disabled</i> : 
                                            shed.data?.box1On ? <b className="text-green-800">Dry Ventilation On</b> : <i className="text-gray-500">Ventilation Off</i>,
                                            value: <></> },
                                     ].map(({ label, value }, key) => (
                                        <TableRow key={key}>
                                            <TableCell className="p-2 text-xs text-gray-500">{label}</TableCell>
                                            <TableCell className="p-2 text-xs text-gray-900 font-medium">{value}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <p className={cn('text-sm mt-2 mb-1', shed.data?.temperatureBox2 ? 'text-gray-600' : 'text-red-400')}>
                                 {shed.data?.nameBox2 ? <b>{shed.data?.nameBox2}</b> : 'Box 2?'}
                            </p>
                            <Table className="ml-2 w-[10%] text-nowrap">
                                <TableBody>
                                    {[
                                        { label: 'Temperature', value: <><b>{shed.data?.temperatureBox2}</b> °C</>},
                                        { label: 'Humidity', value: <><b>{shed.data?.humidityBox2}</b> %</> },
                                        { label: 'Humidity Absolute', value: <><b>{shed.data?.humidityAbsoluteBox2}</b> g/m³</> },
                                        { label: shed.data?.box2Disabled ? <i className="text-red-800">Auto Dry Disabled</i> : 
                                            shed.data?.box2On ? <b className="text-green-800">Dry Ventilation On</b> : <i className="text-gray-500">Ventilation Off</i>,
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
                                    {new Array(3).fill('').map((_, key) => (
                                        <TableRow key={key}>
                                            <TableCell className="p-2 text-xs text-gray-500"><Skeleton key={key} className="h-[12px] w-[120px] mt-1" /></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <Skeleton className="h-[20px] w-[140px] mt-2 mb-2" />
                            <Table className="ml-2 w-[10%] text-nowrap">
                                <TableBody>
                                    {new Array(4).fill('').map((_, key) => (
                                        <TableRow key={key}>
                                            <TableCell className="p-2 text-xs text-gray-500"><Skeleton key={key} className="h-[12px] w-[120px] mt-1" /></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                             <Skeleton className="h-[20px] w-[140px] mt-2 mb-2" />
                            <Table className="ml-2 w-[10%] text-nowrap">
                                <TableBody>
                                    {new Array(4).fill('').map((_, key) => (
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