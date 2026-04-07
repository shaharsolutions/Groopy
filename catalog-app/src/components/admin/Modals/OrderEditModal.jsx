import React, { useState, useMemo } from 'react';
import { 
  X, 
  Plus, 
  Minus, 
  Search, 
  Trash2, 
  Save, 
  ShoppingBag,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const OrderEditModal = ({ 
    isOpen, 
    onClose, 
    order,
    products, // All products for searching
    onSave,
    isUpdating
}) => {
  const [tempItems, setTempItems] = useState(order?.items || []);
  const [tempDiscount, setTempDiscount] = useState(order?.discount_pct || 0);
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen || !order) return null;

  const handleUpdateQuantity = (sku, delta) => {
    setTempItems(prev => prev.map(item => 
      item.sku === sku ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
    ));
  };

  const handleRemoveItem = (sku) => {
    setTempItems(prev => prev.filter(item => item.sku !== sku));
  };

  const handleAddItem = (product) => {
    const qty = product.default_quantity || 12;
    setTempItems(prev => {
      const exists = prev.find(it => it.sku === product.sku);
      if (exists) {
        return prev.map(it => it.sku === product.sku ? { ...it, quantity: it.quantity + qty } : it);
      }
      return [...prev, { ...product, quantity: qty }];
    });
    setSearchTerm('');
  };

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return [];
    return products
      .filter(p => p.name.includes(searchTerm) || p.sku.includes(searchTerm))
      .slice(0, 5);
  }, [products, searchTerm]);

  const subtotal = tempItems.reduce((sum, item) => sum + (parseFloat(item.price || 0) * (parseInt(item.quantity) || 0)), 0);
  const discountAmount = subtotal * (parseFloat(tempDiscount || 0) / 100);
  const total = subtotal - discountAmount;

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="bg-white rounded-[40px] w-full max-w-4xl shadow-3xl overflow-hidden shadow-2xl border border-slate-100"
          dir="rtl"
        >
          <div className="p-6 md:p-12">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 md:mb-10 gap-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-primary-50 text-primary-600 rounded-xl md:rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                   <EditIcon size={20} />
                </div>
                <div>
                   <h3 className="text-xl md:text-3xl font-[1000] text-slate-900 tracking-tighter leading-none">עריכת הזמנה #{order.sequentialId}</h3>
                   <p className="text-[10px] md:text-sm font-bold text-slate-400 mt-1">נהל מוצרים, כמויות והנחות</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="absolute top-6 left-6 p-2 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl transition-all md:relative md:top-0 md:left-0 md:p-3 md:rounded-2xl"
              >
                <X size={20} />
              </button>
            </div>


            {/* Product Search */}
            <div className="relative mb-8">
               <Search className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
               <input 
                type="text" 
                placeholder="חפש מוצר להוספה (פירוט, מק״ט...)"
                className="w-full h-18 bg-slate-50 border border-slate-100 rounded-3xl pr-16 pl-6 font-bold text-lg outline-none focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-300 transition-all shadow-inner text-right"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
               />
               
               <AnimatePresence>
                 {filteredProducts.length > 0 && (
                   <motion.div 
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: 10 }}
                     className="absolute top-full left-0 right-0 mt-3 bg-white rounded-[32px] shadow-2xl border border-slate-100 p-3 z-50 overflow-hidden"
                   >
                     {filteredProducts.map((p) => (
                       <button
                         key={p.id}
                         onClick={() => handleAddItem(p)}
                         className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 rounded-2xl transition-all group text-right"
                       >
                          <div className="w-14 h-14 bg-slate-100 rounded-xl overflow-hidden shadow-inner border border-slate-100">
                             <img src={p.image} alt="" className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1">
                             <h5 className="font-black text-slate-800 text-sm tracking-tight">{p.name}</h5>
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">מק"ט: {p.sku} • ₪{p.price}</span>
                          </div>
                          <div className="w-10 h-10 bg-slate-50 text-slate-300 group-hover:text-primary-500 group-hover:bg-primary-50 rounded-xl flex items-center justify-center transition-all">
                             <Plus size={20} />
                          </div>
                       </button>
                     ))}
                   </motion.div>
                 )}
               </AnimatePresence>
            </div>

            {/* Items List */}
            <div className="space-y-4 max-h-[40vh] overflow-y-auto thin-scrollbar pr-2 mb-10">
               {tempItems.length === 0 && (
                 <div className="py-20 text-center bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-100">
                    <ShoppingBag size={48} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-slate-400 font-bold">ההזמנה ריקה. הוסף מוצרים מעלה.</p>
                 </div>
               )}
               {tempItems.map((item) => (
                 <div 
                   key={item.sku}
                   className="flex items-center gap-6 p-5 bg-white border border-slate-100 rounded-[32px] shadow-sm hover:border-slate-200 transition-all"
                 >
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl overflow-hidden border border-slate-50 shrink-0">
                       <img src={item.image} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                       <h4 className="font-black text-slate-800 text-base tracking-tight truncate leading-none mb-1">{item.name}</h4>
                       <span className="text-xs font-bold text-slate-400">מק"ט: {item.sku} • ₪{parseFloat(item.price).toFixed(2)}</span>
                    </div>

                    <div className="flex items-center bg-slate-50 p-1.5 rounded-2xl gap-3">
                       <button onClick={() => handleUpdateQuantity(item.sku, -1)} className="w-9 h-9 flex items-center justify-center bg-white text-slate-400 hover:text-red-500 rounded-xl shadow-sm transition-all"><Minus size={16} /></button>
                       <span className="text-xl font-black text-slate-800 w-8 text-center tabular-nums">{item.quantity}</span>
                       <button onClick={() => handleUpdateQuantity(item.sku, 1)} className="w-9 h-9 flex items-center justify-center bg-white text-slate-400 hover:text-primary-600 rounded-xl shadow-sm transition-all"><Plus size={16} /></button>
                    </div>

                    <button 
                      onClick={() => handleRemoveItem(item.sku)}
                      className="p-3 text-slate-300 hover:text-red-500 transition-colors"
                    >
                       <Trash2 size={20} />
                    </button>
                 </div>
               ))}
            </div>

            {/* Footer Summary & Save */}
            <div className="bg-slate-900 rounded-[48px] p-8 md:p-12 text-white">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-end">
                  <div className="space-y-6">
                     <div className="flex items-center justify-between text-slate-400">
                        <span className="text-sm font-black uppercase tracking-widest">סיכום ביניים</span>
                        <span className="text-xl font-black tabular-nums">₪{subtotal.toFixed(2)}</span>
                     </div>
                     <div className="flex items-center justify-between">
                        <span className="text-sm font-black text-primary-400 uppercase tracking-widest">הנחה באחוזים</span>
                        <div className="flex items-center gap-3 bg-white/10 rounded-2xl px-5 py-2">
                           <input 
                            type="number" 
                            className="bg-transparent text-xl font-black text-primary-400 text-center outline-none w-16 no-arrows"
                            value={tempDiscount}
                            onChange={(e) => setTempDiscount(e.target.value)}
                           />
                           <span className="text-xl font-black text-primary-400">%</span>
                        </div>
                     </div>
                     <div className="pt-6 border-t border-white/10 flex items-center justify-between">
                        <span className="text-sm font-black text-white/50 uppercase tracking-widest">סה"כ לתשלום</span>
                        <span className="text-4xl font-[1000] tracking-tighter tabular-nums">₪{total.toFixed(2)}</span>
                     </div>
                  </div>

                  <div className="flex flex-col gap-4">
                     <button 
                       onClick={() => onSave(tempItems, tempDiscount)} 
                       disabled={isUpdating}
                       className="w-full h-18 bg-white text-slate-900 rounded-[28px] font-black text-lg flex items-center justify-center gap-3 shadow-xl hover:bg-slate-100 transition-all active:scale-95 disabled:opacity-50"
                     >
                       {isUpdating ? (
                         <div className="w-6 h-6 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
                       ) : (
                         <>
                           <Save size={20} />
                           <span>שמר שינויים</span>
                         </>
                       )}
                     </button>
                     <p className="flex items-center gap-2 text-[10px] font-bold text-white/30 px-2 justify-center">
                        <AlertTriangle size={12} />
                        שינויים אלו יעדכנו את בסיס הנתונים באופן מיידי.
                     </p>
                  </div>
               </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const EditIcon = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22h6a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v10"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10.4 12.6a2 2 0 1 1 3 3L8 21l-4 1 1-4Z"/></svg>
);

export default OrderEditModal;
