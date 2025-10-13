/* ========================================================================== */

export type ThermostatMode = 'disabled' | 'manual' | 'away' | 'auto';

export type ThermostatDays = '0' | '1' | '2' | '3' | '4' | '5' | '6';

export type ThermostatHours = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12' | '13' | '14' | '15' |
    '16' | '17' | '18' | '19' | '20' | '21' | '22' | '23';

export type ThermostatTemperatures = Record<ThermostatDays, Record<ThermostatHours, number>>;

export interface Thermostat {
    temperatureTarget: number;
    temperature: number;
    mode: ThermostatMode;
    onSince: string;
    stopTimeout?: number;
    offSince: string;
    pumpOn: boolean;
    heatOn: boolean;
    on: boolean;
}

export interface ThermostatConfig {
    offsetPeriod: number;
    stopPeriod: number;
    deltaStart: number;
    deltaEnd: number;
    pumpCyclePeriod: number;
    temperatureAway: number;
    temperatureManual: number;
    temperatures: ThermostatTemperatures;
}

/* ========================================================================== */

export const PATH_THERMOSTAT = '/thermostat';
export const PATH_THERMOSTAT_CONFIG = '/thermostat/config';