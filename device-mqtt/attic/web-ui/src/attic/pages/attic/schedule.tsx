import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form } from '@/components/ui/form';
import { toast } from 'sonner';
import { doModify, GetData } from '@/lib';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as aep from '@/attic/lib';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
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

const SCHEDULE = Array.from({ length: 7 }, (_v, i) => i).reduce((week: Record<string, Record<string, boolean>>, d) => {
    week[d.toString()] = Array.from({ length: 24 }, (_v, i) => i).reduce((day: Record<string, boolean>, h) => {
        day[h.toString()] = true;
        return day;
    }, {});
    return week;
}, {});

function getScheduleColor(on: boolean) {
    if(on) {
        return 'rgb(0, 200, 57)';
    }
    return 'rgb(200, 0, 57)';
}

const FormSchema = z.object({
    schedule: z.record(z.string(), z.record(z.string(), z.boolean()))
});

/* ========================================================================== */

const Schedule: React.FC<{
    get: GetData<aep.AtticConfig>;
    refresh: () => void;
    setProcessing: (proc: boolean) => void;
}> = ({ get, refresh, setProcessing }) => {
    const [selectedDay, setSelectedDay] = useState<string | null>(null);
    const [selectedSegment, setSelectedSegment] = useState<any>(null);
    const [editStat, setEditStat] = useState<boolean | ''>(false);
    const [splitHour, setSplitHour] = useState<string>('');
    const isOk = get.status === 'ok';

    useEffect(() => {
        if(get.data) {
            form.setValue('schedule', get.data.schedule);
        }
    }, [get]);

    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema) as any,
        defaultValues: {
            schedule: SCHEDULE,
        },
    });

    const handleUpdate = async (data: z.infer<typeof FormSchema>) => {
        const timeout = setTimeout(() => setProcessing(true), 300);
        const result = await doModify('PUT', aep.PATH_ATTIC_CONFIG, data);
        clearTimeout(timeout);
        setProcessing(false);

        if (result === 'ok') {
            toast((
                <AlertUpdateSuccess>
                    <p>Successfully updated the schedule.</p>
                </AlertUpdateSuccess>
            ));
            refresh();
            form.reset();
        } else {
            toast((<AlertUpdateFailed />));
        }
    };

    const getSegments = (daySchedule: Record<string, boolean>): {
        startHour: number;
        endHour: number;
        stat: boolean;
        width: number;
    }[] => {
        const segments = [];
        let currentStat: boolean = daySchedule['0'];
        let startHour = 0;

        for (let hour = 1; hour <= 24; hour++) {
            const stat = hour === 24 ? null : daySchedule[hour.toString()];

            if (stat !== currentStat || hour === 24) {
                segments.push({
                    startHour,
                    endHour: hour,
                    stat: currentStat,
                    width: ((hour - startHour) / 24) * 100
                });

                if (hour < 24) {
                    currentStat = stat as any;
                    startHour = hour;
                }
            }
        }
        return segments;
    };

    const updateSegmentState = (dayId: string, startHour: number, endHour: number, newStat: boolean) => {
        const currentStats = form.getValues('schedule');
        const updatedDay = { ...currentStats[dayId] };

        for (let hour = startHour; hour < endHour; hour++) {
            updatedDay[hour.toString()] = newStat;
        }

        form.setValue('schedule', {
            ...currentStats,
            [dayId]: updatedDay
        }, { shouldDirty: true });

        setSelectedSegment(null);
        setEditStat('');
    };

    const splitSegment = (dayId: string, startHour: number, endHour: number, splitAtHour: number) => {
        if (splitAtHour <= startHour || splitAtHour >= endHour) {
            toast.error('Invalid split hour');
            return;
        }

        const currentStats = form.getValues('schedule');
        const daySchedule = currentStats[dayId];
        const firstStat = daySchedule[startHour.toString()];

        const updatedDay = { ...daySchedule };
        for (let hour = splitAtHour; hour < endHour; hour++) {
            updatedDay[hour.toString()] = !firstStat;
        }

        form.setValue('schedule', {
            ...currentStats,
            [dayId]: updatedDay
        }, { shouldDirty: true });

        setSelectedSegment(null);
        setSplitHour('');

        toast.success(`Segment split at hour ${splitAtHour}. Second part set to ${!firstStat}°C - adjust as needed.`);
    };

    const mergeWithNext = (dayId: string, segments: any[], segmentIndex: number) => {
        if (segmentIndex >= segments.length - 1) {
            toast.error('Cannot merge: this is the last segment');
            return;
        }

        const currentSegment = segments[segmentIndex];
        const nextSegment = segments[segmentIndex + 1];

        // Merge by setting all hours in both segments to the current segment's temperature
        updateSegmentState(dayId, currentSegment.startHour, nextSegment.endHour, currentSegment.status);

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
        link.download = 'schedule.json';
        link.click();
    };

    const importSchedule = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const imported = JSON.parse(e.target?.result as string);
                    const schedule = imported?.schedule || {};
                    const scheduleNormalized = DAYS.reduce((sch: typeof imported, day) => {
                        let hourly: Record<string, number> = schedule[day.id];
                        const chourly: Record<string, number> = (get.data?.schedule as any)[day.id];
                        if(!hourly) {
                            sch[day.id] = chourly;
                        } else {
                            for(let h = 0; h < 24; h++) {
                                const hour = h.toString();
                                if(typeof hourly[hour] !== 'boolean') {
                                    hourly[hour] = chourly[hour];
                                }
                            }
                            sch[day.id] = hourly;
                        }
                        return sch;
                    }, {});
                    form.setValue('schedule', scheduleNormalized, { shouldDirty: true });

                    toast.success('Schedule imported successfully');
                } catch (error) {
                    toast.error('Invalid JSON file');
                }
            };
            console.log('========1', file);
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
                                <div className="space-y-4">
                                    {DAYS.map((day) => {
                                        const schedule = form.watch('schedule');
                                        const segments = getSegments(schedule[day.id]);

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
                                                                        setEditStat(segment.stat);
                                                                        setSplitHour('');
                                                                    }}
                                                                    className="cursor-pointer hover:opacity-80 transition-opacity flex flex-col items-center justify-center text-slate-900 font-semibold border-r-2 border-background relative group"
                                                                    style={{ width: `${segment.width}%`, background: getScheduleColor(segment.stat) }}
                                                                >
                                                                    <div className="text-base">{segment.stat ? 'Active' : 'Inactive'}</div>
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
                                        setEditStat('');
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
                                        <label className="text-sm font-medium">Active</label>
                                        <Checkbox
                                          checked={editStat as any}
                                          onCheckedChange={(state) => setEditStat(state as any)}
                                      />
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
                                            setEditStat('');
                                            setSplitHour('');
                                        }}
                                        className="flex-1"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={() => {
                                            if (typeof editStat === 'boolean') {
                                                updateSegmentState(
                                                    selectedDay,
                                                    selectedSegment.startHour,
                                                    selectedSegment.endHour,
                                                    editStat
                                                );
                                            } else {
                                                toast.error(`Status must be Active or Inactive`);
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

export default Schedule;