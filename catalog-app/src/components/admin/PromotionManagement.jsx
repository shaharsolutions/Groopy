import React from 'react';
import { Edit, Trash2, Check, X, Megaphone } from 'lucide-react';
import { motion } from 'framer-motion';

const PromotionManagement = ({ 
    promotions, 
    confirmingPromotionDelete, 
    setConfirmingPromotionDelete, 
    handleDeletePromotion, 
    setEditingPromotion,
    handleTogglePromotionActive
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {promotions.map((promo, idx) => (
        <motion.div 
          layout
          key={promo.id || `promo-${idx}`}
          className="bg-white rounded-[40px] border border-slate-200 shadow-sm relative group overflow-hidden flex flex-col"
        >
          <div className="p-8">
            <div className="flex items-center justify-between mb-4">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border backdrop-blur-md shadow-sm ${
                promo.is_active 
                    ? 'bg-green-500/10 text-green-600 border-green-500/20' 
                    : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${promo.is_active ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
                {promo.is_active ? 'פעיל' : 'לא פעיל'}
                </div>
                <button 
                    onClick={() => handleTogglePromotionActive(promo.id, !promo.is_active)}
                    className={`p-2 rounded-xl transition-all ${promo.is_active ? 'text-green-500 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                    {promo.is_active ? <Check size={20} /> : <X size={20} />}
                </button>
            </div>

            <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-500">
                    <Megaphone size={24} />
                </div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">{promo.title || 'מבצע ללא כותרת'}</h3>
            </div>
            
            <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-100 max-h-40 overflow-y-auto thin-scrollbar">
                <div className="text-xs font-mono text-slate-500 mb-2">תצוגה מקדימה (HTML):</div>
                <div 
                    className="text-sm text-slate-700 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: promo.content }}
                />
            </div>

            <div className="pt-6 border-t border-slate-50 flex gap-4">
              {confirmingPromotionDelete === promo.id ? (
                <div className="w-full flex items-center justify-between gap-4 bg-red-50 p-4 rounded-2xl border border-red-100">
                  <span className="font-black text-sm text-red-500">למחוק מבצע?</span>
                  <div className="flex gap-2">
                    <button onClick={() => handleDeletePromotion(promo.id)} className="bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-black">מחק</button>
                    <button onClick={() => setConfirmingPromotionDelete(null)} className="bg-slate-200 text-slate-500 px-4 py-2 rounded-xl text-sm font-black">ביטול</button>
                  </div>
                </div>
              ) : (
                <>
                  <button 
                    onClick={() => setEditingPromotion(promo)}
                    className="flex-1 py-4 text-center text-slate-400 hover:text-primary-600 font-bold text-xs uppercase tracking-widest transition-colors bg-slate-50 hover:bg-white rounded-xl border border-transparent hover:border-slate-100"
                  >
                    עריכה
                  </button>
                  <button 
                    onClick={() => setConfirmingPromotionDelete(promo.id)}
                    className="flex-1 py-4 text-center text-red-300 hover:text-red-500 font-bold text-xs uppercase tracking-widest transition-colors bg-slate-50 hover:bg-white rounded-xl border border-transparent hover:border-slate-100"
                  >
                    מחיקה
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      ))}
      {promotions.length === 0 && (
          <div className="col-span-full py-20 text-center bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-200">
              <Megaphone size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 font-bold">לא הוגדרו מבצעים עדיין</p>
          </div>
      )}
    </div>
  );
};

export default PromotionManagement;
