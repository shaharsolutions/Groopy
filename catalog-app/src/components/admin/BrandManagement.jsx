import React from 'react';
import { 
  Building2, 
  Trash2, 
  Edit, 
  Check, 
  X,
  Type,
  Layout,
  Star
} from 'lucide-react';
import { motion } from 'framer-motion';

const BrandManagement = ({ 
    brands, 
    confirmingBrandDelete, 
    setConfirmingBrandDelete, 
    handleDeleteBrand, 
    setEditingBrand 
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {brands.map((brand, idx) => (
        <motion.div 
          layout
          key={brand.id || `brand-${idx}-${brand.name}`}
          className="bg-white rounded-[40px] p-8 border border-slate-200 shadow-sm relative group overflow-hidden"
        >
          <div className="flex items-center gap-5 mb-8">
            <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center overflow-hidden shadow-inner shrink-0 group-hover:scale-105 transition-transform duration-500">
               {brand.logo ? (
                 <img src={brand.logo} alt={brand.name} className="w-full h-full object-contain p-2" />
               ) : (
                 <Building2 size={24} className="text-slate-300" />
               )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight truncate">{brand.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                 <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${brand.type === 'primary' ? 'bg-primary-50 text-primary-500' : 'bg-slate-50 text-slate-400'}`}>
                   {brand.type === 'primary' ? 'מותג מוביל' : 'מותג רגיל'}
                 </span>
                 {brand.show_in_carousel && (
                   <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-500 rounded-lg text-[9px] font-black uppercase tracking-widest">
                     <Star size={8} fill="currentColor" />
                     <span>בקרוסלה</span>
                   </div>
                 )}
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-6 border-t border-slate-50">
             {confirmingBrandDelete === brand.id ? (
               <div className="w-full flex items-center justify-center gap-4 bg-red-50 p-4 rounded-2xl border border-red-100">
                  <span className="font-black text-xs text-red-500">למחוק מותג?</span>
                  <div className="flex gap-2">
                    <button onClick={() => handleDeleteBrand(brand.id)} className="bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-black">כן</button>
                    <button onClick={() => setConfirmingBrandDelete(null)} className="bg-slate-200 text-slate-500 px-4 py-2 rounded-xl text-xs font-black">בטל</button>
                  </div>
               </div>
             ) : (
               <>
                 <button 
                   onClick={() => setEditingBrand(brand)}
                   className="flex-1 py-4 text-center text-slate-400 hover:text-primary-600 font-bold text-xs uppercase tracking-widest transition-colors bg-slate-50 hover:bg-white rounded-xl border border-transparent hover:border-slate-100"
                 >
                   עריכה
                 </button>
                 <button 
                  onClick={() => setConfirmingBrandDelete(brand.id)}
                  className="flex-1 py-4 text-center text-red-300 hover:text-red-500 font-bold text-xs uppercase tracking-widest transition-colors bg-slate-50 hover:bg-white rounded-xl border border-transparent hover:border-slate-100"
                 >
                   מחיקה
                 </button>
               </>
             )}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default BrandManagement;
