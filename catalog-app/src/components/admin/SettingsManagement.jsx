import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { Settings, Save, CheckCircle2, RotateCcw } from 'lucide-react';

const SettingsManagement = ({ settings, setSettings }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const getSetting = (key, defaultValue) => {
    const setting = settings.find(s => s.key === key);
    return setting ? setting.value : defaultValue;
  };

  const handleToggle = async (key) => {
    const currentValue = getSetting(key, true);
    const newValue = !currentValue;
    
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({ key, value: newValue }, { onConflict: 'key' });

      if (!error) {
        setSettings(prev => {
          const exists = prev.find(s => s.key === key);
          if (exists) {
            return prev.map(s => s.key === key ? { ...s, value: newValue } : s);
          }
          return [...prev, { key, value: newValue }];
        });
        
        setFeedback({ type: 'success', message: 'ההגדרה עודכנה בהצלחה' });
        setTimeout(() => setFeedback(null), 3000);
      } else {
        console.error('Error updating setting:', error);
        setFeedback({ type: 'error', message: 'שגיאה בעדכון ההגדרה' });
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setFeedback({ type: 'error', message: 'שגיאה לא צפויה' });
    } finally {
      setIsUpdating(false);
    }
  };

  const showQuickFilters = getSetting('show_quick_filters', true);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* 🛠️ HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-slate-900 text-white rounded-[24px] flex items-center justify-center shadow-xl shadow-slate-200">
            <Settings size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-[900] text-slate-900 tracking-tight">הגדרות מערכת</h2>
            <p className="text-slate-500 font-bold flex items-center gap-2">ניהול הגדרות גלובליות לקטלוג</p>
          </div>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 font-bold animate-in zoom-in duration-300 ${
          feedback.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 size={20} /> : <RotateCcw size={20} />}
          {feedback.message}
        </div>
      )}

      {/* ⚙️ SETTINGS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Quick Filters Toggle */}
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-black text-slate-900 mb-1">הצגת כפתורי סינון מהיר</h3>
              <p className="text-slate-500 text-sm font-medium">שליטה על הצגת מבצעים חמים, נמכרים ביותר ומוצרים חדשים בקטלוג.</p>
            </div>
            <button
              onClick={() => handleToggle('show_quick_filters')}
              disabled={isUpdating}
              dir="ltr"
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                showQuickFilters ? 'bg-primary-500' : 'bg-slate-200'
              }`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-300 ease-in-out ${
                  showQuickFilters ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <div className={`text-xs font-bold uppercase tracking-widest ${showQuickFilters ? 'text-emerald-500' : 'text-slate-400'}`}>
            {showQuickFilters ? 'פעיל - מוצג בקטלוג' : 'כבוי - מוסתר מהקטלוג'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsManagement;
