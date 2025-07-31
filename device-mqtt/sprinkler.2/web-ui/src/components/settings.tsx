import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SpinnerBars } from '@/components/ui/shadcn-io/spinner';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { z } from 'zod';
import { toast } from 'sonner';
import { useGetEffect, doPut, ep } from '@/lib/utils';
import { AlertUpdateFailed, AlertUpdateSuccess } from '@/components/common';

/* ========================================================================== */

const FormSchema = z.object({
  name: z.string().min(3, {
    message: 'name needs to be at least 3 characters.',
  }).max(50, {
    message: 'name needs to be less then 50 characters.',
  }),
  password: z.optional(z.string().max(32, {
    message: 'password needs to be less then 32 characters.',
  })),
});

/* ========================================================================== */

const Settings: React.FC = () => {
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isProcessing, setProcessing] = useState<boolean>(false);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: '',
      password: '',
    },
  });
  const refresh = useGetEffect<ep.Api>(ep.PATH_API, (data) => {
    if (data) {
      form.resetField('name', {
        defaultValue: data.name,
      });
      form.resetField('password');
    }
  }, true);

  const handleUpdate = async (data: z.infer<typeof FormSchema>) => {
    const timeout = setTimeout(() => setProcessing(true), 300);
    if (data.password === '') {
      delete data.password;
    }
    const result = await doPut(ep.PATH_API, data);
    clearTimeout(timeout);
    setProcessing(false);
    if (result === 'ok') {
      toast((
        <AlertUpdateSuccess>
          <p>Successfuly updated the device configuration.</p>
        </AlertUpdateSuccess>
      ));
      refresh();
    } else {
      toast((<AlertUpdateFailed />));
    }
  };

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardContent className="space-y-6 mt-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleUpdate)} className="w-full space-y-1">

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter the device name" {...field} />
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
                        <Input type={showPassword ? 'text' : 'password'} placeholder="Change device password" {...field} />
                      </FormControl>
                      <FormMessage className="text-xs">&nbsp;</FormMessage>
                    </FormItem>
                  )}
                />

                <div className="flex items-center space-x-2 pb-8">
                  <Checkbox
                    id="showPassword"
                    checked={showPassword}
                    onCheckedChange={(checked) => setShowPassword(!!checked)}
                  />
                  <Label htmlFor="showPassword" className="text-sm text-gray-600">
                    Show password
                  </Label>
                </div>

                <div className="flex space-x-3">
                  <Button type="submit" disabled={!form.formState.isDirty}>
                    Update Device
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

export default Settings;