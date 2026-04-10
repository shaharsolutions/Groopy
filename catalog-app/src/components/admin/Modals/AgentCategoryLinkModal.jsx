import React from 'react';
import { 
  X, 
  Check, 
  Link as ChainLink, 
  ChevronRight,
  Package,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AgentCategoryLinkModal = ({ 
  isOpen, 
  onClose, 
  agent, 
  categories, 
  onCopyLink, 
  copyFeedback 
}) => {
  if (!agent) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Layers size={16} className="text-primary-500" />
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">קישור מותאם לקטגוריה</h2>
            </div>
            <p className="text-slate-400 text-sm font-bold tracking-tight">
              יצירת קישור לסוכן: <span className="text-slate-600">{agent.name}</span>
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-3 bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-2xl transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 pt-4 custom-scrollbar">
          <div className="mb-6">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">בחר קטגוריה ליצירת קישור (רק קטגוריות עם מוצרים)</h3>
            <div className="grid grid-cols-1 gap-3">
              {/* Option: All Categories (Default) */}
              <button
                onClick={() => onCopyLink(agent)}
                className="group flex items-center justify-between p-5 bg-slate-50/50 hover:bg-primary-50 border border-slate-100 hover:border-primary-200 rounded-3xl transition-all text-right"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-primary-500 group-hover:scale-110 transition-transform">
                    <Package size={20} />
                  </div>
                  <div>
                    <span className="block text-slate-800 font-black text-lg">כל הקטלוג</span>
                    <span className="text-slate-400 text-xs font-bold italic">ללא פירוט קטגוריה</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {copyFeedback === agent.id ? (
                    <div className="bg-green-100 text-green-600 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                      <Check size={12} /> הועתק
                    </div>
                  ) : (
                    <ChainLink size={20} className="text-slate-300 group-hover:text-primary-400 transition-colors" />
                  )}
                  <ChevronRight size={18} className="text-slate-200 group-hover:text-primary-200 group-hover:translate-x-[-4px] transition-all" />
                </div>
              </button>

              {/* Individual Categories */}
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => onCopyLink(agent, cat.name)}
                  className="group flex items-center justify-between p-4 bg-white hover:bg-slate-50 border border-slate-100 hover:border-slate-200 rounded-3xl transition-all text-right shadow-sm hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-primary-500 transition-colors">
                      <Package size={16} />
                    </div>
                    <span className="text-slate-700 font-bold text-base">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {copyFeedback === `${agent.id}-${cat.name}` ? (
                      <div className="bg-green-50 text-green-500 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                        <Check size={12} /> הועתק
                      </div>
                    ) : (
                      <ChainLink size={18} className="text-slate-200 group-hover:text-slate-400" />
                    )}
                    <ChevronRight size={16} className="text-slate-100 group-hover:text-slate-300" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between sticky bottom-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">קישור אישי לסוכן</span>
          </div>
          <button 
            onClick={onClose}
            className="text-xs font-black text-slate-400 hover:text-slate-600 uppercase tracking-[0.2em] transition-colors"
          >
            סגור חלון
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default AgentCategoryLinkModal;
