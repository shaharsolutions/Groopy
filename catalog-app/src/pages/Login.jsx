import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LoginPage = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD;
    
    // Trim values to avoid invisible space issues
    const trimmedInput = password.trim();
    const normalizedAdminPassword = adminPassword ? String(adminPassword).trim() : null;
    
    if (normalizedAdminPassword && trimmedInput === normalizedAdminPassword) {
      onLogin(true, rememberMe);
      setError(false);
    } else {
      setError(true);
      setPassword('');
      
      // Developer hint if the env var is missing
      if (!normalizedAdminPassword) {
        console.error('VITE_ADMIN_PASSWORD is not defined in environment variables');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6" dir="rtl">
      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl opacity-50" />
      </div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-md bg-white/10 backdrop-blur-2xl p-10 py-12 rounded-[48px] border border-white/10 shadow-2xl relative z-10"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="h-24 bg-white rounded-3xl flex items-center justify-center shadow-xl mb-6 overflow-hidden p-1 border border-white/20">
            <img src={`${import.meta.env.BASE_URL}byGroopy_strip.png`} alt="Groopy Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-widest uppercase text-center">כניסת מנהל</h1>
          <p className="text-slate-400 font-bold text-sm mt-2 text-center">אנא הזן את הסיסמה לגישה למערכת</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pr-4">ADMIN PASSWORD</label>
            <div className="relative group">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(false);
                }}
                className={`w-full bg-slate-800/50 border ${error ? 'border-red-500 bg-red-500/5' : 'border-white/10'} focus:border-primary-400 rounded-3xl px-8 py-5 text-center text-xl font-black tracking-[0.5em] text-white outline-none transition-all focus:ring-4 focus:ring-primary-500/10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 px-2 py-2">
            <label className="flex items-center gap-3 cursor-pointer select-none group">
              <div className="relative">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="w-6 h-6 border-2 border-white/20 rounded-lg group-hover:border-primary-400 transition-all peer-checked:bg-primary-500 peer-checked:border-primary-500 flex items-center justify-center">
                  <motion.div
                    initial={false}
                    animate={{ scale: rememberMe ? 1 : 0 }}
                    transition={{ type: "spring", damping: 12, stiffness: 300 }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </motion.div>
                </div>
              </div>
              <span className="text-sm font-bold text-slate-400 group-hover:text-white transition-colors">זכור אותי</span>
            </label>
          </div>

          {/* Fixed height container for error message to prevent jumping */}
          <div className="h-6 overflow-hidden">
            <AnimatePresence>
              {error && (
                <motion.p 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-center text-red-500 text-[10px] font-black uppercase tracking-widest"
                >
                  סיסמה שגויה. נסה שוב.
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <button 
            type="submit"
            className="w-full bg-white text-slate-900 font-[1000] py-6 rounded-3xl hover:bg-primary-400 hover:text-white transition-all transform active:scale-95 shadow-xl hover:shadow-primary-500/20"
          >
            כניסה למערכת
          </button>
        </form>

        <Link 
          to="/" 
          className="mt-10 group flex items-center justify-center gap-2 text-slate-500 hover:text-white font-black text-xs uppercase tracking-widest transition-all"
        >
          <ChevronLeft className="group-hover:-translate-x-1 transition-transform" /> חזרה לקטלוג
        </Link>
      </motion.div>
    </div>
  );
};

export default LoginPage;
