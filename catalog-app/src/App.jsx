import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Catalog from './Catalog';
import Admin from './Admin';
import { Settings, Lock, X, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Catalog />} />
        <Route path="/admin" element={<AdminLoginWrapper />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

const AdminLoginWrapper = () => {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'Password') {
      setIsAuthenticated(true);
      setError(false);
    } else {
      setError(true);
      setPassword('');
    }
  };

  if (isAuthenticated) {
    return <Admin />;
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6" dir="rtl">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl opacity-50" />
      </div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-md bg-white/10 backdrop-blur-2xl p-12 rounded-[48px] border border-white/10 shadow-2xl relative z-10"
      >
        <div className="flex flex-col items-center mb-12">
          <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-xl mb-6 overflow-hidden p-2">
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Groopy Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-widest uppercase text-center">כניסת מנהל</h1>
          <p className="text-slate-400 font-bold text-sm mt-2">אנא הזן את הסיסמה לגישה למערכת</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pr-4">ADMIN PASSWORD</label>
            <div className="relative group">
              <input 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full bg-slate-800/50 border ${error ? 'border-red-500' : 'border-white/10'} focus:border-primary-400 rounded-3xl px-8 py-5 text-center text-xl font-black tracking-[1em] text-white outline-none transition-all focus:ring-4 focus:ring-primary-500/10 transition-all`}
              />
              {error && (
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute -bottom-8 left-0 right-0 text-center text-red-500 text-[10px] font-black uppercase tracking-widest"
                >
                  סיסמה שגויה. נסה שוב.
                </motion.p>
              )}
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-white text-slate-900 font-[1000] py-6 rounded-3xl hover:bg-primary-400 hover:text-white transition-all transform active:scale-95 shadow-xl hover:shadow-primary-500/20"
          >
            כניסה למערכת
          </button>
        </form>

        <a 
          href="/" 
          className="mt-12 group flex items-center justify-center gap-2 text-slate-500 hover:text-white font-black text-xs uppercase tracking-widest transition-all"
        >
          <ChevronLeft className="group-hover:-translate-x-1 transition-transform" /> חזרה לקטלוג
        </a>
      </motion.div>
    </div>
  );
};

export default App;
