import React from 'react';
import { X, Wifi, Radio, Settings, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

/* ========================================================================== */

export interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  activeSection: string;
  setActiveSection: (section: string) => void;
}

export interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

/* ========================================================================== */

const Sidebar: React.FC<SidebarProps> = ({ 
  sidebarOpen, 
  setSidebarOpen, 
  activeSection, 
  setActiveSection 
}) => {
  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'wifi', label: 'WiFi Configuration', icon: Wifi },
    { id: 'mqtt', label: 'MQTT Connection', icon: Radio },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className={`
      fixed inset-y-0 left-0 z-50 w-64 bg-white border-r shadow-lg transform transition-transform duration-300 ease-in-out
      xl:relative xl:translate-x-0
      ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
    `}>
      <div className="flex items-center justify-between h-16 px-6 border-b">
        <h1 className="text-xl font-bold text-gray-900">IoT Control</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarOpen(false)}
          className="xl:hidden"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
      
      <nav className="mt-6 px-3">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <li key={item.id}>
                <Button
                  variant={activeSection === item.id ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => {
                    setActiveSection(item.id);
                    setSidebarOpen(false);
                  }}
                >
                  <IconComponent className="h-5 w-5 mr-3" />
                  {item.label}
                </Button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;