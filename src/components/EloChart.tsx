import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

interface EloData {
  game_date: string;
  basic_elo: number;
  margin_elo: number;
}

export function EloChart() {
  const { user } = useAuth();
  const [eloHistory, setEloHistory] = useState<EloData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedElo, setSelectedElo] = useState<'basic' | 'margin'>('basic');

  const loadEloHistory = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('elo_history')
        .select('game_date, basic_elo, margin_elo')
        .eq('user_id', user.id)
        .order('game_date', { ascending: true })
        .limit(20);

      if (error) {
        console.error('Error loading Elo history:', error);
        return;
      }

      setEloHistory(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      loadEloHistory();
    }
  }, [user, loadEloHistory]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Elo History
        </h3>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (eloHistory.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Elo History
        </h3>
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          <div className="text-4xl mb-2">📈</div>
          <p>No Elo history yet</p>
          <p className="text-sm">
            Play some games to see your Elo progression!
          </p>
        </div>
      </div>
    );
  }

  // Calculate chart dimensions and data
  const chartHeight = 200;
  const chartWidth = 400;
  const padding = 40;

  const eloValues = eloHistory.map((d) =>
    selectedElo === 'basic' ? d.basic_elo : d.margin_elo
  );
  const minElo = Math.min(...eloValues);
  const maxElo = Math.max(...eloValues);
  const eloRange = maxElo - minElo || 1;

  const points = eloHistory.map((data, index) => {
    const x =
      padding + (index / (eloHistory.length - 1)) * (chartWidth - 2 * padding);
    const y =
      chartHeight -
      padding -
      ((data[selectedElo === 'basic' ? 'basic_elo' : 'margin_elo'] - minElo) /
        eloRange) *
        (chartHeight - 2 * padding);
    return {
      x,
      y,
      date: data.game_date,
      elo: data[selectedElo === 'basic' ? 'basic_elo' : 'margin_elo'],
    };
  });

  const pathData = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Elo History
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setSelectedElo('basic')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              selectedElo === 'basic'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Basic
          </button>
          <button
            onClick={() => setSelectedElo('margin')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              selectedElo === 'margin'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Margin
          </button>
        </div>
      </div>

      <div className="relative">
        <svg width={chartWidth} height={chartHeight} className="w-full">
          {/* Grid lines */}
          {[0, 1, 2, 3, 4].map((i) => {
            const y =
              chartHeight - padding - (i / 4) * (chartHeight - 2 * padding);
            return (
              <line
                key={i}
                x1={padding}
                y1={y}
                x2={chartWidth - padding}
                y2={y}
                stroke="currentColor"
                strokeWidth="1"
                className="text-gray-200 dark:text-gray-700"
              />
            );
          })}

          {/* Y-axis labels */}
          {[0, 1, 2, 3, 4].map((i) => {
            const y =
              chartHeight - padding - (i / 4) * (chartHeight - 2 * padding);
            const eloValue = minElo + (i / 4) * eloRange;
            return (
              <text
                key={i}
                x={padding - 10}
                y={y + 4}
                textAnchor="end"
                className="text-xs text-gray-500 dark:text-gray-400"
              >
                {Math.round(eloValue)}
              </text>
            );
          })}

          {/* Chart line */}
          <path
            d={pathData}
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            className="text-blue-600 dark:text-blue-400"
          />

          {/* Data points */}
          {points.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="3"
              fill="currentColor"
              className="text-blue-600 dark:text-blue-400"
            />
          ))}

          {/* X-axis */}
          <line
            x1={padding}
            y1={chartHeight - padding}
            x2={chartWidth - padding}
            y2={chartHeight - padding}
            stroke="currentColor"
            strokeWidth="1"
            className="text-gray-300 dark:text-gray-600"
          />
        </svg>

        {/* Legend */}
        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex justify-between">
            <span>{eloHistory[0]?.game_date}</span>
            <span>{eloHistory[eloHistory.length - 1]?.game_date}</span>
          </div>
        </div>

        {/* Current Elo display */}
        {points.length > 0 && (
          <div className="mt-2 text-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Current {selectedElo === 'basic' ? 'Basic' : 'Margin'} Elo:
            </span>
            <span className="ml-1 font-semibold text-blue-600 dark:text-blue-400">
              {points[points.length - 1].elo}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
