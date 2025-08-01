import { useAuth } from '../hooks/useAuth';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, signOut } = useAuth();

  const navItems = [
    { name: 'Dashboard', href: '#', icon: '🏠' },
    { name: 'Submit Score', href: '#', icon: '📊' },
    { name: 'Leaderboard', href: '#', icon: '🏆' },
    { name: 'Stats', href: '#', icon: '📈' },
    { name: 'Settings', href: '#', icon: '⚙️' },
  ];

  // Get display name: display_name from metadata if set, otherwise email prefix
  const getDisplayName = () => {
    const displayName = user?.user_metadata?.display_name;
    if (displayName) {
      return displayName;
    }
    return user?.email?.split('@')[0] || 'User';
  };

  // Get user avatar from metadata
  const getUserAvatar = () => {
    return user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  };

  const handleProfileClick = () => {
    window.location.hash = '#profile';
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 lg:h-full ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar header - Only on mobile */}
          <div className="lg:hidden flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Navigation
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              ✕
            </button>
          </div>

          {/* Navigation - Scrollable middle section */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto min-h-0">
            {navItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="flex items-center px-4 py-3 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                <span className="font-medium">{item.name}</span>
              </a>
            ))}
          </nav>

          {/* User Profile and Sign Out - Fixed at bottom */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-4 flex-shrink-0">
            {/* User Profile - Clickable */}
            <button
              onClick={handleProfileClick}
              className="w-full flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden">
                {getUserAvatar() ? (
                  <img
                    src={getUserAvatar()}
                    alt="User avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-blue-600 flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {getDisplayName().charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {getDisplayName()}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user?.email}
                </p>
              </div>
              <span className="text-gray-400 text-sm">👤</span>
            </button>

            {/* Sign Out Button */}
            <button
              onClick={signOut}
              className="w-full flex items-center px-4 py-3 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              <span className="mr-3 text-lg">🚪</span>
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
