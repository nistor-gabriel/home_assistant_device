import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Dashboard from '@/components/Dashboard';
import WiFiConfig from '@/components/WiFiConfig';
import MQTTConfig from '@/components/MQTTConfig';
import Settings from '@/components/Settings';


/* ========================================================================== */

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<string>('dashboard');

  const renderContent = (): React.ReactNode => {
    switch (activeSection) {
      case 'wifi':
        return <WiFiConfig />;
      case 'mqtt':
        return <MQTTConfig />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        activeSection={activeSection}
        setActiveSection={setActiveSection}
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
        />
        
        <main className="flex-1 overflow-auto p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App