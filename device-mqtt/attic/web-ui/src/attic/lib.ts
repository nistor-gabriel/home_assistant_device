/* ========================================================================== */

export type ScheduleDays = '0' | '1' | '2' | '3' | '4' | '5' | '6';

export type ScheduleHours = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12' | '13' | '14' | '15' |
    '16' | '17' | '18' | '19' | '20' | '21' | '22' | '23';

export type Schedule = Record<ScheduleDays, Record<ScheduleHours, boolean>>;

export interface Attic {
    temperature: number;
    humidity: number;
    humidityAbsolute: number;
    humidityAbsoluteExterior: number;
    on: boolean;
}

export interface AtticConfig {
    schedule: Schedule;
    humidityAbsoluteExteriorURL: string;
    deltaGrams: number;
    disabled: boolean;
}

/* ========================================================================== */

export const PATH_ATTIC = '/attic';

export const PATH_ATTIC_CONFIG = '/attic/config';