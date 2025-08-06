import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

/* ========================================================================== */

export const AlertUpdateFailed: React.FC<{
    title?: string;
}> = ({ title }) => {
    return (
        <Alert variant="destructive" className="border-0">
            <AlertTitle>{title || 'Failed to update'}</AlertTitle>
            <AlertDescription>Currently there might be network issues, please try again latter!</AlertDescription>
        </Alert>
    );
};

export const AlertUpdateSuccess: React.FC<{ 
    title?: string;
    children: React.ReactNode;
}> = ({ title, children }) => {
    return (
        <Alert variant="default" className="border-0 text-green-600">
            <AlertTitle>{title || 'Succesfully updated'}</AlertTitle>
            <AlertDescription>{children}</AlertDescription>
        </Alert>
    );
};
