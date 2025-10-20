import React, { EventHandler, SyntheticEvent, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetEffect, cn, useTimelyRefresh, doModify, useDeltaTimeCompensation } from '@/lib';
import * as tep from '@/thermostat/lib';
import { Card, CardContent } from '@/components/ui/card';
import TimeoutSelect from '@/components/timeout';
import Moment from 'react-moment';
import { Button } from '@/components/ui/button';
import { SpinnerBars } from '@/components/ui/shadcn-io/spinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Minus, Plus, Flame, Snowflake, Wind, Power, Thermometer, Cog, Clock, CheckCircle } from 'lucide-react';
import { AlertUpdateFailed } from '@/components/common';
import { toast } from 'sonner';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';

/* ========================================================================== */

const MIN_TEMP = 5;
const MAX_TEMP = 30;

const DashboardThermostat: React.FC = () => {
    const compensateDate = useDeltaTimeCompensation();
    const [isProcessing, setProcessing] = useState<boolean>(false);
    const [status, setStatus] = useState<'loading' | 'failed' | 'ok'>('loading');
    const isLoading = status === 'loading';
    const isError = status === 'failed';
    const isOk = status === 'ok';

    const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);
    const [temperature, setTemperature] = useState<number>(0);
    const [therm, setTherm] = useState<Partial<tep.Thermostat>>({
        mode: 'disabled',
    });
    const [isDragging, setIsDragging] = useState(false);
    const [startHeating, setStartHeating] = useState<boolean>(false);
    const [selectTimeout, setSelectTimeout] = useState<number>(60);

    const refreshThermostat = useGetEffect<tep.Thermostat>(tep.PATH_THERMOSTAT, (data) => {
        if (data) {
            setTemperature(data.temperatureTarget);
            setTherm(data);
            setProcessing(false);
            setStatus('ok');
        } else {
            setStatus('failed');
        }
    }, 'refresh');

    useTimelyRefresh(5, refreshThermostat);

    const publishTemp = async (temperatureManual: number) => {
        const timeout = setTimeout(() => setProcessing(true), 500);
        const result = await doModify('PUT', tep.PATH_THERMOSTAT_CONFIG, { temperatureManual });
        clearTimeout(timeout);
        if (result === 'ok') {
            refreshThermostat();
        } else {
            setTemperature(therm.temperatureTarget || 0);
            setProcessing(false);
            toast((<AlertUpdateFailed />));
        }
    };

    const startTempPublish = (temp: number = temperature) => {
        if (timer) {
            clearTimeout(timer);
        }
        const newTimer = setTimeout(() => {
            publishTemp(temp);
        }, 1000);
        setTimer(newTimer);
    };

    const setMode = async (mode: tep.ThermostatMode) => {
        const timeout = setTimeout(() => setProcessing(true), 500);
        const result = await doModify('PUT', tep.PATH_THERMOSTAT, { mode });
        clearTimeout(timeout);
        if (result === 'ok') {
            refreshThermostat();
        } else {
            setProcessing(false);
            toast((<AlertUpdateFailed />));
        }
    };

    const getProgress = () => {
        return ((temperature - MIN_TEMP) / (MAX_TEMP - MIN_TEMP)) * 100;
    };

    const svgRef = React.useRef<SVGSVGElement>(null);

    const handleDrag = (e: MouseEvent | TouchEvent) => {
        if (therm.mode === 'disabled' || !isDragging) {
            return;
        }

        const svg = svgRef.current;
        if (!svg) {
            return;
        }

        const rect = svg.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const clientX = e.type.includes('mouse') ? (e as MouseEvent).clientX : (e as TouchEvent).touches[0].clientX;
        const clientY = e.type.includes('mouse') ? (e as MouseEvent).clientY : (e as TouchEvent).touches[0].clientY;

        const x = clientX - centerX;
        const y = clientY - centerY;

        let angle = Math.atan2(y, x) * (180 / Math.PI);
        angle = (angle + 90 + 360) % 360;

        const progress = angle / 360;
        const newTemp = Math.max(MIN_TEMP, Math.min(MAX_TEMP, MIN_TEMP + progress * (MAX_TEMP - MIN_TEMP)));

        setTemperature(Math.round(newTemp * 2) / 2);
    };

    const startDrag: EventHandler<SyntheticEvent> = (e) => {
        if (therm.mode === 'disabled') {
            return;
        }
        e.stopPropagation();
        setIsDragging(true);
    };

    const stopDrag = () => {
        setIsDragging(false);
        startTempPublish();
    };

    const cancel = (): void => {
        setStartHeating(false);
    };

    const handleStartHeating = async () => {
        setStartHeating(false);
        const timeout = setTimeout(() => setProcessing(true), 300);
        const result = await doModify('PUT', tep.PATH_THERMOSTAT, { heatOn: selectTimeout });
        clearTimeout(timeout);
        setProcessing(false);
        if (result === 'ok') {
            refreshThermostat();
        } else {
            toast((<AlertUpdateFailed />));
        }
    }

    const toggleHeating = async () => {
        if (therm.pumpOn) {
            const timeout = setTimeout(() => setProcessing(true), 500);
            const result = await doModify('PUT', tep.PATH_THERMOSTAT, { heatOn: 0 });
            clearTimeout(timeout);
            if (result === 'ok') {
                refreshThermostat();
            } else {
                setProcessing(false);
                toast((<AlertUpdateFailed />));
            }
        } else {
            setStartHeating(true);
        }
    };

    React.useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleDrag);
            window.addEventListener('mouseup', stopDrag);
            window.addEventListener('touchmove', handleDrag);
            window.addEventListener('touchend', stopDrag);

            return () => {
                window.removeEventListener('mousemove', handleDrag);
                window.removeEventListener('mouseup', stopDrag);
                window.removeEventListener('touchmove', handleDrag);
                window.removeEventListener('touchend', stopDrag);
            };
        }
    }, [isDragging, temperature, therm.mode]);

    const getModeConfig = () => {
        switch (therm.mode) {
            case 'auto': return {
                color: 'text-blue-500',
                bg: 'bg-blue-50',
                border: 'border-blue-200',
                gradient: ['#54b315ff', '#f97316'],
            };
            case 'manual': return {
                color: 'text-orange-500',
                bg: 'bg-orange-50',
                border: 'border-orange-200',
                gradient: ['#fb923c', '#f97316'],
                ring: 'focus:ring-orange-500'
            };
            case 'away': return {
                color: 'text-cyan-500',
                bg: 'bg-cyan-50',
                border: 'border-cyan-200',
                gradient: ['#06b6d4', '#0891b2'],
            };
            case 'disabled': return {
                color: 'text-gray-400',
                bg: 'bg-gray-50',
                border: 'border-gray-200',
                gradient: ['#9ca3af', '#6b7280'],
            };
            default: return {
                color: 'text-blue-500',
                bg: 'bg-blue-50',
                border: 'border-blue-200',
                gradient: ['#3b82f6', '#2563eb'],
                ring: 'focus:ring-blue-500'
            };
        }
    };

    const modeConfig = getModeConfig();

    return (
        <>
            <Card className="min-w-[300px]">
                <CardContent className="p-6">

                    {/* Mode Selector */}
                    <div className="flex items-center justify-between mb-6">
                        <Select value={therm.mode} onValueChange={setMode} disabled={!isOk}>
                            <SelectTrigger className={`w-40 font-semibold border-2 ${modeConfig.border} ${modeConfig.bg} ${modeConfig.color}`}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="auto">
                                    <div className="flex items-center gap-2">
                                        <Wind className="w-4 h-4" />
                                        <span>Auto</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="manual">
                                    <div className="flex items-center gap-2">
                                        <Cog className="w-4 h-4" />
                                        <span>Manual</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="away">
                                    <div className="flex items-center gap-2">
                                        <Snowflake className="w-4 h-4" />
                                        <span>Away</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="disabled">
                                    <div className="flex items-center gap-2">
                                        <Power className="w-4 h-4" />
                                        <span>Disabled</span>
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>

                        <Button
                            variant="outline"
                            size="lg"
                            className={cn(
                                'w-12 h-12 rounded-full transition-all duration-300 border-2',
                                therm.mode === 'disabled' && 'hidden',
                                therm.pumpOn
                                    ? 'bg-red-500 text-white hover:bg-red-600 border-red-600 shadow-lg shadow-red-200'
                                    : 'text-orange-500 hover:bg-orange-50 border-orange-300'
                            )}
                            disabled={!isOk}
                            onClick={toggleHeating}
                        >
                            <Flame className={cn(therm.pumpOn && 'animate-pulse')} />
                        </Button>
                    </div>

                    {/* Circular Thermostat */}
                    <div className="relative flex items-center justify-center mb-6">
                        <svg
                            ref={svgRef}
                            className="w-72 h-72 -rotate-90"
                            viewBox="0 0 200 200"
                        >
                            <defs>
                                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor={modeConfig.gradient[0]} />
                                    <stop offset="100%" stopColor={modeConfig.gradient[1]} />
                                </linearGradient>
                                <filter id="glow">
                                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                                    <feMerge>
                                        <feMergeNode in="coloredBlur" />
                                        <feMergeNode in="SourceGraphic" />
                                    </feMerge>
                                </filter>
                            </defs>

                            {/* Background circle */}
                            <circle
                                cx="100"
                                cy="100"
                                r="80"
                                fill="none"
                                stroke={isError ? '#F87171' : '#e2e8f0'}
                                strokeWidth="18"
                            />

                            {/* Progress circle */}
                            <circle
                                cx="100"
                                cy="100"
                                r="80"
                                fill="none"
                                stroke="url(#gradient)"
                                strokeWidth="18"
                                strokeDasharray={`${(getProgress() / 100) * 502.4} 502.4`}
                                strokeLinecap="round"
                                filter={therm.heatOn ? "url(#glow)" : "none"}
                                style={{ transition: isDragging ? 'none' : 'stroke-dasharray 0.3s ease' }}
                            />

                            {therm.mode === 'manual' ? (
                                <circle
                                    cx={100 + 80 * Math.cos((getProgress() / 100) * 2 * Math.PI)}
                                    cy={100 + 80 * Math.sin((getProgress() / 100) * 2 * Math.PI)}
                                    r="14"
                                    fill="white"
                                    stroke={modeConfig.gradient[1]}
                                    strokeWidth="4"
                                    className="cursor-grab active:cursor-grabbing"
                                    style={{
                                        cursor: isDragging ? 'grabbing' : 'grab',
                                        filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.15))'
                                    }}
                                    onMouseDown={startDrag}
                                    onTouchStart={startDrag}
                                />
                            ) : null}
                        </svg>

                        {/* Center content */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <div className={cn('flex items-center mb-2 h-8')}>
                                {therm.pumpOn && therm.mode !== 'disabled' ? (
                                    <Flame className="w-8 h-8 text-red-500 animate-pulse" />
                                ) : null}
                            </div>
                            <div className={`text-5xl font-bold ${modeConfig.color} mb-2 transition-colors duration-300`}>
                                {therm.mode !== 'disabled' ? `${temperature.toFixed(1)}°C` : 'Off'}
                            </div>
                            <div className="flex items-center font-semibold text-slate-600 text-lg min-h-[28px]">
                                {typeof therm.temperature === 'number' ? (
                                    <>
                                        <Thermometer className="w-5 h-5" />
                                        <span className="ml-1">{therm.temperature.toFixed(1)}°C</span>
                                    </>
                                ) : therm.mode !== 'disabled' && isLoading ? (
                                    <Skeleton className="h-6 w-20 rounded" />
                                ) : null}
                            </div>
                        </div>
                    </div>

                    {/* Status Display */}
                    {therm.mode !== 'disabled' ? (
                        <div className={cn(
                            'mb-4 p-4 rounded-lg border-2 transition-all duration-500 min-h-[88px]',
                            therm.onSince
                                ? therm.heatOn
                                    ? 'bg-red-50 border-red-200'
                                    : 'bg-green-50 border-green-300 shadow-sm'
                                : 'bg-slate-50 border-slate-200'
                        )}>
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    {therm.onSince ? (therm.heatOn ? (
                                        <>
                                            <Flame className="w-5 h-5 text-red-500 animate-pulse" />
                                            <span className="font-bold text-red-600">Heating Active</span>
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="w-5 h-5 text-green-600" />
                                            <span className="font-bold text-green-700">Pump Running</span>
                                        </>
                                    )) : therm.offSince ? (
                                        <>
                                            <Clock className="w-5 h-5 text-slate-500" />
                                            <span className="font-semibold text-slate-600">Heat Inactive</span>
                                        </>
                                    ) : null}
                                </div>
                            </div>
                            {therm.onSince ? (
                                <div className="text-sm text-slate-600">
                                    Started <Moment date={compensateDate(therm.onSince)} fromNow />
                                    {therm.stopTimeout && therm.heatOn ? (
                                        <>, stops <Moment date={compensateDate(therm.onSince) + therm.stopTimeout * 1000} fromNow /></>
                                    ) : null}
                                </div>
                            ) : therm.offSince ? (
                                <div className="text-sm text-slate-600">
                                    Off since <Moment date={compensateDate(therm.offSince)} fromNow />
                                </div>
                            ) : null}

                        </div>
                    ) : (
                        <div className="mb-4 min-h-[88px]"></div>
                    )}

                    {/* Control Buttons */}
                    <div className={cn('flex items-center justify-center gap-8 min-h-[56px]', therm.mode !== 'manual' && 'opacity-0 pointer-events-none')}>
                        <Button
                            variant="outline"
                            size="lg"
                            className="w-14 h-14 rounded-full hover:bg-slate-100 border-2 transition-all duration-200 hover:scale-105 disabled:opacity-30"
                            onClick={() => {
                                if (temperature > MIN_TEMP) {
                                    const newTemp = temperature - 0.5;
                                    setTemperature(newTemp);
                                    startTempPublish(newTemp);
                                }
                            }}
                            disabled={temperature <= MIN_TEMP || !isOk}
                        >
                            <Minus className="w-6 h-6 stroke-[3]" />
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            className="w-14 h-14 rounded-full hover:bg-slate-100 border-2 transition-all duration-200 hover:scale-105 disabled:opacity-30"
                            onClick={() => {
                                if (temperature < MAX_TEMP) {
                                    const newTemp = temperature + 0.5;
                                    setTemperature(newTemp);
                                    startTempPublish(newTemp);
                                }
                            }}
                            disabled={temperature >= MAX_TEMP || !isOk}
                        >
                            <Plus className="w-6 h-6 stroke-[3]" />
                        </Button>
                    </div>

                </CardContent>
            </Card>

            <AlertDialog open={startHeating} onOpenChange={setStartHeating}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <Flame className="w-5 h-5 text-orange-500" />
                            Turn Heat On
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Please specify how long should the heat be running.
                        </AlertDialogDescription>
                        <div className="space-y-4 mt-6">
                            <TimeoutSelect minValue={10} options={[
                                {value: 15, label: '15 minutes'},
                                {value: 30, label: '30 minutes'},
                                {value: 60, label: '1 hour'},
                                {value: 90, label: '1 and half hours'},
                                {value: 120, label: '2 hours'},
                            ]} onChange={setSelectTimeout} value={selectTimeout} variant="minutes-minutes" />
                        </div>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={cancel}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleStartHeating} className="bg-red-600 hover:bg-red-700">
                            <Flame className="w-4 h-4 mr-2" />
                            Turn On
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {isProcessing ? (
                <div className="fixed flex justify-center items-center inset-0 z-50 bg-black/30">
                    <SpinnerBars className="text-blue-500" size={64} />
                </div>
            ) : null}
        </>
    );
}

export default DashboardThermostat;