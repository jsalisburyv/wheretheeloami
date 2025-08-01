import { useState } from 'react';
import { Topbar } from './Topbar';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Topbar */}
      <Topbar />

      <div className="flex">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main content */}
        <div className="flex-1 lg:ml-0">
          {/* Mobile menu button */}
          <div className="lg:hidden p-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              ☰
            </button>
          </div>

          {/* Page content */}
          <main className="p-4 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
