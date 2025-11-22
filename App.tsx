import React, { useState, useEffect, useRef } from 'react';
import { Chess, Square } from 'chess.js';
import Layout from './components/Layout';
import ChessBoard from './components/ChessBoard';
import Dashboard from './components/Dashboard';
import { GameMode, Difficulty, User, GameResult, GameRecord } from './types';
import { login, register } from './services/authService';
import { getCurrentUserId, getUserById, saveGameRecord, clearUserSession, setCurrentUserSession } from './services/storageService';
import { getBestMove, calculateAccuracy } from './services/chessEngine';
import { v4 as uuidv4 } from 'uuid'; // Assuming uuid can be simulated or just use Math.random
import { Play, Cpu, Users, Wifi } from 'lucide-react';

// Utility for ID generation if uuid missing
const generateId = () => Math.random().toString(36).substr(2, 9);

const App = () => {
  // -- State --
  const [view, setView] = useState<'landing' | 'login' | 'register' | 'dashboard' | 'game'>('landing');
  const [user, setUser] = useState<User | null>(null);
  
  // Game Config
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.PVE);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.EASY);
  
  // Active Game State
  const [game, setGame] = useState(new Chess());
  const [orientation, setOrientation] = useState<'white' | 'black'>('white');
  const [gameOverStatus, setGameOverStatus] = useState<{over: boolean; result: string} | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  
  // Simulated Online Sync
  const syncIdRef = useRef<string | null>(null);

  // -- Effects --
  
  // Check Auth on Mount
  useEffect(() => {
    const userId = getCurrentUserId();
    if (userId) {
      const u = getUserById(userId);
      if (u) {
        setUser(u);
        setView('dashboard');
      }
    }
  }, []);

  // AI Move Effect
  useEffect(() => {
    if (gameMode === GameMode.PVE && !game.isGameOver() && game.turn() === 'b') {
      makeAIMove();
    }
  }, [game.fen()]);

  // Simulated Online Listener
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'online_move' && gameMode === GameMode.PVP_ONLINE) {
        const data = JSON.parse(e.newValue || '{}');
        if (data.id === syncIdRef.current && data.fen !== game.fen()) {
          const newGame = new Chess(data.fen);
          setGame(newGame);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [gameMode, game]);

  // -- Logic --

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const result = await login(formData.get('email') as string, formData.get('password') as string);
    if (result.success && result.user) {
      setUser(result.user);
      setCurrentUserSession(result.user.id);
      setView('dashboard');
    } else {
      alert(result.message);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const result = await register(
      formData.get('username') as string,
      formData.get('email') as string,
      formData.get('password') as string,
      formData.get('fullName') as string
    );
    if (result.success && result.user) {
      setUser(result.user);
      setCurrentUserSession(result.user.id);
      setView('dashboard');
    } else {
      alert(result.message);
    }
  };

  const startGame = (mode: GameMode, diff?: Difficulty) => {
    const newGame = new Chess();
    setGame(newGame);
    setGameMode(mode);
    if (diff) setDifficulty(diff);
    setGameOverStatus(null);
    setView('game');
    setOrientation('white'); // Player is always white in PvE for this demo
    
    if (mode === GameMode.PVP_ONLINE) {
      const id = generateId();
      syncIdRef.current = id;
      localStorage.setItem('online_move', JSON.stringify({ id, fen: newGame.fen() }));
      alert(`Simulated Online Mode Active. Open this page in another tab and join game ID: ${id} (Mock Implementation)`);
    }
  };

  const handleMove = (from: Square, to: Square): boolean => {
    try {
      const move = game.move({ from, to, promotion: 'q' });
      if (move) {
        const newGame = new Chess(game.fen());
        setGame(newGame);
        checkGameOver(newGame);
        
        // Sync for online
        if (gameMode === GameMode.PVP_ONLINE && syncIdRef.current) {
          localStorage.setItem('online_move', JSON.stringify({ id: syncIdRef.current, fen: newGame.fen() }));
        }
        return true;
      }
    } catch (e) {
      return false;
    }
    return false;
  };

  const makeAIMove = async () => {
    setIsThinking(true);
    const moveStr = await getBestMove(game, difficulty);
    setIsThinking(false);
    
    if (moveStr) {
      try {
          // getBestMove returns verbose object or string? My engine returns object usually, but adapted to return move object. 
          // Checking engine implementation: returns Move object or string? 
          // chess.js moves() returns strings by default or objects if verbose: true.
          // My engine returns {from, to} objects or strings from moves().
          // Let's handle both to be safe, though my engine currently returns a move Object or String.
          game.move(moveStr);
          const newGame = new Chess(game.fen());
          setGame(newGame);
          checkGameOver(newGame);
      } catch(e) {
          console.error("AI Move Error", e);
      }
    }
  };

  const checkGameOver = (currentGameState: Chess) => {
    if (currentGameState.isGameOver()) {
      let resultDescription = '';
      let result = GameResult.DRAW;

      if (currentGameState.isCheckmate()) {
        const winner = currentGameState.turn() === 'w' ? 'Black' : 'White';
        resultDescription = `${winner} wins by Checkmate`;
        // If Player is White (PvE), and Winner is White -> Win.
        // If PvP, we need to track who is who. Assuming Local PvP implies no specific tracking.
        // For Stats, only track PvE or Online where Identity is known.
        
        if (gameMode === GameMode.PVE) {
            result = winner === 'White' ? GameResult.WIN : GameResult.LOSS;
        }
      } else if (currentGameState.isDraw()) {
        resultDescription = 'Draw';
        result = GameResult.DRAW;
      } else if (currentGameState.isStalemate()) {
        resultDescription = 'Draw by Stalemate';
      }

      setGameOverStatus({ over: true, result: resultDescription });

      // Save Record
      if (user) {
        const record: GameRecord = {
          id: generateId(),
          date: new Date().toISOString(),
          mode: gameMode,
          difficulty: gameMode === GameMode.PVE ? difficulty : undefined,
          opponentName: gameMode === GameMode.PVE ? `AI (${difficulty})` : 'Human',
          result: result,
          resultDescription,
          moves: currentGameState.pgn(),
          accuracy: calculateAccuracy(currentGameState.history(), difficulty)
        };
        saveGameRecord(user.id, record);
      }
    }
  };

  const onLogout = () => {
    clearUserSession();
    setUser(null);
    setView('landing');
  };

  // -- Renders --

  const renderLanding = () => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-8 animate-in zoom-in duration-500">
      <div className="space-y-2">
        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight">
          Master the <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-600">Game of Kings</span>
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto">
          Play against adaptive AI, challenge friends locally, or analyze your games with advanced statistics.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl px-4">
        <div 
          onClick={() => setView('login')} 
          className="group cursor-pointer bg-slate-800/50 border border-slate-700 hover:border-amber-500/50 p-8 rounded-2xl transition-all hover:-translate-y-1"
        >
          <Cpu className="w-12 h-12 text-amber-500 mb-4 mx-auto group-hover:scale-110 transition-transform" />
          <h3 className="text-xl font-bold text-white mb-2">Play vs Computer</h3>
          <p className="text-slate-400 text-sm">Challenge our engine with 3 difficulty levels suitable for all skills.</p>
        </div>
        <div 
           onClick={() => setView('login')} 
           className="group cursor-pointer bg-slate-800/50 border border-slate-700 hover:border-blue-500/50 p-8 rounded-2xl transition-all hover:-translate-y-1"
        >
          <Users className="w-12 h-12 text-blue-500 mb-4 mx-auto group-hover:scale-110 transition-transform" />
          <h3 className="text-xl font-bold text-white mb-2">Local PvP</h3>
          <p className="text-slate-400 text-sm">Play with a friend on the same device. Classic face-to-face chess.</p>
        </div>
         <div 
           onClick={() => setView('login')} 
           className="group cursor-pointer bg-slate-800/50 border border-slate-700 hover:border-emerald-500/50 p-8 rounded-2xl transition-all hover:-translate-y-1"
        >
          <Wifi className="w-12 h-12 text-emerald-500 mb-4 mx-auto group-hover:scale-110 transition-transform" />
          <h3 className="text-xl font-bold text-white mb-2">Online</h3>
          <p className="text-slate-400 text-sm">Simulated online play with move synchronization across tabs.</p>
        </div>
      </div>
    </div>
  );

  const renderAuth = (type: 'login' | 'register') => (
    <div className="flex justify-center items-center min-h-[60vh]">
      <div className="w-full max-w-md bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700">
        <h2 className="text-3xl font-bold text-white mb-6 text-center">
          {type === 'login' ? 'Welcome Back' : 'Create Account'}
        </h2>
        <form onSubmit={type === 'login' ? handleLogin : handleRegister} className="space-y-4">
          {type === 'register' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Full Name</label>
                <input name="fullName" required type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-amber-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Username</label>
                <input name="username" required type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-amber-500 outline-none" />
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
            <input name="email" required type="email" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-amber-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Password</label>
            <input name="password" required type="password" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-amber-500 outline-none" />
          </div>
          
          <button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-3 rounded-lg transition-colors mt-4">
            {type === 'login' ? 'Sign In' : 'Register'}
          </button>
        </form>
        <p className="text-center mt-6 text-slate-400 text-sm">
          {type === 'login' ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => setView(type === 'login' ? 'register' : 'login')} className="text-amber-500 hover:underline font-bold">
            {type === 'login' ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  );

  const renderGameSetup = () => (
    // If user wants to play, we can show a modal or just render dashboard with a "New Game" overlay.
    // For simplicity, Dashboard calls startGame directly.
    // However, we need to select mode.
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-800 p-8 rounded-2xl max-w-2xl w-full border border-slate-700 shadow-2xl">
        <h2 className="text-3xl font-bold text-white mb-8 text-center">Choose Your Arena</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
           <button onClick={() => setGameMode(GameMode.PVE)} className={`p-4 rounded-xl border-2 transition-all ${gameMode === GameMode.PVE ? 'border-amber-500 bg-amber-500/10' : 'border-slate-600 hover:border-slate-500'}`}>
             <Cpu className="w-8 h-8 mb-2 mx-auto text-amber-500"/>
             <div className="font-bold">Vs Computer</div>
           </button>
           <button onClick={() => setGameMode(GameMode.PVP_LOCAL)} className={`p-4 rounded-xl border-2 transition-all ${gameMode === GameMode.PVP_LOCAL ? 'border-amber-500 bg-amber-500/10' : 'border-slate-600 hover:border-slate-500'}`}>
             <Users className="w-8 h-8 mb-2 mx-auto text-blue-500"/>
             <div className="font-bold">Local PvP</div>
           </button>
            <button onClick={() => setGameMode(GameMode.PVP_ONLINE)} className={`p-4 rounded-xl border-2 transition-all ${gameMode === GameMode.PVP_ONLINE ? 'border-amber-500 bg-amber-500/10' : 'border-slate-600 hover:border-slate-500'}`}>
             <Wifi className="w-8 h-8 mb-2 mx-auto text-emerald-500"/>
             <div className="font-bold">Online</div>
           </button>
        </div>

        {gameMode === GameMode.PVE && (
           <div className="mb-8">
             <label className="block text-sm font-bold text-slate-400 mb-3">Select Difficulty</label>
             <div className="flex gap-4">
               {[Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD].map((d) => (
                 <button 
                   key={d}
                   onClick={() => setDifficulty(d)}
                   className={`flex-1 py-2 px-4 rounded-lg font-bold text-sm border transition-all ${difficulty === d ? 'bg-amber-500 text-slate-900 border-amber-500' : 'bg-slate-900 border-slate-600 text-slate-300 hover:border-slate-500'}`}
                 >
                   {d}
                 </button>
               ))}
             </div>
           </div>
        )}

        <div className="flex gap-4">
          <button onClick={() => setView('dashboard')} className="flex-1 py-3 font-bold text-slate-400 hover:text-white">Cancel</button>
          <button onClick={() => startGame(gameMode, difficulty)} className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-3 rounded-lg shadow-lg shadow-amber-500/20">
            Start Game
          </button>
        </div>
      </div>
    </div>
  );

  const renderGame = () => (
    <div className="flex flex-col items-center space-y-6 w-full max-w-4xl mx-auto animate-in fade-in duration-500">
      {/* Game Status Bar */}
      <div className="w-full flex items-center justify-between bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg">
        <div className="flex items-center gap-4">
            <div className="flex flex-col">
                <span className="text-xs text-slate-400 font-bold uppercase">Opponent</span>
                <span className="text-lg font-bold text-white">
                    {gameMode === GameMode.PVE ? `Computer (${difficulty})` : 'Player 2'}
                </span>
            </div>
        </div>
        <div className="text-xl font-black font-mono text-amber-500">
           {gameOverStatus ? 'GAME OVER' : game.turn() === 'w' ? "WHITE'S TURN" : "BLACK'S TURN"}
        </div>
        <div className="flex items-center gap-4 text-right">
            <div className="flex flex-col">
                <span className="text-xs text-slate-400 font-bold uppercase">You</span>
                <span className="text-lg font-bold text-white">{user?.username || 'Player 1'}</span>
            </div>
        </div>
      </div>

      {/* Board Wrapper */}
      <div className="relative">
        <ChessBoard 
            game={game} 
            onMove={handleMove} 
            boardOrientation={orientation}
            isLocked={gameOverStatus !== null || (gameMode === GameMode.PVE && game.turn() === 'b')} 
        />
        
        {/* AI Thinking Overlay */}
        {isThinking && (
            <div className="absolute top-4 right-4 bg-black/70 text-white px-4 py-2 rounded-full flex items-center gap-2 backdrop-blur-md border border-slate-600">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                <span className="text-xs font-bold ml-1">AI THINKING</span>
            </div>
        )}

        {/* Game Over Modal Overlay */}
        {gameOverStatus && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-[2px] rounded-lg">
                <div className="bg-slate-800 p-6 rounded-xl border border-amber-500/50 shadow-2xl text-center transform scale-110">
                    <h3 className="text-2xl font-bold text-white mb-2">{gameOverStatus.result}</h3>
                    <div className="flex gap-3 justify-center mt-4">
                        <button onClick={() => setView('dashboard')} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold">
                            Dashboard
                        </button>
                        <button onClick={() => startGame(gameMode, difficulty)} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-lg font-bold">
                            Rematch
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
      
      {/* Control Bar */}
      <div className="flex gap-4">
        <button 
          onClick={() => {
              if (confirm("Are you sure you want to resign?")) {
                setGameOverStatus({ over: true, result: "You Resigned" });
                // Record loss
                if (user) {
                    const record: GameRecord = {
                        id: generateId(),
                        date: new Date().toISOString(),
                        mode: gameMode,
                        difficulty: difficulty,
                        opponentName: gameMode === GameMode.PVE ? 'AI' : 'Human',
                        result: GameResult.LOSS,
                        resultDescription: "Resignation",
                        moves: game.pgn(),
                        accuracy: calculateAccuracy(game.history(), difficulty)
                    };
                    saveGameRecord(user.id, record);
                }
              }
          }} 
          className="bg-slate-800 hover:bg-red-900/30 text-red-400 border border-slate-700 hover:border-red-800 px-6 py-2 rounded-lg font-bold transition-colors"
        >
          Resign
        </button>
         <button 
           onClick={() => {
             // Reset board locally
             startGame(gameMode, difficulty);
           }} 
           className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-6 py-2 rounded-lg font-bold transition-colors"
        >
          Restart
        </button>
      </div>
    </div>
  );

  // -- Main Render Switch --

  // If waiting to select settings for a new game from Dashboard
  const [showGameSetup, setShowGameSetup] = useState(false);

  return (
    <Layout 
      currentUser={user} 
      onLogout={onLogout} 
      onNavigate={(page) => {
          if (page === 'home') setView(user ? 'dashboard' : 'landing');
          else if (page === 'login') setView('login');
          else if (page === 'register') setView('register');
      }}
    >
      {view === 'landing' && renderLanding()}
      {view === 'login' && renderAuth('login')}
      {view === 'register' && renderAuth('register')}
      {view === 'dashboard' && (
        <>
           <Dashboard user={user!} onPlayGame={() => setShowGameSetup(true)} />
           {showGameSetup && renderGameSetup()}
        </>
      )}
      {view === 'game' && renderGame()}
    </Layout>
  );
};

export default App;