export enum GameMode {
  PVE = 'PVE', // Human vs AI
  PVP_LOCAL = 'PVP_LOCAL', // Local pass and play
  PVP_ONLINE = 'PVP_ONLINE', // Simulated online via storage events
}

export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

export enum GameResult {
  WIN = 'WIN',
  LOSS = 'LOSS',
  DRAW = 'DRAW',
  ONGOING = 'ONGOING',
}

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  passwordHash: string; // Simulated hash
  joinedAt: string;
}

export interface GameRecord {
  id: string;
  date: string;
  mode: GameMode;
  difficulty?: Difficulty; // Only for PvE
  opponentName: string;
  result: GameResult; // Perspective of the logged-in user
  resultDescription: string; // e.g., "Checkmate", "Stalemate"
  moves: string; // PGN or Move string
  accuracy?: number; // Simulated accuracy metric
}

export interface UserStats {
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  accuracyAverage: number;
  winsByDifficulty: {
    [key in Difficulty]: number;
  };
}

export interface GameState {
  fen: string;
  turn: 'w' | 'b';
  isCheck: boolean;
  isCheckmate: boolean;
  isDraw: boolean;
  isStalemate: boolean;
  gameOver: boolean;
  winner: 'w' | 'b' | null;
  history: string[];
}