import React from 'react';
import { motion } from 'framer-motion';
import { Package, Plus, Zap, Star, Flame, Minus } from 'lucide-react';

const ProductCard = React.memo(({ product, addToCart, removeFromCart, updateQuantity, onImageClick, cartCount }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-[24px] overflow-hidden border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group flex flex-col h-full"
    >
      {/* Image Box */}
      <div 
        className="relative aspect-[1/1] bg-slate-50 overflow-hidden m-3 rounded-2xl cursor-pointer shadow-inner"
        onClick={() => onImageClick && onImageClick(product.image, product.name)}
      >
        {product.image ? (
          <img src={product.image} alt={product.name} loading="lazy" decoding="async" className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-110" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-10 group-hover:opacity-20 group-hover:scale-125 transition-all duration-700">
            <Package size={120} strokeWidth={1} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-400/5 to-accent-400/5" />
        
        {/* Floating Badges */}
        <div className="absolute top-2 left-2 right-2 flex flex-col gap-1.5 items-start pointer-events-none">
          <div className="bg-white/90 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-[900] text-slate-400 shadow-sm border border-white/50">
            {product.sku}
          </div>
          
          {product.is_best_seller && (
            <div className="bg-blue-500 text-white px-2 py-1 rounded-lg text-[10px] font-[900] flex items-center gap-1 shadow-lg shadow-blue-200">
              <Star size={10} fill="currentColor" />
              נמכר ביותר
            </div>
          )}
          {product.is_clearing && (
            <div className="bg-purple-500 text-white px-2 py-1 rounded-lg text-[10px] font-[900] flex items-center gap-1 shadow-lg shadow-purple-200">
              <Zap size={10} />
              חדש
            </div>
          )}
          {product.is_hot_deal && (
            <div className="bg-orange-500 text-white px-2 py-1 rounded-lg text-[10px] font-[900] flex items-center gap-1 shadow-lg shadow-orange-200">
              <Flame size={10} fill="currentColor" />
              מבצע חם
            </div>
          )}
        </div>
      </div>

      {/* Info Content */}
      <div className="px-3 md:px-6 pb-4 md:pb-6 pt-0 flex flex-col flex-1">
        <span className="text-[11px] md:text-[10px] font-black text-accent-500 uppercase tracking-widest mb-1">
          {(product.category === 'Bottles' || product.category === 'בקבוקים') ? 'בקבוקים' : 
           (product.category === 'Lunch Boxes' || product.category === 'קופסאות אוכל') ? 'קופסאות אוכל' : 
           product.category}
        </span>
        <h3 className="font-bold text-[14px] md:text-base text-slate-800 leading-tight mb-1 md:mb-2 min-h-[2.5rem] md:min-h-[3.2rem] flex items-start">
          {product.name}
        </h3>
        <p className="text-xs md:text-xs text-slate-400 font-bold tracking-tight mb-3 md:mb-4 line-clamp-1 opacity-80">
          {product.description}
        </p>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-y-2 gap-1 px-0.5">
          <div className="shrink-0 mb-0.5">
            <span className="text-[9px] md:text-[9px] font-bold text-slate-400 block -mb-1">מחיר יחידה</span>
            <span className="text-lg md:text-xl font-black text-slate-900 leading-none">₪{product.price.toFixed(2)}</span>
          </div>
          <div className="flex items-stretch gap-1 md:gap-1.5">
            <button 
              onClick={() => addToCart(product)}
              className={`
                flex items-center justify-center gap-1 md:gap-1.5 px-3 md:px-3 py-2 md:py-2 rounded-lg md:rounded-xl transition-all duration-300 min-h-[36px] md:min-h-[auto]
                ${cartCount > 0 
                  ? 'bg-accent-600 text-white shadow-accent-200' 
                  : 'bg-slate-900 text-white hover:bg-accent-600 shadow-slate-100'
                }
                hover:scale-102 active:scale-95 shadow-lg
              `}
            >
              <div className="flex items-center gap-1.5 md:gap-1.5">
                <Plus size={14} md:size={15} strokeWidth={4} className="shrink-0" />
                <span className={`font-black text-xs md:text-sm whitespace-nowrap ${cartCount > 0 ? 'hidden md:inline' : 'inline'}`}>
                  להזמנה
                </span>
              </div>
              {cartCount > 0 && (
                <span className="bg-white text-accent-600 min-w-[20px] md:min-w-[22px] h-5 md:h-5.5 px-1 rounded-md md:rounded-lg flex items-center justify-center text-[10px] md:text-xs font-black shadow-sm">
                  {cartCount}
                </span>
              )}
            </button>

            {cartCount > 0 && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  const defaultQty = Number(product.default_quantity || 12);
                  const plusStep = product.is_incremental_add 
                    ? (product.incremental_step ? Number(product.incremental_step) : 1) 
                    : defaultQty;
                    
                  let minusStep = 1;
                  if (product.is_incremental_add) {
                    minusStep = product.incremental_step ? Number(product.incremental_step) : 1;
                  } else if (product.is_default_carton) {
                    minusStep = defaultQty;
                  }
                  
                  const times = Math.round(plusStep / minusStep);
                  
                  if (cartCount <= plusStep) {
                    removeFromCart(product.id);
                  } else {
                    for (let i = 0; i < times; i++) {
                      updateQuantity(product.id, -1);
                    }
                  }
                }}
                className="flex items-center justify-center px-3 md:px-3 py-2 md:py-2 rounded-lg md:rounded-xl transition-all duration-300 min-h-[36px] md:min-h-[auto] bg-accent-600 text-white shadow-accent-200 hover:scale-102 active:scale-95 shadow-lg"
                title="הסר"
              >
                <Minus size={14} md:size={15} strokeWidth={4} className="shrink-0" />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

ProductCard.displayName = 'ProductCard';

export default ProductCard;
