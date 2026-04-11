import React, { useMemo } from 'react';
import { 
  Search, 
  Tag, 
  ChevronDown, 
  ArrowUpDown, 
  Zap, 
  Star, 
  Flame, 
  Edit, 
  Trash2, 
  Check, 
  X,
  ShoppingBag,
  Package,
  MousePointerClick
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ProductManagement = ({ 
    sortedProducts, 
    searchTerm, 
    setSearchTerm, 
    categories, 
    activeCategories,
    selectedCategory, 
    setSelectedCategory, 
    activeFilters,
    setActiveFilters,
    filterMode,
    setFilterMode,
    requestSort, 
    sortConfig, 
    selectedProductIds, 
    toggleProductSelection, 
    toggleAllProducts, 
    isBulkUpdatingProducts, 
    isBulkCategoryMenuOpen, 
    setIsBulkCategoryMenuOpen, 
    handleBulkUpdateProductCategory, 
    isBulkFlagsMenuOpen, 
    setIsBulkFlagsMenuOpen, 
    handleBulkUpdateProductFlag, 
    setEditingProduct, 
    confirmingProductDelete, 
    setConfirmingProductDelete, 
    handleDeleteProduct 
}) => {
  const [isFilterMenuOpen, setIsFilterMenuOpen] = React.useState(false);

  const activeFiltersCount = useMemo(() => {
    return Object.values(activeFilters).filter(v => v).length;
  }, [activeFilters]);

  const toggleFilter = (flag) => {
    setActiveFilters(prev => ({ ...prev, [flag]: !prev[flag] }));
  };

  const clearFilters = () => {
    setActiveFilters({
      is_best_seller: false,
      is_hot_deal: false,
      is_new: false,
      is_default_carton: false,
      is_incremental_add: false
    });
    setFilterMode('include');
  };

  return (
    <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6 flex-1 min-w-0">
            <div className="relative flex-1 max-w-md shrink-0 flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="text" 
                  placeholder="חיפוש מהיר..."
                  className="w-full bg-white border border-slate-200 rounded-2xl pr-12 pl-6 py-3 font-bold text-sm outline-none focus:border-primary-400 transition-all shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="relative">
                <button 
                  onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-black text-xs transition-all shadow-sm border ${
                    activeFiltersCount > 0 
                    ? 'bg-primary-50 border-primary-200 text-primary-600' 
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <ArrowUpDown size={16} className={isFilterMenuOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
                  <span>סינונים</span>
                  {activeFiltersCount > 0 && (
                    <span className="bg-primary-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {isFilterMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsFilterMenuOpen(false)} />
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute left-0 top-full mt-2 w-64 bg-white rounded-3xl shadow-xl border border-slate-100 p-4 z-50 overflow-hidden space-y-3"
                      >
                        <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">מצב סינון</span>
                          <div className="flex bg-slate-100 p-1 rounded-xl">
                            <button 
                              onClick={() => setFilterMode('include')}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${filterMode === 'include' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-400'}`}
                            >
                              רגיל
                            </button>
                            <button 
                              onClick={() => setFilterMode('exclude')}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${filterMode === 'exclude' ? 'bg-primary-500 text-white shadow-sm' : 'text-slate-400'}`}
                            >
                              הפוך
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-b border-slate-50 pb-2 mb-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">סנן לפי תגיות</span>
                          {activeFiltersCount > 0 && (
                            <button 
                              onClick={clearFilters}
                              className="text-[10px] font-black text-primary-500 hover:text-primary-600 uppercase tracking-widest"
                            >
                              נקה הכל
                            </button>
                          )}
                        </div>

                        {[
                          { id: 'is_best_seller', label: 'נמכר ביותר', icon: Star, color: 'text-blue-500', bg: 'bg-blue-50' },
                          { id: 'is_hot_deal', label: 'מבצע חם', icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50' },
                          { id: 'is_new', label: 'מוצר חדש', icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-50' },
                          { id: 'is_default_carton', label: 'מכירת קרטון', icon: Package, color: 'text-purple-500', bg: 'bg-purple-50' },
                          { id: 'is_incremental_add', label: 'תוספת הדרגתית', icon: MousePointerClick, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                        ].map(filter => (
                          <button
                            key={filter.id}
                            onClick={() => toggleFilter(filter.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all border ${
                              activeFilters[filter.id] 
                              ? `${filter.bg} border-transparent` 
                              : 'bg-white border-transparent hover:bg-slate-50'
                            }`}
                          >
                            <div className={`p-1.5 rounded-lg ${activeFilters[filter.id] ? 'bg-white shadow-sm' : 'bg-slate-50'}`}>
                              <filter.icon size={14} className={filter.color} fill={activeFilters[filter.id] ? 'currentColor' : 'none'} />
                            </div>
                            <span className={`text-xs font-bold ${activeFilters[filter.id] ? 'text-slate-900' : 'text-slate-600'}`}>{filter.label}</span>
                            {activeFilters[filter.id] && <Check size={14} className="mr-auto text-primary-500" strokeWidth={3} />}
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-4 md:pb-3 thin-scrollbar flex-1 min-w-0">
              {['All', ...activeCategories.map(c => c.name)].map((cat, idx) => (
                <button
                  key={cat || `category-${idx}`}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-6 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all whitespace-nowrap ${
                    selectedCategory === cat 
                      ? 'bg-slate-900 text-white shadow-lg' 
                      : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {cat === 'All' ? 'הכל' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* ⚡ Bulk Actions Bar */}
          <AnimatePresence>
            {selectedProductIds.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex items-center gap-3 bg-primary-50 px-4 py-2 rounded-2xl border border-primary-100 shadow-sm"
              >
                <span className="text-sm font-black text-primary-700 whitespace-nowrap">נבחרו {selectedProductIds.length} מוצרים</span>
                
                <div className="relative">
                  <button 
                    onClick={() => setIsBulkCategoryMenuOpen(!isBulkCategoryMenuOpen)}
                    disabled={isBulkUpdatingProducts}
                    className="bg-primary-500 text-white px-4 py-1.5 rounded-xl text-xs font-black hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
                  >
                    {isBulkUpdatingProducts ? (
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Tag size={14} />
                    )}
                    <span>הגדר קטגוריה</span>
                    <ChevronDown size={14} className={`transition-transform duration-200 ${isBulkCategoryMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {isBulkCategoryMenuOpen && (
                      <>
                        <div key="bulk-cat-overlay" className="fixed inset-0 z-40" onClick={() => setIsBulkCategoryMenuOpen(false)} />
                        <motion.div 
                          key="bulk-cat-dropdown"
                          initial={{ opacity: 0, scale: 0.95, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 10 }}
                          className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 overflow-hidden"
                        >
                          {categories.map((cat, idx) => (
                            <button
                              key={cat.id || `bulk-cat-${idx}`}
                              onClick={() => handleBulkUpdateProductCategory(cat.name)}
                              className="w-full text-right px-4 py-2 hover:bg-slate-50 text-xs font-bold text-slate-600 rounded-lg transition-colors"
                            >
                              {cat.name}
                            </button>
                          ))}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                <div className="relative">
                  <button 
                    onClick={() => setIsBulkFlagsMenuOpen(!isBulkFlagsMenuOpen)}
                    disabled={isBulkUpdatingProducts}
                    className="bg-white border border-primary-200 text-primary-600 px-4 py-1.5 rounded-xl text-xs font-black hover:bg-primary-50 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
                  >
                    <Star size={14} />
                    <span>הגדר תגיות</span>
                    <ChevronDown size={14} className={`transition-transform duration-200 ${isBulkFlagsMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {isBulkFlagsMenuOpen && (
                      <>
                        <div key="bulk-flags-overlay" className="fixed inset-0 z-40" onClick={() => setIsBulkFlagsMenuOpen(false)} />
                        <motion.div 
                          key="bulk-flags-dropdown"
                          initial={{ opacity: 0, scale: 0.95, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 10 }}
                          className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 overflow-hidden"
                        >
                          {[
                            { id: 'is_best_seller', label: 'נמכר ביותר', icon: Star },
                            { id: 'is_hot_deal', label: 'מבצע חם', icon: Flame },
                            { id: 'is_new', label: 'חדש', icon: Zap },
                          ].map(flag => (
                            <div key={flag.id} className="border-b border-slate-50 last:border-0 p-1">
                              <div className="text-[10px] font-black text-slate-400 px-3 py-1 uppercase tracking-widest">{flag.label}</div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleBulkUpdateProductFlag(flag.id, true)}
                                  className="flex-1 text-center py-2 hover:bg-green-50 text-green-600 text-[10px] font-black rounded-lg transition-colors border border-transparent hover:border-green-100"
                                >
                                  הפעל
                                </button>
                                <button
                                  onClick={() => handleBulkUpdateProductFlag(flag.id, false)}
                                  className="flex-1 text-center py-2 hover:bg-red-50 text-red-600 text-[10px] font-black rounded-lg transition-colors border border-transparent hover:border-red-100"
                                >
                                  בטל
                                </button>
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-x-auto scrollbar-hide">
           <table className="w-full text-right border-collapse min-w-[1000px]">
             <thead>
               <tr className="bg-slate-50/50 border-b border-slate-100">
                 <th className="px-8 py-5 text-right">
                   <button 
                    onClick={toggleAllProducts}
                    className={`w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center ${
                      selectedProductIds.length === sortedProducts.length && sortedProducts.length > 0
                      ? 'bg-primary-500 border-primary-500 text-white' 
                      : 'bg-white border-slate-200'
                    }`}
                   >
                     {selectedProductIds.length === sortedProducts.length && sortedProducts.length > 0 && <Check size={14} strokeWidth={4} />}
                   </button>
                 </th>
                 <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">תמונה</th>
                 <th onClick={() => requestSort('name')} className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer group text-right">
                   <div className="flex items-center gap-2">
                     שם המוצר
                     <ArrowUpDown size={12} className={`transition-opacity ${sortConfig.key === 'name' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                   </div>
                 </th>
                 <th onClick={() => requestSort('sku')} className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer group text-right">
                    <div className="flex items-center gap-2">
                      מק״ט
                      <ArrowUpDown size={12} className={`transition-opacity ${sortConfig.key === 'sku' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                    </div>
                 </th>
                 <th onClick={() => requestSort('price')} className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer group text-right">
                    <div className="flex items-center gap-2">
                       מחיר (₪)
                       <ArrowUpDown size={12} className={`transition-opacity ${sortConfig.key === 'price' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                    </div>
                 </th>

                 <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">פעולות</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-50">
               {sortedProducts.map((p, pIdx) => (
                 <tr key={p.id || `product-${pIdx}`} className={`group hover:bg-slate-50/50 transition-colors ${selectedProductIds.includes(p.id) ? 'bg-primary-50/30' : ''}`}>
                   <td className="px-8 py-6">
                      <button 
                        onClick={() => toggleProductSelection(p.id)}
                        className={`w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center ${
                          selectedProductIds.includes(p.id)
                          ? 'bg-primary-500 border-primary-500 text-white' 
                          : 'bg-white border-slate-200'
                        }`}
                      >
                        {selectedProductIds.includes(p.id) && <Check size={14} strokeWidth={4} />}
                      </button>
                   </td>
                   <td className="px-8 py-6">
                     <div className="w-16 h-16 bg-slate-100 rounded-2xl overflow-hidden shadow-inner border border-slate-100">
                        {p.image ? (
                          <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                             <Tag size={24} />
                          </div>
                        )}
                     </div>
                   </td>
                   <td className="px-8 py-6 font-black text-slate-800 text-base">
                     <div className="flex items-center gap-3">
                        <span className="flex-1">{p.name}</span>
                        <div className="flex items-center gap-2">

                          {p.is_best_seller && (
                            <div className="bg-blue-50 text-blue-600 p-1.5 rounded-xl border border-blue-100 flex items-center justify-center shrink-0" title="נמכר ביותר">
                              <Star size={14} fill="currentColor" />
                            </div>
                          )}
                          {p.is_hot_deal && (
                            <div className="bg-orange-50 text-orange-600 p-1.5 rounded-xl border border-orange-100 flex items-center justify-center shrink-0" title="מבצע חם">
                              <Flame size={14} fill="currentColor" />
                            </div>
                          )}
                          {p.is_new && (
                            <div className="bg-yellow-50 text-yellow-600 p-1.5 rounded-xl border border-yellow-100 flex items-center justify-center shrink-0" title="מוצר חדש">
                              <Zap size={14} fill="currentColor" />
                            </div>
                          )}
                          {p.is_default_carton && (
                            <div className="bg-purple-50 text-purple-600 p-1.5 rounded-xl border border-purple-100 flex items-center justify-center shrink-0" title="נמכר בקרטונים">
                              <Package size={14} />
                            </div>
                          )}
                          {p.is_incremental_add && (
                            <div className="bg-emerald-50 text-emerald-600 p-1.5 rounded-xl border border-emerald-100 flex items-center justify-center shrink-0" title="תוספת הדרגתית (+1)">
                              <MousePointerClick size={14} />
                            </div>
                          )}
                        </div>
                     </div>
                   </td>
                   <td className="px-8 py-6 font-bold text-slate-400 text-sm">{p.sku}</td>
                   <td className="px-8 py-6 font-black text-slate-900">{parseFloat(p.price).toFixed(2)}</td>

                    <td className="px-8 py-5">
                     <AnimatePresence mode="wait">
                       {confirmingProductDelete === p.id ? (
                         <motion.div 
                           key="confirm-delete"
                           initial={{ opacity: 0, x: 20 }}
                           animate={{ opacity: 1, x: 0 }}
                           exit={{ opacity: 0, x: -20 }}
                           className="flex items-center gap-2 bg-red-50 p-2 rounded-xl"
                         >
                           <span className="text-xs font-black text-red-500 whitespace-nowrap">למחוק?</span>
                           <button onClick={() => handleDeleteProduct(p.id)} className="bg-red-500 text-white p-1.5 rounded-lg hover:bg-red-600 transition-colors"><Check size={14} /></button>
                           <button onClick={() => setConfirmingProductDelete(null)} className="bg-slate-200 text-slate-500 p-1.5 rounded-lg hover:bg-slate-300 transition-colors"><X size={14} /></button>
                         </motion.div>
                       ) : (
                         <motion.div 
                           key="action-buttons"
                           initial={{ opacity: 0 }}
                           animate={{ opacity: 1 }}
                           className="flex gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                         >
                           <button onClick={() => setEditingProduct(p)} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-white rounded-lg shadow-sm border border-transparent hover:border-slate-100 transition-all"><Edit size={18} /></button>
                           <button onClick={() => setConfirmingProductDelete(p.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg shadow-sm border border-transparent hover:border-slate-100 transition-all"><Trash2 size={18} /></button>
                         </motion.div>
                       )}
                     </AnimatePresence>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>

           {sortedProducts.length === 0 && (
             <div className="py-32 text-center">
                <ShoppingBag size={64} className="mx-auto mb-4 text-slate-200" />
                <p className="font-black text-xl text-slate-400">לא נמצאו מוצרים תואמים לחיפוש</p>
                {activeFiltersCount > 0 && (
                  <button 
                    onClick={clearFilters}
                    className="mt-4 text-primary-500 font-bold hover:underline"
                  >
                    נקה את כל המסננים ונסה שוב
                  </button>
                )}
             </div>
           )}
        </div>
    </div>
  );
};

export default ProductManagement;
