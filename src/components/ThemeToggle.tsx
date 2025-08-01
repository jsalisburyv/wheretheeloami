import { useTheme } from '../hooks/useTheme';

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
      aria-label="Toggle theme"
    >
      {isDark ? (
        <span className="text-yellow-500 text-lg">☀️</span>
      ) : (
        <span className="text-gray-600 text-lg">🌙</span>
      )}
    </button>
  );
}
