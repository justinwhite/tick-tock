import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Star, Settings, X, Check } from 'lucide-react';

const LEVELS = [
  { id: 1, name: "Hours", minuteInterval: 60 },
  { id: 2, name: "Half Hours", minuteInterval: 30 },
  { id: 3, name: "15 Mins", minuteInterval: 15 },
  { id: 4, name: "5 Mins", minuteInterval: 5 },
  { id: 5, name: "1 Min", minuteInterval: 1 },
];

const formatTime = (h: number, m: number) => {
    return `${h}:${m.toString().padStart(2, '0')}`;
};

export default function App() {
  const [currentLevel, setCurrentLevel] = useState(5);
  const [targetTime, setTargetTime] = useState({ h: 12, m: 0 });
  
  // Hand states
  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);
  
  // Game state
  const [showCheats, setShowCheats] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");
  
  // Session state
  const [sessionLength, setSessionLength] = useState(10);
  const [progress, setProgress] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  
  // Dragging state
  const clockRef = useRef<SVGSVGElement>(null);
  const [draggingHand, setDraggingHand] = useState<'hour' | 'minute' | null>(null);

  const generateNewTime = useCallback((levelId: number) => {
      const level = LEVELS.find(l => l.id === levelId)!;
      const interval = level.minuteInterval;
      
      setTargetTime(prevTargetTime => {
          let targetH = Math.floor(Math.random() * 12) + 1;
          let targetM = 0;
          if (interval < 60) {
              const possibleSteps = 60 / interval;
              targetM = Math.floor(Math.random() * possibleSteps) * interval;
          }
          
          // Prevent SAME time
          if (targetH === prevTargetTime.h && targetM === prevTargetTime.m) {
              targetH = (targetH % 12) + 1;
          }
          return { h: targetH, m: targetM };
      });
      
      setMessage("");
      setSuccess(false);
  }, []);

  // Initial load
  useEffect(() => {
     generateNewTime(5);
  }, [generateNewTime]);

  // Clear error message after 4s
  useEffect(() => {
      if (message) {
          const timer = setTimeout(() => setMessage(""), 4000);
          return () => clearTimeout(timer);
      }
  }, [message]);

  const handleLevelChange = (levelId: number) => {
      setCurrentLevel(levelId);
      setProgress(0);
      generateNewTime(levelId);
  };

  const handleSessionLengthChange = (len: number) => {
      setSessionLength(len);
      setProgress(0);
      setSessionComplete(false);
      generateNewTime(currentLevel);
  };

  const handlePlayAgain = () => {
      setProgress(0);
      setSessionComplete(false);
      generateNewTime(currentLevel);
  };

  const calculateAngle = (clientX: number, clientY: number) => {
      if (!clockRef.current) return 0;
      const rect = clockRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let angle = Math.atan2(clientY - cy, clientX - cx) * 180 / Math.PI;
      angle = angle + 90;
      if (angle < 0) angle += 360;
      return angle;
  };

  const updateHand = useCallback((hand: 'hour' | 'minute', angle: number) => {
      if (hand === 'minute') {
          const interval = LEVELS.find(l => l.id === currentLevel)!.minuteInterval;
          let rawMin = (angle / 360) * 60;
          let m = Math.round(rawMin / interval) * interval;
          if (m === 60) m = 0;
          setMinute(m);
      } else if (hand === 'hour') {
          // Simply compute the nearest hour based on mouse angle, ignoring minute offset.
          // This allows users to point directly at the number they want to select.
          let h = Math.round(angle / 30);
          if (h <= 0) h += 12;
          if (h > 12) h -= 12;
          setHour(h);
      }
      setMessage("");
  }, [currentLevel, minute]);

  const handleHandPointerDown = (e: React.PointerEvent<SVGGElement>, hand: 'hour' | 'minute') => {
      if (success) return;
      e.preventDefault();
      e.stopPropagation();
      
      const svg = clockRef.current;
      if (svg) svg.setPointerCapture(e.pointerId);
      
      setDraggingHand(hand);
      
      const angle = calculateAngle(e.clientX, e.clientY);
      updateHand(hand, angle);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
      if (!draggingHand) return;
      const angle = calculateAngle(e.clientX, e.clientY);
      updateHand(draggingHand, angle);
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
      if (draggingHand) {
          const svg = clockRef.current;
          if (svg) svg.releasePointerCapture(e.pointerId);
          setDraggingHand(null);
      }
  };

  const handleCheck = () => {
      if (success) return;

      const currentTotalMins = (hour % 12) * 60 + minute;
      const targetTotalMins = (targetTime.h % 12) * 60 + targetTime.m;
      let diff = Math.abs(currentTotalMins - targetTotalMins);
      // Account for 12-hour wrap around
      if (diff > 6 * 60) {
          diff = 12 * 60 - diff;
      }
      
      // +/- 2.5 minutes hit box
      const isCorrect = diff <= 2.5;

      if (isCorrect) {
          setSuccess(true);
          setMessage("");
          const nextProgress = progress + 1;
          setProgress(nextProgress);
          setTimeout(() => {
              setSuccess(false);
              if (nextProgress >= sessionLength) {
                  setSessionComplete(true);
              } else {
                  generateNewTime(currentLevel);
              }
          }, 1500);
      } else {
          // Find which hand is mostly wrong
          let minAbsDiff = Math.abs(minute - targetTime.m);
          if (minAbsDiff > 30) minAbsDiff = 60 - minAbsDiff;
          const isMinClose = minAbsDiff <= 2.5;

          if (!isMinClose) {
              setMessage("Oops! Check your minute hand.");
          } else {
              setMessage("Oops! Check your hour hand.");
          }
      }
  };

  // SVG Geometry
  const SV_SIZE = 500;
  const CENTER = SV_SIZE / 2;
  const RADIUS = 200;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-400 via-indigo-400 to-purple-400 text-slate-900 font-sans flex flex-col items-center justify-between p-4 md:p-8 selection:bg-transparent overflow-x-hidden">
      
      {/* Header Area */}
      <header className="w-full max-w-5xl flex justify-between items-center mb-4 gap-4 px-2">
          <div className="flex-1 bg-indigo-900/40 backdrop-blur-[8px] border border-white/30 rounded-full h-12 overflow-hidden relative shadow-inner max-w-md">
              <div 
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-700 ease-out"
                  style={{ width: `${(progress / sessionLength) * 100}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-sm md:text-base font-black text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)] tracking-wider">
                  {progress} / {sessionLength}
              </div>
          </div>
          <button 
              onClick={() => setShowSettings(true)}
              className="bg-white/30 hover:bg-white/40 backdrop-blur-md border border-white/50 text-white p-3 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 flex-shrink-0"
              aria-label="Settings"
          >
              <Settings className="w-6 h-6" />
          </button>
      </header>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
            >
                <motion.div 
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl p-6 md:p-8 shadow-2xl w-full max-w-md relative"
                >
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-black text-indigo-950 uppercase tracking-widest">Settings</h2>
                        <button onClick={() => setShowSettings(false)} className="text-indigo-950/60 hover:text-indigo-950 bg-white/40 hover:bg-white/80 p-2 rounded-full transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <h3 className="text-sm font-bold text-indigo-900/60 uppercase tracking-wider mb-3">Difficulty Level</h3>
                            <div className="flex flex-col gap-2">
                                {LEVELS.map(level => (
                                    <button 
                                      key={level.id}
                                      onClick={() => handleLevelChange(level.id)}
                                      className={`px-4 py-3 rounded-xl font-bold text-left transition-all flex justify-between items-center outline-none
                                        ${currentLevel === level.id 
                                          ? 'bg-amber-500 text-white shadow-md' 
                                          : 'bg-white/40 text-indigo-950/80 hover:bg-white/60 hover:text-indigo-950'}`}
                                    >
                                        {level.name}
                                        {currentLevel === level.id && <Check className="w-5 h-5" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-bold text-indigo-900/60 uppercase tracking-wider mb-3">Problems per session</h3>
                            <div className="flex gap-2">
                                {[5, 10, 20].map(len => (
                                    <button 
                                        key={len}
                                        onClick={() => handleSessionLengthChange(len)}
                                        className={`flex-1 py-3 rounded-xl font-bold transition-all outline-none
                                        ${sessionLength === len 
                                            ? 'bg-amber-500 text-white shadow-md' 
                                            : 'bg-white/40 text-indigo-950/80 hover:bg-white/60 hover:text-indigo-950'}`}
                                    >
                                        {len}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-bold text-indigo-900/60 uppercase tracking-wider mb-3">Helpers</h3>
                            <button 
                                onClick={() => setShowCheats(prev => !prev)}
                                className={`flex items-center justify-between w-full px-4 py-4 rounded-xl font-bold transition-all text-left outline-none
                                  ${showCheats 
                                      ? 'bg-indigo-500 text-white shadow-md' 
                                      : 'bg-white/40 text-indigo-950/80 hover:bg-white/60 hover:text-indigo-950'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <Sparkles className="w-5 h-5" />
                                    <span>Show 5-Minute Marks</span>
                                </div>
                                <div className={`w-12 h-7 rounded-full p-1 transition-colors ${showCheats ? 'bg-indigo-300' : 'bg-indigo-900/20'}`}>
                                    <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${showCheats ? 'translate-x-5' : 'translate-x-0'}`} />
                                </div>
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
          {sessionComplete && (
              <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
              >
                  <motion.div 
                      initial={{ scale: 0.8, y: 30 }}
                      animate={{ scale: 1, y: 0 }}
                      className="bg-white border-[8px] border-emerald-400 rounded-3xl p-8 md:p-12 shadow-2xl flex flex-col items-center max-w-md w-full text-center"
                  >
                      <div className="w-24 h-24 bg-amber-300 rounded-full flex items-center justify-center mb-6 shadow-lg">
                          <Star className="w-16 h-16 text-white" fill="currentColor" />
                      </div>
                      <h2 className="text-4xl font-black text-indigo-950 uppercase tracking-widest mb-2">You Did It!</h2>
                      <p className="text-lg font-bold text-indigo-900/60 mb-8">
                          You completed {sessionLength} problems.
                      </p>
                      <button 
                          onClick={handlePlayAgain}
                          className="bg-gradient-to-r from-emerald-400 to-green-500 text-white text-xl font-black py-4 px-8 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all w-full tracking-wider uppercase"
                      >
                          Play Again
                      </button>
                  </motion.div>
              </motion.div>
          )}
      </AnimatePresence>

      <main className="flex-1 max-w-md w-full mx-auto flex flex-col justify-center items-center gap-2 mt-2">
          
          <div className="flex flex-col items-center w-full">
            {/* Target Box */}
            <div className="relative w-full bg-white/30 backdrop-blur-[8px] border border-white/50 rounded-3xl shadow-xl px-6 md:px-8 py-4 flex flex-col items-center z-20">
                <h1 className="text-lg md:text-xl font-bold uppercase tracking-widest text-white/90 text-center mb-1">
                    Set the Time
                </h1>
                <div className="text-5xl md:text-[5rem] leading-none font-black text-white drop-shadow-lg text-center tabular-nums tracking-tighter">
                    {formatTime(targetTime.h, targetTime.m)}
                </div>

                {/* Message Hint */}
                <AnimatePresence>
                    {message && (
                        <motion.div 
                            initial={{ opacity: 0, y: -10, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="absolute -bottom-6 w-full flex justify-center z-[100]"
                        >
                            <div className="bg-rose-500 text-white px-6 py-3 rounded-full font-black border-2 border-white shadow-xl text-base md:text-lg tracking-wide shadow-rose-500/20">
                                {message}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
          </div>

          <div className="flex flex-col items-center w-full">
            {/* CLOCK */}
            <div className="relative w-full aspect-square mb-2 max-w-md">
                {/* Frosted Glass Background for Clock Face */}
                <div className="absolute inset-[10%] rounded-full bg-white/25 backdrop-blur-[12px] border-[8px] border-white/40 shadow-[0_20px_50px_rgba(0,0,0,0.1)] -z-0"></div>

                <svg 
                    viewBox={`0 0 ${SV_SIZE} ${SV_SIZE}`} 
                    className="relative w-full h-full touch-none overflow-visible z-10" 
                    ref={clockRef}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                >
                    {/* Shadow for SVG hands */}
                    <defs>
                        <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
                            <feDropShadow dx="0" dy="12" stdDeviation="16" floodColor="#000" floodOpacity="0.15" />
                        </filter>
                    </defs>

                    {/* Ticks */}
                    {Array.from({ length: 60 }).map((_, i) => {
                        const isFive = i % 5 === 0;
                        const tickLength = isFive ? 14 : 6;
                        const tickWidth = isFive ? 4 : 2;
                        const angle = i * 6;
                        // Minute highlight logic
                        const isMinuteActive = draggingHand === 'minute' && i === minute;
                        return (
                            <g key={i}>
                                {isMinuteActive && (
                                    <circle cx={CENTER + Math.cos((angle - 90) * Math.PI / 180) * (RADIUS - 16)} 
                                            cy={CENTER + Math.sin((angle - 90) * Math.PI / 180) * (RADIUS - 16)} 
                                            r="14" fill="#DBEAFE" />
                                )}
                                <line 
                                    x1={CENTER} y1={CENTER - RADIUS + 16}
                                    x2={CENTER} y2={CENTER - RADIUS + 16 + tickLength}
                                    stroke={isFive ? "#1E3A8A" : "#1E3A8A"}
                                    strokeOpacity={isFive ? 0.6 : 0.25}
                                    strokeWidth={isMinuteActive ? tickWidth + 2 : tickWidth}
                                    strokeLinecap="round"
                                    transform={`rotate(${angle}, ${CENTER}, ${CENTER})`}
                                />
                            </g>
                        );
                    })}

                    {/* Hours 1-12 */}
                    {Array.from({ length: 12 }).map((_, i) => {
                        const h = i + 1;
                        const angle = h * 30;
                        const rad = (angle - 90) * Math.PI / 180;
                        const textRadius = RADIUS - 48;
                        const tx = CENTER + Math.cos(rad) * textRadius;
                        const ty = CENTER + Math.sin(rad) * textRadius;
                        
                        const isActive = draggingHand === 'hour' && h === hour;
                        
                        return (
                            <g key={h}>
                                {isActive && (
                                    <circle cx={tx} cy={ty} r="24" fill="#FDE68A" className="drop-shadow-sm" />
                                )}
                                <text x={tx} y={ty} textAnchor="middle" dominantBaseline="central" 
                                      className={`text-3xl md:text-[32px] font-bold ${isActive ? 'fill-[#B45309]' : 'fill-[#1E3A8A]'}`} style={{ userSelect: 'none' }}>
                                    {h}
                                </text>
                            </g>
                        );
                    })}

                    {/* Cheat Mode numbers */}
                    <AnimatePresence>
                        {showCheats && Array.from({ length: 12 }).map((_, i) => {
                            const h = i + 1;
                            const mins = h * 5;
                            const angle = h * 30;
                            const rad = (angle - 90) * Math.PI / 180;
                            const cheatRadius = RADIUS + 24; 
                            const tx = CENTER + Math.cos(rad) * cheatRadius;
                            const ty = CENTER + Math.sin(rad) * cheatRadius;
                            return (
                                <motion.g 
                                    key={`cheat-${h}`}
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0 }}
                                    transition={{ duration: 0.3, delay: i * 0.02, type: 'spring' }}
                                >
                                  <text x={tx} y={ty} textAnchor="middle" dominantBaseline="central" 
                                        className="text-[16px] font-bold fill-[#7C3AED] opacity-80" style={{ userSelect: 'none' }}>
                                    {mins.toString().padStart(2, '0')}
                                  </text>
                                </motion.g>
                            )
                        })}
                    </AnimatePresence>

                    <g filter="url(#shadow)">
                        {/* Hour Hand */}
                        <g transform={`rotate(${hour * 30 + minute * 0.5}, ${CENTER}, ${CENTER})`}>
                            <line x1={CENTER} y1={CENTER + 20} x2={CENTER} y2={CENTER - 110} stroke="#1E3A8A" strokeWidth="12" strokeLinecap="round" />
                            {/* Grip Handle */}
                            <g className="cursor-pointer" onPointerDown={(e) => handleHandPointerDown(e, 'hour')}>
                                <circle cx={CENTER} cy={CENTER - 110} r="28" fill="transparent" />
                                <circle cx={CENTER} cy={CENTER - 110} r="12" fill="#1E3A8A" stroke="#ffffff" strokeWidth="3" 
                                    className={`transition-all ${draggingHand === 'hour' ? 'scale-125 shadow-lg' : ''}`}
                                    style={{ transformOrigin: `${CENTER}px ${CENTER - 110}px` }} />
                            </g>
                        </g>

                        {/* Minute Hand */}
                        <g transform={`rotate(${minute * 6}, ${CENTER}, ${CENTER})`}>
                            <line x1={CENTER} y1={CENTER + 30} x2={CENTER} y2={CENTER - 160} stroke="#2563EB" strokeWidth="8" strokeLinecap="round" />
                            {/* Grip Handle */}
                            <g className="cursor-pointer" onPointerDown={(e) => handleHandPointerDown(e, 'minute')}>
                                <circle cx={CENTER} cy={CENTER - 160} r="32" fill="transparent" />
                                <circle cx={CENTER} cy={CENTER - 160} r="10" fill="#2563EB" stroke="#ffffff" strokeWidth="3" 
                                    className={`transition-all ${draggingHand === 'minute' ? 'scale-150 shadow-lg' : ''}`}
                                    style={{ transformOrigin: `${CENTER}px ${CENTER - 160}px` }} />
                            </g>
                        </g>


                    </g>
                </svg>

                {/* SUCCESS ANIMATION OVERLAY */}
                <AnimatePresence>
                    {success && (
                        <motion.div 
                            initial={{ scale: 0, opacity: 0 }} 
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            className="absolute inset-[10%] flex items-center justify-center pointer-events-none z-20"
                        >
                            <div className="bg-green-500/90 backdrop-blur-sm text-white w-full h-full rounded-full shadow-2xl flex flex-col items-center justify-center border-4 border-green-300">
                                <Star className="w-20 h-20 text-yellow-300 mb-2 drop-shadow-md" fill="currentColor" />
                                <h2 className="text-3xl font-black">Great Job!</h2>
                                <p className="font-bold text-green-100 mt-1">Loading next time...</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            
            {/* Action Buttons */}
            <div className="w-full max-w-md flex mt-2 mb-4">
                <button 
                    onClick={handleCheck} 
                    className="flex-1 bg-gradient-to-r from-orange-400 to-amber-500 text-white text-xl md:text-2xl font-black py-4 px-6 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all border-4 border-white/60 tracking-wider uppercase"
                >
                    Check Answer!
                </button>
            </div>
          </div>
      </main>

    </div>
  );
}


