import React from 'react';
import { Edit, Trash2, Check, X, Layers } from 'lucide-react';
import { motion } from 'framer-motion';

const CategoryManagement = ({ 
    categories, 
    confirmingCategoryDelete, 
    setConfirmingCategoryDelete, 
    handleDeleteCategory, 
    setEditingCategory 
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {categories.map((cat, idx) => (
        <motion.div 
          layout
          key={cat.id || `cat-${idx}-${cat.name}`}
          className="bg-white rounded-[32px] p-6 border border-slate-200 shadow-sm flex items-center justify-between group transition-all hover:shadow-md"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-primary-50 group-hover:text-primary-500 transition-colors">
              <Layers size={20} />
            </div>
            <span className="font-black text-slate-800 text-lg tracking-tight">{cat.name}</span>
          </div>
          
          <div className="flex items-center gap-2">
            {confirmingCategoryDelete === cat.id ? (
              <div className="flex items-center gap-1 bg-red-50 p-1 rounded-xl border border-red-100">
                <button onClick={() => handleDeleteCategory(cat.id)} className="bg-red-500 text-white p-2 rounded-lg"><Check size={14} /></button>
                <button onClick={() => setConfirmingCategoryDelete(null)} className="bg-slate-200 text-slate-500 p-2 rounded-lg"><X size={14} /></button>
              </div>
            ) : (
              <>
                <button 
                  onClick={() => setEditingCategory(cat)}
                  className="p-3 text-slate-300 hover:text-primary-600 hover:bg-slate-50 rounded-xl transition-all"
                >
                  <Edit size={18} />
                </button>
                <button 
                  onClick={() => setConfirmingCategoryDelete(cat.id)}
                  className="p-3 text-slate-300 hover:text-red-500 hover:bg-slate-50 rounded-xl transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default CategoryManagement;
