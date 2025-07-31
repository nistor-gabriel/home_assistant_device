import * as lr from 'lucide-react';
import Dashboard from '@/components/dashboard';
import DashboardMqtt from '@/components/dashboard/mqtt';
import DashboardWlan from '@/components/dashboard/wlan';
import DashboardSystem from '@/components/dashboard/system';
import Wlan from '@/components/wlan';
import MQTT from '@/components/mqtt';
import Settings from '@/components/settings';

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
    { node: <DashboardSystem key="system"/> },
    { node: <DashboardWlan key="wlan" /> },
    { node: <DashboardMqtt key="mqtt" /> },
];

export const menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: lr.Home, node: <Dashboard key="dashboard" dashboardItems={dashboardItems} /> },
    { id: 'wlan', label: 'WiFi Configuration', icon: lr.Wifi, node: <Wlan key="wlan" /> },
    { id: 'mqtt', label: 'MQTT Connection', icon: lr.Radio, node: <MQTT key="mqtt" /> },
    { id: 'settings', label: 'Settings', icon: lr.Settings, node: <Settings key="settings" /> },
];