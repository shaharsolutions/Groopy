import React from 'react';
import { X, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';

const BrandFormModal = ({ 
    isOpen, 
    onClose, 
    brand, 
    setBrand, 
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
          className="bg-white rounded-[40px] w-full max-w-md shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden"
          dir="rtl"
        >
          <div className="p-8 pb-4 flex items-center justify-between">
            <h2 className="text-3xl font-black tracking-tighter">{title}</h2>
            <button onClick={onClose} className="text-slate-300 hover:text-slate-900 transition-colors">
              <X size={32} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-8 pt-0 thin-scrollbar">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">שם המותג</label>
              <input 
                type="text" 
                value={brand.name}
                onChange={(e) => setBrand({...brand, name: e.target.value})}
                className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-6 font-bold outline-none focus:border-primary-500 transition-all shadow-inner" 
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">סוג / קבוצה</label>
              <input 
                type="text" 
                placeholder="לדוגמא: מותגי יבוא"
                value={brand.type}
                onChange={(e) => setBrand({...brand, type: e.target.value})}
                className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-6 font-bold outline-none focus:border-primary-500 transition-all shadow-inner" 
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">קישור ללוגו (URL)</label>
              <div className="flex gap-4">
                <input 
                  type="text" 
                  placeholder="https://example.com/logo.png"
                  value={brand.logo}
                  onChange={(e) => setBrand({...brand, logo: e.target.value})}
                  className="flex-1 h-14 bg-slate-50 border border-slate-200 rounded-2xl px-6 font-bold outline-none focus:border-primary-500 transition-all shadow-inner" 
                />
                <div className="w-14 h-14 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 flex items-center justify-center text-slate-300">
                   {brand.logo ? <img src={brand.logo} alt="" className="w-full h-full object-contain p-2" /> : <ImageIcon size={24} />}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 pt-4 group cursor-pointer" onClick={() => setBrand({...brand, show_in_carousel: !brand.show_in_carousel})}>
              <button 
                type="button"
                className={`relative w-14 h-7 rounded-full p-1 transition-colors duration-300 shadow-inner flex items-center ${brand.show_in_carousel ? 'bg-emerald-500' : 'bg-slate-200'}`}
              >
                <motion.div 
                   layout
                   transition={{ type: "spring", stiffness: 500, damping: 30 }}
                   className={`w-5 h-5 bg-white rounded-full shadow-md ${brand.show_in_carousel ? 'mr-7' : 'mr-0'}`}
                />
              </button>
              <span className="text-sm font-black text-slate-600 select-none">הצג בקרוסלת מותגים</span>
            </div>
          </div>
          
          <div className="p-8 border-t border-slate-100 flex gap-4 bg-slate-50/30">
            <button 
              onClick={onSave}
              disabled={isUpdating || !brand.name || !brand.logo}
              className="flex-1 btn-primary py-4 rounded-2xl font-black shadow-xl active:scale-95 transition-all disabled:opacity-50"
            >
              {isUpdating ? 'שומר...' : 'שמור מותג'}
            </button>
            <button onClick={onClose} className="flex-1 bg-white border border-slate-200 text-slate-500 py-4 rounded-2xl font-black hover:bg-slate-50 transition-all active:scale-95">
              ביטול
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default BrandFormModal;
