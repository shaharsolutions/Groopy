import React, { useState } from 'react';
import { 
  X, 
  Check, 
  Link as ChainLink, 
  Package,
  Layers,
  Image as ImageIcon,
  CheckCircle2,
  Share2,
  MousePointer2,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../supabaseClient';


const AgentCategoryLinkModal = ({ 
  isOpen, 
  onClose, 
  agent, 
  categories, 
  banners,
  onCopyLink, 
  onShareLink,
  copyFeedback 
}) => {
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedBannerIds, setSelectedBannerIds] = useState([]);
  const [selectedExpiration, setSelectedExpiration] = useState(null); // days: 1, 7, 14, null
  const [linkDescription, setLinkDescription] = useState('');

  if (!agent) return null;

  const toggleCategory = (catName) => {
    setSelectedCategories(prev => 
      prev.includes(catName) 
        ? prev.filter(c => c !== catName) 
        : [...prev, catName]
    );
  };

  const toggleBanner = (bannerId) => {
    setSelectedBannerIds(prev => 
      prev.includes(bannerId) 
        ? prev.filter(id => id !== bannerId) 
        : [...prev, bannerId]
    );
  };

  const toggleAllCategories = () => {
    if (selectedCategories.length === categories.length) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(categories.map(c => c.name));
    }
  };

  const toggleAllBanners = () => {
    if (selectedBannerIds.length === banners.length) {
      setSelectedBannerIds([]);
    } else {
      setSelectedBannerIds(banners.map(b => b.id));
    }
  };

  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async (type = 'copy') => {
    setIsGenerating(true);
    try {
      let expiresAt = null;
      if (selectedExpiration) {
        expiresAt = Date.now() + (selectedExpiration * 24 * 60 * 60 * 1000);
      }

      // 1. Save to DB and get generated ID
      const { data, error } = await supabase
        .from('personalized_links')
        .insert([{
          agent_id: agent.id,
          categories: selectedCategories,
          banners: selectedBannerIds,
          expires_at: expiresAt,
          description: linkDescription
        }])
        .select('id')
        .single();

      if (error) {
        console.error('Error saving personalized link:', error);
        return;
      }

      const shortId = data.id;

      if (type === 'copy') {
        onCopyLink(agent, selectedCategories, selectedBannerIds, expiresAt, shortId);
      } else {
        onShareLink(agent, selectedCategories, selectedBannerIds, expiresAt, shortId);
      }
    } catch (err) {
      console.error('Unexpected error generating link:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Layers size={16} className="text-primary-500" />
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">התאמת תוכן לקישור</h2>
            </div>
            <p className="text-slate-400 text-sm font-bold tracking-tight">
              יצירת קישור אישי לסוכן: <span className="text-slate-600">{agent.name}</span>
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-3 bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-2xl transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 pt-4 custom-scrollbar">
          
          {/* Categories Section */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <Package size={14} /> קטגוריות להצגה
              </h3>
              <button 
                onClick={toggleAllCategories}
                className="text-[10px] font-black uppercase tracking-widest text-primary-500 hover:text-primary-600 transition-colors"
              >
                {selectedCategories.length === categories.length ? 'בטל הכל' : 'בחר הכל'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {categories.map((cat) => {
                const isSelected = selectedCategories.includes(cat.name);
                return (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategory(cat.name)}
                    className={`group flex items-center justify-between p-4 rounded-2xl transition-all text-right border-2 ${
                      isSelected 
                        ? 'bg-primary-50 border-primary-200 shadow-sm' 
                        : 'bg-white border-slate-50 hover:border-slate-100 hover:bg-slate-50/50'
                    }`}
                  >
                    <span className={`font-bold text-sm ${isSelected ? 'text-primary-700' : 'text-slate-600'}`}>
                      {cat.name}
                    </span>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                      isSelected ? 'bg-primary-500 text-white scale-110 shadow-lg shadow-primary-200' : 'bg-slate-100 text-transparent'
                    }`}>
                      <Check size={12} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Banners Section */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <ImageIcon size={14} /> באנרים להצגה
              </h3>
              <button 
                onClick={toggleAllBanners}
                className="text-[10px] font-black uppercase tracking-widest text-primary-500 hover:text-primary-600 transition-colors"
              >
                {selectedBannerIds.length === banners.length ? 'בטל הכל' : 'בחר הכל'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {banners.map((banner) => {
                const isSelected = selectedBannerIds.includes(banner.id);
                return (
                  <button
                    key={banner.id}
                    onClick={() => toggleBanner(banner.id)}
                    className={`relative group aspect-video rounded-3xl overflow-hidden border-4 transition-all ${
                      isSelected ? 'border-primary-500 scale-[1.02] shadow-xl shadow-primary-100' : 'border-slate-50 hover:border-slate-100'
                    }`}
                  >
                    <img 
                      src={banner.image} 
                      alt="" 
                      className={`w-full h-full object-cover transition-opacity ${isSelected ? 'opacity-100' : 'opacity-40 group-hover:opacity-60'}`}
                    />
                    <div className={`absolute top-3 left-3 w-6 h-6 rounded-xl flex items-center justify-center backdrop-blur-md transition-all ${
                      isSelected ? 'bg-primary-500 text-white shadow-lg' : 'bg-white/50 text-transparent'
                    }`}>
                      <Check size={14} />
                    </div>
                    {banner.title && (
                      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/50 to-transparent">
                        <span className="text-white font-black text-[10px] truncate block">{banner.title}</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Expiration Section */}
          <div className="mb-6">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
              <Clock size={14} /> תוקף הקישור
            </h3>
            <div className="flex gap-2">
              {[
                { label: 'יום 1', value: 1 },
                { label: '7 ימים', value: 7 },
                { label: '14 יום', value: 14 },
                { label: 'ללא תוקף', value: null },
              ].map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => setSelectedExpiration(opt.value)}
                  className={`flex-1 py-3 px-2 rounded-xl border-2 font-bold text-xs transition-all ${
                    selectedExpiration === opt.value
                      ? 'bg-primary-50 border-primary-200 text-primary-700 shadow-sm'
                      : 'bg-white border-slate-50 text-slate-400 hover:border-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description Section */}
          <div className="mb-6">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
               תיאור הקישור (אופציונלי)
            </h3>
            <textarea 
              value={linkDescription}
              onChange={(e) => setLinkDescription(e.target.value)}
              placeholder="לדוגמה: מבצע אביב ללקוח כהן..."
              className="w-full h-24 p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-primary-300 focus:bg-white transition-all text-sm font-bold placeholder:text-slate-300 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 bg-slate-50 border-t border-slate-100 flex flex-col gap-4 sticky bottom-0 z-10">
          <div className="flex gap-4">
            <button 
              onClick={() => handleGenerate('copy')}
              disabled={isGenerating}
              className={`flex-1 h-16 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl transition-all shadow-xl shadow-primary-100 flex items-center justify-center gap-3 active:scale-[0.98] ${isGenerating ? 'opacity-70 cursor-wait' : ''}`}
            >
              {isGenerating ? (
                <span className="font-black text-lg animate-pulse">מפיק קישור...</span>
              ) : copyFeedback === agent.id ? (
                <>
                  <Check size={20} className="animate-in zoom-in" />
                  <span className="font-black text-lg">הקישור הועתק!</span>
                </>
              ) : (
                <>
                  <ChainLink size={20} />
                  <span className="font-black text-lg">העתק קישור מותאם</span>
                </>
              )}
            </button>
            
            {navigator.share && (
              <button 
                onClick={() => handleGenerate('share')}
                className="w-16 h-16 bg-white border border-slate-200 text-slate-400 hover:text-primary-500 hover:border-primary-100 rounded-2xl transition-all flex items-center justify-center hover:shadow-lg hover:bg-primary-50/30"
                title="שתף קישור"
              >
                <Share2 size={24} />
              </button>
            )}
          </div>
          <div className="flex items-center justify-center gap-2 text-slate-400">
            <MousePointer2 size={12} />
            <span className="text-[10px] font-black uppercase tracking-widest">בחר תוכן ולחץ להעתקה</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AgentCategoryLinkModal;
