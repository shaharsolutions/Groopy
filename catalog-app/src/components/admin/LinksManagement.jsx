import React, { useState } from 'react';
import { 
  Link as ChainLink, 
  Trash2, 
  Eye, 
  Calendar,
  User,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Package,
  Image as ImageIcon,
  Copy,
  Check,
  Pencil
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LinksManagement = ({ 
  links, 
  agents, 
  categories,
  banners,
  onToggleActive, 
  onDeleteLink, 
  onCopyLink,
  onEditLink // Added for editing support
}) => {
  const [copyFeedback, setCopyFeedback] = useState(null);

  const getAgentName = (agentId) => {
    const agent = agents.find(a => a.id === agentId);
    return agent ? agent.name : 'סוכן לא ידוע';
  };

  const getCategoryName = (catId) => {
    // If it's already a name (legacy), return it. If UUID, find it.
    const cat = categories.find(c => c.id === catId || c.name === catId);
    return cat ? cat.name : catId;
  };

  const getBannerTitle = (bannerId) => {
    const banner = banners.find(b => b.id === bannerId);
    return banner ? (banner.title || 'באנר ללא כותרת') : `באנר (${bannerId.slice(0, 4)})`;
  };

  const handleCopy = (linkId, agentId) => {
    const url = `${window.location.origin}/#/?agent=${agentId}&s=${linkId}`;
    navigator.clipboard.writeText(url);
    setCopyFeedback(linkId);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const formatExpiration = (expiresAt) => {
    if (!expiresAt) return 'ללא תוקף';
    const now = Date.now();
    const diff = expiresAt - now;
    if (diff <= 0) return 'פג תוקף';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days > 0) return `נותרו ${days} ימים`;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    return `נותרו ${hours} שעות`;
  };

  const isExpired = (expiresAt) => {
    if (!expiresAt) return false;
    return Date.now() > expiresAt;
  };

  return (
    <div className="mt-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center">
              <ChainLink size={20} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">ניהול קישורים אישיים</h2>
          </div>
          <p className="text-slate-400 text-sm font-bold">מעקב ובקרה אחר קישורים שהופקו לסוכנים</p>
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100">מזהה / סוכן</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100">תיאור</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100">תוכן מותאם</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100">נוצר ב-</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100">תוקף</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100">צפיות (פעיל/חסום)</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100">סטטוס</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <AnimatePresence mode="popLayout">
                {links.map((link) => (
                  <motion.tr 
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    key={link.id} 
                    className="group hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="p-6">
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-primary-50 group-hover:text-primary-500 transition-colors">
                            <code className="text-[10px] font-black uppercase">#{link.id}</code>
                          </div>
                          <div>
                            <span className="block font-black text-slate-700 text-sm">{getAgentName(link.agent_id)}</span>
                            <span className="text-[10px] text-slate-400 font-bold">סוכן ID: {link.agent_id}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <p className="text-xs font-bold text-slate-600 max-w-[150px] truncate" title={link.description}>
                        {link.description || <span className="text-slate-300 italic">ללא תיאור</span>}
                      </p>
                    </td>
                    <td className="p-6">
                      <div className="flex flex-col gap-2 max-w-[200px]">
                        {link.categories && link.categories.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {link.categories.map(cat => (
                              <span key={cat} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-[10px] font-black text-slate-600 rounded-md border border-slate-200">
                                <Package size={10} className="text-slate-400" />
                                {getCategoryName(cat)}
                              </span>
                            ))}
                          </div>
                        )}
                        {link.banners && link.banners.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {link.banners.map(ban => (
                              <span key={ban} className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-50 text-[10px] font-black text-primary-600 rounded-md border border-primary-100">
                                <ImageIcon size={10} className="text-primary-400" />
                                {getBannerTitle(ban)}
                              </span>
                            ))}
                          </div>
                        )}
                        {(!link.categories?.length && !link.banners?.length) && (
                          <span className="text-[10px] font-bold text-slate-300">כל הקטלוג</span>
                        )}
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Calendar size={14} className="text-slate-300" />
                        <span className="text-xs font-bold">{new Date(link.created_at).toLocaleDateString('he-IL')}</span>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className={`flex items-center gap-2 ${isExpired(link.expires_at) ? 'text-red-400' : 'text-slate-500'}`}>
                        <Clock size={14} className={isExpired(link.expires_at) ? 'text-red-300' : 'text-slate-300'} />
                        <span className="text-xs font-bold">{formatExpiration(link.expires_at)}</span>
                      </div>
                    </td>
                    <td className="p-6">
                       <div className="flex items-center gap-3">
                         <div className="flex items-center gap-2">
                           <div className="w-8 h-8 bg-green-50 text-green-600 rounded-lg flex items-center justify-center">
                             <Eye size={14} />
                           </div>
                           <span className="text-sm font-black text-slate-700">{link.views || 0}</span>
                         </div>
                         <div className="w-px h-6 bg-slate-100" />
                         <div className="flex items-center gap-2 opacity-60">
                           <div className="w-8 h-8 bg-red-50 text-red-600 rounded-lg flex items-center justify-center">
                             <ShieldAlert size={14} />
                           </div>
                           <span className="text-sm font-black text-slate-500">{link.views_inactive || 0}</span>
                         </div>
                       </div>
                     </td>
                    <td className="p-6">
                      <button 
                        onClick={() => onToggleActive(link.id, !link.is_active)}
                        className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none ${link.is_active ? 'bg-primary-500' : 'bg-slate-200'}`}
                      >
                        <motion.div 
                          animate={{ x: link.is_active ? -24 : -4 }}
                          className="absolute top-1 right-1 w-4 h-4 bg-white rounded-full shadow-sm"
                        />
                      </button>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => onEditLink(link)}
                          className="p-2 bg-slate-50 text-slate-400 hover:bg-primary-50 hover:text-primary-500 rounded-lg transition-all"
                          title="ערוך קישור"
                        >
                          <Pencil size={16} />
                        </button>
                        <button 
                          onClick={() => handleCopy(link.id, link.agent_id)}
                          className={`p-2 rounded-lg transition-all ${
                            copyFeedback === link.id 
                              ? 'bg-green-50 text-green-500' 
                              : 'bg-slate-50 text-slate-400 hover:bg-primary-50 hover:text-primary-500'
                          }`}
                          title="העתק שוב"
                        >
                          {copyFeedback === link.id ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                        <button 
                          onClick={() => onDeleteLink(link.id)}
                          className="p-2 bg-slate-50 text-slate-300 hover:bg-red-50 hover:text-red-500 rounded-lg transition-all"
                          title="מחק קישור"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              {links.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-32 text-center text-slate-300 font-black italic">
                    אין קישורים פעילים במערכת
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LinksManagement;
