import React from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

/* ========================================================================== */

export interface HeaderProps {
  setSidebarOpen: (open: boolean) => void;
  activeSection: string;
}

/* ========================================================================== */

const Header: React.FC<HeaderProps> = ({ setSidebarOpen, activeSection }) => {
  const getSectionTitle = (section: string): string => {
    switch (section) {
      case 'wifi':
        return 'WiFi Configuration';
      case 'mqtt':
        return 'MQTT Connection';
      default:
        return section.charAt(0).toUpperCase() + section.slice(1);
    }
  };

  return (
    <header className="bg-white border-b h-16 flex items-center px-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setSidebarOpen(true)}
        className="xl:hidden mr-4"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <h2 className="text-lg font-semibold text-gray-900">
        {getSectionTitle(activeSection)}
      </h2>
    </header>
  );
};

export default Header;