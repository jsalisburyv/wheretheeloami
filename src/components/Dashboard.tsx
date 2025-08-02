import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useUserStats } from '../hooks/useUserStats';
import { supabase } from '../lib/supabase';
import { ProfilePage } from './ProfilePage';
import { ScoreSubmission } from './ScoreSubmission';
import { Leaderboard } from './Leaderboard';
import { UserProfile } from './UserProfile';
import { HistoryChart } from './HistoryChart';
import { StatsCard } from './StatsCard';

export function Dashboard() {
  const { user } = useAuth();
  const userStats = useUserStats();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [updatingElo, setUpdatingElo] = useState(false);
  const [eloUpdateMessage, setEloUpdateMessage] = useState('');

  // Get display name: display_name from metadata if set, otherwise email prefix
  const getDisplayName = () => {
    const displayName = user?.user_metadata?.display_name;
    if (displayName) {
      return displayName;
    }
    return user?.email?.split('@')[0] || 'User';
  };

  // Listen for hash changes
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#profile') {
        setCurrentPage('profile');
      } else if (window.location.hash === '#submit-score') {
        setCurrentPage('submit-score');
      } else if (window.location.hash === '#leaderboard') {
        setCurrentPage('leaderboard');
      } else if (window.location.hash.startsWith('#user-')) {
        setCurrentPage('user-profile');
      } else {
        setCurrentPage('dashboard');
      }
    };

    // Set initial page based on hash
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Show profile page if current page is profile
  if (currentPage === 'profile') {
    return <ProfilePage />;
  }

  // Show score submission page if current page is submit-score
  if (currentPage === 'submit-score') {
    return <ScoreSubmission />;
  }

  // Show leaderboard page if current page is leaderboard
  if (currentPage === 'leaderboard') {
    return <Leaderboard />;
  }

  // Show user profile page if current page is user-profile
  if (currentPage === 'user-profile') {
    const userId = window.location.hash.replace('#user-', '');
    return <UserProfile userId={userId} />;
  }

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

  const updateEloRatings = async () => {
    setUpdatingElo(true);
    setEloUpdateMessage('');

    try {
      // Get current session for access token
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setEloUpdateMessage('Error: Not authenticated');
        return;
      }

      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elo-update`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({
              game_date: new Date().toISOString().split('T')[0],
            }),
          }
        );

        const responseText = await response.text();

        let result;
        try {
          result = responseText ? JSON.parse(responseText) : {};
        } catch (parseError) {
          console.error('JSON Parse Error:', parseError);
          setEloUpdateMessage(
            `Error: Invalid response from server - ${responseText}`
          );
          return;
        }

        if (!response.ok) {
          setEloUpdateMessage(
            `Error: ${result.error || 'Failed to update Elo ratings'} (Status: ${response.status})`
          );
        } else {
          setEloUpdateMessage(
            `Success! ${result.message || 'Elo ratings updated successfully.'}`
          );
          window.location.reload();
        }
      } catch (fetchError) {
        console.error('Fetch Error:', fetchError);
        setEloUpdateMessage(
          `Error: ${fetchError instanceof Error ? fetchError.message : 'Unknown error occurred'}`
        );
      }
    } catch (err) {
      console.error('Edge Function Error:', err);
      setEloUpdateMessage(
        `Error: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    } finally {
      setUpdatingElo(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome back, {getDisplayName()}!
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Ready for today's GeoGuessr challenge? Submit your score and see
              how you rank against your friends.
            </p>
          </div>
          <button
            onClick={updateEloRatings}
            disabled={updatingElo}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            {updatingElo ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Updating...</span>
              </>
            ) : (
              <>
                <span>⚡</span>
                <span>Update Elo</span>
              </>
            )}
          </button>
        </div>
        {eloUpdateMessage && (
          <div
            className={`mt-4 p-3 rounded-lg text-sm ${
              eloUpdateMessage.startsWith('Error')
                ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                : 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
            }`}
          >
            {eloUpdateMessage}
          </div>
        )}
      </div>

      {/* Stats Cards - Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Basic Elo"
          value={userStats.currentElo}
          icon="🏆"
          iconBgColor="bg-blue-100 dark:bg-blue-900"
          iconColor="text-blue-600 dark:text-blue-400"
          loading={userStats.loading}
        />
        <StatsCard
          title="Margin Elo"
          value={userStats.currentMarginElo}
          icon="⚡"
          iconBgColor="bg-indigo-100 dark:bg-indigo-900"
          iconColor="text-indigo-600 dark:text-indigo-400"
          loading={userStats.loading}
        />
        <StatsCard
          title="Current Streak"
          value={userStats.currentStreak}
          icon="🔥"
          iconBgColor="bg-green-100 dark:bg-green-900"
          iconColor="text-green-600 dark:text-green-400"
          loading={userStats.loading}
        />
        <StatsCard
          title="Total Wins"
          value={userStats.totalWins}
          icon="🏁"
          iconBgColor="bg-emerald-100 dark:bg-emerald-900"
          iconColor="text-emerald-600 dark:text-emerald-400"
          loading={userStats.loading}
        />
      </div>

      {/* Stats Cards - Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Max Basic Elo"
          value={userStats.maxElo}
          icon="🏅"
          iconBgColor="bg-red-100 dark:bg-red-900"
          iconColor="text-red-600 dark:text-red-400"
          loading={userStats.loading}
        />
        <StatsCard
          title="Max Margin Elo"
          value={userStats.maxMarginElo}
          icon="💎"
          iconBgColor="bg-orange-100 dark:bg-orange-900"
          iconColor="text-orange-600 dark:text-orange-400"
          loading={userStats.loading}
        />
        <StatsCard
          title="Best Streak"
          value={userStats.bestStreak}
          icon="⭐"
          iconBgColor="bg-yellow-100 dark:bg-yellow-900"
          iconColor="text-yellow-600 dark:text-yellow-400"
          loading={userStats.loading}
        />
        <StatsCard
          title="Games Played"
          value={userStats.gamesPlayed}
          icon="📊"
          iconBgColor="bg-purple-100 dark:bg-purple-900"
          iconColor="text-purple-600 dark:text-purple-400"
          loading={userStats.loading}
        />
      </div>

      {/* Stats Cards - Row 3 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Average Score"
          value={userStats.averageScore}
          icon="📈"
          iconBgColor="bg-cyan-100 dark:bg-cyan-900"
          iconColor="text-cyan-600 dark:text-cyan-400"
          loading={userStats.loading}
        />
        <StatsCard
          title="Best Score"
          value={userStats.highestScore}
          icon="🎯"
          iconBgColor="bg-pink-100 dark:bg-pink-900"
          iconColor="text-pink-600 dark:text-pink-400"
          loading={userStats.loading}
        />
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
