import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserCheck, Phone } from 'lucide-react';

const AgentBanner = ({ activeAgent, onSelectClick, isFromLink }) => {
  return (
    <AnimatePresence>
      <motion.div 
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className={`${activeAgent ? 'bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600' : 'bg-slate-900'} text-white py-5 md:py-8 px-6 md:px-12 shadow-[0_20px_50px_rgba(15,23,42,0.3)] sticky top-[80px] md:top-[96px] lg:top-[112px] z-[50] flex flex-col md:flex-row items-center justify-between border-b border-white/10 overflow-hidden gap-6`}
      >
        <div className="flex items-center gap-5 md:gap-8 w-full md:w-auto">
          <div className="w-16 h-16 md:w-28 md:h-28 rounded-[28px] md:rounded-[40px] bg-white/20 flex items-center justify-center backdrop-blur-md border-2 border-white/40 shadow-2xl overflow-hidden ring-8 ring-white/10 shrink-0">
            {activeAgent?.image ? (
              <img src={activeAgent.image} alt={activeAgent.name} className="w-full h-full object-cover scale-105" />
            ) : (
              <UserCheck className="w-8 h-8 md:w-12 md:h-12 text-white opacity-40" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-[10px] md:text-sm font-black uppercase tracking-[0.2em] mb-1 md:mb-2 text-white/60">
              {activeAgent ? 'סוכן מחובר' : 'הממשק אינו מחובר לסוכן'}
            </p>
            <div className="flex items-center gap-4">
              <h2 className="font-[900] text-2xl md:text-5xl tracking-tighter leading-none text-white drop-shadow-lg">
                {activeAgent ? activeAgent.name : 'בחר סוכן להמשך'}
              </h2>
              {activeAgent?.phone && (
                <a 
                  href={`tel:${activeAgent.phone}`}
                  className="w-10 h-10 md:w-14 md:h-14 bg-white/20 hover:bg-white/30 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/30 transition-all hover:scale-110 active:scale-95 shadow-lg group"
                  title="התקשר לסוכן"
                >
                  <Phone className="w-5 h-5 md:w-7 md:h-7 text-white group-hover:animate-bounce" />
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto justify-end">
          {/* Only show select/change button if we DID NOT arrive via a direct link, or if no agent is yet connected */}
          {(!isFromLink || !activeAgent) && (
            <button
              onClick={onSelectClick}
              className="flex-1 md:flex-none bg-white text-slate-900 px-6 md:px-10 py-3 md:py-4 rounded-2xl md:rounded-[24px] font-black text-sm md:text-lg hover:bg-slate-100 hover:scale-105 transition-all shadow-xl active:scale-95 whitespace-nowrap"
            >
              {activeAgent ? 'החלף סוכן' : 'בחר סוכן עכשיו'}
            </button>
          )}
          
          <div className="hidden lg:flex items-center gap-3 bg-white/10 px-6 py-3 rounded-2xl backdrop-blur-md border border-white/10">
            <div className={`w-3.5 h-3.5 rounded-full ${activeAgent ? 'bg-green-400' : 'bg-red-400 animate-pulse'} shadow-lg`} />
            <span className="text-sm font-black uppercase tracking-[0.2em]">{activeAgent ? 'פעיל' : 'ממתין'}</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AgentBanner;
