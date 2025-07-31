import React, { useState } from 'react';
import Sidebar from '@/components/sidebar';
import Header from '@/components/header';
import { menuItems } from './setup';

/* ========================================================================== */

export interface Entry {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  node: React.ReactNode;
}

/* ========================================================================== */

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<string>('dashboard');

  const renderContent = (): React.ReactNode => {
    const selected = menuItems.find((menu) => menu.id === activeSection);
    if(!selected) {
      return null;
    }
    return selected.node;
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        menuItems={menuItems}
      />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 xl:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col xl:ml-0">
        <Header 
          setSidebarOpen={setSidebarOpen}
          activeSection={activeSection}
          menuItems={menuItems}
        />
        
        <main className="flex-1 overflow-auto p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App