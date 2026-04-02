import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserCheck } from 'lucide-react';

const AgentBanner = ({ activeAgent }) => {
  return (
    <AnimatePresence>
      {activeAgent && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-blue-600 text-white py-3 px-4 shadow-xl sticky top-[80px] z-[50] flex items-center justify-between border-b border-blue-400 overflow-hidden"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <UserCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-[10px] opacity-70 leading-none mb-1 font-bold">מחובר לסוכן</p>
              <p className="font-black text-base tracking-tight leading-none text-white">{activeAgent.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-xl backdrop-blur-sm border border-white/10 shrink-0">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
            <span className="text-[10px] font-black uppercase tracking-widest">Connected</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AgentBanner;
