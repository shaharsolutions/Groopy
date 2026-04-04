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
          className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 text-white py-5 md:py-8 px-6 md:px-12 shadow-[0_20px_50px_rgba(37,99,235,0.3)] sticky top-[80px] md:top-[96px] lg:top-[112px] z-[50] flex items-center justify-between border-b border-white/10 overflow-hidden"
        >
          <div className="flex items-center gap-5 md:gap-8">
            <div className="w-16 h-16 md:w-28 md:h-28 rounded-[28px] md:rounded-[40px] bg-white/20 flex items-center justify-center backdrop-blur-md border-2 border-white/40 shadow-2xl overflow-hidden ring-8 ring-white/10 shrink-0">
              {activeAgent.image ? (
                <img src={activeAgent.image} alt={activeAgent.name} className="w-full h-full object-cover scale-105" />
              ) : (
                <UserCheck className="w-8 h-8 md:w-12 md:h-12 text-white" />
              )}
            </div>
            <div>
              <p className="text-xs md:text-base opacity-90 leading-none mb-2 md:mb-3 font-bold uppercase tracking-[0.1em]">מחובר לסוכן</p>
              <h2 className="font-[900] text-2xl md:text-5xl tracking-tighter leading-none text-white drop-shadow-lg">{activeAgent.name}</h2>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-3 bg-white/20 px-4 md:px-6 py-2 md:py-3 rounded-2xl backdrop-blur-md border border-white/20 shadow-lg shrink-0">
            <div className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 rounded-full bg-green-400 animate-pulse shadow-[0_0_15px_rgba(74,222,128,0.8)]" />
            <span className="text-xs md:text-base font-black uppercase tracking-[0.2em]">Connected</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AgentBanner;
