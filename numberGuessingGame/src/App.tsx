import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Trophy, 
  Target, 
  Timer, 
  RotateCcw, 
  Settings, 
  Moon, 
  Sun,
  Sparkles,
  Volume2,
  VolumeX,
  Play
} from 'lucide-react';

interface GameSettings {
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  soundEnabled: boolean;
  darkMode: boolean;
}

const DIFFICULTY_CONFIG = {
  easy: { min: 1, max: 50, maxGuesses: 10, timeLimit: 120 },
  medium: { min: 1, max: 100, maxGuesses: 8, timeLimit: 90 },
  hard: { min: 1, max: 200, maxGuesses: 6, timeLimit: 60 },
  expert: { min: 1, max: 500, maxGuesses: 5, timeLimit: 45 }
};

function App() {
  // Game state
  const [targetNumber, setTargetNumber] = useState<number>(0);
  const [currentGuess, setCurrentGuess] = useState<string>('');
  const [guesses, setGuesses] = useState<number[]>([]);
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost' | 'not-started'>('not-started');
  const [hint, setHint] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [showCelebration, setShowCelebration] = useState(false);
  
  // Settings
  const [settings, setSettings] = useState<GameSettings>({
    difficulty: 'medium',
    soundEnabled: true,
    darkMode: false
  });
  const [showSettings, setShowSettings] = useState(false);

  // Refs
  const timerRef = useRef<NodeJS.Timeout>();
  const audioContextRef = useRef<AudioContext>();

  // Load saved settings on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('numberGameSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  // Save settings when they change
  useEffect(() => {
    localStorage.setItem('numberGameSettings', JSON.stringify(settings));
    document.documentElement.classList.toggle('dark', settings.darkMode);
  }, [settings]);

  // Timer effect
  useEffect(() => {
    if (gameStatus === 'playing' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setGameStatus('lost');
            setHint(`⏰ Time's up! The number was ${targetNumber}. Better luck next time!`);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [gameStatus, timeLeft, targetNumber]);

  // Sound functions
  const playSound = useCallback((frequency: number, duration: number, type: 'sine' | 'square' | 'triangle' = 'sine') => {
    if (!settings.soundEnabled) return;
    
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);
    
    oscillator.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime);
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + duration);
    
    oscillator.start(audioContextRef.current.currentTime);
    oscillator.stop(audioContextRef.current.currentTime + duration);
  }, [settings.soundEnabled]);

  const startNewGame = useCallback(() => {
    const config = DIFFICULTY_CONFIG[settings.difficulty];
    const newTarget = Math.floor(Math.random() * (config.max - config.min + 1)) + config.min;
    
    setTargetNumber(newTarget);
    setCurrentGuess('');
    setGuesses([]);
    setGameStatus('playing');
    setHint(`🎯 I'm thinking of a number between ${config.min} and ${config.max}. You have ${config.maxGuesses} guesses and ${config.timeLimit} seconds!`);
    setTimeLeft(config.timeLimit);
    setStartTime(Date.now());
    setShowCelebration(false);
  }, [settings.difficulty]);

  const makeGuess = useCallback(() => {
    const guess = parseInt(currentGuess);
    const config = DIFFICULTY_CONFIG[settings.difficulty];
    
    if (isNaN(guess) || guess < config.min || guess > config.max) {
      setHint(`❌ Please enter a number between ${config.min} and ${config.max}`);
      playSound(200, 0.2);
      return;
    }

    if (guesses.includes(guess)) {
      setHint('⚠️ You already guessed that number! Try a different one.');
      playSound(200, 0.2);
      return;
    }

    const newGuesses = [...guesses, guess];
    setGuesses(newGuesses);
    setCurrentGuess('');

    if (guess === targetNumber) {
      // Win!
      const timeTaken = (Date.now() - startTime) / 1000;
      setGameStatus('won');
      setHint(`🎉 CONGRATULATIONS! 🎉 You found the number ${targetNumber} in ${newGuesses.length} guess${newGuesses.length !== 1 ? 'es' : ''} and ${timeTaken.toFixed(1)} seconds! You're amazing! 🌟`);
      setShowCelebration(true);
      
      // Victory sound
      playSound(523, 0.2); // C5
      setTimeout(() => playSound(659, 0.2), 100); // E5
      setTimeout(() => playSound(784, 0.3), 200); // G5
      
    } else if (newGuesses.length >= config.maxGuesses) {
      // Lost - too many guesses
      setGameStatus('lost');
      setHint(`💔 Game over! The number was ${targetNumber}. Don't give up - try again!`);
      
      playSound(150, 0.5, 'square');
      
    } else {
      // Continue playing
      const difference = Math.abs(guess - targetNumber);
      let newHint = '';
      
      if (difference <= 5) {
        newHint = '🔥 Very hot! You\'re extremely close!';
        playSound(800, 0.1);
      } else if (difference <= 10) {
        newHint = '♨️ Hot! You\'re getting close!';
        playSound(600, 0.1);
      } else if (difference <= 20) {
        newHint = '🌡️ Warm! You\'re on the right track!';
        playSound(400, 0.1);
      } else if (difference <= 50) {
        newHint = '❄️ Cold! You\'re getting further away.';
        playSound(300, 0.1);
      } else {
        newHint = '🧊 Very cold! Way off target!';
        playSound(200, 0.1);
      }
      
      newHint += guess > targetNumber ? ' Try lower!' : ' Try higher!';
      newHint += ` (${config.maxGuesses - newGuesses.length} guesses left)`;
      
      setHint(newHint);
    }
  }, [currentGuess, guesses, targetNumber, settings.difficulty, startTime, playSound]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && gameStatus === 'playing') {
      makeGuess();
    }
  }, [makeGuess, gameStatus]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-emerald-600 dark:text-emerald-400';
      case 'medium': return 'text-amber-600 dark:text-amber-400';
      case 'hard': return 'text-orange-600 dark:text-orange-400';
      case 'expert': return 'text-red-600 dark:text-red-400';
      default: return 'text-slate-600 dark:text-slate-400';
    }
  };

  const config = DIFFICULTY_CONFIG[settings.difficulty];

  return (
    <div className={`min-h-screen transition-all duration-500 ${settings.darkMode ? 'dark bg-slate-900' : 'bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100'}`}>
      {/* Celebration Animation */}
      {showCelebration && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random() * 2}s`
              }}
            >
              <Sparkles className="w-6 h-6 text-yellow-400" />
            </div>
          ))}
        </div>
      )}

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            Number Master
          </h1>
          <p className="text-xl text-slate-700 dark:text-slate-300">
            The ultimate number guessing challenge
          </p>
        </div>

        {/* Top Controls */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex space-x-3">
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center space-x-2 px-5 py-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border border-slate-200 dark:border-slate-700 hover:scale-105 font-medium"
            >
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </button>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-lg shadow-md border border-slate-200 dark:border-slate-700">
              <Target className="w-5 h-5 text-indigo-500" />
              <span className={`font-bold text-lg ${getDifficultyColor(settings.difficulty)}`}>
                {settings.difficulty.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Main Game Area */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 mb-8 border border-slate-200 dark:border-slate-700">
          {gameStatus === 'not-started' ? (
            <div className="text-center">
              <div className="mb-8">
                <Trophy className="w-20 h-20 mx-auto text-yellow-500 mb-6" />
                <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-4">
                  Ready to Play?
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-300">
                  Challenge yourself with the ultimate number guessing game!
                </p>
              </div>
              <button
                onClick={startNewGame}
                className="flex items-center space-x-3 px-10 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-2xl font-bold text-lg hover:from-indigo-600 hover:to-purple-600 transform hover:scale-105 transition-all duration-200 shadow-xl mx-auto"
              >
                <Play className="w-6 h-6" />
                <span>Start New Game</span>
              </button>
            </div>
          ) : (
            <>
              {/* Game Info Bar */}
              <div className="flex justify-between items-center mb-8 p-5 bg-slate-50 dark:bg-slate-700 rounded-2xl border border-slate-200 dark:border-slate-600">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-3">
                    <Timer className="w-5 h-5 text-indigo-500" />
                    <span className={`font-mono font-bold text-lg ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-slate-700 dark:text-slate-300'}`}>
                      {formatTime(timeLeft)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Target className="w-5 h-5 text-emerald-500" />
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">
                      {config.maxGuesses - guesses.length} guesses left
                    </span>
                  </div>
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                  Range: {config.min} - {config.max}
                </div>
              </div>

              {/* Hint Display */}
              <div className="mb-8 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 border-l-4 border-indigo-500 rounded-r-2xl">
                <p className="text-indigo-800 dark:text-indigo-200 font-semibold text-lg">
                  {hint}
                </p>
              </div>

              {/* Input Area */}
              {gameStatus === 'playing' && (
                <div className="mb-8">
                  <div className="flex space-x-4">
                    <input
                      type="number"
                      value={currentGuess}
                      onChange={(e) => setCurrentGuess(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={`Enter number (${config.min}-${config.max})`}
                      className="flex-1 px-6 py-4 border-2 border-slate-300 dark:border-slate-600 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-xl font-mono bg-white dark:bg-slate-700 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                      min={config.min}
                      max={config.max}
                    />
                    <button
                      onClick={makeGuess}
                      disabled={!currentGuess}
                      className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-bold text-lg hover:from-indigo-600 hover:to-purple-600 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-lg"
                    >
                      Guess!
                    </button>
                  </div>
                </div>
              )}

              {/* Previous Guesses */}
              {guesses.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-4">
                    Previous Guesses ({guesses.length})
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {guesses.map((guess, index) => (
                      <span
                        key={index}
                        className={`px-4 py-2 rounded-xl text-lg font-bold font-mono shadow-md ${
                          guess === targetNumber
                            ? 'bg-emerald-500 text-white'
                            : guess > targetNumber
                            ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 border border-red-200 dark:border-red-800'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                        }`}
                      >
                        {guess}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Game Over Actions */}
              {(gameStatus === 'won' || gameStatus === 'lost') && (
                <div className="text-center">
                  <button
                    onClick={startNewGame}
                    className="flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-bold text-lg hover:from-emerald-600 hover:to-teal-600 transform hover:scale-105 transition-all duration-200 shadow-xl mx-auto"
                  >
                    <RotateCcw className="w-5 h-5" />
                    <span>Play Again</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700">
              <h2 className="text-3xl font-bold mb-6 text-slate-800 dark:text-white">Settings</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-lg font-semibold text-slate-700 dark:text-slate-300 mb-3">
                    Difficulty Level
                  </label>
                  <select
                    value={settings.difficulty}
                    onChange={(e) => setSettings(prev => ({ ...prev, difficulty: e.target.value as any }))}
                    className="w-full px-4 py-3 border-2 border-slate-300 dark:border-slate-600 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white dark:bg-slate-700 dark:text-white text-lg font-medium"
                  >
                    <option value="easy">Easy (1-50, 10 guesses, 2 min)</option>
                    <option value="medium">Medium (1-100, 8 guesses, 1.5 min)</option>
                    <option value="hard">Hard (1-200, 6 guesses, 1 min)</option>
                    <option value="expert">Expert (1-500, 5 guesses, 45 sec)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-slate-700 dark:text-slate-300">Sound Effects</span>
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
                    className={`p-3 rounded-xl transition-all duration-200 ${
                      settings.soundEnabled 
                        ? 'bg-indigo-500 text-white shadow-lg' 
                        : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {settings.soundEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-slate-700 dark:text-slate-300">Dark Mode</span>
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, darkMode: !prev.darkMode }))}
                    className={`p-3 rounded-xl transition-all duration-200 ${
                      settings.darkMode 
                        ? 'bg-indigo-500 text-white shadow-lg' 
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {settings.darkMode ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
                  </button>
                </div>
              </div>

              <button
                onClick={() => setShowSettings(false)}
                className="w-full mt-8 px-6 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all duration-200 font-bold text-lg shadow-lg"
              >
                Close Settings
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;