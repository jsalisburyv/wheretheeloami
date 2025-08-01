import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

interface GameScore {
  game_date: string;
  total_score: number;
}

export function ScoreHistoryChart() {
  const { user } = useAuth();
  const [gameScores, setGameScores] = useState<GameScore[]>([]);
  const [loading, setLoading] = useState(true);

  const loadScoreHistory = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('games')
        .select('game_date, total_score')
        .eq('user_id', user.id)
        .order('game_date', { ascending: true })
        .limit(20); // Show last 20 games for better chart

      if (error) {
        console.error('Error loading score history:', error);
        return;
      }

      setGameScores(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      loadScoreHistory();
    }
  }, [user, loadScoreHistory]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 14000) return '#10b981'; // green-500
    if (score >= 12000) return '#3b82f6'; // blue-500
    if (score >= 10000) return '#f59e0b'; // amber-500
    return '#6b7280'; // gray-500
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Score History
        </h3>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (gameScores.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Score History
        </h3>
        <div className="text-center text-gray-500 dark:text-gray-400 py-16">
          <div className="text-4xl mb-2">📊</div>
          <p>No games played yet</p>
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

  const scores = gameScores.map((g) => g.total_score);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const scoreRange = maxScore - minScore || 5000; // fallback if all scores are the same

  // Create SVG path for the line chart
  const createPath = () => {
    if (gameScores.length < 2) return '';

    const points = gameScores.map((game, index) => {
      const x = padding + (index / (gameScores.length - 1)) * innerWidth;
      const normalizedScore = (game.total_score - minScore) / scoreRange;
      const y = padding + innerHeight - normalizedScore * innerHeight;
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  };

  // Create grid lines
  const gridLines = [];
  const gridCount = 5;
  for (let i = 0; i <= gridCount; i++) {
    const y = padding + (i / gridCount) * innerHeight;
    const score = maxScore - (i / gridCount) * scoreRange;
    gridLines.push({ y, score: Math.round(score) });
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Score History
      </h3>

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
                {line.score.toLocaleString()}
              </text>
            </g>
          ))}

          {/* Line chart */}
          <path
            d={createPath()}
            stroke="#3b82f6"
            strokeWidth="3"
            fill="none"
            className="dark:stroke-blue-400"
          />

          {/* Data points */}
          {gameScores.map((game, index) => {
            const x = padding + (index / (gameScores.length - 1)) * innerWidth;
            const normalizedScore = (game.total_score - minScore) / scoreRange;
            const y = padding + innerHeight - normalizedScore * innerHeight;

            return (
              <g key={game.game_date}>
                <circle
                  cx={x}
                  cy={y}
                  r="4"
                  fill={getScoreColor(game.total_score)}
                  className="hover:r-6 transition-all duration-200"
                />
                <title>
                  {formatDate(game.game_date)}:{' '}
                  {game.total_score.toLocaleString()}
                </title>
              </g>
            );
          })}

          {/* X-axis labels */}
          {gameScores.length <= 10 &&
            gameScores.map((game, index) => {
              const x =
                padding + (index / (gameScores.length - 1)) * innerWidth;
              return (
                <text
                  key={game.game_date}
                  x={x}
                  y={chartHeight - 5}
                  textAnchor="middle"
                  className="text-xs fill-gray-500 dark:fill-gray-400"
                >
                  {formatDate(game.game_date)}
                </text>
              );
            })}
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-4 flex justify-center space-x-4 text-xs">
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-gray-600 dark:text-gray-400">14k+</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span className="text-gray-600 dark:text-gray-400">12k+</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <span className="text-gray-600 dark:text-gray-400">10k+</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 rounded-full bg-gray-500"></div>
          <span className="text-gray-600 dark:text-gray-400">&lt;10k</span>
        </div>
      </div>

      {gameScores.length >= 20 && (
        <div className="mt-2 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Showing last 20 games
          </p>
        </div>
      )}
    </div>
  );
}
