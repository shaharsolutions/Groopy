import React, { useState } from 'react';
import { 
  X, 
  Save, 
  Loader2, 
  Plus, 
  Trash2, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  ClipboardList, 
  ShoppingBag,
  ExternalLink,
  PlusCircle,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CustomerFormModal = ({ 
  isOpen, 
  onClose, 
  customer, 
  setCustomer, 
  onSave, 
  isUpdating, 
  title, 
  orders = [], // All orders to filter for this customer
  onOpenOrder, // Function to open an order details modal
  onAddNote,
  onDeleteNote,
  isSubmittingNote,
  error
}) => {
  const [activeTab, setActiveTab] = useState('details');
  const [newNote, setNewNote] = useState('');
  const [adminName, setAdminName] = useState(localStorage.getItem('groopy_admin_name') || '');

  if (!isOpen) return null;

  const customerOrders = orders.filter(o => 
    o.customer_name === customer.business_name || (customer.email && o.customer_email === customer.email)
  ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const handleAddContact = () => {
    const contacts = [...(customer.additional_contacts || []), { name: '', role: '', phone: '' }];
    setCustomer({ ...customer, additional_contacts: contacts });
  };

  const handleUpdateContact = (index, field, value) => {
    const contacts = [...customer.additional_contacts];
    contacts[index][field] = value;
    setCustomer({ ...customer, additional_contacts: contacts });
  };

  const handleRemoveContact = (index) => {
    const contacts = customer.additional_contacts.filter((_, i) => i !== index);
    setCustomer({ ...customer, additional_contacts: contacts });
  };

  const submitNote = () => {
    if (!newNote.trim()) return;
    onAddNote(newNote, adminName);
    setNewNote('');
    localStorage.setItem('groopy_admin_name', adminName);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative bg-white w-full max-w-4xl h-[800px] max-h-[90vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-8 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary-500 text-white flex items-center justify-center">
              <User size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">{title}</h2>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">ניהול פרטי לקוח</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1.5 md:gap-2 px-4 md:px-8 py-3 md:py-4 bg-slate-50/50 border-b border-slate-100 overflow-x-auto no-scrollbar">
          {[
            { id: 'details', label: 'פרטי לקוח', icon: User },
            { id: 'notes', label: 'הערות', icon: ClipboardList },
            { id: 'orders', label: 'היסטוריית הזמנות', icon: ShoppingBag }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 flex items-center gap-2 px-4 md:px-6 py-2 md:py-2.5 rounded-xl text-[12px] md:text-sm font-black transition-all whitespace-nowrap ${
                activeTab === tab.id 
                ? 'bg-white text-primary-600 shadow-sm border border-slate-200' 
                : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <tab.icon size={16} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3 text-red-600">
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                  </div>
                  <span className="text-sm font-black">{error}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {activeTab === 'details' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">שם העסק / לקוח (חובה)</label>
                  <input 
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-black text-slate-800 focus:ring-2 focus:ring-primary-500/20 transition-all"
                    placeholder="שם העסק..."
                    value={customer.business_name || ''} 
                    onChange={e => setCustomer({ ...customer, business_name: e.target.value })} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">שם איש קשר עיקרי</label>
                  <input 
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-black text-slate-800 focus:ring-2 focus:ring-primary-500/20 transition-all"
                    placeholder="שם איש קשר..."
                    value={customer.contact_name || ''} 
                    onChange={e => setCustomer({ ...customer, contact_name: e.target.value })} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">אימייל</label>
                  <input 
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-black text-slate-800 focus:ring-2 focus:ring-primary-500/20 transition-all text-left"
                    placeholder="email@example.com"
                    value={customer.email || ''} 
                    onChange={e => setCustomer({ ...customer, email: e.target.value })} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">טלפון</label>
                  <input 
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-black text-slate-800 focus:ring-2 focus:ring-primary-500/20 transition-all text-left"
                    placeholder="050-0000000"
                    value={customer.phone || ''} 
                    onChange={e => setCustomer({ ...customer, phone: e.target.value })} 
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">כתובת</label>
                  <input 
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-black text-slate-800 focus:ring-2 focus:ring-primary-500/20 transition-all"
                    placeholder="רחוב, עיר..."
                    value={customer.address || ''} 
                    onChange={e => setCustomer({ ...customer, address: e.target.value })} 
                  />
                </div>
              </div>

              {/* Additional Contacts */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-800 tracking-tight">אנשי קשר נוספים</h3>
                  <button 
                    onClick={handleAddContact}
                    className="flex items-center gap-2 text-primary-600 hover:text-primary-700 font-bold text-xs transition-colors"
                  >
                    <PlusCircle size={14} />
                    <span>הוסף איש קשר</span>
                  </button>
                </div>
                
                <div className="space-y-3">
                  {(customer.additional_contacts || []).map((contact, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl relative group"
                    >
                      <input 
                        className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                        placeholder="שם..."
                        value={contact.name}
                        onChange={e => handleUpdateContact(idx, 'name', e.target.value)}
                      />
                      <input 
                        className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                        placeholder="תפקיד..."
                        value={contact.role}
                        onChange={e => handleUpdateContact(idx, 'role', e.target.value)}
                      />
                      <div className="flex items-center gap-2">
                        <input 
                          className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                          placeholder="טלפון..."
                          value={contact.phone}
                          onChange={e => handleUpdateContact(idx, 'phone', e.target.value)}
                        />
                        <button 
                          onClick={() => handleRemoveContact(idx)}
                          className="p-2 text-red-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                  {(customer.additional_contacts || []).length === 0 && (
                    <p className="text-center py-4 text-xs font-bold text-slate-400 italic">אין אנשי קשר נוספים</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="bg-slate-50 p-6 rounded-[32px] space-y-4">
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="flex-1 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">שם הכותב</label>
                    <input 
                      className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold text-slate-800 outline-none"
                      placeholder="שם המנהל..."
                      value={adminName}
                      onChange={e => setAdminName(e.target.value)}
                    />
                  </div>
                  <div className="flex-[3] space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">תוכן ההערה</label>
                    <textarea 
                      className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold text-slate-800 outline-none min-h-[100px] resize-none"
                      placeholder="כתוב הערה חדשה..."
                      value={newNote}
                      onChange={e => setNewNote(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button 
                    onClick={submitNote}
                    disabled={!newNote.trim() || isSubmittingNote}
                    className="flex items-center gap-2 bg-primary-500 text-white px-8 py-3 rounded-2xl text-sm font-black shadow-lg shadow-primary-200 hover:bg-primary-600 transition-all disabled:opacity-50"
                  >
                    {isSubmittingNote ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                    <span>הוסף הערה</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {(customer.notes || []).slice().reverse().map((note, idx) => (
                  <div key={idx} className="bg-white border border-slate-100 p-5 rounded-3xl group shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-primary-600 bg-primary-50 px-2 py-0.5 rounded-lg">{note.author}</span>
                          <span className="text-[10px] font-bold text-slate-400">
                             {new Date(note.timestamp).toLocaleDateString('he-IL')} • {new Date(note.timestamp).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-slate-700 leading-relaxed whitespace-pre-wrap">{note.text}</p>
                      </div>
                      <button 
                         onClick={() => onDeleteNote(customer.notes.length - 1 - idx)}
                         className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {(customer.notes || []).length === 0 && (
                  <div className="text-center py-20 opacity-20 flex flex-col items-center gap-4">
                    <ClipboardList size={48} />
                    <p className="text-sm font-black">אין עדיין הערות ללקוח זה</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
              {customerOrders.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customerOrders.map(order => (
                    <div 
                      key={order.id}
                      className="bg-white border border-slate-100 p-6 rounded-[32px] hover:shadow-md transition-shadow cursor-default group border-r-4 border-r-primary-500"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">הזמנה #{order.sequentialId}</span>
                          <span className="text-slate-800 font-black">₪{parseFloat(order.total_price || 0).toLocaleString()}</span>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          order.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' :
                          order.status === 'Canceled' ? 'bg-red-50 text-red-600' :
                          'bg-amber-50 text-amber-600'
                        }`}>
                          {order.status === 'New' ? 'חדש' : 
                           order.status === 'Processing' ? 'בטיפול' : 
                           order.status === 'Completed' ? 'הושלם' : 'בוטל'}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-50">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                          <Clock size={12} />
                          <span>{new Date(order.created_at).toLocaleDateString('he-IL')}</span>
                        </div>
                        <button 
                          onClick={() => onOpenOrder(order)}
                          className="flex items-center gap-2 text-primary-500 hover:text-primary-600 font-black text-xs transition-colors"
                        >
                          <span>פרטי הזמנה</span>
                          <ExternalLink size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 opacity-20 flex flex-col items-center gap-4">
                  <ShoppingBag size={48} />
                  <p className="text-sm font-black">עדיין לא בוצעו הזמנות</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-slate-100 flex items-center justify-end gap-4 bg-slate-50/50">
          <button onClick={onClose} className="px-8 py-4 rounded-2xl text-sm font-black text-slate-500 hover:bg-slate-100 transition-colors">
            ביטול
          </button>
          <button 
            onClick={onSave}
            disabled={isUpdating || !customer.business_name}
            className="flex items-center gap-3 bg-primary-500 text-white px-12 py-4 rounded-2xl text-sm font-black shadow-xl shadow-primary-200 hover:bg-primary-600 transition-all disabled:opacity-50"
          >
            {isUpdating ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            <span>שמור שינויים</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default CustomerFormModal;
