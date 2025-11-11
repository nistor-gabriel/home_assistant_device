import React, { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import { doModify, GetData } from '@/lib';
import * as tep from '@/thermostat/lib';
import { zodResolver } from '@hookform/resolvers/zod';
import TimeoutSelect from '@/components/timeout';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { AlertUpdateFailed, AlertUpdateSuccess } from '@/components/common';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/* ========================================================================== */

const FormSchema = z.object({
  offsetPeriod: z.preprocess((val: string) => {
    if (typeof val === 'string') {
      return Number.parseFloat(val);
    }
    return val;
  }, z.number()),
  pumpCyclePeriod: z.preprocess((val: string) => {
    if (typeof val === 'string') {
      return Number.parseFloat(val);
    }
    return val;
  }, z.number()),
  pumpPeriod: z.preprocess((val: string) => {
    if (typeof val === 'string') {
      return Number.parseFloat(val);
    }
    return val;
  }, z.number()),
  deltaStart: z.string(),
  deltaEnd: z.string(),
});

/* ========================================================================== */

const Configurations: React.FC<{
  get: GetData<tep.ThermostatConfig>;
  refresh: () => void;
  setProcessing: (proc: boolean) => void;
}> = ({ get, refresh, setProcessing }) => {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema) as any,
    defaultValues: {
      offsetPeriod: '' as any,
      pumpCyclePeriod: '' as any,
      pumpPeriod: '' as any,
      deltaStart: '' as any,
      deltaEnd: '' as any,
    },
  });

  useEffect(() => {
    if (get.data) {
      form.resetField('offsetPeriod', { defaultValue: get.data.offsetPeriod });
      form.resetField('pumpCyclePeriod', { defaultValue: get.data.pumpCyclePeriod });
      form.resetField('pumpPeriod', { defaultValue: get.data.pumpPeriod });
      form.resetField('deltaStart', { defaultValue: (get.data.deltaStart || '').toString() });
      form.resetField('deltaEnd', { defaultValue: (get.data.deltaEnd || '').toString() });
    }
  }, [get]);


  const handleUpdate = async (data: z.infer<typeof FormSchema>) => {
    const timeout = setTimeout(() => setProcessing(true), 300);
    const result = await doModify('PUT', tep.PATH_THERMOSTAT_CONFIG, {
      ...data,
      deltaStart: parseFloat(data.deltaStart),
      deltaEnd: parseFloat(data.deltaEnd),
    });
    clearTimeout(timeout);
    setProcessing(false);

    if (result === 'ok') {
      toast((
        <AlertUpdateSuccess>
          <p>Successfully updated the thermostat configurations.</p>
        </AlertUpdateSuccess>
      ));
      refresh();
      form.reset();
    } else {
      toast((<AlertUpdateFailed />));
    }
  };

  return (
    <>
      <div>
        <Card>
          <CardContent className="space-y-4 mt-4">
            <Form {...form as any}>
              <form onSubmit={form.handleSubmit(handleUpdate)} className="w-full space-y-1">
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                      <FormField
                        control={form.control as any}
                        name="deltaStart"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Temperature Delta Start</FormLabel>
                            <FormControl>
                              <Select value={field.value} onValueChange={field.onChange} disabled={field.disabled}>
                                <SelectTrigger onBlur={field.onBlur} ref={field.ref}>
                                  <SelectValue placeholder="select a delta" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0.2">0.2°C</SelectItem>
                                  <SelectItem value="0.3">0.3°C</SelectItem>
                                  <SelectItem value="0.5">0.5°C</SelectItem>
                                  <SelectItem value="0.7">0.7°C</SelectItem>
                                  <SelectItem value="0.8">0.8°C</SelectItem>
                                  <SelectItem value="0.9">0.9°C</SelectItem>
                                  <SelectItem value="1">1°C</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage className="text-xs">&nbsp;</FormMessage>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control as any}
                        name="deltaEnd"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Temperature Delta End</FormLabel>
                            <FormControl>
                              <Select value={field.value} onValueChange={field.onChange} disabled={field.disabled}>
                                <SelectTrigger onBlur={field.onBlur} ref={field.ref}>
                                  <SelectValue placeholder="select a delta" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0.2">0.2°C</SelectItem>
                                  <SelectItem value="0.3">0.3°C</SelectItem>
                                  <SelectItem value="0.5">0.5°C</SelectItem>
                                  <SelectItem value="0.7">0.7°C</SelectItem>
                                  <SelectItem value="0.8">0.8°C</SelectItem>
                                  <SelectItem value="0.9">0.9°C</SelectItem>
                                  <SelectItem value="1">1°C</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage className="text-xs">&nbsp;</FormMessage>
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
                <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                  <FormField
                    control={form.control as any}
                    name="pumpCyclePeriod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pump Cycle Period</FormLabel>
                        <FormControl>
                          <TimeoutSelect minValue={60 * 60 * 12} options={[
                            { value: 60 * 60 * 24, label: 'a day' },
                            { value: 60 * 60 * 24 * 2, label: '2 days' },
                            { value: 60 * 60 * 24 * 3, label: '3 days' },
                            { value: 60 * 60 * 24 * 4, label: '4 days' },
                            { value: 60 * 60 * 24 * 5, label: '5 days' },
                            { value: 60 * 60 * 24 * 7, label: '7 days' },
                          ]} variant="hours" {...field} />
                        </FormControl>
                        <FormMessage className="text-xs">&nbsp;</FormMessage>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control as any}
                    name="pumpPeriod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pump Unstale Period</FormLabel>
                        <FormControl>
                          <TimeoutSelect minValue={30} options={[
                            { value: 60, label: 'a minute' },
                            { value: 3 * 60, label: '3 minutes' },
                            { value: 7 * 60, label: '7 minutes' },
                            { value: 10 * 60, label: '10 minutes' },
                            { value: 30 * 60, label: '30 minutes' },
                            { value: 60 * 60, label: 'an hour' },
                          ]} variant="seconds" {...field} />
                        </FormControl>
                        <FormMessage className="text-xs">&nbsp;</FormMessage>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control as any}
                    name="offsetPeriod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pump Offset Period</FormLabel>
                        <FormControl>
                          <TimeoutSelect minValue={3} options={[
                            { value: 5, label: '5 seconds' },
                            { value: 10, label: '10 seconds' },
                            { value: 30, label: '30 seconds' },
                            { value: 60, label: 'a minute' },
                          ]} variant="seconds" {...field} />
                        </FormControl>
                        <FormMessage className="text-xs">&nbsp;</FormMessage>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex space-x-3">
                  <Button type="submit" disabled={!form.formState.isDirty}>
                    Update
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default Configurations;