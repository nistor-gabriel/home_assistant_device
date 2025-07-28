import React, { useState, ChangeEvent } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { doDelete } from '@/lib/utils'

/* ========================================================================== */

interface WiFiFormData {
  ssid: string;
  password: string;
  showPassword: boolean;
}

/* ========================================================================== */

const WiFiConfig: React.FC = () => {
  const [formData, setFormData] = useState<WiFiFormData>({
    ssid: '',
    password: '',
    showPassword: false
  });
  const [showResetDialog, setShowResetDialog] = useState<boolean>(false);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleConnect = (): void => {
    console.log('Connecting to WiFi:', formData);
    // Add connection logic here
  };

  const handleReset = (): void => {
    setShowResetDialog(true);
  };

  const confirmReset = async () => {
    setShowResetDialog(false);
    await doDelete('/wlan');
  };

  const cancelReset = (): void => {
    setShowResetDialog(false);
  };

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardContent className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="ssid">Network Name (SSID)</Label>
              <Input
                id="ssid"
                name="ssid"
                type="text"
                value={formData.ssid}
                onChange={handleInputChange}
                placeholder="Enter WiFi network name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type={formData.showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter WiFi password"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="showPassword"
                checked={formData.showPassword}
                onCheckedChange={(checked) =>
                  setFormData(prev => ({ ...prev, showPassword: !!checked }))
                }
              />
              <Label htmlFor="showPassword" className="text-sm text-gray-600">
                Show password
              </Label>
            </div>
            <div className="flex space-x-3">
              <Button onClick={handleConnect}>
                Connect to Network
              </Button>
              <Button variant="secondary" onClick={handleReset}>
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset WiFi Configuration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reset the WiFi settings?
              This will make the device have its own WiFi!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelReset}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReset} className="bg-red-600 hover:bg-red-700">
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default WiFiConfig;