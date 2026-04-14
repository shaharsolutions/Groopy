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
  MousePointerClick,
  ImageOff,
  Link2Off,
  Copy,
  ClipboardCheck
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
    isBulkDeletingProducts,
    setIsBulkEditModalOpen,
    handleBulkDeleteProducts,
    setEditingProduct, 
    confirmingProductDelete, 
    setConfirmingProductDelete, 
    handleDeleteProduct,
    brokenImageIds,
    reportBrokenImage,
    onImageClick
}) => {
  const [isFilterMenuOpen, setIsFilterMenuOpen] = React.useState(false);
  const [isCopyMenuOpen, setIsCopyMenuOpen] = React.useState(false);
  const [isConfirmingBulkDelete, setIsConfirmingBulkDelete] = React.useState(false);
  const [copyFeedback, setCopyFeedback] = React.useState(false);
  const [copyFormat, setCopyFormat] = React.useState('spreadsheet'); // 'spreadsheet' or 'text'
  const [copyColumns, setCopyColumns] = React.useState({
    name: true,
    sku: true,
    price: true,
    image: false,
    category: false,
    description: false
  });

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
      is_incremental_add: false,
      no_image: false,
      is_image_broken: false
    });
    setFilterMode('include');
  };
  
  const handleCopyData = async () => {
    const productsToCopy = selectedProductIds.length > 0 
      ? sortedProducts.filter(p => selectedProductIds.includes(p.id))
      : sortedProducts;

    if (productsToCopy.length === 0) return;

    // Define column mapping
    const columnMap = [
      { id: 'name', label: 'שם המוצר', key: 'name' },
      { id: 'sku', label: 'מק״ט', key: 'sku' },
      { id: 'price', label: 'מחיר', key: 'price' },
      { id: 'image', label: 'קישור לתמונה', key: 'image' },
      { id: 'category', label: 'קטגוריה', key: 'category' },
      { id: 'description', label: 'תיאור', key: 'description' }
    ];

    const activeCols = columnMap.filter(col => copyColumns[col.id]);
    const separator = copyFormat === 'text' ? ' | ' : '\t';
    
    // Headers
    let output = activeCols.map(c => c.label).join(separator) + '\n';

    // Rows
    productsToCopy.forEach(p => {
      output += activeCols.map(col => {
        let val = p[col.key] || '';
        if (col.id === 'price') val = parseFloat(val).toFixed(2);
        // Clean value of internal tabs or newlines to keep separation clear
        val = String(val).replace(/\t/g, ' ').replace(/[\n\r]+/g, ' ').trim();
        return val;
      }).join(separator) + '\n';
    });

    try {
      await navigator.clipboard.writeText(output);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
      setIsCopyMenuOpen(false);
    } catch (err) {
      console.error('Failed to copy!', err);
    }
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
                <div className="absolute left-4 top-1/2 -translate-y-1/2 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 text-[10px] font-black text-slate-400">
                  {sortedProducts.length}
                </div>
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
                          { id: 'no_image', label: 'חסרה תמונה', icon: ImageOff, color: 'text-red-500', bg: 'bg-red-50' },
                          { id: 'is_image_broken', label: 'קישור שבור', icon: Link2Off, color: 'text-rose-600', bg: 'bg-rose-50' },
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

              <div className="relative">
                <button 
                  onClick={() => setIsCopyMenuOpen(!isCopyMenuOpen)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-black text-xs transition-all shadow-sm border ${
                    copyFeedback 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {copyFeedback ? <ClipboardCheck size={16} /> : <Copy size={16} />}
                  <span>{copyFeedback ? 'הועתק!' : 'העתק נתונים'}</span>
                </button>

                <AnimatePresence>
                  {isCopyMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsCopyMenuOpen(false)} />
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute left-0 top-full mt-2 w-64 bg-white rounded-3xl shadow-xl border border-slate-100 p-4 z-50 overflow-hidden space-y-3"
                      >
                        <div className="border-b border-slate-50 pb-2 mb-2 flex items-center justify-between">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">פורמט העתקה</span>
                          <div className="flex bg-slate-100 p-1 rounded-xl">
                            <button 
                              onClick={() => setCopyFormat('spreadsheet')}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${copyFormat === 'spreadsheet' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-400'}`}
                            >
                              אקסל
                            </button>
                            <button 
                              onClick={() => setCopyFormat('text')}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${copyFormat === 'text' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400'}`}
                            >
                              טקסט (|)
                            </button>
                          </div>
                        </div>

                        <div className="border-b border-slate-50 pb-2 mb-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">בחר עמודות</span>
                        </div>

                        {[
                          { id: 'name', label: 'שם המוצר' },
                          { id: 'sku', label: 'מק״ט' },
                          { id: 'price', label: 'מחיר' },
                          { id: 'image', label: 'קישור לתמונה' },
                          { id: 'category', label: 'קטגוריה' },
                          { id: 'description', label: 'תיאור' }
                        ].map(col => (
                          <button
                            key={col.id}
                            onClick={() => setCopyColumns(prev => ({ ...prev, [col.id]: !prev[col.id] }))}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all border ${
                              copyColumns[col.id] 
                              ? 'bg-primary-50 border-transparent' 
                              : 'bg-white border-transparent hover:bg-slate-50'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${copyColumns[col.id] ? 'bg-primary-500 border-primary-500 text-white' : 'bg-white border-slate-200'}`}>
                              {copyColumns[col.id] && <Check size={12} strokeWidth={4} />}
                            </div>
                            <span className={`text-xs font-bold ${copyColumns[col.id] ? 'text-slate-900' : 'text-slate-600'}`}>{col.label}</span>
                          </button>
                        ))}

                        <button 
                          onClick={handleCopyData}
                          className="w-full mt-4 bg-slate-900 text-white py-3 rounded-2xl text-xs font-black shadow-lg shadow-slate-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                          <Copy size={16} />
                          העתק {selectedProductIds.length > 0 ? `${selectedProductIds.length} נבחרים` : 'הכל'}
                        </button>
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
                
                <button 
                  onClick={() => setIsBulkEditModalOpen(true)}
                  disabled={isBulkUpdatingProducts || isBulkDeletingProducts}
                  className="bg-primary-500 text-white px-6 py-2 rounded-xl text-xs font-black hover:bg-primary-600 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 shadow-md shadow-primary-500/20"
                >
                  {isBulkUpdatingProducts ? (
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Edit size={16} />
                  )}
                  <span>פעולות קבוצתיות</span>
                </button>

                {isConfirmingBulkDelete ? (
                  <div className="flex items-center gap-2 bg-red-100 p-1.5 rounded-xl border border-red-200 animate-in fade-in slide-in-from-right-2">
                    <span className="text-[10px] font-black text-red-600 px-2 uppercase tracking-widest">בטוח?</span>
                    <button 
                      onClick={() => {
                        handleBulkDeleteProducts();
                        setIsConfirmingBulkDelete(false);
                      }}
                      className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors shadow-sm"
                    >
                      <Check size={14} strokeWidth={3} />
                    </button>
                    <button 
                      onClick={() => setIsConfirmingBulkDelete(false)}
                      className="bg-white text-slate-400 p-2 rounded-lg hover:bg-slate-50 transition-colors border border-slate-200"
                    >
                      <X size={14} strokeWidth={3} />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setIsConfirmingBulkDelete(true)}
                    disabled={isBulkUpdatingProducts || isBulkDeletingProducts}
                    className="bg-white text-red-500 border border-red-100 px-6 py-2 rounded-xl text-xs font-black hover:bg-red-50 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 shadow-sm"
                  >
                    {isBulkDeletingProducts ? (
                      <div className="w-3 h-3 border-2 border-red-200 border-t-red-500 rounded-full animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                    <span>מחק נבחרים</span>
                  </button>
                )}
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
                      <button 
                        onClick={() => p.image && !brokenImageIds?.has(p.id) && onImageClick(p.image)}
                        className={`w-16 h-16 bg-slate-100 rounded-2xl overflow-hidden shadow-inner border border-slate-100 flex items-center justify-center transition-transform active:scale-95 ${p.image && !brokenImageIds?.has(p.id) ? 'cursor-zoom-in hover:brightness-90' : 'cursor-default'}`}
                      >
                         {p.image && !brokenImageIds?.has(p.id) ? (
                           <img 
                             src={p.image} 
                             alt={p.name} 
                             className="w-full h-full object-cover" 
                             onError={() => reportBrokenImage(p.id)}
                           />
                         ) : (
                           <div className="w-full h-full flex items-center justify-center text-slate-300">
                              {brokenImageIds?.has(p.id) ? (
                                <Link2Off size={24} className="text-rose-300" />
                              ) : (
                                <Tag size={24} />
                              )}
                           </div>
                         )}
                      </button>
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
