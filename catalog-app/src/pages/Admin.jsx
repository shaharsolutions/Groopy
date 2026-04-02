import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Package, 
  Plus, 
  Trash2, 
  Edit, 
  Save, 
  X, 
  Share2, 
  Link as ChainLink, 
  ChevronRight, 
  Lock,
  Search,
  Phone,
  User,
  Check,
  Image,
  Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('products');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [agents, setAgents] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingAgent, setEditingAgent] = useState(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isAddingAgent, setIsAddingAgent] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(null);
  const [confirmingProductDelete, setConfirmingProductDelete] = useState(null);
  const [confirmingAgentDelete, setConfirmingAgentDelete] = useState(null);

  // New states for form inputs
  const [newAgent, setNewAgent] = useState({ name: '', phone: '', image: '' });
  const [newProduct, setNewProduct] = useState({ id: '', name: '', sku: '', price: '', category: 'Bottles', location: '', description: '', image: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // 1. Fetch Products
    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select('*')
      .order('name');
    
    if (productsData) setProducts(productsData);
    if (productsError) console.error('Error fetching products:', productsError);

    // 2. Fetch Agents
    const { data: agentsData, error: agentsError } = await supabase
      .from('agents')
      .select('*')
      .order('name');
    
    if (agentsData) setAgents(agentsData);
    if (agentsError) console.error('Error fetching agents:', agentsError);
  }

  // Product Actions
  const handleAddProduct = async () => {
    const finalProduct = { 
      id: newProduct.sku || Date.now().toString(), 
      ...newProduct, 
      price: parseFloat(newProduct.price) 
    };

    const { error } = await supabase.from('products').insert([finalProduct]);
    if (!error) {
      setProducts([...products, finalProduct]);
      setIsAddingProduct(false);
      setNewProduct({ id: '', name: '', sku: '', price: '', category: 'Bottles', location: '', description: '', image: '' });
    } else {
      console.error('Error adding product:', error);
    }
  }

  const handleDeleteProduct = async (id) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (!error) {
      setProducts(products.filter(p => p.id !== id));
      setConfirmingProductDelete(null);
    } else {
      console.error('Error deleting product:', error);
    }
  }

  const handleUpdateProduct = async (updated) => {
    const { error } = await supabase.from('products').update(updated).eq('id', updated.id);
    if (!error) {
      setProducts(products.map(p => p.id === updated.id ? updated : p));
      setEditingProduct(null);
    } else {
      console.error('Error updating product:', error);
    }
  }

  // Agent Actions
  const handleAddAgent = async () => {
    const agent = { id: Date.now().toString(), ...newAgent };
    const { error } = await supabase.from('agents').insert([agent]);
    if (!error) {
      setAgents([...agents, agent]);
      setIsAddingAgent(false);
      setNewAgent({ name: '', phone: '', image: '' });
    } else {
      console.error('Error adding agent:', error);
    }
  }

  const handleDeleteAgent = async (id) => {
    const { error } = await supabase.from('agents').delete().eq('id', id);
    if (!error) {
      setAgents(agents.filter(a => a.id !== id));
      setConfirmingAgentDelete(null);
    } else {
      console.error('Error deleting agent:', error);
    }
  }

  const handleUpdateAgent = async (updated) => {
    const { error } = await supabase.from('agents').update(updated).eq('id', updated.id);
    if (!error) {
      setAgents(agents.map(a => a.id === updated.id ? updated : a));
      setEditingAgent(null);
    } else {
      console.error('Error updating agent:', error);
    }
  }

  const copyAgentLink = (id) => {
    const origin = window.location.origin;
    const base = import.meta.env.BASE_URL;
    // Ensure base starts and ends with / appropriately
    const fullBase = base.startsWith('/') ? base : `/${base}`;
    const link = `${origin}${fullBase}${fullBase.endsWith('/') ? '' : '/'}#/?agent=${id}`;
    navigator.clipboard.writeText(link);
    setCopyFeedback(id);
    setTimeout(() => setCopyFeedback(null), 2000);
  }

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row" dir="rtl">
      {/* 🏙️ SIDEBAR OVERLAY (MOBILE) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* 🏙️ SIDEBAR */}
      <aside className={`
        fixed inset-y-0 right-0 z-50 w-80 bg-white border-l border-slate-200 flex flex-col p-8 transition-transform duration-300 md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : 'translate-x-[100%] md:translate-x-0'}
      `}>
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm overflow-hidden p-1 border border-slate-100">
              <img src={`${import.meta.env.BASE_URL}logo.png?v=2`} alt="Groopy Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="font-black text-xl text-slate-800 tracking-tight">ניהול קטלוג</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">קטלוג מוצרים</p>
            </div>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 text-slate-400 hover:text-slate-900 md:hidden"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="space-y-3">
          <button 
            onClick={() => { setActiveTab('products'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${
              activeTab === 'products' 
              ? 'bg-primary-500 text-white shadow-lg shadow-primary-200' 
              : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-4">
              <Package size={20} />
              <span className="font-black text-sm">מוצרים במלאי</span>
            </div>
            <ChevronRight size={16} className={activeTab === 'products' ? '' : 'text-slate-300'} />
          </button>

          <button 
            onClick={() => { setActiveTab('agents'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${
              activeTab === 'agents' 
              ? 'bg-primary-500 text-white shadow-lg shadow-primary-200' 
              : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-4">
              <Users size={20} />
              <span className="font-black text-sm">ניהול סוכנים</span>
            </div>
            <ChevronRight size={16} className={activeTab === 'agents' ? '' : 'text-slate-300'} />
          </button>
        </nav>

        <div className="mt-auto pt-8 border-t border-slate-100">
           <Link 
            to="/"
            className="flex items-center gap-3 text-slate-400 hover:text-slate-900 font-bold text-xs transition-colors"
           >
             <ChevronRight /> חזרה לממשק הלקוח
           </Link>
        </div>
      </aside>

      {/* 📜 MAIN CONTENT AREA */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto w-full">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <div className="flex items-center justify-between gap-6 w-full md:w-auto">
            <div className="flex items-center md:hidden">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm text-slate-600"
              >
                <div className="space-y-1.5 w-6">
                  <div className="h-0.5 w-6 bg-current rounded-full" />
                  <div className="h-0.5 w-4 bg-current rounded-full" />
                  <div className="h-0.5 w-6 bg-current rounded-full" />
                </div>
              </button>
            </div>
            
            <div className="text-right md:text-right">
               <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter mb-2">
                 {activeTab === 'products' ? 'ניהול מוצרים' : 'רשת הסוכנים'}
               </h2>
               <p className="text-slate-400 font-bold text-sm whitespace-nowrap">
                 {activeTab === 'products' ? `סה״כ ${products.length} מוצרים רשומים` : `רשימת סוכנים וקישורי הפצה`}
               </p>
            </div>
          </div>

          <div className="flex gap-4">
            <Link 
              to="/"
              className="bg-white border border-slate-200 text-slate-600 px-6 py-4 rounded-2xl font-black text-sm flex items-center gap-3 hover:bg-slate-50 transition-all shadow-sm"
            >
              <Eye size={20} />
              <span className="whitespace-nowrap">חזרה לקטלוג</span>
            </Link>
            
            <button 
              onClick={() => activeTab === 'products' ? setIsAddingProduct(true) : setIsAddingAgent(true)}
              className="btn-primary w-fit flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              <span className="whitespace-nowrap">{activeTab === 'products' ? 'מוצר חדש' : 'סוכן חדש'}</span>
            </button>
          </div>
        </header>

        {/* 📋 PRODUCTS TAB */}
        {activeTab === 'products' && (
          <div className="space-y-6">
             <div className="relative mb-8 max-w-md">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="text" 
                  placeholder="חיפוש מהיר..."
                  className="w-full bg-white border border-slate-200 rounded-2xl pr-12 pl-6 py-3 font-bold text-sm outline-none focus:border-primary-400 transition-all shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>

             <div className="bg-white rounded-[32px] border border-slate-200 overflow-x-auto shadow-sm scrollbar-hide">
                <table className="w-full text-right border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-black text-[10px] uppercase tracking-widest">
                      <th className="px-8 py-5">תמונה/סוג</th>
                      <th className="px-8 py-5">שם המוצר</th>
                      <th className="px-8 py-5">מק״ט</th>
                      <th className="px-8 py-5">מחיר (₪)</th>
                      <th className="px-8 py-5">מיקום</th>
                      <th className="px-8 py-5">פעולות</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.map(p => (
                      <tr key={p.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-5">
                          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-300 overflow-hidden">
                             {p.image ? (
                               <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                             ) : (
                               p.category === 'Bottles' ? <Package size={20} /> : <Package size={20} />
                             )}
                          </div>
                        </td>
                        <td className="px-8 py-5 font-black text-slate-800 text-sm">{p.name}</td>
                        <td className="px-8 py-5 font-bold text-slate-400 text-xs">{p.sku}</td>
                        <td className="px-8 py-5 font-black text-slate-900">{p.price.toFixed(2)}</td>
                        <td className="px-8 py-5 whitespace-nowrap">
                          <span className="bg-slate-100 px-3 py-1 rounded-lg text-slate-500 text-[10px] font-black">{p.location || '-'}</span>
                        </td>
                         <td className="px-8 py-5">
                          <AnimatePresence mode="wait">
                            {confirmingProductDelete === p.id ? (
                              <motion.div 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex items-center gap-2 bg-red-50 p-2 rounded-xl"
                              >
                                <span className="text-[10px] font-black text-red-500 whitespace-nowrap">למחוק?</span>
                                <button onClick={() => handleDeleteProduct(p.id)} className="bg-red-500 text-white p-1.5 rounded-lg hover:bg-red-600 transition-colors"><Check size={14} /></button>
                                <button onClick={() => setConfirmingProductDelete(null)} className="bg-slate-200 text-slate-500 p-1.5 rounded-lg hover:bg-slate-300 transition-colors"><X size={14} /></button>
                              </motion.div>
                            ) : (
                              <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                              >
                                <button onClick={() => setEditingProduct(p)} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-white rounded-lg shadow-sm border border-transparent hover:border-slate-100 transition-all"><Edit size={18} /></button>
                                <button onClick={() => setConfirmingProductDelete(p.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg shadow-sm border border-transparent hover:border-slate-100 transition-all"><Trash2 size={18} /></button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>
        )}

        {/* 👥 AGENTS TAB */}
        {activeTab === 'agents' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {agents.map(agent => (
              <motion.div 
                layout
                key={agent.id}
                className="bg-white rounded-[40px] p-8 border border-slate-200 shadow-sm relative group overflow-hidden"
              >
                <div className="flex items-center gap-5 mb-8">
                  <div className="w-16 h-16 bg-gradient-to-tr from-slate-100 to-slate-200 rounded-3xl flex items-center justify-center text-slate-400 shadow-inner overflow-hidden">
                    {agent.image ? (
                      <img src={agent.image} alt={agent.name} className="w-full h-full object-cover" />
                    ) : (
                      <User size={28} />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">{agent.name}</h3>
                    <p className="text-slate-400 font-bold text-xs">{agent.phone}</p>
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-slate-50">
                   <button 
                     onClick={() => copyAgentLink(agent.id)}
                     className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-primary-500 hover:text-white rounded-2xl transition-all group/link"
                   >
                     <div className="flex items-center gap-3">
                        {copyFeedback === agent.id ? <Check size={18} /> : <ChainLink size={18} />}
                        <span className="font-black text-xs">{copyFeedback === agent.id ? 'הועתק!' : 'העתק קישור לקטלוג'}</span>
                     </div>
                     <Share2 size={14} className="opacity-40 group-hover/link:opacity-100" />
                   </button>
                   
                    <div className="flex gap-4 pt-2">
                     {confirmingAgentDelete === agent.id ? (
                       <div className="w-full flex items-center justify-center gap-4 bg-red-50 py-3 rounded-xl border border-red-100">
                         <span className="font-black text-[10px] text-red-500 tracking-widest">מחיקה?</span>
                         <div className="flex gap-2">
                           <button onClick={() => handleDeleteAgent(agent.id)} className="bg-red-500 text-white px-3 py-1 rounded-lg text-[10px] font-black hover:bg-red-600 transition-colors">כן</button>
                           <button onClick={() => setConfirmingAgentDelete(null)} className="bg-slate-200 text-slate-500 px-3 py-1 rounded-lg text-[10px] font-black hover:bg-slate-300 transition-colors">בטל</button>
                         </div>
                       </div>
                     ) : (
                       <>
                         <button 
                           onClick={() => setEditingAgent(agent)}
                           className="flex-1 py-3 text-center text-slate-400 hover:text-primary-600 font-bold text-[10px] uppercase tracking-widest transition-colors bg-slate-50 hover:bg-white rounded-xl border border-transparent hover:border-slate-100"
                         >
                           עריכת סוכן
                         </button>
                         <button 
                          onClick={() => setConfirmingAgentDelete(agent.id)}
                          className="flex-1 py-3 text-center text-red-300 hover:text-red-500 font-bold text-[10px] uppercase tracking-widest transition-colors bg-slate-50 hover:bg-white rounded-xl border border-transparent hover:border-slate-100"
                         >
                           מחיקת סוכן
                         </button>
                       </>
                     )}
                    </div>
                </div>

                <div className="absolute top-4 left-4 flex gap-2">
                   <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                </div>
              </motion.div>
            ))}
            
            {agents.length === 0 && (
              <div className="col-span-full py-32 text-center border-2 border-dashed border-slate-200 rounded-[40px] opacity-30">
                <Users size={64} className="mx-auto mb-4" />
                <p className="font-black text-xl">אין סוכנים רשומים... עדיין</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 🗳️ ADD PRODUCT MODAL */}
      <AnimatePresence>
        {isAddingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-slate-900/40 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[40px] w-full max-w-2xl p-12 shadow-2xl relative"
            >
              <button 
                onClick={() => setIsAddingProduct(false)}
                className="absolute left-10 top-10 text-slate-300 hover:text-slate-900 transition-colors"
                >
                  <X size={32} />
                </button>
              
              <h2 className="text-3xl font-black mb-8 tracking-tighter">הוספת מוצר חדש</h2>
              
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">שם המוצר</label>
                  <input 
                    type="text" 
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">מק״ט</label>
                  <input 
                    type="text" 
                    value={newProduct.sku}
                    onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">מחיר (₪)</label>
                  <input 
                    type="number" 
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">קטגוריה</label>
                  <select 
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500"
                  >
                    <option value="Bottles">בקבוקים</option>
                    <option value="Lunch Boxes">קופסאות אוכל</option>
                  </select>
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">קישור לתמונה (URL)</label>
                  <input 
                    type="text" 
                    placeholder="https://example.com/image.jpg"
                    value={newProduct.image}
                    onChange={(e) => setNewProduct({...newProduct, image: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500" 
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">תיאור קצר</label>
                  <textarea 
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500 h-24" 
                  />
                </div>
              </div>

              <div className="mt-12">
                 <button onClick={handleAddProduct} className="btn-primary w-full py-5 text-lg">שמור מוצר במערכת</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 👤 ADD AGENT MODAL */}
      <AnimatePresence>
        {isAddingAgent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-slate-900/40 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[40px] w-full max-w-md p-12 shadow-2xl relative"
            >
              <button 
                onClick={() => setIsAddingAgent(false)}
                className="absolute left-10 top-10 text-slate-300 hover:text-slate-900 transition-colors"
                >
                  <X size={32} />
              </button>
              
              <h2 className="text-3xl font-black mb-8 tracking-tighter">הוספת סוכן</h2>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">
                    <User size={12} /> שם הסוכן
                  </label>
                  <input 
                    type="text" 
                    placeholder="לדוגמה: מוטי זיגדון"
                    value={newAgent.name}
                    onChange={(e) => setNewAgent({...newAgent, name: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">
                    <Phone size={12} /> טלפון WhatsApp
                  </label>
                  <input 
                    type="text" 
                    placeholder="05XXXXXXXX"
                    value={newAgent.phone}
                    onChange={(e) => setNewAgent({...newAgent, phone: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500" 
                  />
                  <p className="text-[10px] text-slate-400 pr-2">ניתן להזין מספר רגיל המתחיל ב-0, המערכת תבצע המרה אוטומטית</p>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">
                    <Image size={12} /> קישור לתמונה
                  </label>
                  <input 
                    type="text" 
                    placeholder="URL לתמונה של הסוכן"
                    value={newAgent.image}
                    onChange={(e) => setNewAgent({...newAgent, image: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500" 
                  />
                </div>
              </div>

              <div className="mt-12">
                 <button onClick={handleAddAgent} className="btn-primary w-full py-5">צור סוכן והנפק קישור</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ✏️ EDIT AGENT MODAL */}
      <AnimatePresence>
        {editingAgent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-slate-900/40 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[40px] w-full max-w-md p-12 shadow-2xl relative"
            >
              <button 
                onClick={() => setEditingAgent(null)}
                className="absolute left-10 top-10 text-slate-300 hover:text-slate-900 transition-colors"
                >
                  <X size={32} />
              </button>
              
              <h2 className="text-3xl font-black mb-8 tracking-tighter">עריכת סוכן</h2>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">
                    <User size={12} /> שם הסוכן
                  </label>
                  <input 
                    type="text" 
                    value={editingAgent.name}
                    onChange={(e) => setEditingAgent({...editingAgent, name: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">
                    <Phone size={12} /> טלפון WhatsApp
                  </label>
                  <input 
                    type="text" 
                    value={editingAgent.phone}
                    onChange={(e) => setEditingAgent({...editingAgent, phone: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">
                    <Image size={12} /> קישור לתמונה
                  </label>
                  <input 
                    type="text" 
                    value={editingAgent.image}
                    onChange={(e) => setEditingAgent({...editingAgent, image: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500" 
                  />
                </div>
              </div>

              <div className="mt-12 flex gap-4">
                 <button onClick={() => handleUpdateAgent(editingAgent)} className="btn-primary w-full py-5">שמור שינויים</button>
                 <button onClick={() => setEditingAgent(null)} className="w-full bg-slate-100 font-black text-slate-500 py-5 rounded-2xl hover:bg-slate-200 transition-colors">ביטול</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ✏️ EDIT PRODUCT MODAL */}
      <AnimatePresence>
        {editingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-slate-900/40 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[40px] w-full max-w-2xl p-12 shadow-2xl relative"
            >
              <button 
                onClick={() => setEditingProduct(null)}
                className="absolute left-10 top-10 text-slate-300 hover:text-slate-900 transition-colors"
                >
                  <X size={32} />
                </button>
              
              <h2 className="text-3xl font-black mb-8 tracking-tighter">עריכת מוצר: {editingProduct.sku}</h2>
              
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">שם המוצר</label>
                  <input 
                    type="text" 
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">מחיר (₪)</label>
                  <input 
                    type="number" 
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({...editingProduct, price: parseFloat(e.target.value)})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">מק״ט</label>
                  <input 
                    type="text" 
                    value={editingProduct.sku}
                    onChange={(e) => setEditingProduct({...editingProduct, sku: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500" 
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">קישור לתמונה</label>
                  <input 
                    type="text" 
                    value={editingProduct.image}
                    onChange={(e) => setEditingProduct({...editingProduct, image: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500" 
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">תיאור קצר</label>
                  <textarea 
                    value={editingProduct.description}
                    onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none border focus:border-primary-500 h-24" 
                  />
                </div>
              </div>

              <div className="mt-12 flex gap-4">
                 <button onClick={() => handleUpdateProduct(editingProduct)} className="btn-primary w-full py-5 text-lg">שמור שינויים</button>
                 <button onClick={() => setEditingProduct(null)} className="w-full bg-slate-100 font-black text-slate-500 py-5 rounded-2xl hover:bg-slate-200 transition-colors">ביטול</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Admin;
