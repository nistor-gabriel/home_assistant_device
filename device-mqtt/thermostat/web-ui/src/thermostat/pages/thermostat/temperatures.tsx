import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import { doModify, GetData } from '@/lib';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as tep from '@/thermostat/lib';
import { Skeleton } from '@/components/ui/skeleton';
import { z } from 'zod';
import { AlertUpdateFailed, AlertUpdateSuccess } from '@/components/common';
import { Download, Upload, X, Scissors, Merge } from 'lucide-react';

/* ========================================================================== */

const DAYS = [
    { id: '0', name: 'Monday' },
    { id: '1', name: 'Tuesday' },
    { id: '2', name: 'Wednesday' },
    { id: '3', name: 'Thursday' },
    { id: '4', name: 'Friday' },
    { id: '5', name: 'Saturday' },
    { id: '6', name: 'Sunday' }
];

const TEMPERATURES = Array.from({ length: 7 }, (_v, i) => i).reduce((week: Record<string, Record<string, number>>, d) => {
    week[d.toString()] = Array.from({ length: 24 }, (_v, i) => i).reduce((day: Record<string, number>, h) => {
        day[h.toString()] = 18;
        return day;
    }, {});
    return week;
}, {});

const MIN_TEMP = 5;

const LOW_TEMP = 18;

const HIGH_TEMP = 25;

const MAX_TEMP = 30;

function getTempColor(temp: number) {
    // Clamp temperature to min/max range
    const clampedTemp = Math.max(LOW_TEMP, Math.min(HIGH_TEMP, temp));

    // Normalize to 0-1 range
    const normalized = (clampedTemp - LOW_TEMP) / (HIGH_TEMP - LOW_TEMP);

    // Define color stops: blue -> cyan -> green -> yellow -> red
    let r: number, g: number, b: number;

    if (normalized < 0.25) {
        // Blue to Cyan
        const t = normalized / 0.25;
        r = 0;
        g = Math.round(200 * t);
        b = 200;
    } else if (normalized < 0.5) {
        // Cyan to Green
        const t = (normalized - 0.25) / 0.25;
        r = 0;
        g = 200;
        b = Math.round(200 * (1 - t));
    } else if (normalized < 0.75) {
        // Green to Yellow
        const t = (normalized - 0.5) / 0.25;
        r = Math.round(200 * t);
        g = 200;
        b = 0;
    } else {
        // Yellow to Red
        const t = (normalized - 0.75) / 0.25;
        r = 200;
        g = Math.round(200 * (1 - t));
        b = 0;
    }

    return `rgb(${r}, ${g}, ${b})`;
}

const FormSchema = z.object({
    temperatureAway: z.preprocess((val: string) => {
        if (typeof val === 'string') {
            return Number.parseFloat(val);
        }
        return val;
    }, z.number().min(MIN_TEMP, {
        message: `Temperature needs to be at least ${MIN_TEMP}°C.`,
    }).max(MAX_TEMP, {
        message: `Temperature can be ${MAX_TEMP}°C at maximum.`,
    })),
    temperatures: z.record(z.string(), z.record(z.string(), z.number())),
});

/* ========================================================================== */

