import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

interface GameScore {
  game_date: string;
  total_score: number;
  round1_score: number;
  round2_score: number;
  round3_score: number;
}

export function ScoreHistory() {
  const { user } = useAuth();
  const [gameScores, setGameScores] = useState<GameScore[]>([]);
  const [loading, setLoading] = useState(true);

  const loadScoreHistory = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('games')
        .select(
          'game_date, total_score, round1_score, round2_score, round3_score'
        )
        .eq('user_id', user.id)
        .order('game_date', { ascending: false })
        .limit(10); // Show last 10 games

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
      year: 'numeric',
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 14000) return 'text-green-600 dark:text-green-400';
    if (score >= 12000) return 'text-blue-600 dark:text-blue-400';
    if (score >= 10000) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recent Scores
        </h3>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (gameScores.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recent Scores
        </h3>
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          <div className="text-4xl mb-2">🎯</div>
          <p>No games played yet</p>
          <p className="text-sm">
            Submit your first score to see your history!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Recent Scores
      </h3>

      <div className="space-y-3">
        {gameScores.map((game, index) => (
          <div
            key={game.game_date}
            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
          >
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full">
                <span className="text-blue-600 dark:text-blue-400 text-sm font-medium">
                  {index + 1}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatDate(game.game_date)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {game.round1_score} + {game.round2_score} +{' '}
                  {game.round3_score}
                </p>
              </div>
            </div>

            <div className="text-right">
              <p
                className={`text-lg font-bold ${getScoreColor(game.total_score)}`}
              >
                {game.total_score.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
            </div>
          </div>
        ))}
      </div>

      {gameScores.length >= 10 && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing last 10 games
          </p>
        </div>
      )}
    </div>
  );
}
