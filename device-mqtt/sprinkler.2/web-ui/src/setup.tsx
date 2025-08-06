import * as lr from 'lucide-react';
import Dashboard from '@/components/dashboard';
import DashboardMqtt from '@/components/dashboard/mqtt';
import DashboardWlan from '@/components/dashboard/wlan';
import DashboardSystem from '@/components/dashboard/system';
import DashboardSwitch from '@/components/dashboard/switch';
import Wlan from '@/components/wlan';
import MQTT from '@/components/mqtt';
import Settings from '@/components/settings';
import Switch from '@/components/switch';
import Fs from '@/components/fs';

/* ========================================================================== */

export interface DashboardItem {
    node: React.ReactNode;
}

export interface MenuItem {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    node: React.ReactNode;
}

/* ========================================================================== */

export const dashboardItems: DashboardItem[] = [
    { node: <DashboardSwitch key="switch" /> },
    { node: <DashboardSystem key="system"/> },
    { node: <DashboardWlan key="wlan" /> },
    { node: <DashboardMqtt key="mqtt" /> },
];

export const menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: lr.Home, node: <Dashboard key="dashboard" dashboardItems={dashboardItems} /> },
    { id: 'switch', label: 'Switch Configuration', icon: lr.Lightbulb, node: <Switch key="switch" /> },
    { id: 'wlan', label: 'WiFi Configuration', icon: lr.Wifi, node: <Wlan key="wlan" /> },
    { id: 'mqtt', label: 'MQTT Connection', icon: lr.Radio, node: <MQTT key="mqtt" /> },
    { id: 'settings', label: 'Settings', icon: lr.Settings, node: <Settings key="settings" /> },
    { id: 'fs', label: 'File System', icon: lr.FileSymlink, node: <Fs key="fs" /> },
];