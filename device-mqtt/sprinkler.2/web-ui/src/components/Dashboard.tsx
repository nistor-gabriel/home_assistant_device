import React from 'react';
import Moment from 'react-moment';
import { Skeleton } from '@/components/ui/skeleton';
import { Wifi, Radio, Settings } from 'lucide-react';
import { useGetData, cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"

/* ========================================================================== */

const Dashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        <DashboardSystem />

        <DashboardWifi />

        <DashboardMqtt />

      </div>
    </div>
  );
};

const DashboardSystem: React.FC = () => {
  const api = useGetData<{ name: string; type: string; version: string; }>('/api');
  const stats = useGetData<{ time: string; flashFree: number; flashUsed: number; memoryFree: number; memoryUsed: number; uptime: number; }>('/stats');
  const isLoading = api.status === 'loading' || stats.status === 'loading';
  const isError = api.status === 'failed' || stats.status === 'failed';
  const isOk = api.status === 'ok' && stats.status === 'ok';

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
                  { label: 'Now is', value: (<Moment date={stats.data?.time} parse="YYYY-MM-DDTHH:mm:ss" format="YYYY-MM-DD HH:mm:ss" />) },
                  { label: 'Uptime', value: (<Moment subtract={{ seconds: stats.data?.uptime || 0 }} durationFromNow />) },
                  { label: 'Free RAM', value: <>{stats.data?.memoryFree ? (stats.data.memoryFree / 1024).toFixed(1) + ' Kb' : '-'}</> },
                  { label: 'Used RAM', value: <>{stats.data?.memoryUsed ? (stats.data.memoryUsed / 1024).toFixed(1) + ' Kb': '-'}</> },
                  { label: 'Free Flash', value: <>{stats.data?.flashFree ? (stats.data.flashFree / 1024).toFixed(1) + ' Kb': '-'}</> },
                  { label: 'Used Flash', value: <>{stats.data?.flashUsed ? (stats.data.flashUsed / 1024).toFixed(1) + ' Kb': '-'}</> },
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

const DashboardWifi: React.FC = () => {
  const wlan = useGetData<{ ip: string; gateway: string; subnet: string; ssid: string; dns: string; signal: number; }>('/wlan');
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
                  { label: 'Signal', value: <>{wlan.data?.signal ? (wlan.data.signal).toFixed(0) + ' %': '-'}</> },
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

const DashboardMqtt: React.FC = () => {
  const mqtt = useGetData<{ server: string; isConnected: boolean; port: number; ssl: boolean; }>('/mqtt');
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
                  { label: 'Using Port', value: <>{mqtt.data?.port === 0 ? 'default' : mqtt.data?.port || '-'}</> },
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
  );
}

export default Dashboard;