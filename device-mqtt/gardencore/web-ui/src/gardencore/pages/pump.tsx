import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useGetEffect, doModify } from '@/lib';
import * as gep from '@/gardencore/lib';
import { SpinnerBars } from '@/components/ui/shadcn-io/spinner';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { AlertUpdateFailed, AlertUpdateSuccess } from '@/components/common';

/* ========================================================================== */

const FormSchema = z.object({
  offHighPressure: (z.preprocess((val) => {
    if (typeof val === 'string') {
      return Number.parseFloat(val);
    }
    return val;
  }, z.number().min(0, {
    message: 'High Pressure needs to be at least 0.',
  }).max(10, {
    message: 'High Pressure can be 10 at maximum.',
  })) as any) as z.ZodString,
  offLowPressure: (z.preprocess((val) => {
    if (typeof val === 'string') {
      return Number.parseFloat(val);
    }
    return val;
  }, z.number().min(0, {
    message: 'Low Pressure needs to be at least 0.',
  }).max(10, {
    message: 'Low Pressure can be 10 at maximum.',
  })) as any) as z.ZodString,
  offHighPeriod: (z.preprocess((val) => {
    if (typeof val === 'string') {
      return Number.parseFloat(val);
    }
    return val;
  }, z.number().min(1, {
    message: 'High Period needs to be at least 1.',
  }).max(60, {
    message: 'High Period can be 60 at maximum.',
  })) as any) as z.ZodString,
  offLowPeriod: (z.preprocess((val) => {
    if (typeof val === 'string') {
      return Number.parseFloat(val);
    }
    return val;
  }, z.number().min(1, {
    message: 'Low Period needs to be at least 1.',
  }).max(60, {
    message: 'Low Period can be 60 at maximum.',
  })) as any) as z.ZodString,
  offLowStartPeriod: (z.preprocess((val) => {
    if (typeof val === 'string') {
      return Number.parseFloat(val);
    }
    return val;
  }, z.number().min(1, {
    message: 'Low Start Period needs to be at least 1.',
  }).max(60, {
    message: 'Low Start Period can be 60 at maximum.',
  })) as any) as z.ZodString,
  disabledLowWatchdog: z.boolean(),
  disabledHighWatchdog: z.boolean(),
});

/* ========================================================================== */

const Pump: React.FC = () => {
  const [isProcessing, setProcessing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      offHighPressure: '',
      offLowPressure: '',
      offHighPeriod: '',
      offLowPeriod: '',
      offLowStartPeriod: '',
      disabledLowWatchdog: false,
      disabledHighWatchdog: false,
    },
  });

  const refresh = useGetEffect<gep.Pump>(gep.PATH_PUMP, (data) => {
    if (data) {
      form.resetField('offHighPressure', {
        defaultValue: data.offHighPressure.toString(),
      });
      form.resetField('offLowPressure', {
        defaultValue: data.offLowPressure.toString(),
      });
      form.resetField('offHighPeriod', {
        defaultValue: data.offHighPeriod.toString(),
      });
      form.resetField('offLowPeriod', {
        defaultValue: data.offLowPeriod.toString(),
      });
      form.resetField('offLowStartPeriod', {
        defaultValue: data.offLowStartPeriod.toString(),
      });
      form.resetField('disabledLowWatchdog', {
        defaultValue: data.disabledLowWatchdog,
      });
      form.resetField('disabledHighWatchdog', {
        defaultValue: data.disabledHighWatchdog,
      });
      setIsLoading(false);
    }
  }, 'refresh');

  const handleUpdate = async (data: z.infer<typeof FormSchema>) => {
    const timeout = setTimeout(() => setProcessing(true), 300);
    const result = await doModify('PUT', gep.PATH_PUMP, data);
    clearTimeout(timeout);
    setProcessing(false);

    if (result === 'ok') {
      toast((
        <AlertUpdateSuccess>
          <p>Successfuly updated the Pump configuration.</p>
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
      <div className="space-y-6">
        <Card>
          <CardContent className="space-y-4 mt-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleUpdate)} className="w-full space-y-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                  <div>
                    <FormField
                      control={form.control}
                      name="disabledLowWatchdog"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="ml-2">Disable Low Watchdog</FormLabel>
                          <FormMessage className="text-xs">&nbsp;</FormMessage>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="offLowPressure"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Off Low Pressure (Bar)</FormLabel>
                          <FormControl>
                            <Input disabled={isLoading} step={0.1} type="number" placeholder="enter the pressure" {...field} />
                          </FormControl>
                          <FormMessage className="text-xs">&nbsp;</FormMessage>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="offLowPeriod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Off Low Period (Seconds)</FormLabel>
                          <FormControl>
                            <Input disabled={isLoading} step={1} type="number" placeholder="enter the period" {...field} />
                          </FormControl>
                          <FormMessage className="text-xs">&nbsp;</FormMessage>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="offLowStartPeriod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Off Low Start Period (Seconds)</FormLabel>
                          <FormControl>
                            <Input disabled={isLoading} step={1} type="number" placeholder="enter the start period" {...field} />
                          </FormControl>
                          <FormMessage className="text-xs">&nbsp;</FormMessage>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div>
                    <FormField
                      control={form.control}
                      name="disabledHighWatchdog"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="ml-2">Disable High Watchdog</FormLabel>
                          <FormMessage className="text-xs">&nbsp;</FormMessage>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="offHighPressure"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Off High Pressure (Bar)</FormLabel>
                          <FormControl>
                            <Input disabled={isLoading} step={0.1} type="number" placeholder="enter the pressure" {...field} />
                          </FormControl>
                          <FormMessage className="text-xs">&nbsp;</FormMessage>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="offHighPeriod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Off High Period (Seconds)</FormLabel>
                          <FormControl>
                            <Input disabled={isLoading} step={1} type="number" placeholder="enter the period" {...field} />
                          </FormControl>
                          <FormMessage className="text-xs">&nbsp;</FormMessage>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex space-x-3">
                  <Button type="submit" disabled={!form.formState.isDirty}>
                    Update Pump
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {isProcessing ? (
        <div className="fixed flex justify-center items-center inset-0 z-50 bg-black/30">
          <SpinnerBars className="text-blue-500" size={64} />
        </div>
      ) : null}
    </>
  );
};

export default Pump;