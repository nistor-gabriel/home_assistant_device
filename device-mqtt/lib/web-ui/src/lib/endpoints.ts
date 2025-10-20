/* ========================================================================== */

export interface Api { 
    name: string; 
    type: string; 
    version: string;
}

export interface Stats {
    time: string;
    tzone: string;
    flashFree: number;
    flashUsed: number;
    memoryFree: number;
    memoryUsed: number;
    uptime: number; 
}

export interface Wlan {
    ip: string; 
    gateway: string;
    subnet: string;
    ssid: string;
    dns: string;
    signal: number;
}

export interface Mqtt {
    server: string;
    port: number; 
    ssl: boolean; 
    clientId: string;
    defaultClientId: string;
    isConnected: boolean; 
}

export interface FsItem {
    name: string;
    path: string;
    isDir: boolean;
    hash: string;
}

export interface Fs {
    path: string;
    items: FsItem[];
}

export interface SwitchItem {
    id: number;
    on: boolean;
    name: string;
    disabled: boolean;
    onSince: string;
    stopTimeout: number;
}

export interface Switch {
    items: SwitchItem[];
}

/* ========================================================================== */

export const PATH_API = '/api';
export const PATH_STATS = '/stats';
export const PATH_WLAN = '/wlan';
export const PATH_MQTT = '/mqtt';
export const PATH_FS = '/fs';
export const PATH_SWITCH = '/switch';

export function pathSwitchItem(sw: SwitchItem) {
    return PATH_SWITCH + '/' + sw.id;
}