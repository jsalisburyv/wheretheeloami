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
      // Get player stats
      const { data: playerStats, error: statsError } = await supabase
        .from('player_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Get all games for the user
      const { data: games, error: gamesError } = await supabase
        .from('games')
        .select('*')
        .eq('user_id', user.id)
        .order('game_date', { ascending: false });

      if (statsError && statsError.code !== 'PGRST116') {
        console.error('Error loading player stats:', statsError);
      }

      if (gamesError) {
        console.error('Error loading games:', gamesError);
        return;
      }

      if (!games || games.length === 0) {
        setStats((prev) => ({
          ...prev,
          gamesPlayed: 0,
          totalWins: playerStats?.total_wins || 0,
          currentStreak: playerStats?.current_win_streak || 0,
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

      // Use player_stats for win-related data
      const totalWins = playerStats?.total_wins || 0;
      const currentStreak = playerStats?.current_win_streak || 0;

      // Calculate best streak from games (this might need to be stored in player_stats)
      const bestStreak = calculateBestStreak(games);

      // For now, using placeholder Elo values (you'll need to implement Elo calculation)
      const currentElo = 1200; // This should come from your Elo system
      const maxElo = 1200; // This should come from your Elo system

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
