import { ThemeToggle } from './ThemeToggle';

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center h-16">
        {/* Left side - Logo, Title, and Mobile Menu Button */}
        <div className="flex items-center space-x-3 pl-6">
          {/* Mobile menu button */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <span className="sr-only">Open sidebar</span>
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          <img src="/logo.png" alt="Logo" className="w-8 h-8" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Where the ELO am I?
          </h1>
        </div>

        {/* Right side - Theme toggle only */}
        <div className="flex items-center pr-6">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
