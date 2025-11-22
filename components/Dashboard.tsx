import React, { useEffect, useState } from 'react';
import { User, UserStats, GameRecord, Difficulty, GameResult } from '../types';
import { calculateUserStats, getUserGames } from '../services/storageService';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Trophy, Target, Clock, Activity, History, Play } from 'lucide-react';

interface DashboardProps {
  user: User;
  onPlayGame: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onPlayGame }) => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [history, setHistory] = useState<GameRecord[]>([]);

  useEffect(() => {
    if (user) {
      const userStats = calculateUserStats(user.id);
      setStats(userStats);
      const games = getUserGames(user.id);
      setHistory(games.reverse()); // Newest first
    }
  }, [user]);

  if (!stats) return <div>Loading...</div>;

  const pieData = [
    { name: 'Wins', value: stats.wins, color: '#10b981' },
    { name: 'Draws', value: stats.draws, color: '#94a3b8' },
    { name: 'Losses', value: stats.losses, color: '#ef4444' },
  ];

  const barData = [
    { name: 'Easy', wins: stats.winsByDifficulty[Difficulty.EASY] },
    { name: 'Medium', wins: stats.winsByDifficulty[Difficulty.MEDIUM] },
    { name: 'Hard', wins: stats.winsByDifficulty[Difficulty.HARD] },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white">Welcome back, {user.username}!</h2>
          <p className="text-slate-400">Here is your grandmaster summary.</p>
        </div>
        <button 
          onClick={onPlayGame}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-900 px-6 py-3 rounded-lg font-bold shadow-lg shadow-amber-500/20 transition-all transform hover:scale-105"
        >
          <Play size={20} />
          New Game
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={<Trophy className="text-amber-400" />} 
          label="Total Wins" 
          value={stats.wins} 
          subtext={`Win Rate: ${stats.winRate}%`}
        />
        <StatCard 
          icon={<Activity className="text-blue-400" />} 
          label="Games Played" 
          value={stats.totalGames} 
        />
        <StatCard 
          icon={<Target className="text-green-400" />} 
          label="Avg. Accuracy" 
          value={`${stats.accuracyAverage}%`} 
        />
        <StatCard 
          icon={<Clock className="text-purple-400" />} 
          label="Member Since" 
          value={new Date(user.joinedAt).toLocaleDateString()} 
          subtext="Active Player"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Charts */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-xl font-bold mb-6 text-slate-200">Performance Overview</h3>
          <div className="h-64 flex items-center justify-center">
            {stats.totalGames === 0 ? (
              <p className="text-slate-500">No games played yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          {stats.totalGames > 0 && (
            <div className="flex justify-center gap-6 text-sm">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> Wins</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-400"></div> Draws</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div> Losses</div>
            </div>
          )}
        </div>

        {/* Recent History */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex flex-col">
          <h3 className="text-xl font-bold mb-6 text-slate-200 flex items-center gap-2">
            <History size={20} />
            Match History
          </h3>
          <div className="overflow-y-auto flex-grow max-h-[300px] pr-2">
            {history.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No games found.</p>
            ) : (
              <div className="space-y-3">
                {history.map((game) => (
                  <div key={game.id} className="bg-slate-700/50 p-3 rounded-lg flex items-center justify-between border border-slate-600 hover:border-slate-500 transition-colors">
                    <div className="flex flex-col">
                      <span className="font-bold text-white flex items-center gap-2">
                        vs {game.opponentName} 
                        {game.difficulty && <span className="text-xs bg-slate-600 px-1.5 py-0.5 rounded text-slate-300">{game.difficulty}</span>}
                      </span>
                      <span className="text-xs text-slate-400">{new Date(game.date).toLocaleString()}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`font-bold ${
                        game.result === GameResult.WIN ? 'text-emerald-400' : 
                        game.result === GameResult.LOSS ? 'text-red-400' : 'text-slate-300'
                      }`}>
                        {game.result}
                      </span>
                      <span className="text-xs text-slate-400">{game.resultDescription}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, subtext }: any) => (
  <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center gap-4">
    <div className="p-3 bg-slate-700/50 rounded-lg">{icon}</div>
    <div>
      <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {subtext && <p className="text-xs text-slate-500">{subtext}</p>}
    </div>
  </div>
);

export default Dashboard;