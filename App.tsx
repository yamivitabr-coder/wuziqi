/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw, Undo2, Trophy } from 'lucide-react';

const BOARD_SIZE = 15;

type Player = 1 | 2;
type Cell = Player | null;

export default function App() {
  const [board, setBoard] = useState<Cell[][]>(
    Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null))
  );
  const [currentPlayer, setCurrentPlayer] = useState<Player>(1);
  const [gameMode, setGameMode] = useState<'PvP' | 'PvE'>('PvP');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [winner, setWinner] = useState<Player | 'Draw' | null>(null);
  const [history, setHistory] = useState<Cell[][][]>([]);
  const [scores, setScores] = useState({ 1: 0, 2: 0 });

  const checkWinner = (row: number, col: number, player: Player, currentBoard: Cell[][]) => {
    const directions = [
      [1, 0],  // vertical
      [0, 1],  // horizontal
      [1, 1],  // diagonal \
      [1, -1], // diagonal /
    ];

    for (const [dr, dc] of directions) {
      let count = 1;
      
      // Check forward
      for (let i = 1; i < 5; i++) {
        const r = row + dr * i;
        const c = col + dc * i;
        if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && currentBoard[r][c] === player) {
          count++;
        } else {
          break;
        }
      }
      
      // Check backward
      for (let i = 1; i < 5; i++) {
        const r = row - dr * i;
        const c = col - dc * i;
        if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && currentBoard[r][c] === player) {
          count++;
        } else {
          break;
        }
      }

      if (count >= 5) return true;
    }
    return false;
  };

  const handleCellClick = (row: number, col: number) => {
    if (board[row][col] || winner || isAiThinking) return;
    makeMove(row, col);
  };

  const makeMove = (row: number, col: number) => {
    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = currentPlayer;
    
    setHistory(prev => [...prev, board.map(r => [...r])]);
    setBoard(newBoard);

    if (checkWinner(row, col, currentPlayer, newBoard)) {
      setWinner(currentPlayer);
      setScores(prev => ({ ...prev, [currentPlayer]: prev[currentPlayer] + 1 }));
    } else if (newBoard.every(row => row.every(cell => cell !== null))) {
      setWinner('Draw');
    } else {
      setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
    }
  };

  // AI Logic
  const evaluatePosition = useCallback((row: number, col: number, player: Player, currentBoard: Cell[][]) => {
    const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
    let totalScore = 0;

    for (const [dr, dc] of directions) {
      let count = 1;
      let openEnds = 0;

      // Check forward
      for (let i = 1; i < 5; i++) {
        const r = row + dr * i;
        const c = col + dc * i;
        if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
          if (currentBoard[r][c] === player) count++;
          else if (currentBoard[r][c] === null) { openEnds++; break; }
          else break;
        } else break;
      }

      // Check backward
      for (let i = 1; i < 5; i++) {
        const r = row - dr * i;
        const c = col - dc * i;
        if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
          if (currentBoard[r][c] === player) count++;
          else if (currentBoard[r][c] === null) { openEnds++; break; }
          else break;
        } else break;
      }

      if (count >= 5) totalScore += 100000;
      else if (count === 4) totalScore += openEnds === 2 ? 10000 : (openEnds === 1 ? 1000 : 0);
      else if (count === 3) totalScore += openEnds === 2 ? 1000 : (openEnds === 1 ? 100 : 0);
      else if (count === 2) totalScore += openEnds === 2 ? 100 : (openEnds === 1 ? 10 : 0);
    }
    return totalScore;
  }, []);

  const getBestMove = useCallback(() => {
    let bestScore = -1;
    let moves: [number, number][] = [];

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c] === null) {
          const aiScore = evaluatePosition(r, c, 2, board);
          const humanScore = evaluatePosition(r, c, 1, board);
          const score = aiScore * 1.1 + humanScore; // Slightly prioritize offense

          if (score > bestScore) {
            bestScore = score;
            moves = [[r, c]];
          } else if (score === bestScore) {
            moves.push([r, c]);
          }
        }
      }
    }

    if (moves.length === 0) return null;
    return moves[Math.floor(Math.random() * moves.length)];
  }, [board, evaluatePosition]);

  useEffect(() => {
    if (gameMode === 'PvE' && currentPlayer === 2 && !winner) {
      setIsAiThinking(true);
      const timer = setTimeout(() => {
        const move = getBestMove();
        if (move) {
          makeMove(move[0], move[1]);
        }
        setIsAiThinking(false);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [currentPlayer, gameMode, winner, getBestMove]);

  const undo = () => {
    if (history.length === 0 || winner) return;
    const previousBoard = history[history.length - 1];
    setBoard(previousBoard);
    setHistory(history.slice(0, -1));
    setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
  };

  const restart = () => {
    setBoard(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)));
    setCurrentPlayer(1);
    setWinner(null);
    setHistory([]);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8">
      {/* Header Section */}
      <div className="relative mb-12 text-center">
        {/* Floating Icons */}
        <motion.div 
          animate={{ rotate: [0, 5, -5, 0], y: [0, -5, 5, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="absolute -left-24 -top-8 hidden lg:block"
        >
          <div className="w-24 h-24 bg-[#2A2A2A] brutal-border rounded-2xl flex items-center justify-center overflow-hidden rotate-[-12deg] brutal-shadow">
            <img src="https://picsum.photos/seed/duck/200/200" alt="Duck" className="w-full h-full object-cover opacity-80" referrerPolicy="no-referrer" />
            <div className="absolute inset-0 flex items-center justify-center text-4xl">🦆</div>
          </div>
        </motion.div>

        <motion.div 
          animate={{ rotate: [0, -5, 5, 0], y: [0, 5, -5, 0] }}
          transition={{ duration: 5, repeat: Infinity }}
          className="absolute -right-24 -top-4 hidden lg:block"
        >
          <div className="w-24 h-24 bg-[#2A2A2A] brutal-border rounded-2xl flex items-center justify-center overflow-hidden rotate-[12deg] brutal-shadow">
            <img src="https://picsum.photos/seed/shrimp/200/200" alt="Shrimp" className="w-full h-full object-cover opacity-80" referrerPolicy="no-referrer" />
            <div className="absolute inset-0 flex items-center justify-center text-4xl">🦐</div>
          </div>
        </motion.div>

        <h1 className="text-6xl md:text-8xl font-display font-black tracking-tighter uppercase mb-4">
          GOMOKU <span className="text-[#F27D26]">POP!</span>
        </h1>
        
        <div className="inline-block bg-[#FDFD96] brutal-border px-6 py-1 brutal-shadow-sm rotate-[-2deg]">
          <span className="font-display font-bold text-sm tracking-widest uppercase">Zen Vibes Only</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-12 items-start justify-center max-w-7xl w-full">
        {/* Left Panel: Scoreboard */}
        <div className="flex flex-col gap-6 w-full lg:w-64">
          <ScoreCard 
            player={1} 
            score={scores[1]} 
            active={currentPlayer === 1 && !winner} 
            symbol="●"
            rotation="-2deg"
          />
          
          <div className="relative h-32 w-full brutal-border bg-white brutal-shadow overflow-hidden group">
            <img 
              src="https://picsum.photos/seed/car/400/300" 
              alt="Cool Car" 
              className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-black/10"></div>
          </div>

          <ScoreCard 
            player={2} 
            score={scores[2]} 
            active={currentPlayer === 2 && !winner} 
            symbol="○"
            rotation="2deg"
            isThinking={isAiThinking}
          />
        </div>

        {/* Center: Game Board */}
        <div className="relative">
          <div className="bg-white brutal-border brutal-shadow p-2 md:p-4">
            <div 
              className="grid gap-0" 
              style={{ 
                gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
                width: 'min(90vw, 600px)',
                aspectRatio: '1/1'
              }}
            >
              {board.map((row, rIdx) => 
                row.map((cell, cIdx) => (
                  <div 
                    key={`${rIdx}-${cIdx}`}
                    onClick={() => handleCellClick(rIdx, cIdx)}
                    className="relative border-[0.5px] border-black/20 flex items-center justify-center cursor-pointer hover:bg-black/5 transition-colors"
                  >
                    {/* Grid lines intersection helper */}
                    <div className="absolute w-[1px] h-full bg-black/10"></div>
                    <div className="absolute h-[1px] w-full bg-black/10"></div>
                    
                    {/* Piece */}
                    <AnimatePresence>
                      {cell && (
                        <motion.div
                          initial={{ scale: 0, rotate: -45 }}
                          animate={{ scale: 1, rotate: 0 }}
                          className={`w-4/5 h-4/5 rounded-full brutal-border brutal-shadow-sm z-10 ${
                            cell === 1 ? 'bg-black' : 'bg-white'
                          }`}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Winner Overlay */}
          <AnimatePresence>
            {winner && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-sm"
              >
                <div className="bg-[#FDFD96] brutal-border brutal-shadow p-8 text-center rotate-[-3deg]">
                  <Trophy className="w-16 h-16 mx-auto mb-4 text-[#F27D26]" />
                  <h2 className="text-4xl font-display font-black uppercase mb-4">
                    {winner === 'Draw' ? "It's a Draw!" : `Player ${winner} Wins!`}
                  </h2>
                  <button 
                    onClick={restart}
                    className="brutal-btn bg-white hover:bg-black hover:text-white"
                  >
                    Play Again
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Panel: Controls */}
        <div className="flex flex-col gap-6 w-full lg:w-64">
          <button 
            onClick={undo}
            disabled={history.length === 0 || !!winner}
            className="brutal-btn bg-[#89CFF0] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Undo2 className="w-5 h-5" />
            Undo
          </button>

          <button 
            onClick={restart}
            className="brutal-btn bg-[#F4C2C2] flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            Restart
          </button>

          <div className="bg-[#2A2A2A] brutal-border brutal-shadow p-6 text-white">
            <label className="block text-[10px] uppercase tracking-widest font-bold mb-2 opacity-60">Game Mode</label>
            <button 
              onClick={() => {
                setGameMode(prev => prev === 'PvP' ? 'PvE' : 'PvP');
                restart();
              }}
              className="w-full brutal-border border-white/30 p-2 text-center font-display font-bold hover:bg-white/10 transition-colors cursor-pointer"
            >
              {gameMode === 'PvP' ? 'PvP (Local)' : 'PvE (AI)'}
            </button>
          </div>

          <div className="text-center mt-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">Get Your Game On</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-16 text-center">
        <p className="text-[11px] font-bold uppercase tracking-widest opacity-40">
          © 2024 POP GOMOKU • NO CAP JUST STRAT
        </p>
      </footer>
    </div>
  );
}

function ScoreCard({ player, score, active, symbol, rotation, isThinking }: { 
  player: number, 
  score: number, 
  active: boolean, 
  symbol: string,
  rotation: string,
  isThinking?: boolean
}) {
  return (
    <motion.div 
      animate={{ 
        scale: active ? 1.05 : 1,
        backgroundColor: isThinking ? '#f0f0f0' : '#ffffff'
      }}
      style={{ rotate: rotation }}
      className={`bg-white brutal-border brutal-shadow p-6 text-center transition-colors relative ${
        active ? 'border-[#F27D26]' : 'border-black'
      }`}
    >
      <p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-60">
        {player === 2 && isThinking ? 'AI Thinking...' : `Player ${player}`}
      </p>
      <div className="text-6xl font-display font-black mb-2">{score}</div>
      <div className="text-2xl opacity-80">{symbol}</div>
      {active && (
        <motion.div 
          layoutId="active-indicator"
          className="absolute -top-2 -right-2 w-4 h-4 bg-[#F27D26] rounded-full brutal-border"
        />
      )}
    </motion.div>
  );
}
