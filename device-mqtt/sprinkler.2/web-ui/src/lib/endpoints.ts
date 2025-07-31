/* ========================================================================== */

export interface Api { 
    name: string; 
    type: string; 
    version: string;
}

export interface Stats {
    time: string;
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

/* ========================================================================== */

export const PATH_API = '/api';
export const PATH_STATS = '/stats';
export const PATH_WLAN = '/wlan';
export const PATH_MQTT = '/mqtt';