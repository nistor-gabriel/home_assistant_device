import React from 'react'
import { Home, Lightbulb, Wifi, Radio, Settings as SettingsIcon, FileSymlink, Text as LogIcon } from 'lucide-react';
import ReactDOM from 'react-dom/client'
import Moment from 'react-moment';
import { Toaster } from '@/components/ui/sonner';
import DashboardMqtt from '@/dashboard/mqtt';
import DashboardWlan from '@/dashboard/wlan';
import DashboardSystem from '@/dashboard/system';
import DashboardSwitch from '@/dashboard/switch';
import DashboardPump from '@/gardencore/dashboard/pump';
import { Fan as PumpIcon } from 'lucide-react';
import Pump from '@/gardencore/pages/pump';
import Wlan from '@/pages/wlan';
import MQTT from '@/pages/mqtt';
import Settings from '@/pages/settings';
import Switch from '@/pages/switch';
import Dashboard from '@/pages/dashboard';
import Fs from '@/pages/fs';
import Log from '@/pages/log';
import App, { MenuItem, DashboardItem } from '@/app.tsx';
import '@/gardencore/lib';
import '@/index.css';

/* ========================================================================== */

const dashboardItems: DashboardItem[] = [
  { node: <DashboardSwitch key="switch" /> },
  { node: <DashboardPump key="pump" /> },
  { node: <DashboardSystem key="system" /> },
  { node: <DashboardWlan key="wlan" /> },
  { node: <DashboardMqtt key="mqtt" /> },
];

const menuItems: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, node: <Dashboard key="dashboard" dashboardItems={dashboardItems} /> },
  { id: 'switch', label: 'Switch Configuration', icon: Lightbulb, node: <Switch key="switch" /> },
  { id: 'pump', label: 'Pump Configuration', icon: PumpIcon, node: <Pump key="pump" /> },
  { id: 'wlan', label: 'WiFi Configuration', icon: Wifi, node: <Wlan key="wlan" /> },
  { id: 'mqtt', label: 'MQTT Connection', icon: Radio, node: <MQTT key="mqtt" /> },
  { id: 'settings', label: 'Settings', icon: SettingsIcon, node: <Settings key="settings" /> },
  { id: 'fs', label: 'File System', icon: FileSymlink, node: <Fs key="fs" /> },
  { id: 'log', label: 'Log', icon: LogIcon, node: <Log key="log" /> },
];

/* ========================================================================== */

Moment.startPooledTimer();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Toaster position="top-center" closeButton />
    <App menuItems={menuItems} />
  </React.StrictMode>,
)
