import React from 'react';
import { motion } from 'framer-motion';
import { Package, MapPin, Plus } from 'lucide-react';

const ProductCard = ({ product, idx, addToCart }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.05 }}
      key={product.id}
      className="bg-white rounded-[32px] overflow-hidden border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group flex flex-col h-full"
    >
      {/* Image Box */}
      <div className="relative aspect-[1/1] bg-slate-50 overflow-hidden m-2 rounded-[24px]">
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
          {product.location && (
            <div className="bg-primary-500 text-white px-3 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-1.5 shadow-lg shadow-primary-200">
              <MapPin size={10} />
              {product.location}
            </div>
          )}
        </div>
      </div>

      {/* Info Content */}
      <div className="p-6 pt-2 flex flex-col flex-1">
        <span className="text-[10px] font-black text-accent-500 uppercase tracking-widest mb-2">
          {product.category === 'Bottles' ? 'Premium Bottles' : 'Food Storage'}
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
            className="bg-slate-900 text-white w-14 h-14 rounded-2xl flex items-center justify-center hover:bg-primary-600 hover:scale-110 active:scale-95 shadow-xl shadow-slate-100 hover:shadow-primary-100 transition-all duration-300"
          >
            <Plus size={24} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
