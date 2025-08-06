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
import { useGetEffect, doDelete, doModify, doPing, sleep, ep } from '@/lib/utils';
import { AlertUpdateFailed, AlertUpdateSuccess } from '@/components/common';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';

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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showDialog, setShowDialog] = useState<'confirm-reset' | 'confirm-reboot' | 'failed-reset' | 'done-reset' | false>(false);

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
      setIsLoading(false);
    }
  }, 'refresh');

  const handleUpdate = async (data: z.infer<typeof FormSchema>) => {
    const timeout = setTimeout(() => setProcessing(true), 300);
    if (data.password === '') {
      delete data.password;
    }
    const result = await doModify('PUT', ep.PATH_API, data);
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

  const cancel = (): void => {
    setShowDialog(false);
  };

  const waitForDisconnect = async (doneName: typeof showDialog, failedName: typeof showDialog) => {
    let k = 0;
    do {
      await sleep(1000);
      if ((await doPing(ep.PATH_API)) === 'failed') {
        setProcessing(false);
        setShowDialog(doneName);
        return;
      }
      k++;
    } while (k < 5);

    setProcessing(false);
    setShowDialog(failedName);
  }

  const confirmReset = async () => {
    setShowDialog(false);
    setProcessing(true);
    const result = await doModify('POST', ep.PATH_API, { reset: true });
    if (result === 'ok') {
      await waitForDisconnect('done-reset', 'failed-reset');
      form.reset();
    } else {
      setProcessing(false);
      toast((
        <AlertUpdateFailed />
      ));
    }
  };

  const confirmReboot = async () => {
    setShowDialog(false);
    setProcessing(true);
    const result = await doDelete(ep.PATH_API);
    if (result === 'ok') {
      setProcessing(false);
      toast((
        <AlertUpdateSuccess title="Success">
          <p>Successfuly rebooted the device.</p>
        </AlertUpdateSuccess>
      ));
    } else {
      setProcessing(false);
      toast((
        <AlertUpdateFailed title="Failed to Reboot"/>
      ));
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
                        <Input disabled={isLoading} placeholder="enter the device name" {...field} />
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
                        <Input disabled={isLoading} type={showPassword ? 'text' : 'password'} placeholder="change device password" {...field} />
                      </FormControl>
                      <FormMessage className="text-xs">&nbsp;</FormMessage>
                    </FormItem>
                  )}
                />

                <div className="flex items-center space-x-2 pb-8">
                  <Checkbox
                    id="showPassword"
                    disabled={isLoading}
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
                  <div className="w-full"></div>
                  <Button disabled={isLoading} type="submit" variant="secondary" onClick={(event) => {
                    event.preventDefault();
                    setShowDialog('confirm-reboot');
                  }}>
                    Reboot
                  </Button>
                  <Button disabled={isLoading} type="submit" variant="secondary" onClick={(event) => {
                    event.preventDefault();
                    setShowDialog('confirm-reset');
                  }}>
                    Factory Reset
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showDialog !== false} onOpenChange={setShowDialog as any}>
        <AlertDialogContent>
          <AlertDialogHeader>
            {showDialog === 'confirm-reset' ? (
              <AlertDialogTitle>Reset Device!</AlertDialogTitle>
            ) : showDialog === 'confirm-reboot' ? (
              <AlertDialogTitle>Reboot Device!</AlertDialogTitle>
            ) : showDialog === 'failed-reset' ? (
              <AlertDialogTitle>Failed!</AlertDialogTitle>
            ) : showDialog === 'done-reset' ? (
              <AlertDialogTitle>Success</AlertDialogTitle>
            ) : null}

            {showDialog === 'confirm-reboot' ? (
              <AlertDialogDescription>
                Are you sure you want to reboot the device?
              </AlertDialogDescription>
            ) : showDialog === 'confirm-reset' ? (
              <AlertDialogDescription>
                Are you sure you want to reset the device?
                This will put the device in the initial state.
              </AlertDialogDescription>
            ) : showDialog === 'failed-reset' ? (
              <AlertDialogDescription>
                Failed to factory reset, the device is still available.
                Please try again latter!
              </AlertDialogDescription>
            ) : showDialog === 'done-reset' ? (
              <AlertDialogDescription>
                Successfully reseted, the device is no longer available.
                To access the device you will need to connect to its WiFi network.
                The WiFi name is the device name and the password will be the default one.
                The IP is <b>192.168.4.1</b>
              </AlertDialogDescription>
            ) : null}
          </AlertDialogHeader>

          {showDialog === 'confirm-reset' || showDialog === 'confirm-reboot' ? (
            <AlertDialogFooter>
              <AlertDialogCancel onClick={cancel}>Cancel</AlertDialogCancel>
              {showDialog === 'confirm-reset' ? (
                <AlertDialogAction onClick={confirmReset} className="bg-red-600 hover:bg-red-700">
                  Reset
                </AlertDialogAction>
              ) : (
                <AlertDialogAction onClick={confirmReboot} className="bg-red-600 hover:bg-red-700">
                  Reboot
                </AlertDialogAction>
              )}
            </AlertDialogFooter>
          ) : showDialog === 'failed-reset' || showDialog === 'done-reset' ? (
            <AlertDialogFooter>
              <AlertDialogAction onClick={cancel} className="bg-red-600 hover:bg-red-700">
                Ok
              </AlertDialogAction>
            </AlertDialogFooter>
          ) : null}
        </AlertDialogContent>
      </AlertDialog>

      {isProcessing ? (
        <div className="fixed flex justify-center items-center inset-0 z-50 bg-black/30">
          <SpinnerBars className="text-blue-500" size={64} />
        </div>
      ) : null}
    </>
  );
};

export default Settings;