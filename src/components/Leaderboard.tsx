import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Player {
  id: string;
  display_name: string;
  email: string;
}

interface Game {
  id: string;
  user_id: string;
  game_date: string;
  total_score: number;
  round1_score: number;
  round2_score: number;
  round3_score: number;
}

interface EloHistory {
  id: string;
  user_id: string;
  game_date: string;
  basic_elo: number;
  margin_elo: number;
}

interface CurrentElo {
  user_id: string;
  basic_elo: number;
  margin_elo: number;
}

interface PlayerStats {
  player: Player;
  currentBasicElo: number;
  currentMarginElo: number;
  maxBasicElo: number;
  maxMarginElo: number;
  averageScore: number;
  highestScore: number;
  bestStreak: number;
  currentStreak: number;
}

export function Leaderboard() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [eloHistory, setEloHistory] = useState<EloHistory[]>([]);
  const [currentElos, setCurrentElos] = useState<CurrentElo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboardData();
  }, []);

  const loadLeaderboardData = async () => {
    try {
      setLoading(true);

      // Load all games first
      const { data: gamesData, error: gamesError } = await supabase
        .from('games')
        .select('*')
        .order('game_date', { ascending: true });

      if (gamesError) {
        console.error('Error loading games:', gamesError);
        return;
      }

      setGames(gamesData || []);

      // Get unique user IDs from games
      const userIds = [...new Set(gamesData?.map((g) => g.user_id) || [])];

      // Try to get user profiles from a profiles table, or create basic player data
      let playerData: Player[] = [];

      try {
        // Try to query a profiles table if it exists
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, display_name, email')
          .in('id', userIds);

        if (!profilesError && profiles) {
          playerData = profiles.map((profile) => ({
            id: profile.id,
            display_name:
              profile.display_name || `Player ${profile.id.slice(0, 8)}`,
            email: profile.email || '',
          }));
        } else {
          // Fallback: create basic player data
          playerData = userIds.map((id) => ({
            id,
            display_name: `Player ${id.slice(0, 8)}`,
            email: '',
          }));
        }
      } catch {
        // Fallback: create basic player data
        playerData = userIds.map((id) => ({
          id,
          display_name: `Player ${id.slice(0, 8)}`,
          email: '',
        }));
      }

      setPlayers(playerData);

      // Load all Elo history
      const { data: eloData, error: eloError } = await supabase
        .from('elo_history')
        .select('*')
        .order('game_date', { ascending: true });

      if (eloError) {
        console.error('Error loading Elo history:', eloError);
        return;
      }

      setEloHistory(eloData || []);

      // Load current Elo values
      const { data: currentEloData, error: currentEloError } = await supabase
        .from('current_elos')
        .select('*');

      console.log('Current Elo Data:', currentEloData);
      console.log('Current Elo Error:', currentEloError);

      if (currentEloError) {
        console.error('Error loading current Elo:', currentEloError);
      }

      setCurrentElos(currentEloData || []);
    } catch (error) {
      console.error('Error loading leaderboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePlayerStats = (): PlayerStats[] => {
    if (!players.length || !games.length) return [];

    return players
      .map((player) => {
        const playerGames = games.filter((g) => g.user_id === player.id);
        const playerEloHistory = eloHistory.filter(
          (h) => h.user_id === player.id
        );
        const playerCurrentElo = currentElos.find(
          (e) => e.user_id === player.id
        );

        if (playerGames.length === 0) {
          return {
            player,
            currentBasicElo: 1500,
            currentMarginElo: 1500,
            maxBasicElo: 1500,
            maxMarginElo: 1500,
            averageScore: 0,
            highestScore: 0,
            bestStreak: 0,
            currentStreak: 0,
          };
        }

        // Calculate scores
        const scores = playerGames.map((g) => g.total_score);
        const averageScore = Math.round(
          scores.reduce((sum, score) => sum + score, 0) / scores.length
        );
        const highestScore = Math.max(...scores);

        // Calculate streaks
        const sortedGames = [...playerGames].sort(
          (a, b) =>
            new Date(a.game_date).getTime() - new Date(b.game_date).getTime()
        );

        let bestStreak = 0;
        let currentStreak = 0;
        let tempStreak = 0;

        for (let i = 0; i < sortedGames.length; i++) {
          const game = sortedGames[i];
          const sameDateGames = games.filter(
            (g) => g.game_date === game.game_date
          );
          const isWin =
            game.total_score ===
            Math.max(...sameDateGames.map((g) => g.total_score));

          if (isWin) {
            tempStreak++;
            currentStreak = tempStreak;
          } else {
            tempStreak = 0;
          }

          bestStreak = Math.max(bestStreak, tempStreak);
        }

        // Get current Elo from current_elos table, fallback to history
        const currentBasicElo =
          playerCurrentElo?.basic_elo ??
          (playerEloHistory.length > 0
            ? playerEloHistory[playerEloHistory.length - 1].basic_elo
            : 1500);
        const currentMarginElo =
          playerCurrentElo?.margin_elo ??
          (playerEloHistory.length > 0
            ? playerEloHistory[playerEloHistory.length - 1].margin_elo
            : 1500);

        // Get max Elo from history
        const maxBasicElo =
          playerEloHistory.length > 0
            ? Math.max(...playerEloHistory.map((h) => h.basic_elo))
            : currentBasicElo;
        const maxMarginElo =
          playerEloHistory.length > 0
            ? Math.max(...playerEloHistory.map((h) => h.margin_elo))
            : currentMarginElo;

        return {
          player,
          currentBasicElo,
          currentMarginElo,
          maxBasicElo,
          maxMarginElo,
          averageScore,
          highestScore,
          bestStreak,
          currentStreak,
        };
      })
      .sort((a, b) => b.currentBasicElo - a.currentBasicElo); // Sort by current basic ELO descending
  };

  const playerStats = calculatePlayerStats();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Leaderboard
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Loading leaderboard data...
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Leaderboard
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Compare your performance with other players in the league.
        </p>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                  Player
                </th>
                <th className="text-center py-3 px-4 font-semibold text-gray-900 dark:text-white">
                  Current ELO
                </th>
                <th className="text-center py-3 px-4 font-semibold text-gray-900 dark:text-white">
                  Max ELO
                </th>
                <th className="text-center py-3 px-4 font-semibold text-gray-900 dark:text-white">
                  Avg Score
                </th>
                <th className="text-center py-3 px-4 font-semibold text-gray-900 dark:text-white">
                  Highest Score
                </th>
                <th className="text-center py-3 px-4 font-semibold text-gray-900 dark:text-white">
                  Best Streak
                </th>
                <th className="text-center py-3 px-4 font-semibold text-gray-900 dark:text-white">
                  Current Streak
                </th>
              </tr>
            </thead>
            <tbody>
              {playerStats.map((stats, index) => (
                <tr
                  key={stats.player.id}
                  className={`border-b border-gray-100 dark:border-gray-700 ${
                    index === 0 ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''
                  }`}
                >
                  <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">
                        {index === 0
                          ? '🥇'
                          : index === 1
                            ? '🥈'
                            : index === 2
                              ? '🥉'
                              : `${index + 1}.`}
                      </span>
                      <button
                        onClick={() => {
                          window.location.hash = `#user-${stats.player.id}`;
                        }}
                        className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                      >
                        {stats.player.display_name}
                      </button>
                    </div>
                  </td>
                  <td className="text-center py-3 px-4 text-gray-600 dark:text-gray-400">
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {Math.round(stats.currentBasicElo)}
                    </span>
                  </td>
                  <td className="text-center py-3 px-4 text-gray-600 dark:text-gray-400">
                    {Math.round(stats.maxBasicElo)}
                  </td>
                  <td className="text-center py-3 px-4 text-gray-600 dark:text-gray-400">
                    {stats.averageScore.toLocaleString()}
                  </td>
                  <td className="text-center py-3 px-4 text-gray-600 dark:text-gray-400">
                    {stats.highestScore.toLocaleString()}
                  </td>
                  <td className="text-center py-3 px-4 text-gray-600 dark:text-gray-400">
                    {stats.bestStreak}
                  </td>
                  <td className="text-center py-3 px-4 text-gray-600 dark:text-gray-400">
                    <span
                      className={`font-semibold ${
                        stats.currentStreak > 0
                          ? 'text-green-600 dark:text-green-400'
                          : ''
                      }`}
                    >
                      {stats.currentStreak}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {playerStats.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 py-16">
            <div className="text-4xl mb-2">📊</div>
            <p>No players found</p>
            <p className="text-sm">
              Players need to submit scores to appear on the leaderboard
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
