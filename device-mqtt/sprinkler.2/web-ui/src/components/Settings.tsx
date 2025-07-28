import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

/* ========================================================================== */

interface SettingsData {
  autoConnectWifi: boolean;
  autoReconnectMqtt: boolean;
  enableNotifications: boolean;
}

/* ========================================================================== */

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SettingsData>({
    autoConnectWifi: true,
    autoReconnectMqtt: true,
    enableNotifications: false
  });

  const handleSettingChange = (name: keyof SettingsData, checked: boolean): void => {
    setSettings(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-6 mt-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-wifi" className="text-sm font-medium">
              Auto-connect to WiFi
            </Label>
            <Switch
              id="auto-wifi"
              checked={settings.autoConnectWifi}
              onCheckedChange={(checked) => handleSettingChange('autoConnectWifi', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-mqtt" className="text-sm font-medium">
              Auto-reconnect MQTT
            </Label>
            <Switch
              id="auto-mqtt"
              checked={settings.autoReconnectMqtt}
              onCheckedChange={(checked) => handleSettingChange('autoReconnectMqtt', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="notifications" className="text-sm font-medium">
              Enable notifications
            </Label>
            <Switch
              id="notifications"
              checked={settings.enableNotifications}
              onCheckedChange={(checked) => handleSettingChange('enableNotifications', checked)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;