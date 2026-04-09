import React, { useState } from 'react';
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  Search, 
  ShoppingBag, 
  Clock, 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  Phone, 
  Check, 
  Edit, 
  Save, 
  Settings,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmCancelModal from './ConfirmCancelModal';

const statusMap = {
  'New': { label: 'חדש', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
  'Processing': { label: 'בעבודה', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
  'Completed': { label: 'הושלם', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  'Canceled': { label: 'בוטל', icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100' }
};

const OrderDetailsModal = (props) => {
  const { 
    order, 
    onClose, 
    setIsEditingOrder, 
    handleUpdateOrderStatus, 
    setSelectedOrder,
    adminName,
    setAdminName,
    newNoteText,
    setNewNoteText,
    handleAddNote,
    isSubmittingNote,
    confirmingNoteDelete,
    setConfirmingNoteDelete,
    handleDeleteNote,
    customers = [],
    onOpenCustomer
  } = props;

  // Removed activeTab state as we are moving to a single scrollable view
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const scrollContainerRef = React.useRef(null);
  
  if (!order) return null;

  const orderStatus = statusMap[order.status] || statusMap['New'];
  const subtotal = (order.items || []).reduce((sum, item) => sum + (parseFloat(item.price || 0) * (parseInt(item.quantity) || 0)), 0);
  const discountPct = parseFloat(order.discount_pct || 0);
  const discountAmount = subtotal * (discountPct / 100);
  const total = subtotal - discountAmount;

  const sections = [
    { id: 'logistics', label: 'לוגיסטיקה וציר זמן', icon: Clock },
    { id: 'items', label: 'פריטים ותשלום', icon: ShoppingBag }
  ];

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="fixed inset-0 z-[120] overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4 md:p-8 bg-slate-900/60 backdrop-blur-xl">
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="bg-white rounded-[40px] md:rounded-[48px] w-full max-w-6xl shadow-2xl relative flex flex-col md:flex-row max-h-[90vh] md:h-[85vh] overflow-hidden"
          dir="rtl"
        >
          {/* Right Sidebar: Quick Info & Status */}
          <div className="w-full md:w-80 bg-slate-50 p-6 md:p-10 border-l border-slate-100 flex flex-col overflow-y-auto thin-scrollbar">
            <div className="mb-10 text-right">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 leading-none">פרטי הזמנה</h3>
              <div className="flex items-center gap-3">
                <h2 className="text-4xl font-[1000] text-slate-900 tracking-tighter leading-none">#{order.sequentialId}</h2>
                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${orderStatus.bg} ${orderStatus.border} ${orderStatus.color}`}>
                  {orderStatus.label}
                </div>
              </div>
              <p className="text-slate-400 font-bold text-xs mt-3 uppercase tracking-tight pr-1">
                {new Date(order.created_at).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' })} • {new Date(order.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            <div className="space-y-6 flex-1">
              {/* Customer Card */}
              <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm relative overflow-hidden group text-right">
                <div className="absolute top-0 right-0 w-1.5 h-full bg-primary-500" />
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-4">פרטי לקוח</span>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                    <User size={24} />
                  </div>
                  <div className="flex flex-col">
                    <h4 className="text-xl font-black text-slate-800 tracking-tight leading-none">{order.customer_name}</h4>
                    <span className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-tight">
                      {customers.find(c => c.business_name === order.customer_name)?.contact_name || 'לקוח פרטי'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-slate-100">
                  <button 
                    onClick={() => onOpenCustomer?.(order.customer_name)}
                    className="flex items-center justify-between w-full h-11 px-4 bg-primary-50 hover:bg-primary-100 text-primary-600 rounded-xl transition-all group/btn"
                  >
                    <div className="flex items-center gap-2">
                      <User size={14} className="group-hover/btn:scale-110 transition-transform" />
                      <span className="text-xs font-black uppercase tracking-widest">כרטיס לקוח</span>
                    </div>
                    <ExternalLink size={14} className="opacity-40 group-hover/btn:opacity-100 group-hover/btn:translate-x-[-2px] transition-all" />
                  </button>

                  {order.agent_name && (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-6 h-6 bg-slate-100/50 rounded-lg flex items-center justify-center text-slate-400">
                        <Settings size={12} />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">דרך סוכן:</span>
                      <span className="text-xs font-black text-primary-600">{order.agent_name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Actions */}
              <div className="space-y-3">
                 <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-1 pr-2">עדכון סטטוס</span>
                 <div className="grid grid-cols-2 gap-2">
                   {Object.entries(statusMap).map(([key, status]) => (
                     <button 
                       key={`order-status-${key}`}
                       disabled={order.status === 'Canceled' && key !== 'Canceled'}
                       onClick={() => {
                         if (key === 'Canceled') {
                           setIsCancelModalOpen(true);
                         } else {
                           handleUpdateOrderStatus(order.id, key);
                         }
                       }}
                       className={`flex items-center gap-2 p-3 rounded-2xl border transition-all text-right ${
                         order.status === key 
                           ? `${status.bg} ${status.border} ${status.color} shadow-sm ring-2 ring-white` 
                           : order.status === 'Canceled' && key !== 'Canceled'
                             ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed opacity-50'
                             : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                       }`}
                     >
                       <status.icon size={14} className={order.status === key ? status.color : 'opacity-40'} />
                       <span className="text-[10px] font-black uppercase tracking-widest">{status.label}</span>
                       {order.status === key && <Check size={12} className="mr-auto" />}
                     </button>
                   ))}
                 </div>
              </div>
            </div>

            <button 
              onClick={onClose}
              className="mt-8 w-full py-5 bg-white text-slate-400 hover:text-slate-900 border border-slate-200 rounded-3xl font-black text-sm uppercase tracking-widest transition-all hover:bg-slate-50"
            >
              סגירת פרטים
            </button>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
            {/* Tabs Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between px-6 md:px-12 pt-8 md:pt-10 pb-4 md:pb-6 border-b border-slate-100 gap-6">
                <div className="flex items-center gap-4 md:gap-8">
                  {sections.map(section => (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className="relative pb-4 flex items-center gap-2 transition-all group text-slate-400 hover:text-primary-600"
                    >
                      <section.icon size={16} className="opacity-40 group-hover:opacity-100 group-hover:text-primary-500 transition-all" />
                      <span className="text-[10px] md:text-sm font-black uppercase tracking-widest whitespace-nowrap">{section.label}</span>
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary-500 rounded-full opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0" />
                    </button>
                  ))}
               </div>

               <button 
                  onClick={() => setIsEditingOrder(true)}
                  className="flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-xs md:text-sm shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95 w-full md:w-auto"
                >
                  <Edit size={14} />
                  <span>עריכת הזמנה</span>
                </button>
            </div>

            <div 
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto p-8 md:p-12 thin-scrollbar scroll-smooth"
            >
              <div className="space-y-16">
                {/* Logistics & Timeline Section */}
                <div id="logistics" className="scroll-mt-10">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-10"
                  >
                    {/* Customer Personal Note (if exists) */}
                    {order.customer_note && (
                      <div className="bg-primary-50/50 p-8 rounded-[32px] border border-primary-100 border-dashed text-right relative">
                        <div className="absolute top-4 left-6 text-primary-200 uppercase font-black text-[40px] opacity-20 pointer-events-none self-start">"</div>
                        <span className="text-[10px] font-black text-primary-500 uppercase tracking-widest block mb-4">הערת לקוח מההזמנה:</span>
                        <p className="text-lg font-bold text-slate-700 leading-relaxed italic pr-4 border-r-4 border-primary-500/20">
                          {order.customer_note}
                        </p>
                      </div>
                    )}

                    <h4 className="text-2xl font-black text-slate-900 tracking-tighter flex items-center gap-3 mb-2">
                       <Zap size={24} className="text-amber-500" />
                       לוגיסטיקה וציר זמן
                    </h4>

                    {/* Add Note Form */}
                    <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 space-y-4">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pr-2">הוספת הערה לוגיסטית</span>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <input 
                            type="text" 
                            placeholder="כותב ההערה..."
                            className="bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-primary-400 transition-all text-right shadow-sm"
                            value={adminName}
                            onChange={(e) => setAdminName(e.target.value)}
                          />
                          <div className="bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold text-slate-400 text-right opacity-50 shadow-sm">הערה ידנית</div>
                       </div>
                       <textarea 
                        rows="3"
                        placeholder="הקלד כאן את תוכן ההערה..."
                        className="w-full bg-white border border-slate-200 rounded-[24px] p-6 text-sm font-bold outline-none focus:border-primary-400 transition-all text-right shadow-sm"
                        value={newNoteText}
                        onChange={(e) => setNewNoteText(e.target.value)}
                       />
                       <button 
                         onClick={handleAddNote}
                         disabled={isSubmittingNote || !newNoteText.trim() || !adminName.trim()}
                         className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-30"
                       >
                         {isSubmittingNote ? 'שומר...' : 'שמירת הערה'}
                       </button>
                    </div>

                    {/* Logistics Notes Timeline */}
                    <div className="space-y-6">
                       <div className="space-y-4">
                          {(order.notes || []).length === 0 && (
                            <div className="text-center py-16 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px]">
                               <Clock size={40} className="mx-auto text-slate-200 mb-4" />
                               <p className="text-slate-400 font-bold">אין הערות זמינות להזמנה זו</p>
                            </div>
                          )}
                          {[...(order.notes || [])]
                            .map((note, originalIdx) => ({ ...note, originalIdx }))
                            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                            .map((note) => (
                              <motion.div 
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                key={`note-${note.originalIdx}`} 
                                className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm relative group/note text-right"
                              >
                                <div className="flex items-center justify-between mb-3 pl-10">
                                  <div className="flex items-center gap-3">
                                     <div className="w-8 h-8 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center font-black text-xs">
                                        {note.author?.[0]}
                                     </div>
                                     <span className="text-sm font-black text-slate-800 tracking-tight">{note.author}</span>
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-300">
                                    {new Date(note.timestamp).toLocaleDateString()} • {new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-slate-600 text-sm font-bold leading-relaxed pr-11">{note.text}</p>
                                
                                <button 
                                  onClick={() => setConfirmingNoteDelete(note.originalIdx)}
                                  className="absolute top-4 left-4 p-2 text-slate-300 hover:text-red-500 opacity-20 group-hover/note:opacity-100 transition-all"
                                >
                                  <Trash2 size={16} />
                                </button>
  
                                {confirmingNoteDelete === note.originalIdx && (
                                  <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-[32px] flex items-center justify-center gap-4 animate-in fade-in">
                                     <span className="text-sm font-black text-red-500">למחוק הערה?</span>
                                     <button onClick={() => handleDeleteNote(note.originalIdx)} className="bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-black">מחק</button>
                                     <button onClick={() => setConfirmingNoteDelete(null)} className="bg-slate-100 text-slate-500 px-4 py-2 rounded-xl text-xs font-black">ביטול</button>
                                  </div>
                                )}
                              </motion.div>
                            ))}
                       </div>
                    </div>
                  </motion.div>
                </div>

                {/* Items & Payment Section */}
                <div id="items" className="scroll-mt-10 pt-10 border-t border-slate-100">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                  >
                    <h4 className="text-2xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
                       <ShoppingBag size={24} className="text-primary-500" />
                       פריטים ותשלום
                    </h4>

                    {/* Items List */}
                    <div className="space-y-4">
                      {(order.items || []).map((item, idx) => (
                        <div 
                          key={`item-${item.sku || idx}`}
                          className="flex items-center gap-6 p-6 bg-slate-50 border border-slate-100 rounded-[32px] group hover:bg-white hover:border-primary-100 hover:shadow-xl hover:shadow-primary-100/20 transition-all duration-300"
                        >
                          <div className="w-20 h-20 bg-white rounded-2xl overflow-hidden shadow-inner border border-slate-100 group-hover:scale-105 transition-transform duration-500">
                            <img src={item.image} alt="" className="w-full h-full object-cover" />
                          </div>
                          
                          <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="text-right">
                              <h4 className="text-xl font-black text-slate-800 tracking-tight leading-none mb-1">{item.name}</h4>
                              <div className="flex items-center gap-2 justify-end">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">מק"ט: {item.sku}</span>
                                <span className="w-1 h-1 rounded-full bg-slate-200" />
                                <span className="text-xs font-black text-slate-600 tracking-tight">₪{parseFloat(item.price || 0).toFixed(2)} ליח'</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-12">
                               <div className="flex flex-col items-center">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-40 mb-1">כמות</span>
                                  <span className="text-2xl font-[1000] text-slate-900 tracking-tighter tabular-nums">{item.quantity}</span>
                               </div>
                               <div className="flex flex-col text-right">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-40 mb-1">סה"כ</span>
                                  <span className="text-2xl font-black text-slate-900 tracking-tighter tabular-nums">₪{(parseFloat(item.price || 0) * (parseInt(item.quantity) || 0)).toFixed(2)}</span>
                               </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Summary Card */}
                    <div className="mt-12 bg-slate-900 text-white p-10 rounded-[48px] shadow-2xl relative overflow-hidden">
                       <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary-600/20 to-transparent pointer-events-none" />
                       <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 text-right">
                          <div className="space-y-1">
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">סיכום ביניים</span>
                             <span className="text-3xl font-black tracking-tighter tabular-nums">₪{subtotal.toFixed(2)}</span>
                          </div>
                          <div className="space-y-1">
                             <span className="text-[10px] font-black text-primary-400 uppercase tracking-widest block">הנחה ({discountPct}%)</span>
                             <span className="text-3xl font-black text-primary-400 tracking-tighter tabular-nums" dir="ltr">-₪{discountAmount.toFixed(2)}</span>
                          </div>
                          <div className="space-y-1 md:border-r border-white/10 md:pr-8">
                             <span className="text-[10px] font-black text-white/50 uppercase tracking-widest block">סה"כ לתשלום</span>
                             <span className="text-5xl font-[1000] tracking-tighter tabular-nums">₪{total.toFixed(2)}</span>
                          </div>
                       </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <ConfirmCancelModal 
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        onConfirm={(reason) => {
          handleUpdateOrderStatus(order.id, 'Canceled', reason);
          setIsCancelModalOpen(false);
        }}
        orderId={order.id}
      />
    </div>
  );
};

export default OrderDetailsModal;
