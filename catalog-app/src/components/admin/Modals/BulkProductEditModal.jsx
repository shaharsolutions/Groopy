import React, { useState } from 'react';
import { X, Tag, Star, Flame, Zap, Layers, Package, MousePointerClick, ShoppingBag, Check, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const BulkProductEditModal = ({ 
    isOpen, 
    onClose, 
    categories, 
    onSave, 
    isUpdating,
    selectedCount
}) => {
  // State for the new values: 'keep' | 'active' | 'inactive'
  const [flagsState, setFlagsState] = useState({
    is_new: 'keep',
    is_best_seller: 'keep',
    is_hot_deal: 'keep',
    is_visible: 'keep'
  });

  const [categoryUpdate, setCategoryUpdate] = useState({
    active: false,
    value: ''
  });

  const [quantityUpdate, setQuantityUpdate] = useState({
    active: false,
    value: 12
  });

  const [saleModeUpdate, setSaleModeUpdate] = useState({
    active: false,
    mode: 'standard', // 'standard' | 'cartons' | 'custom'
    incrementalStep: 1
  });

  if (!isOpen) return null;

  const handleSave = () => {
    const changes = {};
    if (categoryUpdate.active) {
      changes.category = categoryUpdate.value;
    }

    if (quantityUpdate.active) {
      changes.default_quantity = parseInt(quantityUpdate.value) || 12;
    }

    if (saleModeUpdate.active) {
      if (saleModeUpdate.mode === 'standard') {
        changes.is_default_carton = false;
        changes.is_incremental_add = false;
        changes.incremental_step = null;
      } else if (saleModeUpdate.mode === 'cartons') {
        changes.is_default_carton = true;
        changes.is_incremental_add = false;
        changes.incremental_step = null;
      } else if (saleModeUpdate.mode === 'custom') {
        changes.is_default_carton = false;
        changes.is_incremental_add = true;
        changes.incremental_step = parseInt(saleModeUpdate.incrementalStep) || 1;
      }
    }
    
    Object.entries(flagsState).forEach(([field, state]) => {
      if (state === 'active') changes[field] = true;
      if (state === 'inactive') changes[field] = false;
    });
    
    if (Object.keys(changes).length === 0) {
      onClose();
      return;
    }
    
    onSave(changes);
  };

  const flags = [
    { id: 'is_new', label: 'מוצר חדש', icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-50' },
    { id: 'is_best_seller', label: 'נמכר ביותר', icon: Star, color: 'text-blue-500', bg: 'bg-blue-50' },
    { id: 'is_hot_deal', label: 'מבצע חם', icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50' },
    { id: 'is_visible', label: 'מוצג בקטלוג', icon: Eye, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  ];

  const hasChanges = categoryUpdate.active || quantityUpdate.active || saleModeUpdate.active || Object.values(flagsState).some(s => s !== 'keep');

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
      />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white rounded-[40px] w-full max-w-xl shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden"
        dir="rtl"
      >
        {/* Header */}
        <div className="p-8 md:p-10 pb-4 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black tracking-tighter">עריכה קבוצתית</h2>
            <p className="text-slate-400 font-bold mt-1">עדכון של {selectedCount} מוצרים נבחרים</p>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-300 hover:text-slate-900 transition-colors flex-shrink-0 mr-2"
          >
            <X size={32} />
          </button>
        </div>
        
        {/* Body */}
        <div className="flex-1 overflow-y-auto p-8 md:p-10 pt-4 thin-scrollbar">
          <div className="space-y-8">
            {/* Quick Visibility Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={() => onSave({ is_visible: true })}
                disabled={isUpdating}
                className="bg-emerald-50 text-emerald-600 border border-emerald-100 p-6 rounded-3xl font-black text-sm hover:bg-emerald-100 transition-all active:scale-95 flex items-center justify-center gap-3 shadow-sm"
              >
                <Eye size={24} />
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-widest opacity-60 mb-0.5">פעולה מהירה</div>
                  <div className="text-base">הצג הכל בקטלוג</div>
                </div>
              </button>
              <button 
                onClick={() => onSave({ is_visible: false })}
                disabled={isUpdating}
                className="bg-orange-50 text-orange-600 border border-orange-100 p-6 rounded-3xl font-black text-sm hover:bg-orange-100 transition-all active:scale-95 flex items-center justify-center gap-3 shadow-sm"
              >
                <EyeOff size={24} />
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-widest opacity-60 mb-0.5">פעולה מהירה</div>
                  <div className="text-base">הסתר הכל מהקטלוג</div>
                </div>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category Update */}
              <div className={`p-6 rounded-3xl border-2 transition-all ${categoryUpdate.active ? 'bg-primary-50/30 border-primary-200' : 'bg-slate-50 border-transparent'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${categoryUpdate.active ? 'bg-primary-500 text-white' : 'bg-white text-slate-400'}`}>
                      <Tag size={20} />
                    </div>
                    <span className={`font-black ${categoryUpdate.active ? 'text-primary-900' : 'text-slate-500'}`}>קטגוריה</span>
                  </div>
                  <button 
                    onClick={() => setCategoryUpdate(p => ({ ...p, active: !p.active }))}
                    className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${categoryUpdate.active ? 'bg-primary-500 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-400 hover:border-slate-300'}`}
                  >
                    {categoryUpdate.active ? 'ביטול' : 'שנה'}
                  </button>
                </div>
                
                <AnimatePresence>
                  {categoryUpdate.active && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <select 
                        value={categoryUpdate.value}
                        onChange={(e) => setCategoryUpdate(p => ({ ...p, value: e.target.value }))}
                        className="w-full h-14 bg-white border border-slate-200 rounded-2xl px-6 font-bold outline-none focus:border-primary-500 transition-all shadow-sm"
                      >
                        <option value="">בחר קטגוריה...</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Quantity Update */}
              <div className={`p-6 rounded-3xl border-2 transition-all ${quantityUpdate.active ? 'bg-primary-50/30 border-primary-200' : 'bg-slate-50 border-transparent'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${quantityUpdate.active ? 'bg-primary-500 text-white' : 'bg-white text-slate-400'}`}>
                      <Layers size={20} />
                    </div>
                    <span className={`font-black ${quantityUpdate.active ? 'text-primary-900' : 'text-slate-500'}`}>כמות</span>
                  </div>
                  <button 
                    onClick={() => setQuantityUpdate(p => ({ ...p, active: !p.active }))}
                    className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${quantityUpdate.active ? 'bg-primary-500 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-400 hover:border-slate-300'}`}
                  >
                    {quantityUpdate.active ? 'ביטול' : 'שנה'}
                  </button>
                </div>
                
                <AnimatePresence>
                  {quantityUpdate.active && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <input 
                        type="number"
                        value={quantityUpdate.value}
                        onChange={(e) => setQuantityUpdate(p => ({ ...p, value: e.target.value }))}
                        placeholder="כמות ברירת מחדל"
                        className="w-full h-14 bg-white border border-slate-200 rounded-2xl px-6 font-bold outline-none focus:border-primary-500 transition-all shadow-sm"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Sale Mode Update */}
            <div className={`p-6 rounded-3xl border-2 transition-all ${saleModeUpdate.active ? 'bg-primary-50/30 border-primary-200 shadow-sm' : 'bg-slate-50 border-transparent'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${saleModeUpdate.active ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20' : 'bg-white text-slate-400'}`}>
                    <ShoppingBag size={20} />
                  </div>
                  <span className={`font-black ${saleModeUpdate.active ? 'text-primary-900' : 'text-slate-500'}`}>שיטת מכירה</span>
                </div>
                <button 
                  onClick={() => setSaleModeUpdate(p => ({ ...p, active: !p.active }))}
                  className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${saleModeUpdate.active ? 'bg-primary-500 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-400 hover:border-slate-300'}`}
                >
                  {saleModeUpdate.active ? 'ביטול' : 'שנה'}
                </button>
              </div>
              
              <AnimatePresence>
                {saleModeUpdate.active && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {[
                        { id: 'standard', label: 'יחידות', icon: Tag },
                        { id: 'cartons', label: 'קרטונים', icon: Package },
                        { id: 'custom', label: 'מארז/תוספת', icon: MousePointerClick }
                      ].map(mode => (
                        <button
                          key={mode.id}
                          onClick={() => setSaleModeUpdate(p => ({ ...p, mode: mode.id }))}
                          className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${saleModeUpdate.mode === mode.id ? 'bg-white border-primary-500 shadow-md' : 'bg-white/50 border-slate-100 hover:border-slate-200 text-slate-400'}`}
                        >
                          <div className={`p-2 rounded-lg ${saleModeUpdate.mode === mode.id ? 'bg-primary-50 text-primary-500' : 'bg-slate-50 text-slate-300'}`}>
                            <mode.icon size={18} />
                          </div>
                          <span className={`text-xs font-black ${saleModeUpdate.mode === mode.id ? 'text-slate-900' : ''}`}>{mode.label}</span>
                          {saleModeUpdate.mode === mode.id && <Check size={16} className="mr-auto text-primary-500" strokeWidth={3} />}
                        </button>
                      ))}
                    </div>

                    {saleModeUpdate.mode === 'custom' && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 p-4 bg-white rounded-2xl border border-slate-100 flex items-center justify-between"
                      >
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">כמות להוספה:</span>
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            value={saleModeUpdate.incrementalStep}
                            onChange={(e) => setSaleModeUpdate(p => ({ ...p, incrementalStep: e.target.value }))}
                            className="w-20 h-10 bg-slate-50 border border-slate-200 rounded-xl text-center font-bold outline-none focus:border-primary-500 transition-all shadow-inner"
                          />
                          <span className="text-[10px] font-black text-slate-300 uppercase">יחידות</span>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Flags Update */}
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">עדכון תגיות</label>
              <div className="grid grid-cols-1 gap-4">
                {flags.map(flag => (
                  <div 
                    key={flag.id}
                    className={`p-5 rounded-3xl border-2 transition-all flex items-center justify-between ${flagsState[flag.id] !== 'keep' ? 'bg-white border-primary-200 shadow-lg' : 'bg-slate-50 border-transparent'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${flagsState[flag.id] === 'active' ? flag.bg : 'bg-white shadow-inner border border-slate-100'}`}>
                        <flag.icon size={24} className={flagsState[flag.id] === 'active' ? flag.color : (flagsState[flag.id] === 'inactive' ? 'text-red-300' : 'text-slate-300')} fill={flagsState[flag.id] === 'active' ? 'currentColor' : 'none'} />
                      </div>
                      <div className={`font-black ${flagsState[flag.id] !== 'keep' ? 'text-slate-900' : 'text-slate-400'}`}>{flag.label}</div>
                    </div>

                    <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
                      <button
                        onClick={() => setFlagsState(p => ({ ...p, [flag.id]: 'keep' }))}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all ${flagsState[flag.id] === 'keep' ? 'bg-white text-slate-600 shadow-sm' : 'text-slate-400 hover:text-slate-500'}`}
                      >
                        ללא שינוי
                      </button>
                      <button
                        onClick={() => setFlagsState(p => ({ ...p, [flag.id]: 'active' }))}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all ${flagsState[flag.id] === 'active' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-400 hover:text-green-500'}`}
                      >
                        הפעל
                      </button>
                      <button
                        onClick={() => setFlagsState(p => ({ ...p, [flag.id]: 'inactive' }))}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all ${flagsState[flag.id] === 'inactive' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400 hover:text-red-500'}`}
                      >
                        ביטול
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-8 md:p-10 pt-6 border-t border-slate-100 flex gap-4 bg-slate-50/30">
          <button 
            onClick={handleSave}
            disabled={isUpdating || !hasChanges}
            className="flex-[2] btn-primary py-5 rounded-3xl font-black text-lg shadow-xl shadow-primary-500/20 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed"
          >
            {isUpdating ? 'מעדכן...' : 'בצע עדכון'}
          </button>
          <button 
            onClick={onClose}
            className="flex-1 bg-white border border-slate-200 text-slate-500 py-5 rounded-3xl font-black text-lg hover:bg-slate-50 transition-all active:scale-95"
          >
            סגור
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default BulkProductEditModal;
