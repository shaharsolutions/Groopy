import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ProductFormModal = ({ 
    isOpen, 
    onClose, 
    product, 
    setProduct, 
    categories, 
    onSave, 
    isUpdating, 
    title 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
      />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl relative flex flex-col max-h-[90vh] md:max-h-[85vh] overflow-hidden"
        dir="rtl"
      >
        {/* Header */}
        <div className="p-6 md:p-12 pb-4 flex items-center justify-between">
          <h2 className="text-3xl font-black tracking-tighter">{title}</h2>
          <button 
            onClick={onClose}
            className="text-slate-300 hover:text-slate-900 transition-colors flex-shrink-0 mr-2"
          >
            <X size={32} />
          </button>
        </div>
        
        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-12 pt-0 thin-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
            <div className="flex flex-col gap-2 col-span-1 md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">שם המוצר</label>
              <input 
                type="text" 
                value={product.name}
                onChange={(e) => setProduct({...product, name: e.target.value})}
                className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-4 md:px-6 font-bold outline-none focus:border-primary-500 transition-all shadow-inner" 
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">מק״ט</label>
              <input 
                type="text" 
                value={product.sku}
                onChange={(e) => setProduct({...product, sku: e.target.value})}
                className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-4 md:px-6 font-bold outline-none focus:border-primary-500 transition-all shadow-inner" 
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end col-span-1 md:col-span-2">
              <div className="flex flex-col gap-2 md:col-span-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2 truncate">מחיר (₪)</label>
                <input 
                  type="number" 
                  value={product.price}
                  onChange={(e) => setProduct({...product, price: e.target.value})}
                  className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-4 md:px-6 font-bold outline-none focus:border-primary-500 transition-all shadow-inner" 
                />
              </div>
              <div className="flex flex-col gap-2 md:col-span-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2 truncate">כמות ברירת מחדל</label>
                <input 
                  type="number" 
                  value={product.default_quantity || 12}
                  onChange={(e) => setProduct({...product, default_quantity: e.target.value})}
                  className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-4 md:px-6 font-bold outline-none focus:border-primary-500 transition-all shadow-inner" 
                />
              </div>
              <div className="md:col-span-2 flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl shadow-inner h-14 self-end">
                <div className="relative flex items-center">
                  <input 
                    type="checkbox" 
                    id="is_default_carton"
                    checked={product.is_default_carton}
                    onChange={() => setProduct({...product, is_default_carton: !product.is_default_carton})}
                    className="peer w-6 h-6 border-2 border-slate-300 rounded-lg checked:bg-primary-500 checked:border-primary-500 transition-all outline-none cursor-pointer"
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-white opacity-0 peer-checked:opacity-100">
                    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                </div>
                <label htmlFor="is_default_carton" className="text-[10px] font-black text-slate-800 uppercase tracking-widest cursor-pointer select-none">נמכר בקרטונים</label>
              </div>

              <div className="md:col-span-2 flex items-center justify-between gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl shadow-inner h-14 self-end">
                <div className="flex items-center gap-3">
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox" 
                      id="is_incremental_add"
                      checked={product.is_incremental_add}
                      onChange={() => setProduct({...product, is_incremental_add: !product.is_incremental_add})}
                      className="peer w-6 h-6 border-2 border-slate-300 rounded-lg checked:bg-accent-500 checked:border-accent-500 transition-all outline-none cursor-pointer"
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-white opacity-0 peer-checked:opacity-100">
                      <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  </div>
                  <label htmlFor="is_incremental_add" className="text-[10px] font-black text-slate-800 uppercase tracking-widest cursor-pointer select-none whitespace-nowrap">תוספת הדרגתית</label>
                </div>
                
                {product.is_incremental_add && (
                  <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-tighter text-left leading-tight">יחידות<br/>לתוספת</label>
                    <input 
                      type="number" 
                      placeholder="1"
                      value={product.incremental_step || ''}
                      onChange={(e) => setProduct({...product, incremental_step: e.target.value ? Number(e.target.value) : null})}
                      className="w-12 h-9 bg-white border border-slate-200 rounded-lg text-center font-bold text-sm outline-none focus:border-accent-500 transition-all shadow-sm"
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">קטגוריה</label>
              <select 
                value={product.category}
                onChange={(e) => setProduct({...product, category: e.target.value})}
                className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-6 font-bold outline-none focus:border-primary-500 transition-all shadow-inner"
              >
                <option value="">בחר קטגוריה...</option>
                {categories.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">קישור לתמונה (URL)</label>
              <input 
                type="text" 
                placeholder="https://example.com/image.jpg"
                value={product.image}
                onChange={(e) => setProduct({...product, image: e.target.value})}
                className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-6 font-bold outline-none focus:border-primary-500 transition-all shadow-inner" 
              />
            </div>

            <div className="flex flex-col gap-2 col-span-1 md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">תיאור המוצר</label>
              <textarea 
                rows="4"
                value={product.description}
                onChange={(e) => setProduct({...product, description: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-3xl p-6 font-bold outline-none focus:border-primary-500 transition-all shadow-inner" 
              />
            </div>
            
            {/* Toggles */}
            <div className="grid grid-cols-3 gap-4 col-span-1 md:col-span-2">
              {[
                { id: 'is_new', label: 'חדש' },
                { id: 'is_best_seller', label: 'נמכר ביותר' },
                { id: 'is_hot_deal', label: 'מבצע חם' },
              ].map(flag => (
                <button
                  key={flag.id}
                  type="button"
                  onClick={() => setProduct({...product, [flag.id]: !product[flag.id]})}
                  className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                    product[flag.id] 
                      ? 'bg-primary-500 border-primary-500 text-white shadow-lg' 
                      : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                  }`}
                >
                  {flag.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-6 md:p-12 pt-6 border-t border-slate-100 flex gap-4 bg-slate-50/30">
          <button 
            onClick={onSave}
            disabled={isUpdating}
            className="flex-[2] btn-primary py-5 rounded-3xl font-black text-lg shadow-xl shadow-primary-500/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {isUpdating ? 'שומר...' : 'שמור שינויים'}
          </button>
          <button 
            onClick={onClose}
            className="flex-1 bg-white border border-slate-200 text-slate-500 py-5 rounded-3xl font-black text-lg hover:bg-slate-50 transition-all active:scale-95"
          >
            ביטול
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ProductFormModal;
