import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableRow, TableHeader, TableHead } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { SpinnerBars } from '@/components/ui/shadcn-io/spinner';
import { SlashIcon, Wrench, Folder, File, ArrowUpSquare, FileCog, FileJson, FileCode, FileArchive, Download, Trash, PlusCircle } from 'lucide-react';
import { useGetEffect, doDelete, ep, cn, doModify } from '@/lib/utils';
import { AlertUpdateFailed, AlertUpdateSuccess } from '@/components/common';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
    AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogAction,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';


/* ========================================================================== */

const FormSchema = z.object({
    path: z.string().min(1, {
        message: 'path needs to be at least one character.',
    }).max(128, {
        message: 'path needs to be less then 128 characters.',
    }),
    content: z.file({
        message: 'please select a file',
    }),
});

/* ========================================================================== */

const Fs: React.FC = () => {
    const [pathSel, setPathSel] = useState<string>('/');
    const [open, setOpen] = useState<string>('');
    const [isProcessing, setProcessing] = useState<boolean>(false);
    const [showAddDialog, setShowAddDialog] = useState<boolean>(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | false>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [items, setItems] = useState<ep.Fs['items']>([]);

    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            path: pathSel,
        },
    });

    const refresh = useGetEffect<ep.Fs>(ep.PATH_FS + pathSel, (data) => {
        if(data) {
            const items = data.items.sort((e1, e2) => e1.name.localeCompare(e2.name));
            items?.sort((e1, e2) => {
                if (e1.isDir && e2.isDir) {
                    return 0;
                }
                if (e1.isDir) {
                    return -1;
                }
                return 1;
            });
            setItems(items);
            setIsLoading(false);
        }
    }, 'refresh');

    const handleSel = (path: string) => {
        setItems([]);
        setPathSel(path);
        form.resetField('path', {
            defaultValue: path,
        });
    };

    const pathItems = pathSel.split('/').slice(1);
    let pathParent: string | null = null;
    if (pathSel !== '/') {
        pathParent = '/' + pathItems.slice(0, -1).join('/');
    }

    const breadcrumbs: Array<{ path: string; name: string; }> = [];
    for (let k = 0; k < pathItems.length - 1; k++) {
        breadcrumbs.push({ name: pathItems[k], path: '/' + pathItems.slice(0, -1).join('/') });
    }

    const iconFromFile = (entry: ep.Fs['items'][0]) => {
        const props = { className: 'text-gray-500' };
        if (entry.name.endsWith('.mpy')) {
            return (<FileCog {...props} />);
        }
        if (entry.name.endsWith('.py')) {
            return (<FileCode {...props} />);
        }
        if (entry.name.endsWith('.json')) {
            return (<FileJson {...props} />);
        }
        if (entry.name.endsWith('.gz')) {
            return (<FileArchive {...props} />);
        }
        return (<File {...props} />);
    };

    const handleDelete = async () => {
        if(!deleteConfirm) {
            return;
        }
        setDeleteConfirm(false);
        setProcessing(true);
        setOpen('');
        const result = await doDelete(ep.PATH_FS + deleteConfirm);
        if (result === 'ok') {
            setProcessing(false);
            refresh();
            toast((
                <AlertUpdateSuccess>
                    <p>Removed <b>{deleteConfirm}</b>!</p>
                </AlertUpdateSuccess>
            ));
        } else {
            setProcessing(false);
            toast((
                <AlertUpdateFailed />
            ));
        }
    };

    const handleAddOpen = () => {
        form.resetField('path', {
            defaultValue: pathSel,
        });
        form.reset();
        setShowAddDialog(true);
    };

    const handleAdd = async (data: z.infer<typeof FormSchema>) => {
        setShowAddDialog(false);
        setProcessing(true);
        const reader = new FileReader();
        reader.readAsArrayBuffer(data.content);
        reader.onload = async (evt) => {
            if (evt.target) {
                const result = await doModify('POST', ep.PATH_FS + data.path, evt.target.result, {
                    headers: { 'Content-Type': 'application/octet-stream' },
                });
                setProcessing(false);
                if (result === 'ok') {
                    refresh();
                    toast((
                        <AlertUpdateSuccess>
                            <p>Added <b>{data.path}</b>!</p>
                        </AlertUpdateSuccess>
                    ));
                } else {
                    toast((
                        <AlertUpdateFailed />
                    ));
                }
            } else {
                setProcessing(false);
                toast((
                    <AlertUpdateFailed />
                ));
            }
        };

    };

    const handleAddChangeFile = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files && event.target.files[0];
        if (file) {
            form.setValue('content', file);
            form.setValue('path', pathSel + (pathSel === '/' ? '' : '/') + file.name);
        }
    };

    return (
        <>
            <header className="fixed w-full top-12 z-10">
                <Breadcrumb className="bg-blue-100 p-1">
                    <BreadcrumbList className="h-5">
                        {pathSel === '/' ? (
                            <BreadcrumbSeparator>
                                <SlashIcon />
                            </BreadcrumbSeparator>
                        ) : (
                            <BreadcrumbLink href="" onClick={(e) => {
                                e.preventDefault();
                                handleSel('/');
                            }}>
                                <BreadcrumbSeparator>
                                    <SlashIcon />
                                </BreadcrumbSeparator>
                            </BreadcrumbLink>
                        )}
                        {breadcrumbs.map((item, key) => (
                            <React.Fragment key={key}>
                                <BreadcrumbItem>
                                    <BreadcrumbLink href="" onClick={(e) => {
                                        e.preventDefault();
                                        handleSel(item.path);
                                    }}>
                                        {item.name}
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator>
                                    <SlashIcon />
                                </BreadcrumbSeparator>
                            </React.Fragment>
                        ))}
                        {pathItems.length > 0 ? (
                            <BreadcrumbItem>
                                <BreadcrumbPage>{pathItems[pathItems.length - 1]}</BreadcrumbPage>
                            </BreadcrumbItem>
                        ) : null}
                    </BreadcrumbList>
                </Breadcrumb>
            </header>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[10px] text-left"></TableHead>
                        <TableHead className="h-0"></TableHead>
                        <TableHead className="h-0 w-3"></TableHead>
                        <TableHead className="h-0 text-right w-3 p-1">
                            <Button variant="outline" className="bg-blue-100" disabled={isLoading} onClick={handleAddOpen}><PlusCircle /></Button>
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {pathParent ? (
                        <TableRow className="h-3">
                            <TableCell className="p-1"><ArrowUpSquare /></TableCell>
                            <TableCell className="p-1 font-bold">
                                <Button onClick={() => handleSel(pathParent)} variant="link">[..]</Button>
                            </TableCell>
                            <TableCell className="p-1"></TableCell>
                            <TableCell className="text-right p-1"></TableCell>
                        </TableRow>
                    ) : null}
                    {items?.map((entry) => (
                        <TableRow key={entry.path} className="h-3">
                            <TableCell className="p-1">
                                {entry.isDir ? <Folder className="text-black-900" /> : iconFromFile(entry)}
                            </TableCell>
                            <TableCell className={cn('p-1', entry.isDir && 'font-bold')}>
                                <Button onClick={() => handleSel(entry.path)} variant="link" disabled={!entry.isDir}>{entry.name}</Button>
                            </TableCell>
                            <TableCell className="text-xs p-1 text-gray-500">{entry.hash}</TableCell>
                            <TableCell className="text-right p-1">
                                <Popover open={open === entry.path} onOpenChange={(open) => open ? setOpen(entry.path) : setOpen('')}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline"><Wrench /></Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="p-0 m-0 w-40">
                                        <Command className="p-3 rounded-lg border shadow-md">
                                            <CommandList>
                                                {!entry.isDir ? (
                                                    <>
                                                        <CommandItem className="p-3" onSelect={() => setOpen('')}>
                                                            <Download />
                                                            <a href={ep.PATH_FS + '/' + entry.path} target="_blank" download>Download</a>
                                                        </CommandItem>
                                                        <CommandSeparator />
                                                    </>
                                                ) : null}
                                                <CommandItem className="p-3" onSelect={() => setDeleteConfirm(entry.path)}>
                                                    <Trash />
                                                    <span>Delete</span>
                                                </CommandItem>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <AlertDialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Upload new file</AlertDialogTitle>
                        <AlertDialogDescription>
                            Please select the file and pah to upload the file to.
                        </AlertDialogDescription>
                    </AlertDialogHeader>


                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleAdd)} className="w-full space-y-1">

                            <FormField
                                control={form.control}
                                name="path"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Path</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter path" {...field} />
                                        </FormControl>
                                        <FormMessage className="text-xs">&nbsp;</FormMessage>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="content"
                                render={() => (
                                    <FormItem>
                                        <FormControl>
                                            <Input id="file" type="file" onChange={handleAddChangeFile} />
                                        </FormControl>
                                        <FormMessage className="text-xs">&nbsp;</FormMessage>
                                    </FormItem>
                                )}
                            />

                            <AlertDialogFooter>
                                <Button className="bg-blue-600 hover:bg-blue-700" type="submit">
                                    Upload
                                </Button>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>

                            </AlertDialogFooter>
                        </form>
                    </Form>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={deleteConfirm !== false} onOpenChange={setDeleteConfirm as any}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete?</AlertDialogTitle>

                        <AlertDialogDescription>
                            Are you sure you want to delete <b>{deleteConfirm}</b>?
                        </AlertDialogDescription>
                    </AlertDialogHeader>


                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete()} className="bg-red-600 hover:bg-red-700">
                            Delete
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

export default Fs;