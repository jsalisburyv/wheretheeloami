interface StatsCardProps {
  title: string;
  value: string | number;
  icon: string;
  iconBgColor: string;
  iconColor: string;
  loading?: boolean;
}

export function StatsCard({
  title,
  value,
  icon,
  iconBgColor,
  iconColor,
  loading = false,
}: StatsCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div
            className={`w-8 h-8 ${iconBgColor} rounded-lg flex items-center justify-center`}
          >
            <span className={`${iconColor} text-lg`}>{icon}</span>
          </div>
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {title}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {loading
              ? '...'
              : typeof value === 'number'
                ? value.toLocaleString()
                : value}
          </p>
        </div>
      </div>
    </div>
  );
}
