/* ========================================================================== */

export interface Pump {
    disabledLowWatchdog: boolean;
    disabledHighWatchdog: boolean;
    offHighPressure: number;
    offHighPeriod: number;
    offLowPressure: number;
    offLowPeriod: number;
    offLowStartPeriod: number;
    lastIssue: string;
}

export interface PumpPressure {
    pressure: number;
}

/* ========================================================================== */

export const PATH_PUMP = '/pump';
export const PATH_PUMP_PRESSURE = '/pump/pressure';