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

      {/* Charts Section - Side by Side */}
      {playerStats.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Elo History Plot */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Elo History - All Players
            </h2>
            <EloHistoryPlot playerStats={playerStats} eloHistory={eloHistory} />
          </div>

          {/* Score History Plot */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Score History - All Players
            </h2>
            <ScoreHistoryPlot playerStats={playerStats} games={games} />
          </div>
        </div>
      )}
    </div>
  );
}

// Score History Plot Component
function ScoreHistoryPlot({
  playerStats,
  games,
}: {
  playerStats: PlayerStats[];
  games: Game[];
}) {
  const width = 800;
  const height = 400;
  const margin = { top: 20, right: 80, bottom: 60, left: 60 }; // Increased right margin even more
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Get all unique dates from games
  const allDates = [...new Set(games.map((g) => g.game_date))].sort();

  // Create player data with display names - use consistent order from playerStats
  const playersWithNames = playerStats.map((player) => ({
    userId: player.player.id,
    displayName: player.player.display_name,
    color: getPlayerColor(
      player.player.id,
      playerStats.map((p) => p.player.id)
    ),
  }));

  // Calculate scales
  const dateRange = {
    min: new Date(allDates[0]).getTime(),
    max: new Date(allDates[allDates.length - 1]).getTime(),
  };

  const scoreRange = {
    min: Math.min(...games.map((g) => g.total_score)),
    max: Math.max(...games.map((g) => g.total_score)),
  };

  // Handle single date case
  const xScale = (date: string) => {
    if (allDates.length === 1) {
      return margin.left + chartWidth / 2; // Center the single point
    }
    return (
      margin.left +
      ((new Date(date).getTime() - dateRange.min) /
        (dateRange.max - dateRange.min)) *
        chartWidth
    );
  };

  const yScale = (score: number) => {
    if (scoreRange.max === scoreRange.min) {
      return margin.top + chartHeight / 2; // Center if all values are the same
    }
    return (
      margin.top +
      chartHeight -
      ((score - scoreRange.min) / (scoreRange.max - scoreRange.min)) *
        chartHeight
    );
  };

  // Helper function to get player color - consistent across charts
  function getPlayerColor(userId: string, allPlayers: string[]) {
    const colors = [
      '#3b82f6',
      '#10b981',
      '#f59e0b',
      '#ef4444',
      '#8b5cf6',
      '#06b6d4',
      '#f97316',
      '#84cc16',
    ];
    const index = allPlayers.indexOf(userId);
    return colors[index % colors.length];
  }

  // Format date for display - shorter format
  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  }

  // Show only some dates to prevent overlap
  function shouldShowDateLabel(date: string, index: number) {
    if (allDates.length <= 5) return true; // Show all if few dates
    if (allDates.length <= 10) return index % 2 === 0; // Show every other if 6-10 dates
    return index % 3 === 0; // Show every third if many dates
  }

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} className="w-full max-w-full">
        {/* Grid lines */}
        <g className="text-gray-300 dark:text-gray-600">
          {/* Vertical grid lines for dates */}
          {allDates.map((date, i) => {
            const x = xScale(date);
            return (
              <line
                key={`grid-x-${date}-${i}`}
                x1={x}
                y1={margin.top}
                x2={x}
                y2={margin.top + chartHeight}
                stroke="currentColor"
                strokeWidth="1"
                opacity="0.3"
              />
            );
          })}

          {/* Horizontal grid lines for scores */}
          {[0, 1, 2, 3, 4].map((i) => {
            const score =
              scoreRange.min + (i * (scoreRange.max - scoreRange.min)) / 4;
            const y = yScale(score);
            return (
              <line
                key={`grid-y-${i}`}
                x1={margin.left}
                y1={y}
                x2={margin.left + chartWidth}
                y2={y}
                stroke="currentColor"
                strokeWidth="1"
                opacity="0.3"
              />
            );
          })}
        </g>

        {/* Plot lines for each player */}
        {playersWithNames.map((player) => {
          const playerGames = games
            .filter((g) => g.user_id === player.userId)
            .sort(
              (a, b) =>
                new Date(a.game_date).getTime() -
                new Date(b.game_date).getTime()
            );

          if (playerGames.length === 0) {
            return (
              <g key={player.userId}>
                {/* Show a placeholder point for players without games */}
                <circle
                  cx={margin.left + chartWidth / 2}
                  cy={margin.top + chartHeight / 2}
                  r="4"
                  fill={player.color}
                  opacity="0.5"
                  className="hover:r-6 transition-all duration-200"
                />
                <text
                  x={margin.left + chartWidth / 2}
                  y={margin.top + chartHeight / 2 + 20}
                  textAnchor="middle"
                  className="text-xs text-gray-600 dark:text-gray-400"
                >
                  {player.displayName} (No games)
                </text>
              </g>
            );
          }

          // Create path for the line
          const pathData = playerGames
            .map((g) => `${xScale(g.game_date)},${yScale(g.total_score)}`)
            .join(' L ');

          return (
            <g key={player.userId}>
              {/* Line */}
              {playerGames.length > 1 && (
                <path
                  d={`M ${pathData}`}
                  stroke={player.color}
                  strokeWidth="2"
                  fill="none"
                  className="hover:stroke-width-3 transition-all duration-200"
                />
              )}

              {/* Data points */}
              {playerGames.map((game, index) => (
                <circle
                  key={`${player.userId}-${game.game_date}-${index}`}
                  cx={xScale(game.game_date)}
                  cy={yScale(game.total_score)}
                  r="4"
                  fill={player.color}
                  className="hover:r-6 transition-all duration-200"
                />
              ))}
            </g>
          );
        })}

        {/* X-axis labels - only show some to prevent overlap */}
        <g className="text-gray-600 dark:text-gray-400 text-xs">
          {allDates.map((date, i) => {
            if (!shouldShowDateLabel(date, i)) return null;
            const x = xScale(date);
            return (
              <text
                key={`label-${date}-${i}`}
                x={x}
                y={height - 10}
                textAnchor="middle"
                className="text-xs"
              >
                {formatDate(date)}
              </text>
            );
          })}
        </g>

        {/* Y-axis labels */}
        <g className="text-gray-600 dark:text-gray-400 text-xs">
          {[0, 1, 2, 3, 4].map((i) => {
            const score =
              scoreRange.min + (i * (scoreRange.max - scoreRange.min)) / 4;
            const y = yScale(score);
            return (
              <text
                key={`y-label-${i}`}
                x={margin.left - 10}
                y={y + 3}
                textAnchor="end"
                className="text-xs"
              >
                {Math.round(score).toLocaleString()}
              </text>
            );
          })}
        </g>

        {/* Axes */}
        <g className="text-gray-600 dark:text-gray-400">
          {/* X-axis */}
          <line
            x1={margin.left}
            y1={margin.top + chartHeight}
            x2={margin.left + chartWidth}
            y2={margin.top + chartHeight}
            stroke="currentColor"
            strokeWidth="2"
          />
          <text
            x={margin.left + chartWidth / 2}
            y={height - 30}
            textAnchor="middle"
            className="text-sm font-medium"
          >
            Date
          </text>

          {/* Y-axis */}
          <line
            x1={margin.left}
            y1={margin.top}
            x2={margin.left}
            y2={margin.top + chartHeight}
            stroke="currentColor"
            strokeWidth="2"
          />
          <text
            x={10}
            y={margin.top + chartHeight / 2}
            textAnchor="middle"
            transform={`rotate(-90, 10, ${margin.top + chartHeight / 2})`}
            className="text-sm font-medium"
          >
            Total Score
          </text>
        </g>

        {/* Legend */}
        <g className="text-xs">
          {playersWithNames.map((player, index) => {
            const row = Math.floor(index / 3); // 3 items per row
            const col = index % 3;
            const xOffset = col * 200; // 200px spacing between columns
            const yOffset = row * 20; // 20px spacing between rows

            return (
              <g
                key={`legend-${player.userId}`}
                transform={`translate(${margin.left + xOffset}, ${margin.top - 20 - yOffset})`}
              >
                <rect
                  x="0"
                  y="0"
                  width="12"
                  height="12"
                  fill={player.color}
                  rx="2"
                />
                <text x="20" y="9" className="text-gray-900 dark:text-white">
                  {player.displayName}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

// Elo History Plot Component
function EloHistoryPlot({
  playerStats,
  eloHistory,
}: {
  playerStats: PlayerStats[];
  eloHistory: EloHistory[];
}) {
  const width = 800;
  const height = 400;
  const margin = { top: 20, right: 80, bottom: 60, left: 60 }; // Increased right margin even more
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Get all unique dates from elo history
  const allDates = [...new Set(eloHistory.map((h) => h.game_date))].sort();

  // Create player data with display names - use consistent order from playerStats
  const playersWithNames = playerStats.map((player) => ({
    userId: player.player.id,
    displayName: player.player.display_name,
    color: getPlayerColor(
      player.player.id,
      playerStats.map((p) => p.player.id)
    ),
  }));

  // Check if we have data
  if (allDates.length === 0 || eloHistory.length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-16">
        <div className="text-4xl mb-2">📊</div>
        <p>No Elo history data available</p>
        <p className="text-sm">
          Elo history will appear here once players have played games and Elo
          has been calculated
        </p>
      </div>
    );
  }

  // Calculate scales
  const dateRange = {
    min: new Date(allDates[0]).getTime(),
    max: new Date(allDates[allDates.length - 1]).getTime(),
  };

  const eloRange = {
    min: Math.min(...eloHistory.map((h) => h.basic_elo)),
    max: Math.max(...eloHistory.map((h) => h.basic_elo)),
  };

  // Handle single date case
  const xScale = (date: string) => {
    if (allDates.length === 1) {
      return margin.left + chartWidth / 2; // Center the single point
    }
    return (
      margin.left +
      ((new Date(date).getTime() - dateRange.min) /
        (dateRange.max - dateRange.min)) *
        chartWidth
    );
  };

  const yScale = (elo: number) => {
    if (eloRange.max === eloRange.min) {
      return margin.top + chartHeight / 2; // Center if all values are the same
    }
    return (
      margin.top +
      chartHeight -
      ((elo - eloRange.min) / (eloRange.max - eloRange.min)) * chartHeight
    );
  };

  // Helper function to get player color - consistent across charts
  function getPlayerColor(userId: string, allPlayers: string[]) {
    const colors = [
      '#3b82f6',
      '#10b981',
      '#f59e0b',
      '#ef4444',
      '#8b5cf6',
      '#06b6d4',
      '#f97316',
      '#84cc16',
    ];
    const index = allPlayers.indexOf(userId);
    return colors[index % colors.length];
  }

  // Format date for display - shorter format
  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  }

  // Show only some dates to prevent overlap
  function shouldShowDateLabel(date: string, index: number) {
    if (allDates.length <= 5) return true; // Show all if few dates
    if (allDates.length <= 10) return index % 2 === 0; // Show every other if 6-10 dates
    return index % 3 === 0; // Show every third if many dates
  }

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} className="w-full max-w-full">
        {/* Grid lines */}
        <g className="text-gray-300 dark:text-gray-600">
          {/* Vertical grid lines for dates */}
          {allDates.map((date, i) => {
            const x = xScale(date);
            return (
              <line
                key={`grid-x-${date}-${i}`}
                x1={x}
                y1={margin.top}
                x2={x}
                y2={margin.top + chartHeight}
                stroke="currentColor"
                strokeWidth="1"
                opacity="0.3"
              />
            );
          })}

          {/* Horizontal grid lines for Elo */}
          {[0, 1, 2, 3, 4].map((i) => {
            const elo = eloRange.min + (i * (eloRange.max - eloRange.min)) / 4;
            const y = yScale(elo);
            return (
              <line
                key={`grid-y-${i}`}
                x1={margin.left}
                y1={y}
                x2={margin.left + chartWidth}
                y2={y}
                stroke="currentColor"
                strokeWidth="1"
                opacity="0.3"
              />
            );
          })}
        </g>

        {/* Plot lines for each player */}
        {playersWithNames.map((player) => {
          const playerHistory = eloHistory
            .filter((h) => h.user_id === player.userId)
            .sort(
              (a, b) =>
                new Date(a.game_date).getTime() -
                new Date(b.game_date).getTime()
            );

          // Show players even if they have no Elo history yet
          if (playerHistory.length === 0) {
            return (
              <g key={player.userId}>
                {/* Show a placeholder point for players without Elo history */}
                <circle
                  cx={margin.left + chartWidth / 2}
                  cy={margin.top + chartHeight / 2}
                  r="4"
                  fill={player.color}
                  opacity="0.5"
                  className="hover:r-6 transition-all duration-200"
                />
                <text
                  x={margin.left + chartWidth / 2}
                  y={margin.top + chartHeight / 2 + 20}
                  textAnchor="middle"
                  className="text-xs text-gray-600 dark:text-gray-400"
                >
                  {player.displayName} (No Elo history)
                </text>
              </g>
            );
          }

          // Remove duplicates by keeping only the latest entry per date
          const uniqueHistory = playerHistory.reduce(
            (acc, entry) => {
              const existingIndex = acc.findIndex(
                (e) => e.game_date === entry.game_date
              );
              if (existingIndex >= 0) {
                acc[existingIndex] = entry; // Replace with latest
              } else {
                acc.push(entry);
              }
              return acc;
            },
            [] as typeof playerHistory
          );

          // Create path for the line
          const pathData = uniqueHistory
            .map((h) => `${xScale(h.game_date)},${yScale(h.basic_elo)}`)
            .join(' L ');

          return (
            <g key={player.userId}>
              {/* Line */}
              {uniqueHistory.length > 1 && (
                <path
                  d={`M ${pathData}`}
                  stroke={player.color}
                  strokeWidth="2"
                  fill="none"
                  className="hover:stroke-width-3 transition-all duration-200"
                />
              )}

              {/* Data points */}
              {uniqueHistory.map((entry, index) => (
                <circle
                  key={`${player.userId}-${entry.game_date}-${index}`}
                  cx={xScale(entry.game_date)}
                  cy={yScale(entry.basic_elo)}
                  r="4"
                  fill={player.color}
                  className="hover:r-6 transition-all duration-200"
                />
              ))}
            </g>
          );
        })}

        {/* X-axis labels - only show some to prevent overlap */}
        <g className="text-gray-600 dark:text-gray-400 text-xs">
          {allDates.map((date, i) => {
            if (!shouldShowDateLabel(date, i)) return null;
            const x = xScale(date);
            return (
              <text
                key={`label-${date}-${i}`}
                x={x}
                y={height - 10}
                textAnchor="middle"
                className="text-xs"
              >
                {formatDate(date)}
              </text>
            );
          })}
        </g>

        {/* Y-axis labels */}
        <g className="text-gray-600 dark:text-gray-400 text-xs">
          {[0, 1, 2, 3, 4].map((i) => {
            const elo = eloRange.min + (i * (eloRange.max - eloRange.min)) / 4;
            const y = yScale(elo);
            return (
              <text
                key={`y-label-${i}`}
                x={margin.left - 10}
                y={y + 3}
                textAnchor="end"
                className="text-xs"
              >
                {Math.round(elo)}
              </text>
            );
          })}
        </g>

        {/* Axes */}
        <g className="text-gray-600 dark:text-gray-400">
          {/* X-axis */}
          <line
            x1={margin.left}
            y1={margin.top + chartHeight}
            x2={margin.left + chartWidth}
            y2={margin.top + chartHeight}
            stroke="currentColor"
            strokeWidth="2"
          />
          <text
            x={margin.left + chartWidth / 2}
            y={height - 30}
            textAnchor="middle"
            className="text-sm font-medium"
          >
            Date
          </text>

          {/* Y-axis */}
          <line
            x1={margin.left}
            y1={margin.top}
            x2={margin.left}
            y2={margin.top + chartHeight}
            stroke="currentColor"
            strokeWidth="2"
          />
          <text
            x={10}
            y={margin.top + chartHeight / 2}
            textAnchor="middle"
            transform={`rotate(-90, 10, ${margin.top + chartHeight / 2})`}
            className="text-sm font-medium"
          >
            Basic Elo
          </text>
        </g>

        {/* Legend */}
        <g className="text-xs">
          {playersWithNames.map((player, index) => {
            const row = Math.floor(index / 3); // 3 items per row
            const col = index % 3;
            const xOffset = col * 200; // 200px spacing between columns
            const yOffset = row * 20; // 20px spacing between rows

            return (
              <g
                key={`legend-${player.userId}`}
                transform={`translate(${margin.left + xOffset}, ${margin.top - 20 - yOffset})`}
              >
                <rect
                  x="0"
                  y="0"
                  width="12"
                  height="12"
                  fill={player.color}
                  rx="2"
                />
                <text x="20" y="9" className="text-gray-900 dark:text-white">
                  {player.displayName}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
