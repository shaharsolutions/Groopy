import React from 'react';
import { motion } from 'framer-motion';
import { Package, Plus } from 'lucide-react';

const ProductCard = ({ product, idx, addToCart, onImageClick, cartCount }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.05 }}
      key={product.id}
      className="bg-white rounded-[40px] overflow-hidden border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group flex flex-col h-full"
    >
      {/* Image Box */}
      <div 
        className="relative aspect-[1/1] bg-slate-50 overflow-hidden m-10 rounded-[32px] cursor-pointer shadow-inner"
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
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
          <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-[900] text-slate-400 shadow-sm border border-white/50">
            {product.sku}
          </div>
        </div>
      </div>

      {/* Info Content */}
      <div className="p-8 pt-0 flex flex-col flex-1">
        <span className="text-[10px] font-black text-accent-500 uppercase tracking-widest mb-2">
          {(product.category === 'Bottles' || product.category === 'בקבוקים') ? 'בקבוקים' : 
           (product.category === 'Lunch Boxes' || product.category === 'קופסאות אוכל') ? 'קופסאות אוכל' : 
           product.category}
        </span>
        <h3 className="font-bold text-lg text-slate-800 leading-snug mb-3 min-h-[3rem] line-clamp-2">
          {product.name}
        </h3>
        <p className="text-xs text-slate-400 font-medium italic mb-6">
          {product.description}
        </p>

        <div className="mt-auto flex items-center justify-between">
          <div>
            <span className="text-sm font-bold text-slate-400 block -mb-1">מחיר יחידה</span>
            <span className="text-2xl font-black text-slate-900">₪{product.price.toFixed(2)}</span>
          </div>
          <button 
            onClick={() => addToCart(product)}
            className={`
              flex items-center justify-center gap-2 px-4 py-3 rounded-2xl transition-all duration-300
              ${cartCount > 0 
                ? 'bg-accent-600 text-white shadow-accent-200' 
                : 'bg-slate-900 text-white hover:bg-accent-600 shadow-slate-100'
              }
              hover:scale-105 active:scale-95 shadow-xl
            `}
          >
            <div className="flex items-center gap-1.5">
              <Plus size={16} strokeWidth={4} />
              <span className="font-bold text-sm whitespace-nowrap">הוספה</span>
            </div>
            {cartCount > 0 && (
              <span className="bg-white text-accent-600 min-w-[22px] h-5.5 px-1 rounded-lg flex items-center justify-center text-[10px] font-black shadow-sm">
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
