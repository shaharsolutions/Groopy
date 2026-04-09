import React, { useState, useEffect, useMemo } from 'react';
import { Edit, Trash2, Check, X, Layers, GripVertical, Save, Shuffle, Filter, Eye, EyeOff } from 'lucide-react';
import { motion, Reorder } from 'framer-motion';

const CategoryManagement = ({ 
    categories, 
    confirmingCategoryDelete, 
    setConfirmingCategoryDelete, 
    handleDeleteCategory, 
    setEditingCategory,
    onUpdateOrder,
    products = []
}) => {
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [tempCategories, setTempCategories] = useState(categories);
  const [showOnlyInUse, setShowOnlyInUse] = useState(false);

  useEffect(() => {
    setTempCategories(categories);
  }, [categories]);

  const activeCategoryNames = useMemo(() => {
    return new Set(products.map(p => p.category).filter(Boolean));
  }, [products]);

  const handleSaveOrder = () => {
    onUpdateOrder(tempCategories);
    setIsReorderMode(false);
  };

  const handleCancelReorder = () => {
    setTempCategories(categories);
    setIsReorderMode(false);
  };

  // 🧩 Filtering Logic
  const filteredCategories = useMemo(() => {
    if (!showOnlyInUse) return categories;
    return categories.filter(cat => activeCategoryNames.has(cat.name));
  }, [categories, showOnlyInUse, activeCategoryNames]);

  const filteredTempCategories = useMemo(() => {
    if (!showOnlyInUse) return tempCategories;
    return tempCategories.filter(cat => activeCategoryNames.has(cat.name));
  }, [tempCategories, showOnlyInUse, activeCategoryNames]);

  const handleReorder = (newFilteredList) => {
    if (!showOnlyInUse) {
      setTempCategories(newFilteredList);
      return;
    }

    // Merge reordered subset back into the full list
    const newList = [...tempCategories];
    const filteredIndices = tempCategories
      .map((cat, idx) => activeCategoryNames.has(cat.name) ? idx : -1)
      .filter(idx => idx !== -1);
      
    newFilteredList.forEach((cat, i) => {
      newList[filteredIndices[i]] = cat;
    });
    setTempCategories(newList);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 🧭 Reorder Controls */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm gap-4">
        <div className="flex items-center gap-3 pr-2">
          <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-500 shrink-0">
            <Shuffle size={20} />
          </div>
          <div>
            <h3 className="font-black text-slate-800 tracking-tight">ניהול סדר קטגוריות</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">גרור קטגוריות כדי לשנות את סדר ההצגה באתר</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* 👁️ Toggle 'In Use' Filter */}
          <button 
            onClick={() => setShowOnlyInUse(!showOnlyInUse)}
            className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-bold transition-all border ${
              showOnlyInUse 
                ? 'bg-primary-50 border-primary-100 text-primary-600' 
                : 'bg-slate-50 border-slate-100 text-slate-400 hover:text-slate-600'
            }`}
            title={showOnlyInUse ? "הצג את כל הקטגוריות" : "הצג רק קטגוריות עם מוצרים"}
          >
            {showOnlyInUse ? <Eye size={18} /> : <EyeOff size={18} />}
            <span className="text-sm">רק פעילות</span>
          </button>

          <div className="w-px h-8 bg-slate-100 mx-1 hidden md:block" />

          {!isReorderMode ? (
            <button 
              onClick={() => setIsReorderMode(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-primary-600 transition-all shadow-lg shadow-slate-200"
            >
              <Shuffle size={18} />
              <span>שנה סדר</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 w-full md:w-auto">
              <button 
                onClick={handleCancelReorder}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 text-slate-500 rounded-2xl font-bold hover:bg-slate-200 transition-all"
              >
                <X size={18} />
                <span>ביטול</span>
              </button>
              <button 
                onClick={handleSaveOrder}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-2xl font-bold hover:bg-primary-600 transition-all shadow-lg shadow-primary-200"
              >
                <Save size={18} />
                <span>שמור סדר</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {isReorderMode ? (
        <Reorder.Group 
          axis="y" 
          values={filteredTempCategories} 
          onReorder={handleReorder} 
          className="flex flex-col gap-3"
        >
          {filteredTempCategories.map((cat) => (
            <Reorder.Item 
              key={cat.id} 
              value={cat}
              className="bg-white rounded-[24px] p-5 border border-slate-200 shadow-sm flex items-center justify-between group cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="text-slate-300 group-hover:text-primary-400 transition-colors">
                  <GripVertical size={24} />
                </div>
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                  <Layers size={18} />
                </div>
                <div>
                  <span className="font-black text-slate-800 text-lg tracking-tight block">{cat.name}</span>
                  {!activeCategoryNames.has(cat.name) && (
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">לא בשימוש</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">מיקום: {tempCategories.indexOf(cat) + 1}</span>
                </div>
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCategories.map((cat, idx) => (
            <motion.div 
              layout
              key={cat.id || `cat-${idx}-${cat.name}`}
              className="bg-white rounded-[32px] p-6 border border-slate-200 shadow-sm flex items-center justify-between group transition-all hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-primary-50 group-hover:text-primary-500 transition-colors">
                  <Layers size={20} />
                </div>
                <div>
                  <span className="font-black text-slate-800 text-lg tracking-tight block">{cat.name}</span>
                  {!activeCategoryNames.has(cat.name) && (
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">לא בשימוש</span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {confirmingCategoryDelete === cat.id ? (
                  <div className="flex items-center gap-1 bg-red-50 p-1 rounded-xl border border-red-100">
                    <button onClick={() => handleDeleteCategory(cat.id)} className="bg-red-500 text-white p-2 rounded-lg"><Check size={14} /></button>
                    <button onClick={() => setConfirmingCategoryDelete(null)} className="bg-slate-200 text-slate-500 p-2 rounded-lg"><X size={14} /></button>
                  </div>
                ) : (
                  <>
                    <button 
                      onClick={() => setEditingCategory(cat)}
                      className="p-3 text-slate-300 hover:text-primary-600 hover:bg-slate-50 rounded-xl transition-all"
                    >
                      <Edit size={18} />
                    </button>
                    <button 
                      onClick={() => setConfirmingCategoryDelete(cat.id)}
                      className="p-3 text-slate-300 hover:text-red-500 hover:bg-slate-50 rounded-xl transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoryManagement;