const Temperatures: React.FC<{
    get: GetData<tep.ThermostatConfig>;
    refresh: () => void;
    setProcessing: (proc: boolean) => void;
}> = ({ get, refresh, setProcessing }) => {
    const [selectedDay, setSelectedDay] = useState<string | null>(null);
    const [selectedSegment, setSelectedSegment] = useState<any>(null);
    const [editTemp, setEditTemp] = useState<string>('');
    const [splitHour, setSplitHour] = useState<string>('');
    const isOk = get.status === 'ok';

    useEffect(() => {
        if(get.data) {
            form.resetField('temperatureAway', { defaultValue: get.data.temperatureAway });
            form.setValue('temperatures', get.data.temperatures);
        }
    }, [get]);

    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema) as any,
        defaultValues: {
            temperatureAway: '' as any,
            temperatures: TEMPERATURES,
        },
    });

    const handleUpdate = async (data: z.infer<typeof FormSchema>) => {
        const timeout = setTimeout(() => setProcessing(true), 300);
        const result = await doModify('PUT', tep.PATH_THERMOSTAT_CONFIG, data);
        clearTimeout(timeout);
        setProcessing(false);

        if (result === 'ok') {
            toast((
                <AlertUpdateSuccess>
                    <p>Successfully updated the thermostat schedule.</p>
                </AlertUpdateSuccess>
            ));
            refresh();
            form.reset();
        } else {
            toast((<AlertUpdateFailed />));
        }
    };

    const getSegments = (daySchedule: Record<string, number>): {
        startHour: number;
        endHour: number;
        temp: number;
        width: number;
    }[] => {
        const segments = [];
        let currentTemp: number = daySchedule['0'];
        let startHour = 0;

        for (let hour = 1; hour <= 24; hour++) {
            const temp = hour === 24 ? null : daySchedule[hour.toString()];

            if (temp !== currentTemp || hour === 24) {
                segments.push({
                    startHour,
                    endHour: hour,
                    temp: currentTemp,
                    width: ((hour - startHour) / 24) * 100
                });

                if (hour < 24) {
                    currentTemp = temp as any;
                    startHour = hour;
                }
            }
        }
        return segments;
    };

    const updateSegmentTemperature = (dayId: string, startHour: number, endHour: number, newTemp: number) => {
        const currentTemps = form.getValues('temperatures');
        const updatedDay = { ...currentTemps[dayId] };

        for (let hour = startHour; hour < endHour; hour++) {
            updatedDay[hour.toString()] = newTemp;
        }

        form.setValue('temperatures', {
            ...currentTemps,
            [dayId]: updatedDay
        }, { shouldDirty: true });

        setSelectedSegment(null);
        setEditTemp('');
    };

    const splitSegment = (dayId: string, startHour: number, endHour: number, splitAtHour: number) => {
        if (splitAtHour <= startHour || splitAtHour >= endHour) {
            toast.error('Invalid split hour');
            return;
        }

        const currentTemps = form.getValues('temperatures');
        const daySchedule = currentTemps[dayId];
        const firstTemp = daySchedule[startHour.toString()];

        // Set a different temperature for the second half to create the split
        // We'll set it slightly different (by 0.5) and user can then edit it
        const secondTemp = firstTemp + 0.5;

        const updatedDay = { ...daySchedule };
        for (let hour = splitAtHour; hour < endHour; hour++) {
            updatedDay[hour.toString()] = secondTemp;
        }

        form.setValue('temperatures', {
            ...currentTemps,
            [dayId]: updatedDay
        }, { shouldDirty: true });

        setSelectedSegment(null);
        setSplitHour('');

        toast.success(`Segment split at hour ${splitAtHour}. Second part set to ${secondTemp}°C - adjust as needed.`);
    };

    const mergeWithNext = (dayId: string, segments: any[], segmentIndex: number) => {
        if (segmentIndex >= segments.length - 1) {
            toast.error('Cannot merge: this is the last segment');
            return;
        }

        const currentSegment = segments[segmentIndex];
        const nextSegment = segments[segmentIndex + 1];

        // Merge by setting all hours in both segments to the current segment's temperature
        updateSegmentTemperature(dayId, currentSegment.startHour, nextSegment.endHour, currentSegment.temp);

        setSelectedSegment(null);
        toast.success('Segments merged successfully');
    };

    const exportSchedule = () => {
        const data = form.getValues();
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'thermostat-schedule.json';
        link.click();
    };

    const importSchedule = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const imported = JSON.parse(e.target?.result as string);
                    const temperatures = imported?.temperatures || {};
                    const temperaturesNormalized = DAYS.reduce((sch: typeof imported, day) => {
                        let hourly: Record<string, number> = temperatures[day.id];
                        const chourly: Record<string, number> = (get.data?.temperatures as any)[day.id];
                        if(!hourly) {
                            sch[day.id] = chourly;
                        } else {
                            for(let h = 0; h < 24; h++) {
                                const hour = h.toString();
                                if(typeof hourly[hour] !== 'number') {
                                    hourly[hour] = chourly[hour];
                                }
                            }
                            sch[day.id] = hourly;
                        }
                        return sch;
                    }, {});
                    form.setValue('temperatures', temperaturesNormalized, { shouldDirty: true });
                    if (imported.temperatureAway !== undefined) {
                        form.setValue('temperatureAway', imported.temperatureAway, { shouldDirty: true });
                    }
                    toast.success('Schedule imported successfully');
                } catch (error) {
                    toast.error('Invalid JSON file');
                }
            };
            reader.readAsText(file);
        }
    };

    return (
        <>
            <div className="space-y-6">
                <Card>
                    <CardContent className="space-y-4 mt-4">
                        <div className="flex justify-end items-center mb-4">
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={exportSchedule}
                                    disabled={!isOk}
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    Export
                                </Button>
                                <label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={!isOk}
                                        asChild
                                    >
                                        <span>
                                            <Upload className="w-4 h-4 mr-2" />
                                            Import
                                        </span>
                                    </Button>
                                    <input
                                        type="file"
                                        accept=".json"
                                        onChange={importSchedule}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                        </div>

                        <Form {...form as any}>
                            <div className="w-full space-y-4">
                                {/* Away Mode */}
                                <Card className="bg-muted/50">
                                    <CardContent className="pt-4">
                                        <FormField
                                            control={form.control as any}
                                            name="temperatureAway"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Away Mode Temperature (°C)</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            disabled={!isOk}
                                                            step={0.5}
                                                            type="number"
                                                            placeholder="enter away temperature"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage className="text-xs">&nbsp;</FormMessage>
                                                </FormItem>
                                            )}
                                        />
                                    </CardContent>
                                </Card>

                                {/* Timeline */}
                                <div className="space-y-4">
                                    {DAYS.map((day) => {
                                        const temperatures = form.watch('temperatures');
                                        const segments = getSegments(temperatures[day.id]);

                                        return (
                                            <Card key={day.id}>
                                                <CardContent className="pt-4">
                                                    <h3 className="text-lg font-semibold mb-3">{day.name}</h3>

                                                    <div className="relative">
                                                        <div className="flex h-20 rounded-lg overflow-hidden border-2">
                                                            {isOk ? null : (<Skeleton className="h-20 rounded-lg w-full" />)}
                                                            {isOk && segments.map((segment, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    onClick={() => {
                                                                        setSelectedDay(day.id);
                                                                        setSelectedSegment({
                                                                            ...segment,
                                                                            segments,
                                                                            segmentIndex: idx
                                                                        });
                                                                        setEditTemp(segment.temp.toString());
                                                                        setSplitHour('');
                                                                    }}
                                                                    className="cursor-pointer hover:opacity-80 transition-opacity flex flex-col items-center justify-center text-slate-900 font-semibold border-r-2 border-background relative group"
                                                                    style={{ width: `${segment.width}%`, background: getTempColor(segment.temp) }}
                                                                >
                                                                    <div className="text-base">{segment.temp}°C</div>
                                                                    <div className="text-xs opacity-75">
                                                                        {segment.startHour}:00-{segment.endHour}:00
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                                                            {[0, 6, 12, 18, 24].map(hour => (
                                                                <span key={hour}>{hour}:00</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>

                                <div className="flex space-x-3">
                                    <Button
                                        type="button"
                                        onClick={form.handleSubmit(handleUpdate)}
                                        disabled={!form.formState.isDirty}
                                    >
                                        Update Schedule
                                    </Button>
                                </div>
                            </div>
                        </Form>
                    </CardContent>
                </Card>
            </div>

            {/* Edit Modal */}
            {selectedSegment && selectedDay && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md">
                        <CardContent className="pt-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold">Edit Temperature</h3>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                        setSelectedSegment(null);
                                        setEditTemp('');
                                        setSplitHour('');
                                    }}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-muted-foreground mb-3">
                                        Time Range: {selectedSegment.startHour}:00 - {selectedSegment.endHour}:00
                                    </p>

                                    <div className="flex items-center gap-2">
                                        <label className="text-sm font-medium">Temperature:</label>
                                        <Input
                                            type="number"
                                            step="0.5"
                                            value={editTemp}
                                            onChange={(e) => setEditTemp(e.target.value)}
                                            className="flex-1"
                                        />
                                        <span className="font-semibold">°C</span>
                                    </div>
                                </div>

                                {/* Split segment option */}
                                {(selectedSegment.endHour - selectedSegment.startHour) > 1 && (
                                    <div className="border-t pt-4">
                                        <label className="text-sm font-medium mb-2 block">Split segment at hour:</label>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="number"
                                                min={selectedSegment.startHour + 1}
                                                max={selectedSegment.endHour - 1}
                                                value={splitHour}
                                                onChange={(e) => setSplitHour(e.target.value)}
                                                placeholder={`${selectedSegment.startHour + 1}-${selectedSegment.endHour - 1}`}
                                                className="flex-1"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    const hour = parseInt(splitHour);
                                                    if (!isNaN(hour)) {
                                                        splitSegment(selectedDay, selectedSegment.startHour, selectedSegment.endHour, hour);
                                                    }
                                                }}
                                                disabled={!splitHour}
                                            >
                                                <Scissors className="w-4 h-4 mr-1" />
                                                Split
                                            </Button>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Split this segment to set different temperatures for different hours
                                        </p>
                                    </div>
                                )}

                                {/* Merge with next segment */}
                                {selectedSegment.segmentIndex < selectedSegment.segments.length - 1 && (
                                    <div className="border-t pt-4">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="w-full"
                                            onClick={() => {
                                                mergeWithNext(selectedDay, selectedSegment.segments, selectedSegment.segmentIndex);
                                            }}
                                        >
                                            <Merge className="w-4 h-4 mr-2" />
                                            Merge with Next Segment
                                        </Button>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Combine this segment with the next one using this segment's temperature
                                        </p>
                                    </div>
                                )}

                                <div className="flex gap-2 pt-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setSelectedSegment(null);
                                            setEditTemp('');
                                            setSplitHour('');
                                        }}
                                        className="flex-1"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={() => {
                                            const temp = parseFloat(editTemp);
                                            if (!isNaN(temp) && temp >= MIN_TEMP && temp <= MAX_TEMP) {
                                                updateSegmentTemperature(
                                                    selectedDay,
                                                    selectedSegment.startHour,
                                                    selectedSegment.endHour,
                                                    temp
                                                );
                                            } else {
                                                toast.error(`Temperature must be between ${MIN_TEMP}°C and ${MAX_TEMP}°C`);
                                            }
                                        }}
                                        className="flex-1"
                                    >
                                        Save
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </>
    );
};

export default Temperatures;