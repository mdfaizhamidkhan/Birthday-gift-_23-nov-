import { GameRecord, GameResult, User, UserStats, Difficulty } from '../types';

const USERS_KEY = 'chess_app_users';
const GAMES_KEY = 'chess_app_games';
const CURRENT_USER_KEY = 'chess_app_current_user_id';

// Helper to simulate delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const saveUser = (user: User): void => {
  const users = getUsers();
  users.push(user);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const getUsers = (): User[] => {
  const stored = localStorage.getItem(USERS_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const getUserById = (id: string): User | undefined => {
  return getUsers().find(u => u.id === id);
};

export const getUserByEmail = (email: string): User | undefined => {
  return getUsers().find(u => u.email === email);
};

export const setCurrentUserSession = (id: string) => {
  localStorage.setItem(CURRENT_USER_KEY, id);
};

export const clearUserSession = () => {
  localStorage.removeItem(CURRENT_USER_KEY);
};

export const getCurrentUserId = (): string | null => {
  return localStorage.getItem(CURRENT_USER_KEY);
};

// Game Storage
export const saveGameRecord = (userId: string, game: GameRecord) => {
  const allGames = getAllGames();
  if (!allGames[userId]) {
    allGames[userId] = [];
  }
  allGames[userId].push(game);
  localStorage.setItem(GAMES_KEY, JSON.stringify(allGames));
};

export const getAllGames = (): Record<string, GameRecord[]> => {
  const stored = localStorage.getItem(GAMES_KEY);
  return stored ? JSON.parse(stored) : {};
};

export const getUserGames = (userId: string): GameRecord[] => {
  const all = getAllGames();
  return all[userId] || [];
};

export const calculateUserStats = (userId: string): UserStats => {
  const games = getUserGames(userId);
  
  const wins = games.filter(g => g.result === GameResult.WIN).length;
  const losses = games.filter(g => g.result === GameResult.LOSS).length;
  const draws = games.filter(g => g.result === GameResult.DRAW).length;
  
  const totalGames = games.length;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
  
  // Calculate average accuracy
  const totalAccuracy = games.reduce((acc, g) => acc + (g.accuracy || 0), 0);
  const accuracyAverage = totalGames > 0 ? Math.round(totalAccuracy / totalGames) : 0;

  const winsByDifficulty = {
    [Difficulty.EASY]: games.filter(g => g.result === GameResult.WIN && g.difficulty === Difficulty.EASY).length,
    [Difficulty.MEDIUM]: games.filter(g => g.result === GameResult.WIN && g.difficulty === Difficulty.MEDIUM).length,
    [Difficulty.HARD]: games.filter(g => g.result === GameResult.WIN && g.difficulty === Difficulty.HARD).length,
  };

  return {
    totalGames,
    wins,
    losses,
    draws,
    winRate,
    accuracyAverage,
    winsByDifficulty
  };
};