import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, 
  X, 
  Trash2, 
  Minus, 
  Plus, 
  CheckCircle, 
  TrendingDown, 
  Send,
  ShoppingCart,
  ChevronDown,
  Package,
  UserCheck,
  RotateCcw
} from 'lucide-react';

const CartDrawer = ({ 
  isCartOpen, 
  setIsCartOpen, 
  cart, 
  removeFromCart, 
  updateQuantity, 
  totalPrice, 
  totalItems, 
  customerName, 
  setCustomerName, 
  customerNote,
  setCustomerNote,
  formError, 
  setFormError, 
  handleWhatsAppSend, 
  isSent, 
  isSubmitting,
  activeAgent,
  onOpenAgentSelector,
  isAgentLocked,
  restorableCart = [],
  onRestoreCart,
  onDismissRestore
}) => {
  return (
    <>
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              key="cart-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100]"
            />
            <motion.div 
              key="cart-drawer"
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 100 }}
              className="fixed inset-y-0 right-0 w-full max-w-xl bg-white z-[100] shadow-[-20px_0_60px_-15px_rgba(0,0,0,0.3)] flex flex-col"
            >
              {/* Cart Header */}
              <div className="p-4 md:p-8 pb-4 md:pb-6 flex items-center justify-between">
                <div className="flex items-center gap-3 md:gap-4">
                   <div className="w-9 h-9 md:w-14 md:h-14 bg-slate-100 rounded-xl md:rounded-3xl flex items-center justify-center text-slate-800">
                    <ShoppingBag size={18} className="md:w-[28px] md:h-[28px]" />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-4xl font-black text-slate-900 tracking-tighter leading-tight">הסל שלך</h2>
                    <p className="text-xs md:text-base font-bold text-slate-400 uppercase tracking-widest">{totalItems} פריטים נבחרו</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center hover:bg-slate-50 rounded-xl md:rounded-2xl transition-colors text-slate-400 hover:text-slate-900"
                >
                  <X size={24} className="md:w-[32px] md:h-[32px]" />
                </button>
              </div>

              {/* Cart Items Area */}
              <div className="flex-1 overflow-y-auto px-4 md:px-8 py-2 md:py-4 space-y-4 md:space-y-8 scrollbar-hide">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                    <div className="p-8 md:p-12 bg-slate-50 rounded-full mb-6">
                      <ShoppingBag size={60} className="md:w-[80px] md:h-[80px]" strokeWidth={1} />
                    </div>
                    <p className="text-lg md:text-xl font-bold">הסל ריק כרגע...</p>
                  </div>
                ) : (
                 cart.map((item, idx) => (
                   <motion.div 
                     layout
                     initial={{ opacity: 0, x: 20 }}
                     animate={{ opacity: 1, x: 0 }}
                     key={item.id || `cart-item-${idx}`} 
                     className="flex gap-4 md:gap-6 group relative"
                    >
                      {/* Item Image */}
                      <div className="w-16 h-16 md:w-24 md:h-24 bg-slate-50 rounded-xl md:rounded-3xl flex-shrink-0 flex items-center justify-center border border-slate-100 overflow-hidden relative group-hover:scale-105 transition-transform">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package size={32} className="md:w-[40px] md:h-[40px] opacity-10" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-tr from-primary-500/5 to-accent-500/5" />
                      </div>
                      
                      {/* Item Meta */}
                      <div className="flex-1 py-0.5 md:py-1">
                        <div className="flex justify-between items-start mb-1 md:mb-2">
                           <h4 className="font-bold text-slate-800 text-sm md:text-xl leading-tight line-clamp-2 max-w-[80%]">
                            {item.name}
                          </h4>
                          <button 
                            onClick={() => removeFromCart(item.id)}
                            className="p-1 md:p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={16} className="md:w-[20px] md:h-[20px]" />
                          </button>
                        </div>
                        <div className="text-xs text-slate-400 font-black mb-2 md:mb-4 uppercase tracking-widest">
                          מק״ט: {item.sku}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 md:gap-3 bg-slate-50 p-1 md:p-1.5 rounded-xl md:rounded-2xl">
                            <button 
                              onClick={() => updateQuantity(item.id, -1)}
                              className="w-7 h-7 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center hover:bg-white transition-all text-slate-800 active:scale-90"
                            >
                              <Minus size={12} className="md:w-[18px] md:h-[18px]" />
                            </button>
                            <div className="flex flex-col items-center">
                              <span className="w-7 md:w-10 text-center font-black text-base md:text-2xl text-slate-900 leading-none">
                                {item.quantity}
                              </span>
                              <span className="text-[8px] font-black text-slate-400 uppercase">
                                יח'
                              </span>
                            </div>
                            <button 
                              onClick={() => updateQuantity(item.id, 1)}
                              className="w-7 h-7 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center hover:bg-white transition-all text-slate-800 active:scale-90"
                            >
                              <Plus size={12} className="md:w-[18px] md:h-[18px]" />
                            </button>
                          </div>
                          <div className="text-right">
                             <div className="text-xs font-black text-slate-400 uppercase mb-0.5">
                               {item.is_default_carton ? `${item.quantity / (item.default_quantity || 12)} קרטון` : ''}
                             </div>
                              <div className="font-black text-lg md:text-3xl text-slate-900 tracking-tight">₪{(item.price * item.quantity).toFixed(2)}</div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Cart Footer Checkout */}
               {cart.length > 0 && (
                   <div className="p-2.5 md:p-8 bg-slate-50/80 backdrop-blur-3xl border-t border-slate-100 space-y-2 md:space-y-6 rounded-t-[24px] md:rounded-t-[40px] shadow-[0_-20px_40px_-20px_rgba(0,0,0,0.05)]">
                    {/* Name Input */}
                    <div className="space-y-1 text-right">
                      <label className="flex items-center justify-end gap-2 text-xs md:text-base font-[900] text-slate-700 uppercase tracking-widest pl-2">
                         שם הלקוח המזמין
                         <CheckCircle size={12} className={customerName.length > 2 ? 'text-primary-500' : 'text-slate-300'} />
                      </label>
                       <input 
                        type="text" 
                        placeholder="הכנס את שמך כאן..."
                        value={customerName}
                        onChange={(e) => {
                          setCustomerName(e.target.value);
                          if (formError) setFormError('');
                        }}
                        className={`w-full bg-white border ${formError ? 'border-red-500 ring-4 ring-red-500/10' : 'border-slate-200'} rounded-2xl md:rounded-3xl px-4 md:px-6 py-2 md:py-4 outline-none focus:border-primary-500 focus:ring-8 focus:ring-primary-500/5 transition-all font-bold text-base md:text-xl text-right`}
                      />
                      <AnimatePresence>
                        {formError && (
                          <motion.p 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="text-red-500 text-xs font-black uppercase tracking-widest mt-1 pr-2"
                            dangerouslySetInnerHTML={{ __html: formError }}
                          />
                        )}
                      </AnimatePresence>
                    </div>

                     {/* Note Input */}
                    <div className="space-y-1 text-right">
                      <label className="flex items-center justify-end gap-2 text-[10px] md:text-base font-[900] text-slate-700 uppercase tracking-widest pl-2">
                         הערה (אופציונלי)
                      </label>
                      <input 
                        type="text" 
                        placeholder="הוסף הערה..."
                        value={customerNote}
                        onChange={(e) => setCustomerNote(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl md:rounded-3xl px-3 md:px-6 py-1.5 md:py-3 outline-none focus:border-primary-500 transition-all font-bold text-xs md:text-base text-right"
                      />
                    </div>
  
                    {/* Pricing Summary */}
                    <div className="bg-white rounded-[20px] md:rounded-[32px] p-3 md:p-8 border border-slate-200 shadow-sm flex flex-col gap-1.5 md:gap-4">
                      <div className="flex justify-between items-center text-slate-400 font-bold text-xs md:text-base">
                        <span>סה״כ פריטים:</span>
                        <span className="bg-slate-50 px-2 md:px-3 py-0.5 md:py-1 rounded-lg text-slate-800 font-black">{totalItems}</span>
                      </div>
                       <div className="flex justify-between items-center md:items-end border-t border-slate-50 pt-1.5 md:pt-4">
                        <div className="text-right">
                          <span className="block text-[10px] md:text-base font-black text-primary-500 uppercase tracking-wider mb-0 md:mb-1">לתשלום סופי</span>
                          <span className="text-2xl md:text-5xl font-[1000] text-slate-900 tracking-tighter leading-none">₪{totalPrice.toFixed(2)}</span>
                        </div>
                        <div className="hidden md:block">
                          <TrendingDown size={32} className="text-primary-100 -mb-2" />
                        </div>
                      </div>
                    </div>
  
                    {/* SEND BUTTON */}
                    {activeAgent ? (
                       <button 
                        onClick={handleWhatsAppSend}
                        disabled={isSubmitting}
                        className={`btn-primary w-full py-3 md:py-6 flex items-center justify-center gap-3 md:gap-4 group relative overflow-hidden ${isSent ? 'bg-green-500' : ''} ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                        {isSubmitting ? (
                          <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Send size={20} className="md:w-[24px] md:h-[24px] relative z-10 group-hover:translate-x-[-8px] group-hover:translate-y-[-8px] transition-transform duration-500" />
                        )}
                        <span className="relative z-10 font-black text-lg md:text-2xl tracking-tight">
                           {isSubmitting ? 'מעבד הזמנה...' : 'שליחת הזמנה לוואטסאפ'}
                        </span>
                        <div className="absolute inset-0 bg-white/10 translate-x-full group-hover:translate-x-0 transition-transform duration-700 skew-x-12" />
                      </button>
                    ) : (
                      <button 
                        onClick={onOpenAgentSelector}
                        className="w-full py-4 md:py-6 bg-slate-900 text-white flex items-center justify-center gap-3 md:gap-4 rounded-3xl md:rounded-[40px] font-black text-xl md:text-2xl tracking-tight hover:bg-slate-800 transition-all shadow-xl active:scale-95 group relative overflow-hidden"
                      >
                        <UserCheck size={24} className="relative z-10 group-hover:scale-110 transition-transform" />
                        <span className="relative z-10">בחר סוכן להמשך</span>
                      </button>
                    )}
                    
                    <div className="flex flex-col items-center gap-1.5">
                      {activeAgent ? (
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100/50 px-3 py-1.5 rounded-full border border-slate-100">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                          <span>נשלח לסוכן: <span className={`text-slate-900 ${isAgentLocked ? '' : 'underline decoration-primary-500 decoration-1'}`}>{activeAgent.name}</span></span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-red-500 uppercase tracking-widest bg-red-50 px-3 py-1.5 rounded-full border border-red-100">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                          <span>חובה לבחור סוכן</span>
                        </div>
                      )}
                      
                      <p className="text-[8px] md:text-xs text-center text-slate-400 font-black px-4 leading-tight uppercase tracking-widest opacity-40">
                        {activeAgent ? 'הלחיצה תפתח את הוואטסאפ' : 'יש לבחור סוכן להמשך'}
                      </p>
                    </div>
                  </div>
               )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 🚀 STICKY MINI CART (MOBILE ONLY) */}
      <AnimatePresence>
        {totalItems > 0 && !isCartOpen && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-4 md:bottom-6 left-0 right-0 z-40 px-2 md:px-6 pointer-events-none"
          >
            <button 
              onClick={() => setIsCartOpen(true)}
              className="pointer-events-auto max-w-sm mx-auto w-full glass-card border-none bg-slate-900 border-slate-800 text-white p-2 md:p-4 rounded-[24px] md:rounded-[28px] shadow-2xl flex items-center justify-between group overflow-hidden"
            >
              <div className="flex items-center gap-2 md:gap-3 relative z-10 pl-1 md:pl-2">
                <div className="w-10 h-10 md:w-14 md:h-14 bg-white/10 backdrop-blur-md rounded-xl md:rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform">
                  <ShoppingCart size={18} md:size={24} />
                </div>
                <div>
                  <div className="text-[8px] md:text-[10px] font-black opacity-40 uppercase tracking-widest mb-0.5 md:mb-1">הסל שלך</div>
                  <div className="font-black text-xl md:text-3xl tracking-tighter">₪{totalPrice.toFixed(2)}</div>
                </div>
              </div>
              <div className="flex items-center gap-1 md:gap-2 pr-0 md:pr-4 relative z-10">
                <div className="bg-white/10 hover:bg-white/20 px-3 md:px-4 py-2 md:py-4 rounded-xl md:rounded-2xl font-black text-xs md:text-base tracking-tight transition-all text-white">
                  לסגירת הזמנה
                </div>
                <ChevronDown className="-rotate-90 text-primary-400" size={20} md:size={24} />
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🔄 RESTORE CART BUTTON */}
      <AnimatePresence>
        {cart.length === 0 && restorableCart.length > 0 && !isCartOpen && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-4 md:bottom-6 left-0 right-0 z-40 px-4 md:px-6 pointer-events-none"
          >
            <div className="relative max-w-sm mx-auto w-full pointer-events-auto">
              <button 
                onClick={onRestoreCart}
                className="w-full bg-white border-2 border-slate-900 text-slate-900 p-2 md:p-4 rounded-[24px] md:rounded-[28px] shadow-2xl flex items-center justify-between group relative overflow-hidden"
              >
                <div className="flex items-center gap-2 md:gap-3 relative z-10 pl-1 md:pl-2">
                  <div className="w-10 h-10 md:w-14 md:h-14 bg-slate-900 rounded-xl md:rounded-2xl flex items-center justify-center group-hover:rotate-[-45deg] transition-transform text-white shadow-lg">
                    <RotateCcw size={18} md:size={24} />
                  </div>
                  <div className="text-right">
                    <div className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 md:mb-1">ההזמנה לא נשלחה?</div>
                    <div className="font-black text-lg md:text-2xl tracking-tighter leading-none">שחזר את הסל</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 md:gap-2 pr-0 md:pr-4 relative z-10">
                  <div className="bg-slate-100 group-hover:bg-slate-900 group-hover:text-white px-3 md:px-4 py-2 md:py-4 rounded-xl md:rounded-2xl font-black text-xs md:text-base tracking-tight transition-all text-slate-900 shadow-sm">
                    שחזור
                  </div>
                </div>
                <div className="absolute inset-0 bg-primary-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              {/* ✨ Floating Dismiss Button (Outside overflow-hidden) */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onDismissRestore();
                }}
                className="absolute -top-3 -left-3 w-8 h-8 bg-white border-2 border-slate-900 rounded-full flex items-center justify-center shadow-xl hover:bg-slate-50 hover:scale-110 active:scale-95 transition-all z-30 group"
                title="סגור"
              >
                <X size={14} className="text-slate-900 group-hover:rotate-90 transition-transform" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CartDrawer;
