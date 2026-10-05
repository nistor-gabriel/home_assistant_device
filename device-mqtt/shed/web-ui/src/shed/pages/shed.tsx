import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { SpinnerBars } from '@/components/ui/shadcn-io/spinner';
import { useGetEffect, doModify } from '@/lib';
import * as sep from '@/shed/lib';
import { AlertUpdateFailed, AlertUpdateSuccess } from '@/components/common';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';

/* ========================================================================== */

const FormSchema = z.object({
    nameBox1: z.string().min(1, {
        message: 'name needs to be at least 1 character',
    }).max(50, {
        message: 'name needs to be less then 50 characters.',
    }),
    box1Disabled: z.boolean(),
    nameBox2: z.string().min(1, {
        message: 'name needs to be at least 1 character',
    }).max(50, {
        message: 'name needs to be less then 50 characters.',
    }),
    box2Disabled: z.boolean(),
    deltaGrams: (z.preprocess((val) => {
        if (typeof val === 'string') {
            return Number.parseFloat(val);
        }
        return val;
    }, z.number().min(1, {
        message: 'Delta Grams needs to be at least 1.',
    })) as any) as z.ZodString,
});

/* ========================================================================== */

const Shed: React.FC = () => {
    const [isProcessing, setProcessing] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            nameBox1: '',
            box1Disabled: false,
            nameBox2: '',
            box2Disabled: false,
            deltaGrams: '',
        },
    });

    const refresh = useGetEffect<sep.Shed>(sep.PATH_SHED, (data) => {
        if (data) {
            form.resetField('nameBox1', {
                defaultValue: data.nameBox1,
            });
            form.resetField('box1Disabled', {
                defaultValue: data.box1Disabled,
            });
            form.resetField('nameBox2', {
                defaultValue: data.nameBox2,
            });
            form.resetField('box2Disabled', {
                defaultValue: data.box2Disabled,
            });
            form.resetField('deltaGrams', {
                defaultValue: data.deltaGrams.toString(),
            });
            setIsLoading(false);
        }
    }, 'refresh');

    const handleUpdate = async (data: z.infer<typeof FormSchema>) => {
        const timeout = setTimeout(() => setProcessing(true), 300);
        const result = await doModify('PUT', sep.PATH_SHED, data);
        clearTimeout(timeout);
        setProcessing(false);

        if (result === 'ok') {
            toast((
                <AlertUpdateSuccess>
                    <p>Successfuly updated the Box configuration.</p>
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
                    <CardContent className="space-y-4 mt-4 mb-4">
                        <Form {...form as any}>
                            <form onSubmit={form.handleSubmit(handleUpdate)} className="w-full space-y-1">

                                <FormField
                                    control={form.control as any}
                                    name="nameBox1"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Name Box1</FormLabel>
                                            <FormControl>
                                                <Input disabled={isLoading} placeholder="enter the box1 name" {...field} />
                                            </FormControl>
                                            <FormMessage className="text-xs">&nbsp;</FormMessage>
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control as any}
                                    name="box1Disabled"
                                    render={({ field }) => (
                                        <FormItem className="h-16">
                                            <div className="space-y-2">
                                                <FormLabel>Box1 Disable Auto Dry</FormLabel>
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

                                <FormField
                                    control={form.control as any}
                                    name="nameBox2"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Name Box2</FormLabel>
                                            <FormControl>
                                                <Input disabled={isLoading} placeholder="enter the box2 name" {...field} />
                                            </FormControl>
                                            <FormMessage className="text-xs">&nbsp;</FormMessage>
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control as any}
                                    name="box2Disabled"
                                    render={({ field }) => (
                                        <FormItem className="h-16">
                                            <div className="space-y-2">
                                                <FormLabel>Box2 Disable Auto Dry</FormLabel>
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

                                <FormField
                                    control={form.control as any}
                                    name="deltaGrams"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Delta Grams</FormLabel>
                                            <FormControl>
                                                <Input disabled={isLoading} step={0.5} type="number" placeholder="enter the delta grams" {...field} />
                                            </FormControl>
                                            <FormMessage className="text-xs">&nbsp;</FormMessage>
                                        </FormItem>
                                    )}
                                />

                                <div className="flex space-x-3">
                                    <Button type="submit" disabled={!form.formState.isDirty}>
                                        Update Shed
                                    </Button>
                                    <Button variant="secondary" onClick={(e) => { e.preventDefault(); form.reset() }} disabled={!form.formState.isDirty}>
                                        Reset
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

export default Shed;