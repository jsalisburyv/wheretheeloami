import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { HistoryChart } from './HistoryChart';

interface UserProfileProps {
  userId: string;
}

interface UserStats {
  averageScore: number;
  highestScore: number;
  bestStreak: number;
  currentStreak: number;
  currentBasicElo: number;
  currentMarginElo: number;
  maxBasicElo: number;
  maxMarginElo: number;
  gamesPlayed: number;
  totalWins: number;
  loading: boolean;
}

interface Game {
  game_date: string;
  total_score: number;
}

export function UserProfile({ userId }: UserProfileProps) {
  const [stats, setStats] = useState<UserStats>({
    averageScore: 0,
    highestScore: 0,
    bestStreak: 0,
    currentStreak: 0,
    currentBasicElo: 1500,
    currentMarginElo: 1500,
    maxBasicElo: 1500,
    maxMarginElo: 1500,
    gamesPlayed: 0,
    totalWins: 0,
    loading: true,
  });
  const [userDisplayName, setUserDisplayName] = useState<string>('Loading...');

  useEffect(() => {
    loadUserStats();
  }, [userId]);

  const loadUserStats = async () => {
    try {
      setStats((prev) => ({ ...prev, loading: true }));

      // Get user profile data first
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error loading profile:', profileError);
        setUserDisplayName(`Player ${userId.slice(0, 8)}`);
      } else {
        setUserDisplayName(
          profile.display_name || `Player ${userId.slice(0, 8)}`
        );
      }

      // Get all games for the user
      const { data: games, error: gamesError } = await supabase
        .from('games')
        .select('*')
        .eq('user_id', userId)
        .order('game_date', { ascending: false });

      if (gamesError) {
        console.error('Error loading games:', gamesError);
        setStats((prev) => ({ ...prev, loading: false }));
        return;
      }

      if (!games || games.length === 0) {
        setStats((prev) => ({
          ...prev,
          gamesPlayed: 0,
          loading: false,
        }));
        return;
      }

      // Calculate statistics from games
      const totalScore = games.reduce(
        (sum, game) => sum + (game.total_score || 0),
        0
      );
      const averageScore = Math.round(totalScore / games.length);
      const highestScore = Math.max(
        ...games.map((game) => game.total_score || 0)
      );
      const gamesPlayed = games.length;

      // Calculate win stats
      const { totalWins, currentStreak } = calculateWinStats(games);
      const bestStreak = calculateBestStreak(games);

      // Get Elo stats
      const { currentBasicElo, currentMarginElo, maxBasicElo, maxMarginElo } =
        await getEloStats(userId);

      setStats({
        averageScore,
        highestScore,
        bestStreak,
        currentStreak,
        currentBasicElo,
        currentMarginElo,
        maxBasicElo,
        maxMarginElo,
        gamesPlayed,
        totalWins,
        loading: false,
      });
    } catch (error) {
      console.error('Error loading user stats:', error);
      setStats((prev) => ({ ...prev, loading: false }));
    }
  };

  const calculateWinStats = (games: Game[]) => {
    let totalWins = 0;
    let currentStreak = 0;
    let tempStreak = 0;

    // Sort games by date
    const sortedGames = [...games].sort(
      (a, b) =>
        new Date(a.game_date).getTime() - new Date(b.game_date).getTime()
    );

    for (let i = 0; i < sortedGames.length; i++) {
      const game = sortedGames[i];

      // Check if this game was a win (highest score for that date)
      const sameDateGames = games.filter((g) => g.game_date === game.game_date);
      const isWin =
        game.total_score ===
        Math.max(...sameDateGames.map((g) => g.total_score));

      if (isWin) {
        totalWins++;
        tempStreak++;
        currentStreak = tempStreak;
      } else {
        tempStreak = 0;
      }
    }

    return { totalWins, currentStreak };
  };

  const getEloStats = async (userId: string) => {
    try {
      // Try to get current Elo from current_elos table first
      const { data: currentEloData, error: currentError } = await supabase
        .from('current_elos')
        .select('basic_elo, margin_elo')
        .eq('user_id', userId)
        .maybeSingle();

      // Get Elo history for current and max values
      const { data: eloHistory, error: historyError } = await supabase
        .from('elo_history')
        .select('basic_elo, margin_elo, game_date')
        .eq('user_id', userId)
        .order('game_date', { ascending: false });

      if (currentError) {
        console.error('Error loading current Elo:', currentError);
      }

      if (historyError) {
        console.error('Error loading Elo history:', historyError);
      }

      // Default values - use 1500 as default (standard Elo starting point)
      let currentBasicElo = 1500;
      let currentMarginElo = 1500;
      let maxBasicElo = 1500;
      let maxMarginElo = 1500;

      // Try to get current Elo from current_elos first, then fallback to history
      if (currentEloData) {
        currentBasicElo = currentEloData.basic_elo ?? 1500;
        currentMarginElo = currentEloData.margin_elo ?? 1500;
      } else if (eloHistory && eloHistory.length > 0) {
        // Get current Elo from the most recent entry
        currentBasicElo = eloHistory[0].basic_elo ?? 1500;
        currentMarginElo = eloHistory[0].margin_elo ?? 1500;
      }

      // Calculate max values from history
      if (eloHistory && eloHistory.length > 0) {
        maxBasicElo = Math.max(...eloHistory.map((h) => h.basic_elo ?? 1500));
        maxMarginElo = Math.max(...eloHistory.map((h) => h.margin_elo ?? 1500));
      }

      return { currentBasicElo, currentMarginElo, maxBasicElo, maxMarginElo };
    } catch (error) {
      console.error('Error getting Elo stats:', error);
      return {
        currentBasicElo: 1500,
        currentMarginElo: 1500,
        maxBasicElo: 1500,
        maxMarginElo: 1500,
      };
    }
  };

  const calculateBestStreak = (games: Game[]) => {
    let bestStreak = 0;
    let tempStreak = 0;

    // Sort games by date to calculate streaks properly
    const sortedGames = [...games].sort(
      (a, b) =>
        new Date(a.game_date).getTime() - new Date(b.game_date).getTime()
    );

    for (let i = 0; i < sortedGames.length; i++) {
      const game = sortedGames[i];

      // Check if this game was played on a consecutive day
      if (i > 0) {
        const prevGame = sortedGames[i - 1];
        const currentDate = new Date(game.game_date);
        const prevDate = new Date(prevGame.game_date);
        const dayDiff =
          (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

        if (dayDiff === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      } else {
        tempStreak = 1;
      }

      bestStreak = Math.max(bestStreak, tempStreak);
    }

    return bestStreak;
  };

  // Helper functions for score chart
  const getScoreColor = (score: number) => {
    if (score >= 14000) return '#10b981'; // green-500
    if (score >= 12000) return '#3b82f6'; // blue-500
    if (score >= 10000) return '#f59e0b'; // amber-500
    return '#6b7280'; // gray-500
  };

  const formatScore = (score: number) => score.toLocaleString();

  // Helper functions for Elo chart
  const getEloColor = (elo: number) => {
    if (elo >= 1200) return '#10b981'; // green-500
    if (elo >= 1100) return '#3b82f6'; // blue-500
    if (elo >= 1000) return '#f59e0b'; // amber-500
    return '#6b7280'; // gray-500
  };

  const formatElo = (elo: number) => elo.toLocaleString();

  if (stats.loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {userDisplayName}'s Profile
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Loading profile data...
          </p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {userDisplayName}'s Profile
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Viewing {userDisplayName}'s GeoGuessr league statistics and
              performance.
            </p>
          </div>
          <button
            onClick={() => window.history.back()}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            <span>←</span>
            <span>Back</span>
          </button>
        </div>
      </div>

      {/* Stats Cards - Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Basic Elo
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {Math.round(stats.currentBasicElo)}
              </p>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
              <span className="text-blue-600 dark:text-blue-400 text-xl">
                🏆
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Margin Elo
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {Math.round(stats.currentMarginElo)}
              </p>
            </div>
            <div className="bg-indigo-100 dark:bg-indigo-900 p-3 rounded-full">
              <span className="text-indigo-600 dark:text-indigo-400 text-xl">
                ⚡
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Current Streak
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.currentStreak}
              </p>
            </div>
            <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full">
              <span className="text-green-600 dark:text-green-400 text-xl">
                🔥
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Wins
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.totalWins}
              </p>
            </div>
            <div className="bg-emerald-100 dark:bg-emerald-900 p-3 rounded-full">
              <span className="text-emerald-600 dark:text-emerald-400 text-xl">
                🏁
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards - Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Max Basic Elo
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {Math.round(stats.maxBasicElo)}
              </p>
            </div>
            <div className="bg-red-100 dark:bg-red-900 p-3 rounded-full">
              <span className="text-red-600 dark:text-red-400 text-xl">🏅</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Max Margin Elo
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {Math.round(stats.maxMarginElo)}
              </p>
            </div>
            <div className="bg-orange-100 dark:bg-orange-900 p-3 rounded-full">
              <span className="text-orange-600 dark:text-orange-400 text-xl">
                💎
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Best Streak
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.bestStreak}
              </p>
            </div>
            <div className="bg-yellow-100 dark:bg-yellow-900 p-3 rounded-full">
              <span className="text-yellow-600 dark:text-yellow-400 text-xl">
                ⭐
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Games Played
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.gamesPlayed}
              </p>
            </div>
            <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-full">
              <span className="text-purple-600 dark:text-purple-400 text-xl">
                📊
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards - Row 3 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Average Score
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.averageScore.toLocaleString()}
              </p>
            </div>
            <div className="bg-cyan-100 dark:bg-cyan-900 p-3 rounded-full">
              <span className="text-cyan-600 dark:text-cyan-400 text-xl">
                📈
              </span>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Best Score
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.highestScore.toLocaleString()}
              </p>
            </div>
            <div className="bg-pink-100 dark:bg-pink-900 p-3 rounded-full">
              <span className="text-pink-600 dark:text-pink-400 text-xl">
                🎯
              </span>
            </div>
          </div>
        </div>
        <div className="hidden lg:block"></div>{' '}
        {/* Empty space for 4-column layout */}
        <div className="hidden lg:block"></div>{' '}
        {/* Empty space for 4-column layout */}
      </div>

      {/* Score History Chart and Elo Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HistoryChart
          type="score"
          title="Score History"
          color="#3b82f6"
          colorClass="dark:stroke-blue-400"
          getValueColor={getScoreColor}
          formatValue={formatScore}
        />
        <HistoryChart
          type="elo"
          title="Elo History"
          color="#10b981"
          colorClass="dark:stroke-green-400"
          getValueColor={getEloColor}
          formatValue={formatElo}
        />
      </div>
    </div>
  );
}
