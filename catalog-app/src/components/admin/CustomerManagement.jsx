import React from 'react';
import { 
  Users, 
  Mail, 
  MapPin, 
  Phone, 
  ShoppingBag, 
  Clock, 
  ChevronRight, 
  Download, 
  Upload, 
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { motion } from 'framer-motion';

const CustomerManagement = ({ 
  customers, 
  searchTerm, 
  setSearchTerm, 
  handleDownloadTemplate, 
  handleImportExcel,
  setEditingCustomer,
  confirmingCustomerDelete,
  setConfirmingCustomerDelete,
  handleDeleteCustomer,
  setSelectedCustomerDetails,
  sortConfig,
  requestSort
}) => {
  const filteredCustomers = customers.filter(c => 
    c.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.contact_name && c.contact_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const SortHeader = ({ label, columnKey, centered = false }) => {
    const isActive = sortConfig?.key === columnKey;
    return (
      <th className={`px-8 py-5 ${centered ? 'text-center' : 'text-right'}`}>
        <button 
          onClick={() => requestSort(columnKey)}
          className={`group inline-flex items-center gap-1 hover:text-primary-600 transition-colors ${isActive ? 'text-primary-600' : 'text-slate-400'}`}
        >
          <span className="font-black text-[10px] uppercase tracking-widest">{label}</span>
          <div className={`transition-all duration-200 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 group-hover:opacity-50'}`}>
            {isActive && sortConfig.direction === 'desc' ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
          </div>
        </button>
      </th>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="חיפוש לקוח..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-12 pl-4 py-3 bg-white border border-slate-200 rounded-2xl w-full md:w-80 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-black hover:bg-slate-200 transition-colors"
          >
            <Download size={16} />
            <span>הורד תבנית</span>
          </button>
          
          <label className="flex items-center gap-2 px-4 py-2.5 bg-primary-50 text-primary-600 rounded-xl text-sm font-black hover:bg-primary-100 transition-colors cursor-pointer">
            <Upload size={16} />
            <span>ייבוא לקוחות</span>
            <input 
              type="file" 
              accept=".xlsx,.xls" 
              className="hidden" 
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) handleImportExcel(file);
              }}
            />
          </label>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-200 overflow-x-auto shadow-sm scrollbar-hide">
        <table className="w-full text-right border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-black text-[10px] uppercase tracking-widest">
              <SortHeader label="שם העסק / לקוח" columnKey="business_name" />
              <SortHeader label="איש קשר" columnKey="contact_name" />
              <th className="px-8 py-5">פרטי התקשרות</th>
              <SortHeader label="הזמנות" columnKey="orderCount" centered />
              <SortHeader label="הזמנה אחרונה" columnKey="lastOrderDate" />
              <th className="px-8 py-5">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredCustomers.map((customer) => (
              <tr 
                key={customer.id} 
                className="group hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => setSelectedCustomerDetails(customer)}
              >
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600 font-black text-lg">
                      {customer.business_name?.charAt(0)}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-slate-800">{customer.business_name}</span>
                        {String(customer.id).startsWith('virtual-') ? (
                          <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100 uppercase tracking-tighter">הזמנות</span>
                        ) : (
                          <span className="text-[9px] font-black text-primary-600 bg-primary-50 px-2 py-0.5 rounded-lg border border-primary-100 uppercase tracking-tighter">CRM</span>
                        )}
                      </div>
                      {customer.address && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 font-bold">
                          <MapPin size={10} />
                          <span>{customer.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className="text-sm font-bold text-slate-600">{customer.contact_name || '---'}</span>
                </td>
                <td className="px-8 py-6">
                  <div className="flex flex-col gap-1">
                    {customer.email && (
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
                        <Mail size={12} className="text-slate-300" />
                        <span>{customer.email}</span>
                      </div>
                    )}
                    {customer.phone && (
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
                        <Phone size={12} className="text-slate-300" />
                        <span>{customer.phone}</span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-8 py-6 text-center">
                  <div className="inline-flex flex-col items-center justify-center bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                    <span className="text-lg font-black text-slate-800 leading-none">{customer.orderCount || 0}</span>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">הזמנות</span>
                  </div>
                </td>
                <td className="px-8 py-6">
                  {customer.lastOrderDate ? (
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg w-fit mb-1">
                        {new Date(customer.lastOrderDate).toLocaleDateString('he-IL')}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {new Date(customer.lastOrderDate).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-slate-300 italic text-right">אין הזמנות</span>
                  )}
                </td>
                <td className="px-8 py-6" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setEditingCustomer(customer)}
                      className="p-3 bg-slate-50 text-slate-400 hover:text-primary-600 rounded-2xl shadow-sm border border-transparent hover:border-slate-100 transition-all"
                    >
                      <Edit size={18} />
                    </button>
                    
                    {confirmingCustomerDelete === customer.id ? (
                      <div className="flex items-center gap-2 bg-red-50 p-1.5 rounded-xl border border-red-100">
                        <button 
                          onClick={() => handleDeleteCustomer(customer.id)}
                          className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-black"
                        >
                          מחק
                        </button>
                        <button 
                          onClick={() => setConfirmingCustomerDelete(null)}
                          className="text-slate-400 px-2 text-[10px] font-black"
                        >
                          בטל
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setConfirmingCustomerDelete(customer.id)}
                        className={`p-3 rounded-2xl shadow-sm border border-transparent transition-all ${
                          String(customer.id).startsWith('virtual-') 
                            ? 'bg-slate-50 text-slate-300 cursor-help hover:bg-slate-100' 
                            : 'bg-slate-50 text-slate-400 hover:text-red-500 hover:border-slate-100'
                        }`}
                        title={String(customer.id).startsWith('virtual-') ? 'לא ניתן למחוק לקוח מהזמנות' : 'מחיקת לקוח'}
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredCustomers.length === 0 && (
          <div className="py-20 text-center flex flex-col items-center gap-4 opacity-30 grayscale">
            <Users size={60} className="text-slate-900" />
            <h3 className="text-xl font-black text-slate-900 tracking-tighter">לא נמצאו לקוחות...</h3>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerManagement;
