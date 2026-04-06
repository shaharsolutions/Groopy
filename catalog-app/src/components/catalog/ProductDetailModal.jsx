import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Plus, 
  Minus, 
  ShoppingCart, 
  CheckCircle2, 
  Star, 
  Flame, 
  Zap,
} from 'lucide-react';

const ProductDetailModal = ({ 
  isOpen, 
  onClose, 
  product, 
  addToCart, 
  cartCount 
}) => {
  const defaultQty = product?.default_quantity || 12;
  const [quantity, setQuantity] = useState(defaultQty);
  const [isAdded, setIsAdded] = useState(false);

  useEffect(() => {
    if (isOpen && product) {
      setQuantity(product.default_quantity || 12);
      setIsAdded(false);
    }
  }, [isOpen, product]);

  if (!product) return null;

  const handleAddToCart = () => {
    addToCart(product, quantity);
    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
    }, 2000);
  };

  const adjustQuantity = (delta) => {
    const step = product.default_quantity || 12;
    setQuantity(prev => Math.max(step, prev + delta));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8" dir="rtl">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xl"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 50 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-5xl bg-white rounded-t-[40px] md:rounded-[56px] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] overflow-hidden border border-white/20 flex flex-col md:flex-row max-h-[95vh] md:max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left: Image Section (Mobile: Top) */}
            <div className="w-full md:w-1/2 bg-slate-50 relative flex items-center justify-center p-6 md:p-12 h-[220px] md:h-auto overflow-hidden shrink-0">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-accent-500/5" />
              
              <AnimatePresence mode="wait">
                <motion.img
                  key={product.id}
                  initial={{ opacity: 0, scale: 0.9, rotate: -5 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  src={product.image || 'https://via.placeholder.com/600'}
                  alt={product.name}
                  className="max-w-[80%] max-h-full object-contain relative z-10 drop-shadow-2xl"
                />
              </AnimatePresence>

              {/* Badges Overlay */}
              <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
                {product.is_hot_deal && (
                  <div className="bg-orange-500 text-white px-3 py-1.5 rounded-xl text-[10px] md:text-xs font-black flex items-center gap-1.5 shadow-lg shadow-orange-200">
                    <Flame size={12} fill="currentColor" />
                    מבצע חם
                  </div>
                )}
                {product.is_best_seller && (
                  <div className="bg-blue-500 text-white px-3 py-1.5 rounded-xl text-[10px] md:text-xs font-black flex items-center gap-1.5 shadow-lg shadow-blue-200">
                    <Star size={12} fill="currentColor" />
                    נמכר ביותר
                  </div>
                )}
                {product.is_clearing && (
                  <div className="bg-purple-500 text-white px-3 py-1.5 rounded-xl text-[10px] md:text-xs font-black flex items-center gap-1.5 shadow-lg shadow-purple-200">
                    <Zap size={12} />
                    חדש במלאי
                  </div>
                )}
              </div>
            </div>

            {/* Right: Info & Actions Section */}
            <div className="w-full md:w-1/2 p-6 md:p-16 flex flex-col min-h-0 relative bg-white">
              <button 
                onClick={onClose}
                className="absolute top-4 left-4 w-10 h-10 md:w-12 md:h-12 bg-slate-50 hover:bg-slate-100 rounded-xl md:rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all z-30 shadow-sm md:shadow-none"
              >
                <X size={20} />
              </button>

              <div className="flex-1 overflow-y-auto px-1">
                <div className="flex flex-col gap-1 mb-4 md:mb-6 mt-2 md:mt-0 text-right">
                  <span className="text-[10px] md:text-sm font-black text-accent-500 uppercase tracking-[0.2em]">{product.category || 'GENERAL'}</span>
                  <p className="text-slate-400 font-bold text-[10px] md:text-sm">מק״ט: {product.sku}</p>
                </div>

                <h2 className="text-2xl md:text-4xl font-[1000] text-slate-900 leading-tight tracking-tighter mb-4 text-right">
                  {product.name}
                </h2>

                <div className="prose prose-slate mb-6 md:mb-10 text-right">
                  <p className="text-slate-500 text-base md:text-xl font-medium leading-relaxed">
                    {product.description || 'אין תיאור זמין למוצר זה.'}
                  </p>
                </div>

                <div className="mb-6 md:mb-10 p-5 md:p-6 bg-slate-50/50 rounded-[24px] md:rounded-[32px] border border-slate-100/50">
                  <div className="flex items-end justify-between gap-4">
                    <div className="text-right">
                      <span className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest block mb-1">מחיר ליחידה</span>
                      <span className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter">₪{product.price.toFixed(2)}</span>
                    </div>
                    {cartCount > 0 && (
                      <div className="text-left">
                        <span className="text-[10px] md:text-xs font-black text-accent-500 block mb-1">כבר בסל</span>
                        <span className="text-xl md:text-2xl font-black text-slate-900">{cartCount} יח׳</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-6 md:pt-8 border-t border-slate-100 flex flex-col gap-4 md:gap-6 bg-white shrink-0">
                <div className="flex items-center justify-between gap-4">
                   <div className="flex items-center gap-1.5 md:gap-2">
                     <button 
                       onClick={() => adjustQuantity(-12)}
                       className="w-10 md:w-16 h-10 md:h-16 bg-white border-2 border-slate-100 hover:border-primary-500 hover:text-primary-600 rounded-xl md:rounded-2xl flex items-center justify-center transition-all active:scale-95"
                     >
                       <Minus size={20} md:size={24} strokeWidth={3} />
                     </button>
                     <div className="w-14 md:w-28 text-center">
                        <span className="text-xl md:text-4xl font-black text-slate-900 block leading-none">{quantity}</span>
                        <span className="text-[8px] md:text-xs font-bold text-slate-400 uppercase tracking-widest block mt-0.5 whitespace-nowrap">יחידות סה״כ</span>
                     </div>
                     <button 
                        onClick={() => adjustQuantity(12)}
                        className="w-10 md:w-16 h-10 md:h-16 bg-white border-2 border-slate-100 hover:border-primary-500 hover:text-primary-600 rounded-xl md:rounded-2xl flex items-center justify-center transition-all active:scale-95"
                     >
                        <Plus size={20} md:size={24} strokeWidth={3} />
                     </button>
                   </div>

                   <div className="text-left">
                      <span className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest block mb-0.5">סה״כ להוספה</span>
                      <span className="text-lg md:text-2xl font-black text-primary-600 leading-none">₪{(product.price * quantity).toFixed(2)}</span>
                   </div>
                </div>

                <button 
                  onClick={handleAddToCart}
                  disabled={isAdded}
                  className={`
                    w-full h-14 md:h-20 rounded-[20px] md:rounded-[32px] flex items-center justify-center gap-3 text-base md:text-xl font-black transition-all duration-500 shadow-xl md:shadow-2xl
                    ${isAdded 
                      ? 'bg-emerald-500 text-white shadow-emerald-200' 
                      : 'bg-slate-900 text-white hover:bg-primary-600 shadow-slate-200 active:scale-95'
                    }
                  `}
                >
                  <AnimatePresence mode="wait">
                    {isAdded ? (
                      <motion.div 
                        key="check"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex items-center gap-2"
                      >
                        <CheckCircle2 size={20} md:size={24} strokeWidth={3} />
                        <span>נוסף לסל!</span>
                      </motion.div>
                    ) : (
                      <motion.div 
                        key="cart"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2 md:gap-3"
                      >
                        <ShoppingCart size={20} md:size={24} strokeWidth={3} />
                        <span>הוספה להזמנה</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
                
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ProductDetailModal;
