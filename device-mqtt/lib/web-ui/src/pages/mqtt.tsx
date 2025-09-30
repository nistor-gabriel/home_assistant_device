import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { SpinnerBars } from '@/components/ui/shadcn-io/spinner';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import { doModify, useGetEffect } from '@/lib';
import * as ep from '@/lib/endpoints';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { AlertUpdateFailed, AlertUpdateSuccess } from '@/components/common';

/* ========================================================================== */

const FormSchema = z.object({
  server: z.ipv4({
    message: 'please provide a valid ipv4 server host.',
  }),
  port: (z.union([
    z.preprocess((val) => {
      if (typeof val === 'string') {
        return Number.parseInt(val);
      }
      return val;
    }, z.int().min(1, {
      message: 'port needs to be at least 1.',
    }).max(65536, {
      message: "port needs to be less then 65536.",
    })),
    z.string().max(0),
  ]) as any) as z.ZodString,
  user: z.string().min(1, {
    message: 'user needs to be at least 1 character',
  }).max(32, {
    message: 'user needs to be less then 32 characters.',
  }),
  password: z.string().min(8, {
    message: 'password needs to be at least 8 characters',
  }).max(32, {
    message: 'password needs to be less then 32 characters.',
  }),
  ssl: z.boolean(),
  clientId: z.string().max(23, {
    message: 'clientId needs to be less then 23 characters.',
  }),
});

/* ========================================================================== */

const MQTT: React.FC = () => {
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isProcessing, setProcessing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [clientIdPlaceholder, setClientIdPlaceholder] = useState<string>('');

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      server: '',
      port: '',
      user: '',
      password: '',
      ssl: false,
      clientId: '',
    },
  });

  const refresh = useGetEffect<ep.Mqtt>(ep.PATH_MQTT, (data) => {
    if (data) {
      form.resetField('server', {
        defaultValue: data.server,
      });
      form.resetField('port', {
        defaultValue: data.port === 0 ? '' : data.port.toFixed(0),
      });
      form.resetField('ssl', {
        defaultValue: data.ssl,
      });
      form.resetField('clientId', {
        defaultValue: data.clientId,
      });
      setClientIdPlaceholder('auto-generated<' + data.defaultClientId + '>');
      setIsLoading(false);
    }
  }, 'refresh');

  const handleUpdate = async (data: z.infer<typeof FormSchema>) => {
    const timeout = setTimeout(() => setProcessing(true), 300);
    if (data.port === '') {
      data.port = 0 as any;
    }
    const result = await doModify('PUT', ep.PATH_MQTT, data);
    clearTimeout(timeout);
    setProcessing(false);


    if (result === 'ok') {
      toast((
        <AlertUpdateSuccess>
          <p>Successfuly updated the MQTT configuration.</p>
        </AlertUpdateSuccess>
      ));
      refresh();
      form.reset();
      setShowPassword(false);
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
                  <FormField
                    control={form.control}
                    name="server"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Broker Host</FormLabel>
                        <FormControl>
                          <Input disabled={isLoading} placeholder="mqtt.example.com" {...field} />
                        </FormControl>
                        <FormMessage className="text-xs">&nbsp;</FormMessage>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="port"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Port</FormLabel>
                        <FormControl>
                          <Input disabled={isLoading} type="number" placeholder="using default port" {...field} />
                        </FormControl>
                        <FormMessage className="text-xs">&nbsp;</FormMessage>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="user"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input disabled={isLoading} placeholder="enter username" {...field} />
                        </FormControl>
                        <FormMessage className="text-xs">&nbsp;</FormMessage>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client ID</FormLabel>
                        <FormControl>
                          <Input disabled={isLoading} placeholder={clientIdPlaceholder} {...field} />
                        </FormControl>
                        <FormMessage className="text-xs">&nbsp;</FormMessage>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input disabled={isLoading} type={showPassword ? 'text' : 'password'} placeholder="enter password" {...field} />
                        </FormControl>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="showPassword"
                            disabled={isLoading}
                            checked={showPassword}
                            onCheckedChange={(checked) => setShowPassword(!!checked)}
                          />
                          <Label htmlFor="showPassword" className="text-xs text-gray-600">
                            Show password
                          </Label>
                        </div>
                        <FormMessage className="text-xs">&nbsp;</FormMessage>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ssl"
                    render={({ field }) => (
                      <FormItem>
                        <div className="space-y-2">
                          <FormLabel>Use SSL/TLS</FormLabel>
                        </div>
                        <FormControl>
                          <Checkbox
                            disabled={isLoading}
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex space-x-3">
                  <Button type="submit" disabled={!form.formState.isDirty}>
                    Update Connection
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

export default MQTT;