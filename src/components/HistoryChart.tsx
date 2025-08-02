import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

interface HistoryData {
  date: string;
  value: number;
}

interface GameData {
  game_date: string;
  total_score: number;
}

interface EloData {
  game_date: string;
  basic_elo: number;
}

interface HistoryChartProps {
  type: 'score' | 'elo';
  title: string;
  color: string;
  colorClass: string;
  getValueColor: (value: number) => string;
  formatValue: (value: number) => string;
}

export function HistoryChart({
  type,
  title,
  color,
  colorClass,
  getValueColor,
  formatValue,
}: HistoryChartProps) {
  const { user } = useAuth();
  const [historyData, setHistoryData] = useState<HistoryData[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistoryData = useCallback(async () => {
    if (!user?.id) return;

    try {
      let data: GameData[] | EloData[] | null = null;
      let error = null;

      if (type === 'score') {
        const result = await supabase
          .from('games')
          .select('game_date, total_score')
          .eq('user_id', user.id)
          .order('game_date', { ascending: true })
          .limit(20);
        data = result.data as GameData[];
        error = result.error;
      } else {
        const result = await supabase
          .from('elo_history')
          .select('game_date, basic_elo')
          .eq('user_id', user.id)
          .order('game_date', { ascending: true })
          .limit(20);
        data = result.data as EloData[];
        error = result.error;
      }

      if (error) {
        console.error(`Error loading ${type} history:`, error);
        return;
      }

      const formattedData =
        data?.map((item) => ({
          date: item.game_date,
          value:
            type === 'score'
              ? (item as GameData).total_score
              : (item as EloData).basic_elo,
        })) || [];

      setHistoryData(formattedData);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, type]);

  useEffect(() => {
    if (user) {
      loadHistoryData();
    }
  }, [user, loadHistoryData]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {title}
        </h3>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (historyData.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {title}
        </h3>
        <div className="text-center text-gray-500 dark:text-gray-400 py-16">
          <div className="text-4xl mb-2">📊</div>
          <p>No {type === 'score' ? 'games' : 'Elo history'} available yet</p>
          <p className="text-sm">
            Submit your first score to see your history!
          </p>
        </div>
      </div>
    );
  }

  // Calculate chart dimensions and scales
  const chartWidth = 600;
  const chartHeight = 200;
  const padding = 40;
  const innerWidth = chartWidth - 2 * padding;
  const innerHeight = chartHeight - 2 * padding;

  const values = historyData
    .map((d) => d.value)
    .filter((v) => !isNaN(v) && isFinite(v));
  const minValue = values.length > 0 ? Math.min(...values) : 0;
  const maxValue =
    values.length > 0 ? Math.max(...values) : type === 'score' ? 5000 : 1000;
  const valueRange = maxValue - minValue || (type === 'score' ? 5000 : 200); // fallback

  // Create SVG path for the line chart
  const createPath = () => {
    if (historyData.length < 2) return '';

    const points = historyData
      .map((data, index) => {
        const x = padding + (index / (historyData.length - 1)) * innerWidth;
        const normalizedValue = (data.value - minValue) / valueRange;
        const y = padding + innerHeight - normalizedValue * innerHeight;

        // Validate coordinates to prevent NaN
        if (isNaN(x) || isNaN(y) || !isFinite(x) || !isFinite(y)) {
          return null;
        }

        return `${x},${y}`;
      })
      .filter((point) => point !== null);

    return points.length > 0 ? `M ${points.join(' L ')}` : '';
  };

  // Create grid lines
  const gridLines = [];
  const gridCount = 5;
  for (let i = 0; i <= gridCount; i++) {
    const y = padding + (i / gridCount) * innerHeight;
    const value = maxValue - (i / gridCount) * valueRange;
    gridLines.push({ y, value: Math.round(value) });
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {title}
      </h3>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : historyData.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <div className="text-4xl mb-2">📊</div>
            <p>No {type} data available</p>
            <p className="text-sm">Submit some scores to see your history</p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <svg width={chartWidth} height={chartHeight} className="mx-auto">
            {/* Grid lines */}
            {gridLines.map((line, index) => (
              <g key={index}>
                <line
                  x1={padding}
                  y1={line.y}
                  x2={chartWidth - padding}
                  y2={line.y}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                  className="dark:stroke-gray-600"
                />
                <text
                  x={padding - 10}
                  y={line.y + 4}
                  textAnchor="end"
                  className="text-xs fill-gray-500 dark:fill-gray-400"
                >
                  {formatValue(line.value)}
                </text>
              </g>
            ))}

            {/* Line chart */}
            <path
              d={createPath()}
              stroke={color}
              strokeWidth="3"
              fill="none"
              className={colorClass}
            />

            {/* Data points */}
            {historyData.map((data, index) => {
              const x =
                padding + (index / (historyData.length - 1)) * innerWidth;
              const normalizedValue = (data.value - minValue) / valueRange;
              const y = padding + innerHeight - normalizedValue * innerHeight;

              // Validate coordinates to prevent NaN
              if (isNaN(x) || isNaN(y) || !isFinite(x) || !isFinite(y)) {
                return null;
              }

              return (
                <g key={`${data.date}-${index}`}>
                  <circle
                    cx={x}
                    cy={y}
                    r="4"
                    fill={getValueColor(data.value)}
                    className="hover:r-6 transition-all duration-200"
                  />
                  <title>
                    {formatDate(data.date)}: {formatValue(data.value)}
                  </title>
                </g>
              );
            })}

            {/* X-axis labels */}
            {historyData.length <= 10 &&
              historyData.map((data, index) => {
                const x =
                  padding + (index / (historyData.length - 1)) * innerWidth;

                // Validate coordinates to prevent NaN
                if (isNaN(x) || !isFinite(x)) {
                  return null;
                }

                return (
                  <text
                    key={`${data.date}-${index}`}
                    x={x}
                    y={chartHeight - 5}
                    textAnchor="middle"
                    className="text-xs fill-gray-500 dark:fill-gray-400"
                  >
                    {formatDate(data.date)}
                  </text>
                );
              })}
          </svg>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex justify-center space-x-4 text-xs">
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-gray-600 dark:text-gray-400">
            {type === 'score' ? '14k+' : '1200+'}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span className="text-gray-600 dark:text-gray-400">
            {type === 'score' ? '12k+' : '1100+'}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <span className="text-gray-600 dark:text-gray-400">
            {type === 'score' ? '10k+' : '1000+'}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 rounded-full bg-gray-500"></div>
          <span className="text-gray-600 dark:text-gray-400">
            {type === 'score' ? '<10k' : '<1000'}
          </span>
        </div>
      </div>

      {historyData.length >= 20 && (
        <div className="mt-2 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Showing last 20 {type === 'score' ? 'games' : 'Elo updates'}
          </p>
        </div>
      )}
    </div>
  );
}
