/* ========================================================================== */

export interface Shed {
    nameBox1: string;
    temperatureBox1: number;
    humidityBox1: number;
    humidityAbsolute: number;
    box1On: boolean;
    box1Disabled: boolean;

    nameBox2: string;
    temperatureBox2: number;
    humidityBox2: number;
    humidityAbsoluteBox2: number;
    box2On: boolean;
    box2Disabled: boolean;

    temperature: number;
    humidity: number;
    humidityAbsoluteBox1: number;

    deltaGrams: number;
}

/* ========================================================================== */

export const PATH_SHED = '/shed';