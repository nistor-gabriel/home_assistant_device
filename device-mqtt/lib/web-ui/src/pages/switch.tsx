import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { SpinnerBars } from '@/components/ui/shadcn-io/spinner';
import { useGetData, doModify } from '@/lib';
import * as ep from '@/lib/endpoints';
import { AlertUpdateFailed, AlertUpdateSuccess } from '@/components/common';
import { Input } from '@/components/ui/input';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
    AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogAction,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';

/* ========================================================================== */

const FormSchema = z.object({
    name: z.string().min(1, {
        message: 'name needs to be at least 1 character',
    }).max(50, {
        message: 'name needs to be less then 50 characters.',
    }),
    disabled: z.boolean(),
});

/* ========================================================================== */

const SwitchForm: React.FC<{
    sw: ep.SwitchItem;
    setProcessing: (processing: boolean) => void;
    setActiveForm: (form: UseFormReturn) => void;
    refresh: () => void;
}> = ({ sw, setProcessing, setActiveForm, refresh }) => {
    const path = ep.pathSwitchItem(sw);
    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            name: sw.name,
            disabled: sw.disabled,
        },
    });

    useEffect(() => {
        form.resetField('name', {
            defaultValue: sw.name,
        });
        form.resetField('disabled', {
            defaultValue: sw.disabled,
        });
        form.reset();
        setActiveForm(form as any);
    }, [sw]);

    const handleUpdate = async (data: z.infer<typeof FormSchema>) => {
        const timeout = setTimeout(() => setProcessing(true), 300);
        const result = await doModify('PUT', path, data);
        clearTimeout(timeout);
        setProcessing(false);

        if (result === 'ok') {
            toast((
                <AlertUpdateSuccess>
                    <p>Successfuly updated the Switch configuration.</p>
                </AlertUpdateSuccess>
            ));
            refresh();
        } else {
            toast((<AlertUpdateFailed />));
        }
    };

    return (
        <Card>
            <CardContent className="space-y-4 mt-4 mb-4">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleUpdate)} className="w-full space-y-1">

                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    { sw.managedName ? (
                                        <FormLabel className="text-gray-500">Name <i>(read only managed name)</i></FormLabel>
                                    ) : (
                                        <FormLabel>Name</FormLabel>
                                    )}
                                    <FormControl>
                                        <Input placeholder="enter the switch name" {...field} disabled={sw.managedName} />
                                    </FormControl>
                                    <FormMessage className="text-xs">&nbsp;</FormMessage>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
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
                        <div className="flex space-x-3">
                            <Button type="submit" disabled={!form.formState.isDirty}>
                                Update Switch
                            </Button>
                            <Button variant="secondary" onClick={(e) => { e.preventDefault(); form.reset() }} disabled={!form.formState.isDirty}>
                                Reset
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
};

const Switch: React.FC = () => {
    const [rsp, refresh] = useGetData<ep.Switch>(ep.PATH_SWITCH, 'refresh');
    const [selected, setSelected] = useState<string>('');
    const [activeForm, setActiveForm] = useState<UseFormReturn | null>(null);
    const [isProcessing, setProcessing] = useState<boolean>(false);
    const [confirmDiscard, setConfirmDiscard] = useState<string | false>(false);

    useEffect(() => {
        if (rsp.data && !selected) {
            setSelected(rsp.data.items[0].id.toString());
        }
    }, [rsp.data]);

    const handleTabSelect = (tab: string) => {
        if (activeForm && activeForm.formState.isDirty) {
            setConfirmDiscard(tab);
            return;
        }
        setSelected(tab);
    };

    return (
        <>
            <div className="space-y-6">
                <Tabs value={selected} onValueChange={handleTabSelect}>
                    <TabsList>
                        {rsp.data?.items.map((sw) => (
                            <TabsTrigger key={sw.id} value={sw.id.toString()}>{sw.name}</TabsTrigger>
                        ))}
                    </TabsList>
                    {rsp.data?.items.map((sw) => (
                        <TabsContent key={sw.id} value={sw.id.toString()}>
                            <SwitchForm sw={sw} setProcessing={setProcessing} setActiveForm={setActiveForm} refresh={refresh} />
                        </TabsContent>
                    ))}
                </Tabs>
            </div>

            <AlertDialog open={confirmDiscard !== false} onOpenChange={setConfirmDiscard as any}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Discard?</AlertDialogTitle>

                        <AlertDialogDescription>
                            If you change the Switch Tab your changes will be discared, are you sure?
                        </AlertDialogDescription>
                    </AlertDialogHeader>


                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { setSelected(confirmDiscard as any); setConfirmDiscard(false) }} className="bg-red-600 hover:bg-red-700">
                            Discard
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
};

export default Switch;