import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

interface ScoreData {
  round1: string;
  round2: string;
  round3: string;
  totalScore: number;
  gameDate: string;
}

export function ScoreSubmission() {
  const { user } = useAuth();
  const [scoreData, setScoreData] = useState<ScoreData>({
    round1: '',
    round2: '',
    round3: '',
    totalScore: 0,
    gameDate: new Date().toISOString().split('T')[0],
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const calculateTotal = (round1: string, round2: string, round3: string) => {
    const r1 = parseInt(round1) || 0;
    const r2 = parseInt(round2) || 0;
    const r3 = parseInt(round3) || 0;
    return r1 + r2 + r3;
  };

  const handleScoreChange = (
    round: keyof Pick<ScoreData, 'round1' | 'round2' | 'round3'>,
    value: string
  ) => {
    const newScoreData = { ...scoreData, [round]: value };
    const total = calculateTotal(
      newScoreData.round1,
      newScoreData.round2,
      newScoreData.round3
    );
    setScoreData({ ...newScoreData, totalScore: total });
  };

  const validateScores = () => {
    const r1 = parseInt(scoreData.round1) || 0;
    const r2 = parseInt(scoreData.round2) || 0;
    const r3 = parseInt(scoreData.round3) || 0;

    if (r1 < 0 || r2 < 0 || r3 < 0) {
      return 'Scores cannot be negative';
    }
    if (r1 > 5000 || r2 > 5000 || r3 > 5000) {
      return 'Individual round scores cannot exceed 5,000';
    }
    if (scoreData.totalScore > 15000) {
      return 'Total score cannot exceed 15,000';
    }
    if (scoreData.totalScore === 0) {
      return 'Please enter at least one score';
    }
    return null;
  };

  const handleCopyScore = () => {
    const { round1, round2, round3, totalScore } = scoreData;
    const scoreString = `${round1}+${round2}+${round3}=${totalScore}`;
    navigator.clipboard.writeText(scoreString);
    setMessage('Score copied to clipboard!');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');

    const validationError = validateScores();
    if (validationError) {
      setMessage(validationError);
      setSubmitting(false);
      return;
    }

    try {
      const { error } = await supabase.from('games').insert([
        {
          game_date: scoreData.gameDate,
          user_id: user?.id,
          round1_score: parseInt(scoreData.round1) || 0,
          round2_score: parseInt(scoreData.round2) || 0,
          round3_score: parseInt(scoreData.round3) || 0,
          // total_score is automatically calculated by the database
        },
      ]);

      if (error) {
        if (error.code === '23505') {
          setMessage('You have already submitted a score for this date');
        } else {
          setMessage('Error submitting score: ' + error.message);
        }
      } else {
        setMessage('Score submitted successfully!');
        // Reset form
        setScoreData({
          round1: '',
          round2: '',
          round3: '',
          totalScore: 0,
          gameDate: new Date().toISOString().split('T')[0],
        });
      }
    } catch {
      setMessage('An error occurred while submitting score');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Submit Today's Score
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Enter your GeoGuessr scores for today's challenge. Each round has a
          maximum of 5,000 points.
        </p>
      </div>

      {/* Score Submission Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Date Selection */}
          <div>
            <label
              htmlFor="gameDate"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Game Date
            </label>
            <input
              type="date"
              id="gameDate"
              value={scoreData.gameDate}
              onChange={(e) =>
                setScoreData({ ...scoreData, gameDate: e.target.value })
              }
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Round Scores */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label
                htmlFor="round1"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Round 1 Score
              </label>
              <input
                type="number"
                id="round1"
                value={scoreData.round1}
                onChange={(e) => handleScoreChange('round1', e.target.value)}
                min="0"
                max="5000"
                placeholder="0-5000"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="round2"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Round 2 Score
              </label>
              <input
                type="number"
                id="round2"
                value={scoreData.round2}
                onChange={(e) => handleScoreChange('round2', e.target.value)}
                min="0"
                max="5000"
                placeholder="0-5000"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="round3"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Round 3 Score
              </label>
              <input
                type="number"
                id="round3"
                value={scoreData.round3}
                onChange={(e) => handleScoreChange('round3', e.target.value)}
                min="0"
                max="5000"
                placeholder="0-5000"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Total Score Display */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex justify-between items-center gap-4">
              <span className="text-lg font-medium text-gray-900 dark:text-white">
                Total Score
              </span>
              <div className="flex gap-2 items-center">
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {scoreData.totalScore.toLocaleString()}
                </span>
                <button
                  type="button"
                  onClick={handleCopyScore}
                  className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-3 py-1 rounded-md text-sm font-medium"
                  disabled={scoreData.totalScore === 0}
                >
                  Copy Score
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Maximum possible: 15,000 points
            </p>
          </div>

          
          {/* Message Display */}
          {message && (
            <div
              className={`text-sm p-3 rounded-md ${
                message.includes('Error') ||
                message.includes('already submitted')
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                  : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
              }`}
            >
              {message}
            </div>
          )}

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={submitting || scoreData.totalScore === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-md text-lg font-medium transition-colors"
            >
              {submitting ? 'Submitting...' : 'Submit Score'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
