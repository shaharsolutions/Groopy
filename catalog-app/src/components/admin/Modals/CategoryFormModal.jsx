import React from 'react';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';

const CategoryFormModal = ({ 
    isOpen, 
    onClose, 
    category, 
    setCategory, 
    onSave, 
    isUpdating, 
    title 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4 md:p-8 bg-slate-900/40 backdrop-blur-md">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-[40px] w-full max-w-sm p-8 shadow-2xl relative"
          dir="rtl"
        >
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-black tracking-tighter">{title}</h2>
            <button onClick={onClose} className="text-slate-300 hover:text-slate-900 transition-colors">
              <X size={32} />
            </button>
          </div>
          
          <div className="space-y-6">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">שם הקטגוריה</label>
              <input 
                type="text" 
                value={category.name}
                onChange={(e) => setCategory({...category, name: e.target.value})}
                className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-6 font-bold outline-none focus:border-primary-500 transition-all shadow-inner" 
                autoFocus
              />
            </div>
          </div>
          
          <div className="mt-10 flex gap-4">
            <button 
              onClick={onSave}
              disabled={isUpdating || !category.name}
              className="flex-1 btn-primary py-4 rounded-2xl font-black shadow-xl active:scale-95 transition-all disabled:opacity-50"
            >
              {isUpdating ? 'שומר...' : 'שמור קטגוריה'}
            </button>
            <button onClick={onClose} className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-2xl font-black hover:bg-slate-200 transition-all">
              ביטול
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CategoryFormModal;
