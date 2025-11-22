import React, { useState, useEffect } from 'react';
import { Chess, Square, Move } from 'chess.js';
import { PIECE_PATHS, BOARD_THEME } from '../constants';
import { clsx } from 'clsx';

interface ChessBoardProps {
  game: Chess;
  onMove: (from: Square, to: Square) => boolean;
  boardOrientation?: 'white' | 'black';
  isLocked?: boolean;
}

const ChessBoard: React.FC<ChessBoardProps> = ({
  game,
  onMove,
  boardOrientation = 'white',
  isLocked = false,
}) => {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<Square[]>([]);
  const [board, setBoard] = useState(game.board());
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);

  // Update board when game state changes
  useEffect(() => {
    setBoard(game.board());
    
    // Extract last move from history if available
    const history = game.history({ verbose: true });
    if (history.length > 0) {
      const last = history[history.length - 1];
      setLastMove({ from: last.from, to: last.to });
    } else {
      setLastMove(null);
    }
  }, [game, game.fen()]); // Re-render on FEN change

  const handleSquareClick = (square: Square) => {
    if (isLocked) return;

    const piece = game.get(square);
    const isMyPiece = piece && piece.color === (game.turn());

    // If selecting a piece to move
    if (isMyPiece) {
      if (selectedSquare === square) {
        // Deselect
        setSelectedSquare(null);
        setPossibleMoves([]);
      } else {
        // Select new
        setSelectedSquare(square);
        const moves = game.moves({ square, verbose: true }) as Move[];
        setPossibleMoves(moves.map((m) => m.to));
      }
      return;
    }

    // If clicking an empty square or enemy piece (attempting move)
    if (selectedSquare) {
      const success = onMove(selectedSquare, square);
      if (success) {
        setSelectedSquare(null);
        setPossibleMoves([]);
      } else {
        // Invalid move, just deselect if clicked elsewhere
        setSelectedSquare(null);
        setPossibleMoves([]);
      }
    }
  };

  // Helper to generate files/ranks based on orientation
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  const displayFiles = boardOrientation === 'white' ? files : [...files].reverse();
  const displayRanks = boardOrientation === 'white' ? ranks : [...ranks].reverse();

  return (
    <div className="w-full max-w-[600px] mx-auto aspect-square select-none shadow-xl rounded-lg overflow-hidden border-4 border-slate-700">
      <div className="grid grid-rows-8 h-full w-full">
        {displayRanks.map((rank, rIndex) => (
          <div key={rank} className="grid grid-cols-8 h-full w-full">
            {displayFiles.map((file, cIndex) => {
              const square = `${file}${rank}` as Square;
              const isLight = (rIndex + cIndex) % 2 === 0;
              const bgClass = isLight ? 'bg-[#f0d9b5]' : 'bg-[#b58863]';
              
              const piece = game.get(square);
              const isSelected = selectedSquare === square;
              const isPossibleMove = possibleMoves.includes(square);
              const isLastMove = lastMove && (lastMove.from === square || lastMove.to === square);

              // Check if king is in check
              const isKingInCheck = piece?.type === 'k' && piece.color === game.turn() && game.inCheck();

              return (
                <div
                  key={square}
                  className={clsx(
                    'relative flex items-center justify-center w-full h-full cursor-pointer',
                    bgClass
                  )}
                  onClick={() => handleSquareClick(square)}
                >
                  {/* Last move highlight */}
                  {isLastMove && (
                    <div className="absolute inset-0 bg-yellow-200 opacity-40" />
                  )}

                  {/* Selected highlight */}
                  {isSelected && (
                    <div className="absolute inset-0 bg-[rgba(255,255,0,0.5)]" />
                  )}

                  {/* Possible Move indicator */}
                  {isPossibleMove && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                      {!piece ? (
                        <div className="w-3 h-3 rounded-full bg-[rgba(0,0,0,0.2)]" />
                      ) : (
                        <div className="absolute inset-0 border-4 border-[rgba(0,0,0,0.2)] rounded-full" />
                      )}
                    </div>
                  )}

                  {/* King in check - Red Glow */}
                  {isKingInCheck && (
                    <div className="absolute inset-0 bg-red-500 opacity-50 animate-pulse" />
                  )}

                  {/* Coordinate Labels (Optional, mostly for corners) */}
                  {cIndex === 0 && boardOrientation === 'white' && (
                    <span className={clsx("absolute top-0.5 left-0.5 text-[10px] font-bold", isLight ? "text-[#b58863]" : "text-[#f0d9b5]")}>
                      {rank}
                    </span>
                  )}
                   {rIndex === 7 && boardOrientation === 'white' && (
                    <span className={clsx("absolute bottom-0.5 right-0.5 text-[10px] font-bold", isLight ? "text-[#b58863]" : "text-[#f0d9b5]")}>
                      {file}
                    </span>
                  )}

                  {/* Piece */}
                  {piece && (
                    <div className="w-[85%] h-[85%] z-20 pointer-events-none transition-transform duration-200">
                      <svg viewBox="0 0 45 45" className="w-full h-full drop-shadow-sm">
                        <path
                          fill={piece.color === 'w' ? '#fff' : '#000'}
                          stroke={piece.color === 'w' ? '#000' : '#fff'}
                          strokeWidth="1.5"
                          d={PIECE_PATHS[piece.type]}
                        />
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChessBoard;
