import { ThemeToggle } from './ThemeToggle';

export function Topbar() {
  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Logo and Title */}
          <div className="flex items-center space-x-3">
            <img src="/logo.png" alt="Logo" className="w-8 h-8" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Where the ELO am I?
            </h1>
          </div>

          {/* Right side - Theme toggle only */}
          <div className="flex items-center">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
