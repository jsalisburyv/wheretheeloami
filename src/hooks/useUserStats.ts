import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';

interface UserStats {
  averageScore: number;
  highestScore: number;
  bestStreak: number;
  currentStreak: number;
  currentElo: number;
  maxElo: number;
  gamesPlayed: number;
  totalWins: number;
  loading: boolean;
}

interface Game {
  game_date: string;
  total_score: number;
}

export function useUserStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats>({
    averageScore: 0,
    highestScore: 0,
    bestStreak: 0,
    currentStreak: 0,
    currentElo: 1000,
    maxElo: 1000,
    gamesPlayed: 0,
    totalWins: 0,
    loading: true,
  });

  const loadUserStats = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Get player stats from the player_stats table
      const { data: playerStats, error: statsError } = await supabase
        .from('player_stats')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle missing records

      if (statsError && statsError.code !== 'PGRST116') {
        console.error('Error loading player stats:', statsError);
      }

      // Get all games for the user
      const { data: games, error: gamesError } = await supabase
        .from('games')
        .select('*')
        .eq('user_id', user.id)
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
          totalWins: playerStats?.total_wins || 0,
          currentStreak: playerStats?.current_win_streak || 0,
          bestStreak: playerStats?.max_win_streak || 0,
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

      // Use player_stats for win-related data, fallback to calculated values
      const totalWins =
        playerStats?.total_wins || calculateWinStats(games).totalWins;
      const currentStreak =
        playerStats?.current_win_streak ||
        calculateWinStats(games).currentStreak;
      const bestStreak =
        playerStats?.max_win_streak || calculateBestStreak(games);

      // Get Elo stats from elo_history table
      const { currentElo, maxElo } = await getEloStats(user.id);

      setStats({
        averageScore,
        highestScore,
        bestStreak,
        currentStreak,
        currentElo,
        maxElo,
        gamesPlayed,
        totalWins,
        loading: false,
      });
    } catch (error) {
      console.error('Error:', error);
      setStats((prev) => ({ ...prev, loading: false }));
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      loadUserStats();
    }
  }, [user, loadUserStats]);

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
      const { data: eloHistory, error } = await supabase
        .from('elo_history')
        .select('basic_elo')
        .eq('user_id', userId)
        .order('game_date', { ascending: false });

      if (error) {
        console.error('Error loading Elo history:', error);
        return { currentElo: 1000, maxElo: 1000 };
      }

      if (!eloHistory || eloHistory.length === 0) {
        return { currentElo: 1000, maxElo: 1000 };
      }

      const currentElo = eloHistory[0].basic_elo;
      const maxElo = Math.max(...eloHistory.map((h) => h.basic_elo));

      return { currentElo, maxElo };
    } catch (error) {
      console.error('Error getting Elo stats:', error);
      return { currentElo: 1000, maxElo: 1000 };
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

  return stats;
}
