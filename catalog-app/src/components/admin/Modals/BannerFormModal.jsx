import React from 'react';
import { X, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';

const BannerFormModal = ({ 
    isOpen, 
    onClose, 
    banner, 
    setBanner, 
    onSave, 
    isUpdating, 
    title,
    categories,
    products
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4 md:p-8 bg-slate-900/40 backdrop-blur-md">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden"
          dir="rtl"
        >
          <div className="p-8 pb-4 flex items-center justify-between">
            <h2 className="text-3xl font-black tracking-tighter">{title}</h2>
            <button onClick={onClose} className="text-slate-300 hover:text-slate-900 transition-colors">
              <X size={32} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-8 pt-0 thin-scrollbar">
            <div className="flex flex-col gap-2 col-span-1 md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">כותרת הבאנר (פנימי)</label>
              <input 
                type="text" 
                value={banner.title}
                onChange={(e) => setBanner({...banner, title: e.target.value})}
                className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-6 font-bold outline-none focus:border-primary-500 transition-all shadow-inner" 
              />
            </div>
            
            <div className="flex flex-col gap-2 col-span-1 md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">קישור לתמונה (URL)</label>
              <div className="flex flex-col gap-6">
                <input 
                  type="text" 
                  placeholder="https://example.com/banner.jpg"
                  value={banner.image}
                  onChange={(e) => setBanner({...banner, image: e.target.value})}
                  className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-6 font-bold outline-none focus:border-primary-500 transition-all shadow-inner" 
                />
                
                {banner.image && (
                  <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-200 space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">עיצוב תצוגה</h3>
                      <div className="flex gap-2">
                         {['cover', 'contain', 'fill'].map((fit) => (
                           <button 
                             key={fit}
                             onClick={() => setBanner({...banner, object_fit: fit})}
                             className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all ${banner.object_fit === fit ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}
                           >
                             {fit === 'cover' ? 'כיסוי' : fit === 'contain' ? 'התאמה' : 'מתיחה'}
                           </button>
                         ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase">
                          <span>מיקום אופקי (X)</span>
                          <span>{banner.pos_x || 50}%</span>
                        </div>
                        <input 
                          type="range" min="0" max="100" 
                          value={banner.pos_x || 50} 
                          onChange={(e) => setBanner({...banner, pos_x: parseInt(e.target.value)})}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-500"
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase">
                          <span>מיקום אנכי (Y)</span>
                          <span>{banner.pos_y || 50}%</span>
                        </div>
                        <input 
                          type="range" min="0" max="100" 
                          value={banner.pos_y || 50} 
                          onChange={(e) => setBanner({...banner, pos_y: parseInt(e.target.value)})}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-500"
                        />
                      </div>

                      <div className="space-y-3 col-span-1 md:col-span-2">
                        <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase">
                          <span>תקריב (Zoom)</span>
                          <span>{banner.zoom || 1}x</span>
                        </div>
                        <input 
                          type="range" min="1" max="3" step="0.1"
                          value={banner.zoom || 1} 
                          onChange={(e) => setBanner({...banner, zoom: parseFloat(e.target.value)})}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-500"
                        />
                      </div>
                    </div>

                    <div className="aspect-[16/10] bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 flex items-center justify-center text-slate-300 relative">
                       {banner.image ? (
                         <img 
                           src={banner.image} 
                           alt="" 
                           className="w-full h-full transition-all duration-300 pointer-events-none select-none"
                           style={{
                             objectFit: banner.object_fit || 'cover',
                             objectPosition: `${banner.pos_x || 50}% ${banner.pos_y || 50}%`,
                             transform: `scale(${banner.zoom || 1})`
                           }}
                         />
                       ) : <ImageIcon size={48} />}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">סוג יעד (לחיצה)</label>
              <select 
                value={banner.target_type}
                onChange={(e) => setBanner({...banner, target_type: e.target.value, target_value: ''})}
                className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-6 font-bold outline-none focus:border-primary-500 transition-all"
              >
                <option value="none">ללא קישור</option>
                <option value="category">קטגוריה</option>
                <option value="badge">תגית (מבצעים/חדשים)</option>
                <option value="product">מוצר ספציפי (מק"ט)</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">ערך יעד</label>
              {banner.target_type === 'category' ? (
                <select 
                  value={banner.target_value}
                  onChange={(e) => setBanner({...banner, target_value: e.target.value})}
                  className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-6 font-bold outline-none focus:border-primary-500 transition-all"
                >
                  <option value="">בחר קטגוריה...</option>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              ) : banner.target_type === 'badge' ? (
                <select 
                  value={banner.target_value}
                  onChange={(e) => setBanner({...banner, target_value: e.target.value})}
                  className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-6 font-bold outline-none focus:border-primary-500 transition-all"
                >
                  <option value="">בחר תגית...</option>
                  <option value="is_hot_deal">מבצעים חמים</option>
                  <option value="is_best_seller">נמכרים ביותר</option>
                  <option value="is_clearing">מוצרים חדשים</option>
                </select>
              ) : (
                <input 
                  type="text" 
                  placeholder={banner.target_type === 'product' ? 'הזן מק"ט מוצר' : 'ערך יעד'}
                  value={banner.target_value}
                  onChange={(e) => setBanner({...banner, target_value: e.target.value})}
                  className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-6 font-bold outline-none focus:border-primary-500 transition-all" 
                />
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">סדר תצוגה</label>
              <input 
                type="number" 
                value={banner.order_index}
                onChange={(e) => setBanner({...banner, order_index: parseInt(e.target.value) || 0})}
                className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-6 font-bold outline-none focus:border-primary-500 transition-all" 
              />
            </div>

            <div className="flex items-center gap-4 pt-6 group cursor-pointer" onClick={() => setBanner({...banner, is_active: !banner.is_active})}>
              <button 
                type="button"
                className={`relative w-14 h-7 rounded-full p-1 transition-colors duration-300 shadow-inner flex items-center ${banner.is_active ? 'bg-emerald-500' : 'bg-slate-200'}`}
              >
                <motion.div 
                  layout
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className={`w-5 h-5 bg-white rounded-full shadow-md ${banner.is_active ? 'mr-7' : 'mr-0'}`}
                />
              </button>
              <span className="text-sm font-black text-slate-600 select-none">באנר פעיל</span>
            </div>
          </div>
          
          <div className="p-8 border-t border-slate-100 flex gap-4 bg-slate-50/30">
            <button 
              onClick={onSave}
              disabled={isUpdating || !banner.image}
              className="flex-1 btn-primary py-5 rounded-3xl font-black text-lg shadow-2xl active:scale-95 transition-all disabled:opacity-50"
            >
              {isUpdating ? 'שומר...' : 'שמור באנר'}
            </button>
            <button onClick={onClose} className="flex-1 bg-white border border-slate-200 text-slate-500 py-5 rounded-3xl font-black text-lg hover:bg-slate-50 transition-all active:scale-95">
              ביטול
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default BannerFormModal;
