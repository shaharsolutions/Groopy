import React from 'react';
import { Image as ImageIcon, Edit, Trash2, Check, X, Tag, Package, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';

const BannerManagement = ({ 
    banners, 
    confirmingBannerDelete, 
    setConfirmingBannerDelete, 
    handleDeleteBanner, 
    setEditingBanner 
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {banners.map((banner, idx) => (
        <motion.div 
          layout
          key={banner.id || `banner-${idx}-${banner.title}`}
          className="bg-white rounded-[40px] border border-slate-200 shadow-sm relative group overflow-hidden flex flex-col"
        >
          {/* Banner Image Preview */}
          <div className="aspect-[16/10] w-full bg-slate-100 overflow-hidden relative">
            {banner.image ? (
              <img 
                src={banner.image} 
                alt={banner.title} 
                className="w-full h-full transition-all duration-300" 
                style={{
                  objectFit: banner.object_fit || 'cover',
                  objectPosition: `${banner.pos_x || 50}% ${banner.pos_y || 50}%`,
                  transform: `scale(${banner.zoom || 1})`
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-300">
                <ImageIcon size={48} />
              </div>
            )}
            
            {/* Status Badge */}
            <div className={`absolute top-6 left-6 flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border backdrop-blur-md shadow-sm ${
              banner.is_active 
                ? 'bg-green-500/10 text-green-600 border-green-500/20' 
                : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${banner.is_active ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
              {banner.is_active ? 'פעיל' : 'לא פעיל'}
            </div>
            
            {/* Order Index Badge */}
            <div className="absolute top-6 right-6 bg-white/90 backdrop-blur-md border border-slate-200 w-10 h-10 rounded-2xl flex items-center justify-center text-slate-900 font-black shadow-sm">
              {banner.order_index}
            </div>
          </div>

          <div className="p-8">
            <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2">{banner.title || 'באנר ללא כותרת'}</h3>
            
            <div className="flex flex-wrap gap-3 mb-6">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-500 text-xs font-bold">
                {banner.target_type === 'badge' ? <Tag size={14} className="text-primary-500" /> : 
                 banner.target_type === 'category' ? <Package size={14} className="text-primary-500" /> : 
                 banner.target_type === 'product' ? <ShoppingBag size={14} className="text-primary-500" /> : null}
                <span className="opacity-60">יעד:</span>
                <span className="font-black text-slate-700">
                  {banner.target_type === 'badge' ? `תגית (${banner.target_value})` : 
                   banner.target_type === 'category' ? `קטגוריה (${banner.target_value})` : 
                   banner.target_type === 'product' ? `מוצר (${banner.target_value})` : 'ללא יעד'}
                </span>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-50 flex gap-4">
              {confirmingBannerDelete === banner.id ? (
                <div className="w-full flex items-center justify-between gap-4 bg-red-50 p-4 rounded-2xl border border-red-100">
                  <span className="font-black text-sm text-red-500">למחוק באנר?</span>
                  <div className="flex gap-2">
                    <button onClick={() => handleDeleteBanner(banner.id)} className="bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-black">מחק</button>
                    <button onClick={() => setConfirmingBannerDelete(null)} className="bg-slate-200 text-slate-500 px-4 py-2 rounded-xl text-sm font-black">ביטול</button>
                  </div>
                </div>
              ) : (
                <>
                  <button 
                    onClick={() => setEditingBanner(banner)}
                    className="flex-1 py-4 text-center text-slate-400 hover:text-primary-600 font-bold text-xs uppercase tracking-widest transition-colors bg-slate-50 hover:bg-white rounded-xl border border-transparent hover:border-slate-100"
                  >
                    עריכה
                  </button>
                  <button 
                    onClick={() => setConfirmingBannerDelete(banner.id)}
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
    </div>
  );
};

export default BannerManagement;
