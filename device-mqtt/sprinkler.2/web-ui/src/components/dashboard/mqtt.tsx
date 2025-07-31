import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Radio } from 'lucide-react';
import { useGetData, cn, ep } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"

/* ========================================================================== */

const DashboardMqtt: React.FC = () => {
    const mqtt = useGetData<ep.Mqtt>(ep.PATH_MQTT);
    const isLoading = mqtt.status === 'loading';
    const isError = mqtt.status === 'failed';
    const isOk = mqtt.status === 'ok';

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className={cn('text-lg font-semibold', isLoading && 'text-gray-300', isError && 'text-red-400', isOk && 'text-gray-900')}>MQTT Status</CardTitle>
                <Radio className={cn('h-8 w-8', isLoading && 'text-gray-300', !isLoading && 'text-red-400')} />
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {isOk ? (
                        <p className={cn('text-sm mt-2 mb-1', mqtt.data?.isConnected ? 'text-gray-600' : 'text-red-400')}>
                            {mqtt.data?.server ? (
                                <>{mqtt.data?.isConnected ? 'Connected to' : 'Cannot connect to'} <b>{mqtt.data?.server}</b></>
                            ) : 'No server configured'}
                        </p>
                    ) : isError ? null : (
                        <Skeleton className="h-[20px] w-[140px] mt-2 mb-2" />
                    )}
                    {isOk ? (
                        <Table className="ml-2 w-[10%] text-nowrap">
                            <TableBody>
                                {[
                                    { label: 'Client Id', value: <>{mqtt.data?.clientId ? mqtt.data?.clientId : mqtt.data?.defaultClientId ? <i className="text-gray-500">{mqtt.data?.defaultClientId}</i> : '-'}</> },
                                    { label: 'Using Port', value: <>{mqtt.data?.port === 0 ? <i className="text-gray-500">default</i> : mqtt.data?.port || '-'}</> },
                                    { label: 'Using SSL', value: <>{mqtt.data?.ssl ? 'True' : 'False'}</> },
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