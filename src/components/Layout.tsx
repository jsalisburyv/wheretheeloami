import { useState } from 'react';
import { Topbar } from './Topbar';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Topbar */}
      <Topbar onMenuClick={() => setSidebarOpen(true)} />

      {/* Main Layout */}
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Page Content */}
          <main className="flex-1 p-6 overflow-y-auto">{children}</main>
        </div>
      </div>
    </div>
  );
}
