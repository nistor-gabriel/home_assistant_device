import React from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

/* ========================================================================== */

export interface MenuItem {
  id: string;
  label: string;
}

export interface HeaderProps {
  setSidebarOpen: (open: boolean) => void;
  activeSection: string;
  menuItems: MenuItem[];
}

/* ========================================================================== */

const Header: React.FC<HeaderProps> = ({ setSidebarOpen, activeSection, menuItems }) => {
  const getSectionTitle = (section: string): string => {
    const selected = menuItems.find((menu) => menu.id === section);
    if(!selected) {
      return section.charAt(0).toUpperCase() + section.slice(1);
    }
    return selected.label;
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