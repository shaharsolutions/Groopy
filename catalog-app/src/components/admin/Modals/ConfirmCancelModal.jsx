import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Send } from 'lucide-react';

const ConfirmCancelModal = ({ isOpen, onClose, onConfirm, orderId }) => {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
        <motion.div
          key="cancel-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />
        
        <motion.div
          key="cancel-modal"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-red-50/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                <AlertTriangle size={20} />
              </div>
              <div className="text-right">
                <h3 className="text-lg font-black text-slate-900 leading-tight">ביטול הזמנה</h3>
                <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">פעולה בלתי הפיכה</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={20} className="text-slate-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-8 space-y-6 text-right">
            <div className="space-y-2">
              <div className="flex items-center justify-between pr-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">אופציונלי</span>
                <label className="text-sm font-black text-slate-700 block text-right">סיבת ביטול ההזמנה</label>
              </div>
              <textarea 
                autoFocus
                rows="4"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="הסבר מדוע ההזמנה מבוטלת (לא חובה)..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 transition-all text-right resize-none placeholder:text-slate-300"
              />
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3 text-right">
              <div className="flex-1">
                <p className="text-[11px] font-bold text-amber-900 leading-relaxed">
                  הערה: אם תזין סיבה, היא תתווסף כהערה לוגיסטית לצורך מעקב.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-4 px-6 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95"
            >
              חזור בך
            </button>
            <button
              onClick={() => onConfirm(reason)}
              className="flex-1 py-4 px-6 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-200 hover:bg-red-700 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span>אשר ביטול</span>
              <Send size={14} className="rotate-180" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ConfirmCancelModal;
