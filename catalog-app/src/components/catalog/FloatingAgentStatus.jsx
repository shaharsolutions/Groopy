import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserCheck, ChevronLeft } from 'lucide-react';

const FloatingAgentStatus = ({ activeAgent, onOpenSelector, totalItems }) => {
  // Calculate bottom position based on mini-cart visibility
  // Mini-cart sits at bottom-4 (16px) or bottom-6 (24px)
  // We want to be ~12px above it.
  const bottomPos = totalItems > 0 ? 'bottom-[108px] md:bottom-[120px]' : 'bottom-6';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        className={`fixed ${bottomPos} left-0 right-0 z-40 px-4 md:px-6 pointer-events-none transition-all duration-500 flex justify-center`}
      >
        <button
          onClick={onOpenSelector}
          className="pointer-events-auto max-w-fit flex items-center gap-4 bg-white/90 backdrop-blur-xl border border-slate-200/50 p-2 pr-5 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.1)] hover:shadow-[0_25px_60px_rgba(0,0,0,0.15)] transition-all group active:scale-95"
        >
          {/* Agent Info Area */}
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 overflow-hidden ${activeAgent ? 'bg-primary-50' : 'bg-slate-100'} border-2 ${activeAgent ? 'border-primary-100' : 'border-slate-200'}`}>
              {activeAgent?.image ? (
                <img src={activeAgent.image} alt="" className="w-full h-full object-cover" />
              ) : (
                <UserCheck size={24} className={activeAgent ? 'text-primary-600' : 'text-slate-400'} />
              )}
            </div>
            
            <div className="flex flex-col items-start pr-1">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                {activeAgent ? 'סוכן מחובר' : 'לא מחובר לסוכן'}
              </span>
              <span className="text-base font-bold text-slate-900 leading-none">
                {activeAgent ? activeAgent.name : 'בחר סוכן להזמנה'}
              </span>
            </div>
          </div>

          {/* Action Icon */}
          <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center group-hover:bg-primary-600 transition-colors mr-2">
            <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          </div>
        </button>
      </motion.div>
    </AnimatePresence>
  );
};

export default FloatingAgentStatus;
