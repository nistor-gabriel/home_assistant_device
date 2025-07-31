import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

/* ========================================================================== */

export const AlertUpdateFailed: React.FC = () => {
    return (
        <Alert variant="destructive" className="border-0">
            <AlertTitle>Failed to update</AlertTitle>
            <AlertDescription>Currently there might be network issues, please try again latter!</AlertDescription>
        </Alert>
    );
};

export const AlertUpdateSuccess: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <Alert variant="default" className="border-0 text-green-600">
            <AlertTitle>Succesfully updated</AlertTitle>
            <AlertDescription>{children}</AlertDescription>
        </Alert>
    );
};