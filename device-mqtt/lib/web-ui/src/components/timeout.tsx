import React, { useState, useEffect, forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/* ========================================================================== */

export interface TimeoutSelectProps {
    options: Array<{
        label: string;
        value: number;
    }>;
    variant: 'hours-minutes' | 'hours' | 'minutes-minutes' | 'minutes' | 'seconds';
    disabled?: boolean;
    name?: string;
    onBlur?: () => any;
    onChange?: (value: number) => any;
    value?: number;
    minValue?: number;
}

/* ========================================================================== */

function normalize(value: string, limit: boolean): string | number {
    if (value === '') {
        return '';
    }
    const val = parseInt(value);
    if (isNaN(val)) {
        return '';
    }
    if (val < 0) {
        return Math.abs(val);
    }
    if (!limit) {
        return val;
    }
    if (val > 59) {
        return 59;
    }
    return val;
}

function getLabels(customVariant: TimeoutSelectProps['variant']) {
    switch (customVariant) {
        case 'hours':
        case 'hours-minutes':
            return ['days', 'hours'];
        case 'minutes':
        case 'minutes-minutes':
            return ['hours', 'minutes'];
        case 'seconds':
            return ['minutes', 'seconds'];
        default:
            return ['', ''];
    }
}

function getFactors(customVariant: TimeoutSelectProps['variant']) {
    switch (customVariant) {
        case 'hours':
            return [24 * 60 * 60, 60 * 60];
        case 'hours-minutes':
            return [24 * 60, 60];
        case 'minutes':
            return [60 * 60, 60];
        case 'minutes-minutes':
            return [60, 1];
        case 'seconds':
            return [60, 1];
        default:
            return [0, 0];
    }
}

const TimeoutSelect: React.FC<TimeoutSelectProps> = forwardRef(({
    options,
    variant,
    value,
    disabled = false,
    name,
    onBlur,
    onChange,
    minValue,
}, ref) => {
    const [selectTimeout, setSelectTimeout] = useState<string>('');
    const [majorTimeout, setMajorTimeout] = useState<number | string>('');
    const [minorTimeout, setMinorTimeout] = useState<number | string>('');

    const [majorFactor, minorFactor] = getFactors(variant);

    // Initialize from value prop
    useEffect(() => {
        if (value != undefined) {
            const isPreset = options.some(opt => opt.value === value);

            if (isPreset) {
                setSelectTimeout(value.toString());
                setMajorTimeout(0);
                setMinorTimeout(0);
            } else {
                setSelectTimeout('custom');
                if (isNaN(value)) {
                    setSelectTimeout(options[0].value.toString());
                } else {
                    setTotal(value);
                }
            }
        } else {
            setSelectTimeout('');
        }
    }, [value, options, variant]);

    const setTotal = (total: number) => {
        setMajorTimeout(Math.floor(total / majorFactor));
        setMinorTimeout(Math.floor((total % majorFactor) / minorFactor));
    };

    const processTotal = (majorTimeout: number | string, minorTimeout: number | string) => {
        let total = (typeof majorTimeout === 'number' ? majorTimeout : 0) * majorFactor +
            (typeof minorTimeout === 'number' ? minorTimeout : 0) * minorFactor;
        if (typeof minValue === 'number' && total < minValue) {
            total = minValue;
            setTotal(total);
        }
        return total;
    };

    const setSelected = (newValue: string) => {
        setSelectTimeout(newValue);
        if (newValue !== 'custom') {
            onChange?.(parseFloat(newValue));
        } else {
            onChange?.(processTotal(majorTimeout, minorTimeout));
        }
    };

    const setMajor = (newValue: number | '') => {
        setMajorTimeout(newValue);
        if (onChange) {
            onChange?.(processTotal(newValue, minorTimeout));
        }
    };

    const setMinor = (newValue: number | '') => {
        setMinorTimeout(newValue);
        if (onChange) {
            onChange?.(processTotal(majorTimeout, newValue));
        }
    };

    const isCustom = selectTimeout === 'custom';
    const [majorLabel, minorLabel] = getLabels(variant);

    return (
        <div className="flex gap-2">
            <Select name={name} value={selectTimeout} onValueChange={setSelected} disabled={disabled}>
                <SelectTrigger ref={ref as any} onBlur={onBlur} className="grow-7">
                    <SelectValue placeholder="select a timeout" />
                </SelectTrigger>
                <SelectContent>
                    {<SelectItem value="custom">Custom</SelectItem>}
                    {options.map((item, key) => (
                        <SelectItem key={key} value={item.value.toString()}>{item.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {isCustom ? (
                <>
                    <div className="mt-[-12px]">
                        <Label className="text-xs">{majorLabel}</Label>
                        <Input
                            type="number"

                            onBlur={onBlur}
                            value={majorTimeout}
                            onChange={(e) => {
                                const normalized = normalize(e.target.value, false);
                                setMajor(normalized === '' ? '' : Number(normalized));
                            }}
                            min={0}
                            step={1}
                            disabled={disabled}
                            className="grow-3 max-w-24 h-7"
                        />
                    </div>
                    <div className="mt-[-12px]">
                        <Label className="text-xs">{minorLabel}</Label>
                        <Input
                            type="number"
                            onBlur={onBlur}
                            value={minorTimeout}
                            onChange={(e) => {
                                const normalized = normalize(e.target.value, true);
                                setMinor(normalized === '' ? '' : Number(normalized));
                            }}
                            min={0}
                            max={59}
                            step={1}
                            disabled={disabled}
                            className="grow-3 max-w-24 h-7"
                        />
                    </div>
                </>
            ) : null}
        </div>
    );
});

export default TimeoutSelect;