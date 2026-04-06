import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Plus, Zap, Star, Flame } from 'lucide-react';

const ProductCard = ({ product, idx, addToCart, onImageClick, cartCount }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.05 }}
      key={product.id}
      className="bg-white rounded-[24px] overflow-hidden border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group flex flex-col h-full"
    >
      {/* Image Box */}
      <div 
        className="relative aspect-[1/1] bg-slate-50 overflow-hidden m-3 rounded-2xl cursor-pointer shadow-inner"
        onClick={() => onImageClick && onImageClick(product.image, product.name)}
      >
        {product.image ? (
          <img src={product.image} alt={product.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
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
          
          <AnimatePresence>
            {product.is_best_seller && (
              <motion.div 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="bg-blue-500 text-white px-2 py-1 rounded-lg text-[10px] font-[900] flex items-center gap-1 shadow-lg shadow-blue-200"
              >
                <Star size={10} fill="currentColor" />
                נמכר ביותר
              </motion.div>
            )}
            {product.is_clearing && (
              <motion.div 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="bg-purple-500 text-white px-2 py-1 rounded-lg text-[10px] font-[900] flex items-center gap-1 shadow-lg shadow-purple-200"
              >
                <Zap size={10} />
                חדש
              </motion.div>
            )}
            {product.is_hot_deal && (
              <motion.div 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="bg-orange-500 text-white px-2 py-1 rounded-lg text-[10px] font-[900] flex items-center gap-1 shadow-lg shadow-orange-200"
              >
                <Flame size={10} fill="currentColor" />
                מבצע חם
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Info Content */}
      <div className="p-3 md:p-6 pt-0 flex flex-col flex-1">
        <span className="text-[10px] font-black text-accent-500 uppercase tracking-widest mb-1">
          {(product.category === 'Bottles' || product.category === 'בקבוקים') ? 'בקבוקים' : 
           (product.category === 'Lunch Boxes' || product.category === 'קופסאות אוכל') ? 'קופסאות אוכל' : 
           product.category}
        </span>
        <h3 className="font-bold text-sm md:text-lg text-slate-800 leading-tight mb-1 md:mb-2 min-h-[2.5rem] md:min-h-[3.2rem] line-clamp-2 flex items-start overflow-hidden">
          {product.name}
        </h3>
        <p className="text-[10px] md:text-xs text-slate-400 font-bold tracking-tight mb-3 md:mb-4 line-clamp-1 opacity-80">
          {product.description}
        </p>

        <div className="mt-auto flex items-center justify-between gap-1">
          <div className="shrink-0">
            <span className="text-[8px] md:text-[10px] font-bold text-slate-400 block -mb-0.5">מחיר יחידה</span>
            <span className="text-lg md:text-2xl font-black text-slate-900">₪{product.price.toFixed(2)}</span>
          </div>
          <button 
            onClick={() => addToCart(product)}
            className={`
              flex items-center justify-center gap-1 md:gap-1.5 px-2 md:px-3 py-1.5 md:py-2 rounded-lg md:rounded-xl transition-all duration-300
              ${cartCount > 0 
                ? 'bg-accent-600 text-white shadow-accent-200' 
                : 'bg-slate-900 text-white hover:bg-accent-600 shadow-slate-100'
              }
              hover:scale-105 active:scale-95 shadow-lg
            `}
          >
            <div className="flex items-center gap-0.5 md:gap-1">
              <Plus size={12} md:size={14} strokeWidth={4} />
              <span className={`font-bold text-[10px] md:text-sm whitespace-nowrap ${cartCount > 0 ? 'hidden md:inline' : 'inline'}`}>
                הוספה
              </span>
            </div>
            {cartCount > 0 && (
              <span className="bg-white text-accent-600 min-w-[18px] md:min-w-[24px] h-5 md:h-6 px-1 rounded-md md:rounded-lg flex items-center justify-center text-[10px] md:text-xs font-black shadow-sm">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
