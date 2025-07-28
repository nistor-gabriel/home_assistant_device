import React, { useState, ChangeEvent } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

/* ========================================================================== */

interface MQTTFormData {
  host: string;
  port: number;
  username: string;
  password: string;
  clientId: string;
  useSSL: boolean;
}

/* ========================================================================== */
const MQTTConfig: React.FC = () => {
  const [formData, setFormData] = useState<MQTTFormData>({
    host: '',
    port: 1883,
    username: '',
    password: '',
    clientId: '',
    useSSL: false
  });

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value) || 0 : value
    }));
  };

  const handleConnect = (): void => {
    console.log('Connecting to MQTT:', formData);
    // Add MQTT connection logic here
  };

  const handleTestConnection = (): void => {
    console.log('Testing MQTT connection:', formData);
    // Add test connection logic here
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="host">Broker Host</Label>
              <Input
                id="host"
                name="host"
                type="text"
                value={formData.host}
                onChange={handleInputChange}
                placeholder="mqtt.example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="port">Port</Label>
              <Input
                id="port"
                name="port"
                type="number"
                value={formData.port}
                onChange={handleInputChange}
                placeholder="1883"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="Enter username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mqtt-password">Password</Label>
              <Input
                id="mqtt-password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter password"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="clientId">Client ID</Label>
            <Input
              id="clientId"
              name="clientId"
              type="text"
              value={formData.clientId}
              onChange={handleInputChange}
              placeholder="Auto-generated"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="useSSL" 
              checked={formData.useSSL}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, useSSL: !!checked }))
              }
            />
            <Label htmlFor="useSSL" className="text-sm text-gray-600">
              Use SSL/TLS
            </Label>
          </div>
          <div className="flex space-x-3">
            <Button onClick={handleConnect}>
              Connect
            </Button>
            <Button variant="secondary" onClick={handleTestConnection}>
              Test Connection
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MQTTConfig;