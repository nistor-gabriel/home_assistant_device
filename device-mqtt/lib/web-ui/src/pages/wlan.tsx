import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { useGetData, doModify, doDelete, doPing, sleep } from '@/lib';
import * as ep from '@/lib/endpoints';
import { SpinnerBars } from '@/components/ui/shadcn-io/spinner';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { AlertUpdateFailed } from '@/components/common';

/* ========================================================================== */

const FormSchema = z.object({
  ssid: z.string().min(1, {
    message: 'SSID needs to be at least one character.',
  }).max(32, {
    message: 'SSID needs to be less then 32 characters.',
  }),
  password: z.string().min(8, {
    message: 'password needs to be at least 8 characters.',
  }).max(32, {
    message: 'password needs to be less then 32 characters.',
  }),
});

/* ========================================================================== */

const Wlan: React.FC = () => {
  const rsp = useGetData<ep.Wlan>(ep.PATH_WLAN);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showDialog, setShowDialog] = useState<'confirm-reset' | 'failed-reset' | 'done-reset' | 'failed-connect' | 'done-connect' | false>(false);
  const [isProcessing, setProcessing] = useState<boolean>(false);
  const isLoading = rsp.status === 'loading' || rsp.status === 'failed';

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      ssid: '',
      password: '',
    },
  });

  const waitForDisconnect = async (doneName: typeof showDialog, failedName: typeof showDialog) => {
    let k = 0;
    do {
      await sleep(1000);
      if ((await doPing(ep.PATH_WLAN)) === 'failed') {
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
    const result = await doDelete(ep.PATH_WLAN);
    if (result === 'ok') {
      await waitForDisconnect('done-reset', 'failed-reset');
      form.reset();
    } else {
      setProcessing(false);
      toast((
        <AlertUpdateFailed title="Failed to Reset" />
      ));
    }
  };

  const cancel = (): void => {
    setShowDialog(false);
  };

  const handleConnect = async (data: z.infer<typeof FormSchema>) => {
    setProcessing(true);
    const result = await doModify('PUT', ep.PATH_WLAN, data);
    if (result === 'ok') {
      await waitForDisconnect('done-connect', 'failed-connect');

    } else {
      setProcessing(false);
      toast((
        <AlertUpdateFailed title="Failed to Reset"/>
      ));
    }
  };

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardContent className="space-y-4 mt-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleConnect)} className="w-full space-y-1">

                <FormField
                  control={form.control}
                  name="ssid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Network Name (SSID)</FormLabel>
                      <FormControl>
                        <Input disabled={isLoading} placeholder="enter WiFi network name" {...field} />
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
                        <Input disabled={isLoading} type={showPassword ? 'text' : 'password'} placeholder="enter WiFi password" {...field} />
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
                    Connect to Network
                  </Button>
                  {rsp.data?.ip ? (
                    <Button variant="secondary" onClick={(event) => {
                      event.preventDefault();
                      setShowDialog('confirm-reset');
                    }}>
                      Reset
                    </Button>
                  ) : null}

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
              <AlertDialogTitle>Reset WiFi!</AlertDialogTitle>
            ) : showDialog === 'failed-reset' || showDialog === 'failed-connect' ? (
              <AlertDialogTitle>Failed</AlertDialogTitle>
            ) : showDialog === 'done-reset' || showDialog === 'done-connect' ? (
              <AlertDialogTitle>Success</AlertDialogTitle>
            ) : null}

            {showDialog === 'confirm-reset' ? (
              <AlertDialogDescription>
                Are you sure you want to reset the WiFi settings?
                This will make the device have its own WiFi!
              </AlertDialogDescription>
            ) : showDialog === 'failed-reset' ? (
              <AlertDialogDescription>
                Failed to Reset the WiFi, the device is still available.
                Please try again latter!
              </AlertDialogDescription>
            ) : showDialog === 'done-reset' ? (
              <AlertDialogDescription>
                Successfully reseted, the device is no longer available.
                To access the device you will need to connect to its WiFi network.
                The WiFi name is the device name and the password will be the default one.
                The IP is <b>192.168.4.1</b>
              </AlertDialogDescription>
            ) : showDialog === 'failed-connect' ? (
              <AlertDialogDescription>
                Failed to connect, the device is still available in the current network.
                Please check the credentials and try again latter!
              </AlertDialogDescription>
            ) : showDialog === 'done-connect' ? (
              <AlertDialogDescription>
                Successfully connected, the device is no longer available.
                To access the device you will need to connect to the provided WiFi network.
                To located the device search in the DNS the device will be listed under the device name.
              </AlertDialogDescription>
            ) : null}
          </AlertDialogHeader>

          {showDialog === 'confirm-reset' ? (
            <AlertDialogFooter>
              <AlertDialogCancel onClick={cancel}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmReset} className="bg-red-600 hover:bg-red-700">
                Reset
              </AlertDialogAction>
            </AlertDialogFooter>
          ) : showDialog === 'failed-reset' || showDialog === 'done-reset' || showDialog === 'failed-connect' || showDialog === 'done-connect' ? (
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

export default Wlan;