import React, { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { doModify, GetData } from '@/lib';
import * as aep from '@/attic/lib';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { AlertUpdateFailed, AlertUpdateSuccess } from '@/components/common';

/* ========================================================================== */

const MIN_DELTA_GRAMS = 1;
const MAX_DELTA_GRAMS = 100;
const MAX_LENGTH_URL = 100;

const FormSchema = z.object({
    humidityAbsoluteExteriorURL: z.string().max(MAX_LENGTH_URL, {
        message:`Exceeded maximum length ${MAX_LENGTH_URL} of the url.`
    }),
    deltaGrams: z.preprocess((val: string) => {
        if (typeof val === 'string') {
            return Number.parseFloat(val);
        }
        return val;
    }, z.number().min(MIN_DELTA_GRAMS, {
        message: `Delta grams needs to be at least ${MIN_DELTA_GRAMS} g/m³.`,
    }).max(MAX_DELTA_GRAMS, {
        message: `Delta grams can be ${MAX_DELTA_GRAMS} g/m³ at maximum.`,
    })),
    disabled: z.boolean(),
});

/* ========================================================================== */

const Configurations: React.FC<{
  get: GetData<aep.AtticConfig>;
  refresh: () => void;
  setProcessing: (proc: boolean) => void;
}> = ({ get, refresh, setProcessing }) => {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema) as any,
    defaultValues: {
      humidityAbsoluteExteriorURL: '' as any,
      deltaGrams: '' as any,
      disabled: '' as any,
    },
  });
 
  useEffect(() => {
    if (get.data) {
      form.resetField('humidityAbsoluteExteriorURL', { defaultValue: get.data.humidityAbsoluteExteriorURL });
      form.resetField('deltaGrams', { defaultValue: get.data.deltaGrams });
      form.resetField('disabled', { defaultValue: get.data.disabled });
    }
  }, [get]);


  const handleUpdate = async (data: z.infer<typeof FormSchema>) => {
    const timeout = setTimeout(() => setProcessing(true), 300);
    const result = await doModify('PUT', aep.PATH_ATTIC_CONFIG, {
      ...data
    });
    clearTimeout(timeout);
    setProcessing(false);

    if (result === 'ok') {
      toast((
        <AlertUpdateSuccess>
          <p>Successfully updated the configurations.</p>
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
                    <FormField
                        control={form.control as any}
                        name="humidityAbsoluteExteriorURL"
                        render={({ field }) => (
                          <FormItem>
                              <FormLabel>URL to get the exterior absolute humidity</FormLabel>
                              <FormControl>
                                  <Input
                                      type="text"
                                      placeholder="enter the URL"
                                      {...field}
                                  />
                              </FormControl>
                              <FormMessage className="text-xs">&nbsp;</FormMessage>
                          </FormItem>
                        )}
                      />
                    <FormField
                        control={form.control as any}
                        name="deltaGrams"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Delta Grams</FormLabel>
                                <FormControl>
                                    <Input step={0.5} type="number" placeholder="enter the delta grams" {...field} />
                                </FormControl>
                                <FormMessage className="text-xs">&nbsp;</FormMessage>
                            </FormItem>
                        )}
                    />
                    <FormField
                          control={form.control as any}
                          name="disabled"
                          render={({ field }) => (
                              <FormItem className="h-16">
                                  <div className="space-y-2">
                                      <FormLabel>Disabled</FormLabel>
                                  </div>
                                  <FormControl>
                                      <Checkbox
                                          checked={field.value}
                                          onCheckedChange={field.onChange}
                                      />
                                  </FormControl>
                              </FormItem>
                          )}
                      />
                  </CardContent>
                </Card>
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