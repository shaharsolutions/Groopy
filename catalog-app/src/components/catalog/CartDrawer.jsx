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
  Package
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
  formError, 
  setFormError, 
  handleWhatsAppSend, 
  isSent, 
  activeAgent 
}) => {
  return (
    <>
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50"
            />
            <motion.div 
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 100 }}
              className="fixed inset-y-0 right-0 w-full max-w-xl bg-white z-50 shadow-[-20px_0_60px_-15px_rgba(0,0,0,0.3)] flex flex-col"
            >
              {/* Cart Header */}
              <div className="p-8 pb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-800">
                    <ShoppingBag size={28} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter">הסל שלך</h2>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{totalItems} פריטים נבחרו</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="w-12 h-12 flex items-center justify-center hover:bg-slate-50 rounded-2xl transition-colors text-slate-400 hover:text-slate-900"
                >
                  <X size={32} />
                </button>
              </div>

              {/* Cart Items Area */}
              <div className="flex-1 overflow-y-auto px-8 py-4 space-y-8 scrollbar-hide">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                    <div className="p-12 bg-slate-50 rounded-full mb-6">
                      <ShoppingBag size={80} strokeWidth={1} />
                    </div>
                    <p className="text-xl font-bold">הסל ריק כרגע...</p>
                  </div>
                ) : (
                  cart.map(item => (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={item.id} 
                      className="flex gap-6 group relative"
                    >
                      {/* Item Image */}
                      <div className="w-24 h-24 bg-slate-50 rounded-3xl flex-shrink-0 flex items-center justify-center border border-slate-100 overflow-hidden relative group-hover:scale-105 transition-transform">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package size={40} className="opacity-10" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-tr from-primary-500/5 to-accent-500/5" />
                      </div>
                      
                      {/* Item Meta */}
                      <div className="flex-1 py-1">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-slate-800 text-lg leading-tight line-clamp-2 max-w-[80%]">
                            {item.name}
                          </h4>
                          <button 
                            onClick={() => removeFromCart(item.id)}
                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-400 font-black mb-4 uppercase tracking-widest">
                          מק״ט: {item.sku}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
                            <button 
                              onClick={() => updateQuantity(item.id, -1)}
                              className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white transition-all text-slate-800 active:scale-90"
                            >
                              <Minus size={18} />
                            </button>
                            <span className="w-10 text-center font-black text-xl text-slate-900">{item.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(item.id, 1)}
                              className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white transition-all text-slate-800 active:scale-90"
                            >
                              <Plus size={18} />
                            </button>
                          </div>
                          <div className="text-right">
                             <div className="text-[10px] font-black text-slate-400 uppercase mb-0.5">סה״כ פריט</div>
                             <div className="font-black text-2xl text-slate-900 tracking-tight">₪{(item.price * item.quantity).toFixed(2)}</div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Cart Footer Checkout */}
              {cart.length > 0 && (
                <div className="p-8 bg-slate-50/80 backdrop-blur-3xl border-t border-slate-100 space-y-8 rounded-t-[40px] shadow-[0_-20px_40px_-20px_rgba(0,0,0,0.05)]">
                  {/* Name Input */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm font-black text-slate-700 uppercase tracking-widest pl-2">
                       <CheckCircle size={14} className={customerName.length > 2 ? 'text-primary-500' : 'text-slate-300'} />
                       שם הלקוח המזמין
                    </label>
                    <input 
                      type="text" 
                      placeholder="הכנס את שמך כאן..."
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        if (formError) setFormError('');
                      }}
                      className={`w-full bg-white border ${formError ? 'border-red-500 ring-4 ring-red-500/10' : 'border-slate-200'} rounded-3xl px-6 py-5 outline-none focus:border-primary-500 focus:ring-[10px] focus:ring-primary-500/5 transition-all font-bold text-lg`}
                    />
                    <AnimatePresence>
                      {formError && (
                        <motion.p 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="text-red-500 text-xs font-black uppercase tracking-widest mt-2 pr-2"
                        >
                          {formError}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Pricing Summary */}
                  <div className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center text-slate-400 font-bold text-sm mb-4">
                      <span>סה״כ פריטים:</span>
                      <span className="bg-slate-50 px-3 py-1 rounded-lg text-slate-800">{totalItems}</span>
                    </div>
                    <div className="flex justify-between items-end border-t border-slate-50 pt-6">
                      <div>
                        <span className="block text-xs font-black text-primary-500 uppercase tracking-wider mb-1">לתשלום סופי</span>
                        <span className="text-4xl font-[1000] text-slate-900 tracking-tighter">₪{totalPrice.toFixed(2)}</span>
                      </div>
                      <div className="text-right">
                        <TrendingDown size={32} className="text-primary-100 -mb-2" />
                      </div>
                    </div>
                  </div>

                  {/* SEND BUTTON */}
                  <button 
                    onClick={handleWhatsAppSend}
                    className={`btn-primary w-full py-6 flex items-center justify-center gap-4 group relative overflow-hidden ${isSent ? 'bg-green-500' : ''}`}
                  >
                    <span className="relative z-10 font-black text-xl tracking-tight">
                      {activeAgent ? `שליחת הזמנה לוואטסאפ של ${activeAgent.name}` : 'שליחת הזמנה לוואטסאפ'}
                    </span>
                    <Send size={24} className="relative z-10 -rotate-45 group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-white/10 translate-x-full group-hover:translate-x-0 transition-transform duration-700 skew-x-12" />
                  </button>
                  
                  <p className="text-[10px] text-center text-slate-400 font-black px-6 leading-relaxed uppercase tracking-widest opacity-60">
                    הלחיצה תפתח את אפליקציית הוואטסאפ עם ההזמנה המוכנה שלך
                  </p>
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
            className="fixed bottom-8 left-0 right-0 z-40 px-6 pointer-events-none"
          >
            <button 
              onClick={() => setIsCartOpen(true)}
              className="pointer-events-auto max-w-sm mx-auto w-full glass-card border-none bg-slate-900 border-slate-800 text-white p-4 rounded-[28px] shadow-2xl flex items-center justify-between group overflow-hidden"
            >
              <div className="flex items-center gap-4 relative z-10 pl-2">
                <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform">
                  <ShoppingCart size={24} />
                </div>
                <div>
                  <div className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-1">הסל שלך</div>
                  <div className="font-black text-2xl tracking-tighter">₪{totalPrice.toFixed(2)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 pr-4 relative z-10">
                <div className="bg-white/10 hover:bg-white/20 p-4 rounded-2xl font-black text-sm tracking-tight transition-all">
                  סיום הזמנה
                </div>
                <ChevronDown className="-rotate-90 text-primary-400" size={24} />
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CartDrawer;
