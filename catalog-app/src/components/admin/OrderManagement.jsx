import React from 'react';
import { 
  X, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Zap, 
  Edit, 
  Trash2, 
  Eye, 
  Check, 
  ChevronDown,
  ShoppingBag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatPrice } from '../../utils/formatUtils';

export const statusMap = {
  'New': { label: 'חדש', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
  'Processing': { label: 'בעבודה', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
  'Completed': { label: 'הושלם', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  'Canceled': { label: 'בוטל', icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100' }
};

const OrderManagement = ({ 
    orders, 
    selectedOrderIds, 
    handleBulkDeleteOrders, 
    isBulkDeleting, 
    setSelectedOrderIds, 
    toggleAllOrders, 
    toggleOrderSelection, 
    activeStatusMenu, 
    setActiveStatusMenu, 
    handleUpdateOrderStatus, 
    setSelectedOrder, 
    setConfirmingOrderDelete, 
    confirmingOrderDelete, 
    handleDeleteOrder 
}) => {
  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
             {selectedOrderIds.length > 0 && (
               <motion.div 
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 className="flex items-center gap-3 bg-red-50 px-4 py-2 rounded-2xl border border-red-100"
               >
                 <span className="text-sm font-black text-red-600">נבחרו {selectedOrderIds.length} הזמנות</span>
                 <button 
                   onClick={handleBulkDeleteOrders}
                   disabled={isBulkDeleting}
                   className="bg-red-500 text-white px-4 py-1.5 rounded-xl text-xs font-black hover:bg-red-600 transition-colors disabled:opacity-50"
                 >
                   {isBulkDeleting ? 'מוחק...' : 'מחק פריטים שנבחרו'}
                 </button>
                 <button 
                  onClick={() => setSelectedOrderIds([])}
                  className="text-slate-400 hover:text-slate-600"
                 >
                   <X size={14} />
                 </button>
               </motion.div>
             )}
          </div>
       </div>

       <div className="bg-white rounded-[32px] border border-slate-200 overflow-x-auto shadow-sm scrollbar-hide">
          <table className="w-full text-right border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-black text-[10px] uppercase tracking-widest">
                <th className="px-8 py-5 w-12 text-center">
                  <input 
                    type="checkbox" 
                    checked={orders.length > 0 && selectedOrderIds.length === orders.length}
                    onChange={toggleAllOrders}
                    className="w-4 h-4 rounded-md border-slate-300 text-primary-500 focus:ring-primary-500"
                  />
                </th>
                <th className="px-8 py-5">תאריך והזמנה</th>
                <th className="px-8 py-5">שם הלקוח</th>
                <th className="px-8 py-5">סוכן</th>
                <th className="px-8 py-5">סה״כ לתשלום</th>
                <th className="px-8 py-5">סטטוס</th>
                <th className="px-8 py-5">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((order, idx) => {
                const status = statusMap[order.status] || statusMap['New'];
                return (
                  <tr 
                    key={order.id || `order-${idx}`} 
                    className={`group transition-all duration-300 ${selectedOrderIds.includes(order.id) ? 'bg-primary-50/30' : 'hover:bg-slate-50/50'} ${activeStatusMenu.id === order.id ? 'relative z-[30]' : ''}`}
                  >
                    <td className="px-8 py-6 text-center">
                      <input 
                        type="checkbox" 
                        checked={selectedOrderIds.includes(order.id)}
                        onChange={() => toggleOrderSelection(order.id)}
                        className="w-4 h-4 rounded-md border-slate-300 text-primary-500 focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-800">#{order.sequentialId}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                          {new Date(order.created_at).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' })} • {new Date(order.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6 font-black text-slate-800 text-base">{order.customer_name}</td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        {order.agent_name ? (
                          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
                            {order.agent_name}
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-slate-300 italic">ישיר</span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6 font-black text-slate-900 text-lg">
                      ₪{formatPrice(order.total_price || 0)}
                    </td>
                    <td className="px-8 py-6">
                      <div className="relative">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (activeStatusMenu.id === order.id) {
                              setActiveStatusMenu({ id: null, rect: null });
                            } else {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setActiveStatusMenu({ id: order.id, rect });
                            }
                          }}
                          className={`flex items-center gap-3 px-4 py-2 border rounded-2xl transition-all shadow-sm group/status ${status.bg} ${status.border}`}
                        >
                          <status.icon size={16} className={status.color} />
                          <span className={`text-[10px] font-black uppercase tracking-widest ${status.color}`}>
                            {status.label}
                          </span>
                          <ChevronDown size={14} className={`${status.color} opacity-40 group-hover/status:opacity-100 transition-opacity ${activeStatusMenu.id === order.id ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setSelectedOrder(order)}
                          className="p-3 bg-slate-50 text-slate-400 hover:text-primary-600 rounded-2xl shadow-sm border border-transparent hover:border-slate-100 transition-all group/btn"
                        >
                          <Eye size={20} className="group-hover/btn:scale-110 transition-transform" />
                        </button>
                        
                        {confirmingOrderDelete === order.id ? (
                          <div className="flex items-center gap-2 bg-red-50 p-1.5 rounded-xl border border-red-100 animate-in fade-in slide-in-from-right-2">
                             <span className="text-[10px] font-black text-red-500 px-2 uppercase">מחק?</span>
                             <button onClick={() => handleDeleteOrder(order.id)} className="bg-red-500 text-white p-1.5 rounded-lg"><Check size={14} /></button>
                             <button onClick={() => setConfirmingOrderDelete(null)} className="bg-slate-200 text-slate-500 p-1.5 rounded-lg"><X size={14} /></button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setConfirmingOrderDelete(order.id)}
                            className="p-3 bg-slate-50 text-slate-400 hover:text-red-500 rounded-2xl shadow-sm border border-transparent hover:border-slate-100 transition-all group/btn"
                          >
                            <Trash2 size={20} className="group-hover/btn:scale-110 transition-transform" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {orders.length === 0 && (
            <div className="py-40 text-center flex flex-col items-center gap-6 opacity-30 grayscale">
              <ShoppingBag size={80} className="text-slate-900" />
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter">המערכת מחכה להזמנות...</h3>
                <p className="font-bold text-slate-500 text-lg uppercase tracking-widest scale-90">לא נמצאו הזמנות</p>
              </div>
            </div>
          )}
       </div>
    </div>
  );
};

export default OrderManagement;
