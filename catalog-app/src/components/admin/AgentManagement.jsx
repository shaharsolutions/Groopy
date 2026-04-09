import React from 'react';
import { 
  User, 
  Link as ChainLink, 
  Share2, 
  Check, 
  Users 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AgentManagement = ({ 
    agents, 
    handleCopyAgentLink, 
    copyFeedback, 
    handleShareAgent, 
    confirmingAgentDelete, 
    setConfirmingAgentDelete, 
    handleDeleteAgent, 
    setEditingAgent 
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {agents.map(agent => (
        <motion.div 
          layout
          key={agent.id || `agent-${agent.name}-${agent.phone}`}
          className="bg-white rounded-[40px] p-8 border border-slate-200 shadow-sm relative group overflow-hidden"
        >
          <div className="flex items-center gap-5 mb-8">
            <div className="w-16 h-16 bg-gradient-to-tr from-slate-100 to-slate-200 rounded-3xl flex items-center justify-center text-slate-400 shadow-inner overflow-hidden">
              {agent.image ? (
                <img src={agent.image} alt={agent.name} className="w-full h-full object-cover" />
              ) : (
                <User size={28} />
              )}
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-1">{agent.name}</h3>
              {agent.description && (
                <p className="text-primary-600 font-black text-[11px] mb-1 pr-0.5">
                  {agent.description}
                </p>
              )}
              <p className="text-slate-400 font-bold text-sm leading-none">{agent.phone}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-6 border-t border-slate-50">
             <button 
               onClick={() => handleCopyAgentLink(agent)}
               className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-2xl transition-all group/link"
             >
               <div className="flex items-center gap-3">
                  {copyFeedback === agent.id ? <Check size={18} className="text-green-500" /> : <ChainLink size={18} />}
                  <span className="font-black text-sm">{copyFeedback === agent.id ? 'הועתק!' : 'העתק קישור לקטלוג'}</span>
               </div>
               <div className="text-[10px] uppercase font-black tracking-widest opacity-40 group-hover/link:opacity-100">העתקה</div>
             </button>

             {navigator.share && (
               <button 
                 onClick={() => handleShareAgent(agent)}
                 className="w-full flex items-center justify-between p-4 bg-primary-500 text-white rounded-2xl transition-all shadow-lg shadow-primary-500/20 hover:scale-[1.02] active:scale-[0.98]"
               >
                 <div className="flex items-center gap-3">
                    <Share2 size={18} />
                    <span className="font-black text-sm text-right">שיתוף קטלוג סוכן</span>
                 </div>
                 <div className="text-[10px] uppercase font-black tracking-widest opacity-70">Share</div>
               </button>
             )}
          </div>
             
          <div className="flex gap-4 pt-2">
           {confirmingAgentDelete === agent.id ? (
             <div className="w-full flex items-center justify-center gap-4 bg-red-50 py-3 rounded-xl border border-red-100">
               <span className="font-black text-[10px] text-red-500 tracking-widest">מחיקה?</span>
               <div className="flex gap-2">
                 <button onClick={() => handleDeleteAgent(agent.id)} className="bg-red-500 text-white px-3 py-1 rounded-lg text-[10px] font-black hover:bg-red-600 transition-colors">כן</button>
                 <button onClick={() => setConfirmingAgentDelete(null)} className="bg-slate-200 text-slate-500 px-3 py-1 rounded-lg text-[10px] font-black hover:bg-slate-300 transition-colors">בטל</button>
               </div>
             </div>
           ) : (
             <>
               <button 
                 onClick={() => setEditingAgent(agent)}
                 className="flex-1 py-3 text-center text-slate-400 hover:text-primary-600 font-bold text-[10px] uppercase tracking-widest transition-colors bg-slate-50 hover:bg-white rounded-xl border border-transparent hover:border-slate-100"
               >
                 עריכת סוכן
               </button>
               <button 
                onClick={() => setConfirmingAgentDelete(agent.id)}
                className="flex-1 py-3 text-center text-red-300 hover:text-red-500 font-bold text-[10px] uppercase tracking-widest transition-colors bg-slate-50 hover:bg-white rounded-xl border border-transparent hover:border-slate-100"
               >
                 מחיקת סוכן
               </button>
             </>
           )}
          </div>

          <div className="absolute top-4 left-4 flex gap-2">
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          </div>
        </motion.div>
      ))}
      
      {agents.length === 0 && (
        <div className="col-span-full py-32 text-center border-2 border-dashed border-slate-200 rounded-[40px] opacity-30">
          <Users size={64} className="mx-auto mb-4" />
          <p className="font-black text-xl">אין סוכנים רשומים... עדיין</p>
        </div>
      )}
    </div>
  );
};

export default AgentManagement;
