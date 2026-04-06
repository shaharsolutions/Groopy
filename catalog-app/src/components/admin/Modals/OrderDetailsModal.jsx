import React from 'react';
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
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const statusMap = {
  'New': { label: 'חדש', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
  'Processing': { label: 'בעבודה', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
  'Completed': { label: 'הושלם', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  'Canceled': { label: 'בוטל', icon: AlertCircle, color: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-100' }
};

const OrderDetailsModal = ({ 
    order, 
    onClose, 
    isEditingOrder, 
    setIsEditingOrder, 
    tempOrderItems, 
    handleUpdateItemQuantity, 
    handleRemoveItemFromOrder, 
    editingOrderSearch, 
    setEditingOrderSearch, 
    filteredProductsForEditing, 
    handleAddItemToOrder, 
    tempOrderDiscount, 
    setTempOrderDiscount, 
    handleSaveOrderEdits, 
    isUpdatingOrder, 
    adminName, 
    setAdminName, 
    newNoteText, 
    setNewNoteText, 
    handleAddNote, 
    isSubmittingNote, 
    confirmingNoteDelete, 
    setConfirmingNoteDelete, 
    handleDeleteNote, 
    handleUpdateOrderStatus, 
    setSelectedOrder 
}) => {
  if (!order) return null;

  const orderStatus = statusMap[order.status] || statusMap['New'];
  const subtotal = tempOrderItems.reduce((sum, item) => sum + (parseFloat(item.price || 0) * (parseInt(item.quantity) || 0)), 0);
  const discountAmount = subtotal * (parseFloat(tempOrderDiscount || 0) / 100);
  const total = subtotal - discountAmount;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4 md:p-8 bg-slate-900/60 backdrop-blur-xl">
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="bg-white rounded-[48px] w-full max-w-5xl shadow-2xl relative overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
          dir="rtl"
        >
          {/* Right Sidebar: Order Info & Actions */}
          <div className="w-full md:w-80 bg-slate-50 p-8 md:p-10 border-l border-slate-100 flex flex-col overflow-y-auto">
            <div className="mb-10 text-right">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 leading-none">Order Header</h3>
              <div className="flex items-center gap-3">
                <h2 className="text-4xl font-[1000] text-slate-900 tracking-tighter leading-none">#{order.id.slice(0, 5)}</h2>
                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${orderStatus.bg} ${orderStatus.border} ${orderStatus.color}`}>
                  {orderStatus.label}
                </div>
              </div>
              <p className="text-slate-400 font-bold text-xs mt-3 uppercase tracking-tight">
                {new Date(order.created_at).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' })} • {new Date(order.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            <div className="space-y-8 flex-1">
              {/* Customer Card */}
              <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-1.5 h-full bg-primary-500" />
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-4">Customer info</span>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                    <User size={24} />
                  </div>
                  <div className="flex flex-col">
                    <h4 className="text-xl font-black text-slate-800 tracking-tight leading-none">{order.customer_name}</h4>
                    <span className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-tight">Personal Customer</span>
                  </div>
                </div>
                {order.agent_name && (
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-50">
                    <div className="w-6 h-6 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
                      <Settings size={12} />
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">דרך סוכן:</span>
                    <span className="text-xs font-black text-primary-600">{order.agent_name}</span>
                  </div>
                )}
              </div>

              {/* Status Actions */}
              <div className="space-y-3">
                 <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-1 pr-2">Update status</span>
                 <div className="grid grid-cols-2 gap-2">
                   {Object.entries(statusMap).map(([key, status]) => (
                     <button 
                       key={key}
                       onClick={() => {
                         handleUpdateOrderStatus(order.id, key);
                         if (key !== 'Canceled') {
                            setSelectedOrder(prev => prev ? ({ ...prev, status: key }) : null);
                         }
                       }}
                       className={`flex items-center gap-2 p-3 rounded-2xl border transition-all text-right ${
                         order.status === key 
                           ? `${status.bg} ${status.border} ${status.color} shadow-sm ring-2 ring-white` 
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
              className="mt-8 w-full py-5 bg-white text-slate-400 hover:text-slate-900 border border-slate-200 rounded-3xl font-black text-sm uppercase tracking-[0.2em] transition-all hover:bg-slate-50"
            >
              Close Details
            </button>
          </div>

          {/* Left Area: Items & Notes */}
          <div className="flex-1 p-8 md:p-12 overflow-y-auto bg-white">
             {/* Header with Edit Toggle */}
             <div className="flex items-center justify-between mb-10">
               <div>
                  <h3 className="text-3xl font-[1000] text-slate-900 tracking-tighter leading-none mb-2">פירוט הזמנה</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">Items in this shipment</span>
                  </div>
               </div>

               <div className="flex items-center gap-3">
                  {isEditingOrder ? (
                    <button 
                      onClick={handleSaveOrderEdits}
                      disabled={isUpdatingOrder}
                      className="flex items-center gap-3 px-6 py-3.5 bg-primary-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-primary-200 hover:bg-primary-700 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isUpdatingOrder ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Save size={18} />
                      )}
                      <span>שמירת שינויים</span>
                    </button>
                  ) : (
                    <button 
                      onClick={() => setIsEditingOrder(true)}
                      className="flex items-center gap-3 px-6 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95"
                    >
                      <Edit size={18} />
                      <span>עריכת הזמנה</span>
                    </button>
                  )}
               </div>
             </div>

             {/* Items Area */}
             <div className="space-y-4 mb-12">
                {isEditingOrder && (
                  <div className="relative mb-8">
                     <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                     <input 
                      type="text" 
                      placeholder="חפש מוצר להוספה להזמנה..."
                      className="w-full h-16 bg-slate-50 border border-slate-100 rounded-3xl pr-14 pl-6 font-bold text-sm outline-none focus:bg-white focus:ring-4 focus:ring-primary-500/5 focus:border-primary-200 transition-all shadow-inner"
                      value={editingOrderSearch}
                      onChange={(e) => setEditingOrderSearch(e.target.value)}
                     />

                     {/* Search Results Dropdown */}
                     <AnimatePresence>
                       {filteredProductsForEditing.length > 0 && (
                         <motion.div 
                           initial={{ opacity: 0, y: 10 }}
                           animate={{ opacity: 1, y: 0 }}
                           exit={{ opacity: 0, y: 10 }}
                           className="absolute top-full left-0 right-0 mt-3 bg-white rounded-[32px] shadow-2xl border border-slate-100 p-3 z-30 overflow-hidden"
                         >
                           {filteredProductsForEditing.map(p => (
                             <button
                               key={p.id}
                               onClick={() => handleAddItemToOrder(p)}
                               className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 rounded-2xl transition-all group/item text-right"
                             >
                                <div className="w-12 h-12 bg-slate-100 rounded-xl overflow-hidden shadow-inner border border-slate-50">
                                   <img src={p.image} alt="" className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1">
                                   <h5 className="font-black text-slate-800 text-sm tracking-tight">{p.name}</h5>
                                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SKU: {p.sku} • ₪{p.price}</span>
                                </div>
                                <div className="p-2 bg-slate-50 text-slate-300 group-hover/item:text-primary-500 group-hover/item:bg-primary-50 rounded-lg transition-all">
                                   <Plus size={18} />
                                </div>
                             </button>
                           ))}
                         </motion.div>
                       )}
                     </AnimatePresence>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4">
                  {tempOrderItems.map((item, idx) => (
                    <motion.div 
                      layout
                      key={item.sku || idx}
                      className="flex items-center gap-6 p-6 md:p-8 bg-slate-50 border border-slate-100 rounded-[32px] group hover:bg-white hover:border-slate-200 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500 overflow-hidden"
                    >
                      <div className="w-24 h-24 bg-white rounded-2xl overflow-hidden shadow-inner border border-slate-100 shrink-0 group-hover:scale-105 transition-transform duration-500">
                        <img src={item.image} alt="" className="w-full h-full object-cover" />
                      </div>
                      
                      <div className="flex-1 min-w-0 pr-4">
                         <div className="flex flex-col mb-1">
                           <span className="text-[10px] font-black text-primary-500 uppercase tracking-widest leading-none mb-1">Product Details</span>
                           <h4 className="text-xl font-black text-slate-800 tracking-tighter truncate leading-none">{item.name}</h4>
                         </div>
                         <div className="flex items-center gap-3">
                           <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">SKU: {item.sku}</span>
                           <span className="w-1 h-1 rounded-full bg-slate-200" />
                           <span className="text-xs font-black text-slate-900 tracking-tight">₪{parseFloat(item.price || 0).toFixed(2)} ליחידה</span>
                         </div>
                      </div>

                      <div className="flex items-center bg-white border border-slate-100 p-2 rounded-2xl shadow-sm gap-2">
                        {isEditingOrder && (
                          <button 
                            onClick={() => handleUpdateItemQuantity(item.sku, -1)}
                            className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          >
                            <Minus size={18} />
                          </button>
                        )}
                        <div className="px-5 flex flex-col items-center justify-center">
                          <span className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none -mb-0.5 opacity-40">Qty</span>
                          <span className="text-2xl font-[1000] text-slate-900 tracking-tighter tabular-nums leading-none">{item.quantity}</span>
                        </div>
                        {isEditingOrder && (
                          <button 
                            onClick={() => handleUpdateItemQuantity(item.sku, 1)}
                            className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all"
                          >
                            <Plus size={18} />
                          </button>
                        )}
                      </div>

                      <div className="w-40 text-left border-r border-slate-100 pr-6 hidden md:block">
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-1">Subtotal</span>
                        <span className="text-xl font-black text-slate-900 tracking-tighter tabular-nums">₪{(parseFloat(item.price || 0) * (parseInt(item.quantity) || 0)).toFixed(2)}</span>
                      </div>

                      {isEditingOrder && (
                        <button 
                          onClick={() => handleRemoveItemFromOrder(item.sku)}
                          className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                        >
                          <Trash2 size={20} />
                        </button>
                      )}
                    </motion.div>
                  ))}
                </div>
             </div>

             {/* Footer summary & Notes */}
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-12 bg-slate-50/50 p-10 md:p-14 rounded-[48px] border-t-2 border-white shadow-inner">
                {/* 📝 Notes Section */}
                <div className="space-y-6">
                   <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm">
                            <Clock size={20} />
                         </div>
                         <h4 className="text-2xl font-black text-slate-800 tracking-tighter">הערות לוגיסטיקה</h4>
                      </div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-white/50 px-3 py-1 rounded-full border border-white/50">Timeline</span>
                   </div>

                   <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                     {(!order.notes || order.notes.length === 0) && (
                       <div className="text-center py-10 bg-white/40 border-2 border-dashed border-white/50 rounded-3xl">
                          <p className="text-slate-400 font-bold text-sm">אין הערות זמינות להזמנה זו</p>
                       </div>
                     )}
                     {(order.notes || []).map((note, idx) => (
                       <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={idx} 
                        className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative group/note"
                       >
                         <div className="flex items-center justify-between mb-2">
                           <span className="text-xs font-black text-primary-600 tracking-tight">{note.author}</span>
                           <span className="text-[10px] font-bold text-slate-300">
                             {new Date(note.timestamp).toLocaleDateString()} • {new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                           </span>
                         </div>
                         <p className="text-slate-600 text-sm font-bold leading-relaxed">{note.text}</p>
                         
                         {/* Delete note button */}
                         <button 
                           onClick={() => setConfirmingNoteDelete(idx)}
                           className="absolute top-2 left-2 p-1.5 text-slate-200 hover:text-red-500 opacity-0 group-hover/note:opacity-100 transition-all"
                         >
                           <Trash2 size={14} />
                         </button>

                         {confirmingNoteDelete === idx && (
                           <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-3xl flex items-center justify-center gap-4 animate-in fade-in">
                              <span className="text-xs font-black text-red-500">למחוק הערה?</span>
                              <button onClick={() => handleDeleteNote(idx)} className="bg-red-500 text-white px-3 py-1.5 rounded-xl text-xs font-black">מחק</button>
                              <button onClick={() => setConfirmingNoteDelete(null)} className="bg-slate-100 text-slate-500 px-3 py-1.5 rounded-xl text-xs font-black">ביטול</button>
                           </div>
                         )}
                       </motion.div>
                     ))}
                   </div>

                   <div className="space-y-3 bg-white p-6 rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/20">
                      <div className="grid grid-cols-2 gap-3 mb-2">
                        <div className="flex flex-col gap-1.5">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">Your Name</label>
                           <input 
                            type="text" 
                            placeholder="Admin User..."
                            className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2 text-sm font-bold outline-none focus:bg-white transition-all shadow-inner"
                            value={adminName}
                            onChange={(e) => setAdminName(e.target.value)}
                           />
                        </div>
                        <div className="flex flex-col gap-1.5 opacity-50 grayscale pointer-events-none">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">Event Type</label>
                           <div className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2 text-xs font-bold">Manual Note</div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">Note Content</label>
                         <textarea 
                          rows="3"
                          placeholder="Type your logistical note here..."
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:bg-white transition-all shadow-inner"
                          value={newNoteText}
                          onChange={(e) => setNewNoteText(e.target.value)}
                         />
                      </div>
                      <button 
                        onClick={handleAddNote}
                        disabled={isSubmittingNote || !newNoteText.trim() || !adminName.trim()}
                        className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-30 disabled:grayscale mb-2"
                      >
                        {isSubmittingNote ? 'Saving Note...' : 'Add Logistics Entry'}
                      </button>
                   </div>
                </div>

                {/* 🏷️ Pricing Summary Section */}
                <div className="flex flex-col justify-end gap-6 text-left">
                   <div className="space-y-4 pr-10">
                      <div className="flex items-center justify-between">
                         <span className="text-sm font-black text-slate-400 uppercase tracking-widest">Subtotal</span>
                         <span className="text-2xl font-black text-slate-900 tracking-tighter tabular-nums">₪{subtotal.toFixed(2)}</span>
                      </div>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-slate-200/50">
                         <span className="text-sm font-black text-slate-400 uppercase tracking-widest">Discount</span>
                         <div className="flex items-center gap-3">
                           {isEditingOrder ? (
                             <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-xl px-4 py-1.5 shadow-sm">
                                <input 
                                  type="number" 
                                  className="w-16 bg-transparent font-black text-primary-600 text-right outline-none no-arrows"
                                  value={tempOrderDiscount}
                                  onChange={(e) => setTempOrderDiscount(e.target.value)}
                                />
                                <span className="text-sm font-black text-primary-600">%</span>
                             </div>
                           ) : (
                             <span className="text-xl font-black text-primary-600 tabular-nums">-{parseFloat(tempOrderDiscount || 0)}%</span>
                           )}
                           <span className="text-xs font-bold text-primary-400 bg-primary-50 px-2 py-0.5 rounded-lg border border-primary-100">₪{discountAmount.toFixed(2)}</span>
                         </div>
                      </div>

                      <div className="flex items-center justify-between pt-8 mt-4 border-t-2 border-slate-900/5">
                         <div className="flex flex-col">
                            <span className="text-xs font-black text-primary-500 uppercase tracking-[0.3em] leading-none mb-1 pr-6">Total Amount</span>
                            <span className="text-sm font-bold text-slate-300 uppercase tracking-tight pr-6">Price including discounts</span>
                         </div>
                         <div className="flex flex-col items-end">
                            <span className="text-6xl md:text-7xl font-[1000] text-slate-900 tracking-tighter tabular-nums leading-none">
                              ₪{total.toFixed(2)}
                            </span>
                         </div>
                      </div>
                   </div>
                   
                   {isEditingOrder && (
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed text-right md:text-left pr-10 opacity-60">
                        Notice: Changes made here will be saved to the central database but won't automatically update the customer's WhatsApp message.
                     </p>
                   )}
                </div>
             </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;
