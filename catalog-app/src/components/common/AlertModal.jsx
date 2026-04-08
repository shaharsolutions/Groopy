import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, CheckCircle2, Info } from 'lucide-react';

const AlertModal = ({ 
  isOpen, 
  onClose, 
  message, 
  type = 'error', // 'error' | 'success' | 'info'
  title
}) => {
  if (!isOpen) return null;

  const config = {
    error: {
      icon: <AlertCircle className="text-red-500" size={32} />,
      bg: 'bg-red-50',
      border: 'border-red-100',
      button: 'bg-red-500 hover:bg-red-600 shadow-red-200',
      defaultTitle: 'שגיאה'
    },
    success: {
      icon: <CheckCircle2 className="text-emerald-500" size={32} />,
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
      button: 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200',
      defaultTitle: 'הצלחה'
    },
    info: {
      icon: <Info className="text-primary-500" size={32} />,
      bg: 'bg-primary-50',
      border: 'border-primary-100',
      button: 'bg-primary-500 hover:bg-primary-600 shadow-primary-200',
      defaultTitle: 'הודעה'
    }
  };

  const current = config[type] || config.error;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden border border-slate-100"
            dir="rtl"
          >
            {/* Header / Icon Area */}
            <div className={`p-8 pb-4 flex flex-col items-center text-center`}>
              <div className={`w-20 h-20 ${current.bg} rounded-3xl flex items-center justify-center mb-6 shadow-inner border ${current.border}`}>
                {current.icon}
              </div>
              <h3 className="text-2xl font-[1000] text-slate-900 tracking-tight mb-2">
                {title || current.defaultTitle}
              </h3>
            </div>

            {/* Message Area */}
            <div className="px-8 pb-8 text-center">
              <div 
                className="text-slate-600 font-bold text-lg leading-relaxed"
                dangerouslySetInnerHTML={{ __html: message }}
              />
            </div>

            {/* Actions */}
            <div className="p-8 pt-0 flex flex-col gap-3">
              <button 
                onClick={onClose}
                className={`w-full py-4 rounded-2xl text-white font-black text-lg shadow-xl transition-all active:scale-95 ${current.button}`}
              >
                סגור
              </button>
            </div>

            {/* Close Button X */}
            <button 
              onClick={onClose}
              className="absolute top-6 left-6 p-2 text-slate-300 hover:text-slate-900 transition-colors"
            >
              <X size={20} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AlertModal;
