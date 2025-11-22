import { Chess, Move } from 'chess.js';
import { Difficulty } from '../types';

// Piece weights
const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Simplified Piece-Square Tables (PST) to encourage better positioning
// Mid-game preferences (Center control, advancement)
const PST_PAWN_WHITE = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5,  5, 10, 25, 25, 10,  5,  5],
  [0,  0,  0, 20, 20,  0,  0,  0],
  [5, -5,-10,  0,  0,-10, -5,  5],
  [5, 10, 10,-20,-20, 10, 10,  5],
  [0,  0,  0,  0,  0,  0,  0,  0]
];

const PST_KNIGHT = [
  [-50,-40,-30,-30,-30,-30,-40,-50],
  [-40,-20,  0,  0,  0,  0,-20,-40],
  [-30,  0, 10, 15, 15, 10,  0,-30],
  [-30,  5, 15, 20, 20, 15,  5,-30],
  [-30,  0, 15, 20, 20, 15,  0,-30],
  [-30,  5, 10, 15, 15, 10,  5,-30],
  [-40,-20,  0,  5,  5,  0,-20,-40],
  [-50,-40,-30,-30,-30,-30,-40,-50]
];

// Helper to reverse PST for Black
const reverseArray = (array: number[][]): number[][] => {
  return array.slice().reverse();
};

const PST_PAWN_BLACK = reverseArray(PST_PAWN_WHITE);

const evaluateBoard = (game: Chess): number => {
  let totalEvaluation = 0;
  const board = game.board();

  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const piece = board[i][j];
      if (piece) {
        const value = PIECE_VALUES[piece.type] || 0;
        
        // Position value calculation could be expanded here
        // For brevity, using a simplified approach or just raw material + basic PST for pawns/knights
        let positionValue = 0;
        if (piece.type === 'p') {
          positionValue = piece.color === 'w' ? PST_PAWN_WHITE[i][j] : PST_PAWN_BLACK[i][j];
        } else if (piece.type === 'n') {
            positionValue = PST_KNIGHT[i][j];
        }

        if (piece.color === 'w') {
          totalEvaluation += (value + positionValue);
        } else {
          totalEvaluation -= (value + positionValue);
        }
      }
    }
  }
  return totalEvaluation;
};

// Minimax with Alpha-Beta Pruning
const minimax = (
  game: Chess,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizingPlayer: boolean
): number => {
  if (depth === 0 || game.isGameOver()) {
    return evaluateBoard(game);
  }

  const moves = game.moves();

  if (isMaximizingPlayer) {
    let maxEval = -Infinity;
    for (const move of moves) {
      game.move(move);
      const evalVal = minimax(game, depth - 1, alpha, beta, false);
      game.undo();
      maxEval = Math.max(maxEval, evalVal);
      alpha = Math.max(alpha, evalVal);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      game.move(move);
      const evalVal = minimax(game, depth - 1, alpha, beta, true);
      game.undo();
      minEval = Math.min(minEval, evalVal);
      beta = Math.min(beta, evalVal);
      if (beta <= alpha) break;
    }
    return minEval;
  }
};

export const getBestMove = (game: Chess, difficulty: Difficulty): Promise<string | null> => {
  return new Promise((resolve) => {
    // Use setTimeout to allow UI to render before heavy calc
    setTimeout(() => {
      const moves = game.moves();
      if (moves.length === 0) {
        resolve(null);
        return;
      }

      // Easy: Random move
      if (difficulty === Difficulty.EASY) {
        const randomIndex = Math.floor(Math.random() * moves.length);
        resolve(moves[randomIndex]);
        return;
      }

      // Medium/Hard: Minimax
      // Depth 2 for Medium, 3 for Hard (JS is single threaded, 4 might freeze too long)
      const depth = difficulty === Difficulty.MEDIUM ? 2 : 3;
      let bestMove = null;
      let bestValue = game.turn() === 'w' ? -Infinity : Infinity;
      const isMaximizing = game.turn() === 'w';

      // Optimization: Shuffle moves to prevent deterministic behavior on equal evals
      // and potentially improve pruning
      const shuffledMoves = moves.sort(() => Math.random() - 0.5);

      for (const move of shuffledMoves) {
        game.move(move);
        // After making a move, it's the other player's turn, so we call minimax with !isMaximizing
        const boardValue = minimax(game, depth - 1, -Infinity, Infinity, !isMaximizing);
        game.undo();

        if (isMaximizing) {
          if (boardValue > bestValue) {
            bestValue = boardValue;
            bestMove = move;
          }
        } else {
          if (boardValue < bestValue) {
            bestValue = boardValue;
            bestMove = move;
          }
        }
      }

      resolve(bestMove || moves[0]);
    }, 100);
  });
};

// Simple accuracy simulator (Mock)
export const calculateAccuracy = (gameHistory: string[], difficulty: Difficulty): number => {
  // In a real app, this would compare user moves to Stockfish best moves.
  // Here, we simulate accuracy based on game length and difficulty won against.
  let base = 70;
  if (difficulty === Difficulty.HARD) base = 85;
  if (difficulty === Difficulty.MEDIUM) base = 75;
  return Math.min(99, Math.floor(base + Math.random() * 15));
};
