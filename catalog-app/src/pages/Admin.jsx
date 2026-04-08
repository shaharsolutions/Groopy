import React, { useState, useEffect, useMemo } from 'react';
import { useAdminData } from '../hooks/useAdminData';
import { supabase } from '../supabaseClient';
import logo from '../assets/byGroopy_strip.png';

// Components
import Sidebar from '../components/admin/Sidebar';
import Header from '../components/admin/Header';
import ProductManagement from '../components/admin/ProductManagement';
import AgentManagement from '../components/admin/AgentManagement';
import OrderManagement from '../components/admin/OrderManagement';
import CategoryManagement from '../components/admin/CategoryManagement';
import BrandManagement from '../components/admin/BrandManagement';
import BannerManagement from '../components/admin/BannerManagement';
import CustomerManagement from '../components/admin/CustomerManagement';
import { statusMap } from '../components/admin/OrderManagement';
import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';

// Modals
import ProductFormModal from '../components/admin/Modals/ProductFormModal';
import AgentFormModal from '../components/admin/Modals/AgentFormModal';
import CategoryFormModal from '../components/admin/Modals/CategoryFormModal';
import BrandFormModal from '../components/admin/Modals/BrandFormModal';
import BannerFormModal from '../components/admin/Modals/BannerFormModal';
import OrderDetailsModal from '../components/admin/Modals/OrderDetailsModal';
import OrderEditModal from '../components/admin/Modals/OrderEditModal';
import CustomerFormModal from '../components/admin/Modals/CustomerFormModal';

// Utilities
import { downloadCustomerTemplate, parseCustomerExcel } from '../utils/excelUtils';



const Admin = () => {
  const adminData = useAdminData();
  const { 
    activeTab, setActiveTab,
    isSidebarOpen, setIsSidebarOpen,
    products, setProducts,
    sortedProducts,
    agents, setAgents,
    orders, setOrders,
    categories, setCategories,
    brands, setBrands,
    banners, setBanners,
    searchTerm, setSearchTerm,
    selectedCategory, setSelectedCategory,
    sortConfig, setSortConfig,
    ordersStats,
    customers, setCustomers,
    customersWithStats,
    fetchData
  } = adminData;

  // --- Local UI State ---
  
  // Products
  const [editingProduct, setEditingProduct] = useState(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isUpdatingProduct, setIsUpdatingProduct] = useState(false);
  const [confirmingProductDelete, setConfirmingProductDelete] = useState(null);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [isBulkUpdatingProducts, setIsBulkUpdatingProducts] = useState(false);
  const [isBulkCategoryMenuOpen, setIsBulkCategoryMenuOpen] = useState(false);
  const [isBulkFlagsMenuOpen, setIsBulkFlagsMenuOpen] = useState(false);

  // Agents
  const [isAddingAgent, setIsAddingAgent] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [isUpdatingAgent, setIsUpdatingAgent] = useState(false);
  const [confirmingAgentDelete, setConfirmingAgentDelete] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState(null);

  // Categories
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);
  const [confirmingCategoryDelete, setConfirmingCategoryDelete] = useState(null);

  // Brands
  const [isAddingBrand, setIsAddingBrand] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [isUpdatingBrand, setIsUpdatingBrand] = useState(false);
  const [confirmingBrandDelete, setConfirmingBrandDelete] = useState(null);

  // Banners
  const [isAddingBanner, setIsAddingBanner] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [isUpdatingBanner, setIsUpdatingBanner] = useState(false);
  const [confirmingBannerDelete, setConfirmingBannerDelete] = useState(null);

  // Customers
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [isUpdatingCustomer, setIsUpdatingCustomer] = useState(false);
  const [customerError, setCustomerError] = useState(null);
  const [confirmingCustomerDelete, setConfirmingCustomerDelete] = useState(null);
  const [selectedCustomerDetails, setSelectedCustomerDetails] = useState(null);
  const [isSubmittingCustomerNote, setIsSubmittingCustomerNote] = useState(false);

  // Orders
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [activeStatusMenu, setActiveStatusMenu] = useState({ id: null, rect: null });
  const [confirmingOrderDelete, setConfirmingOrderDelete] = useState(null);

  // Templates for new items
  const [newProduct, setNewProduct] = useState({ name: '', sku: '', price: '', category: '', location: '', description: '', image: '', is_new: false, is_clearing: false, is_best_seller: false, is_hot_deal: false, default_quantity: 12 });
  const [newAgent, setNewAgent] = useState({ name: '', phone: '', image: '' });
  const [newCategory, setNewCategory] = useState({ name: '' });
  const [newBrand, setNewBrand] = useState({ name: '', logo: '', type: '', show_in_carousel: true });
  const [newBanner, setNewBanner] = useState({ 
    image: '', 
    title: '', 
    target_type: 'none', 
    target_value: '', 
    is_active: true, 
    order_index: 0,
    pos_x: 50,
    pos_y: 50,
    zoom: 1,
    object_fit: 'cover'
  });
  const [newCustomer, setNewCustomer] = useState({ 
    business_name: '', 
    contact_name: '', 
    email: '', 
    phone: '', 
    address: '', 
    additional_contacts: [],
    notes: []
  });

  // Order Details / Edit State
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);
  const [adminName, setAdminName] = useState(localStorage.getItem('groopy_admin_name') || '');
  const [newNoteText, setNewNoteText] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [confirmingNoteDelete, setConfirmingNoteDelete] = useState(null);


  useEffect(() => {
    if (selectedOrder) {
      setIsEditingOrder(false);
    }
  }, [selectedOrder]);


  // Helpers
  const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // --- CRUD Handlers ---

  // Products
  const handleAddProduct = async () => {
    setIsUpdatingProduct(true);
    try {
      const productToInsert = { 
        ...newProduct, 
        id: generateUUID(),
        price: parseFloat(newProduct.price) 
      };
      const { data, error } = await supabase.from('products').insert([productToInsert]).select();
      if (!error) { 
        setProducts([...products, data[0]]); 
        setIsAddingProduct(false); 
        setNewProduct({ name: '', sku: '', price: '', category: '', location: '', description: '', image: '', is_new: false, is_clearing: false, is_best_seller: false, is_hot_deal: false, default_quantity: 12 }); 
      } else {
        console.error('Error adding product:', error);
        alert('שגיאה בהוספת מוצר: ' + (error.message || 'שגיאה לא ידועה'));
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('שגיאה לא צפויה בהוספת מוצר');
    } finally { 
      setIsUpdatingProduct(false); 
    }
  };

  const handleUpdateProduct = async () => {
    setIsUpdatingProduct(true);
    try {
      const { error } = await supabase.from('products').update({ ...editingProduct, price: parseFloat(editingProduct.price) }).eq('id', editingProduct.id);
      if (!error) { setProducts(products.map(p => p.id === editingProduct.id ? editingProduct : p)); setEditingProduct(null); }
    } finally { setIsUpdatingProduct(false); }
  };

  const handleDeleteProduct = async (id) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (!error) { setProducts(products.filter(p => p.id !== id)); setConfirmingProductDelete(null); }
  };

  const toggleProductSelection = (id) => setSelectedProductIds(prev => prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]);
  const toggleAllProducts = () => setSelectedProductIds(selectedProductIds.length === sortedProducts.length ? [] : sortedProducts.map(p => p.id));
  
  const handleBulkUpdateProductCategory = async (catName) => {
    setIsBulkUpdatingProducts(true);
    const { error } = await supabase.from('products').update({ category: catName }).in('id', selectedProductIds);
    if (!error) { setProducts(products.map(p => selectedProductIds.includes(p.id) ? { ...p, category: catName } : p)); setSelectedProductIds([]); setIsBulkCategoryMenuOpen(false); }
    setIsBulkUpdatingProducts(false);
  };

  const handleBulkUpdateProductFlag = async (field, value) => {
    setIsBulkUpdatingProducts(true);
    const { error } = await supabase.from('products').update({ [field]: value }).in('id', selectedProductIds);
    if (!error) setProducts(products.map(p => selectedProductIds.includes(p.id) ? { ...p, [field]: value } : p));
    setIsBulkUpdatingProducts(false);
  };

  // Agents
  const handleAddAgent = async () => {
    setIsUpdatingAgent(true);
    const agentToSave = { ...newAgent, id: Date.now().toString() };
    const { data, error } = await supabase.from('agents').insert([agentToSave]).select();
    if (!error) { 
      setAgents([...agents, data[0]]); 
      setIsAddingAgent(false); 
      setNewAgent({ name: '', phone: '', image: '' }); 
    } else {
      console.error('Error adding agent:', error);
      alert('שגיאה בהוספת סוכן: ' + (error.message || 'שגיאה לא ידועה'));
    }
    setIsUpdatingAgent(false);
  };

  const handleUpdateAgent = async () => {
    setIsUpdatingAgent(true);
    const { error } = await supabase.from('agents').update(editingAgent).eq('id', editingAgent.id);
    if (!error) { 
      setAgents(agents.map(a => a.id === editingAgent.id ? editingAgent : a)); 
      setEditingAgent(null); 
    } else {
      console.error('Error updating agent:', error);
      alert('שגיאה בעדכון סוכן: ' + (error.message || 'שגיאה לא ידועה'));
    }
    setIsUpdatingAgent(false);
  };

  const handleDeleteAgent = async (id) => {
    const { error } = await supabase.from('agents').delete().eq('id', id);
    if (!error) { 
      setAgents(agents.filter(a => a.id !== id)); 
      setConfirmingAgentDelete(null); 
    } else {
      console.error('Error deleting agent:', error);
      alert('שגיאה במחיקת סוכן: ' + (error.message || 'שגיאה לא ידועה'));
    }
  };

  const handleCopyAgentLink = (agent) => {
    navigator.clipboard.writeText(`${window.location.origin}/#/?agent=${agent.id}`);
    setCopyFeedback(agent.id); setTimeout(() => setCopyFeedback(null), 2000);
  };

  const handleShareAgent = async (agent) => {
    if (navigator.share) await navigator.share({ title: `Groopy - ${agent.name}`, url: `${window.location.origin}/#/?agent=${agent.id}` });
  };

  // Categories
  const handleAddCategory = async () => {
    setIsUpdatingCategory(true);
    try {
      const categoryToInsert = { ...newCategory, id: generateUUID() };
      const { data, error } = await supabase.from('categories').insert([categoryToInsert]).select();
      if (!error) { 
        setCategories([...categories, data[0]]); 
        setIsAddingCategory(false); 
        setNewCategory({ name: '' }); 
      } else {
        console.error('Error adding category:', error);
        alert('שגיאה בהוספת קטגוריה: ' + (error.message || 'שגיאה לא ידועה'));
      }
    } catch (err) {
      console.error('Unexpected error adding category:', err);
      alert('שגיאה לא צפויה בהוספת קטגוריה');
    } finally {
      setIsUpdatingCategory(false);
    }
  };

  const handleUpdateCategory = async () => {
    setIsUpdatingCategory(true);
    const { error } = await supabase.from('categories').update(editingCategory).eq('id', editingCategory.id);
    if (!error) { setCategories(categories.map(c => c.id === editingCategory.id ? editingCategory : c)); setEditingCategory(null); }
    setIsUpdatingCategory(false);
  };

  const handleDeleteCategory = async (id) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (!error) { setCategories(categories.filter(c => c.id !== id)); setConfirmingCategoryDelete(null); }
  };

  // Brands
  const handleAddBrand = async () => {
    setIsUpdatingBrand(true);
    try {
      const brandToInsert = { ...newBrand, id: generateUUID() };
      const { data, error } = await supabase.from('brands').insert([brandToInsert]).select();
      if (!error) { 
        setBrands([...brands, data[0]]); 
        setIsAddingBrand(false); 
        setNewBrand({ name: '', logo: '', type: '', show_in_carousel: true }); 
      } else {
        console.error('Error adding brand:', error);
        alert('שגיאה בהוספת מותג: ' + (error.message || 'שגיאה לא ידועה'));
      }
    } catch (err) {
      console.error('Unexpected error adding brand:', err);
      alert('שגיאה לא צפויה בהוספת מותג');
    } finally {
      setIsUpdatingBrand(false);
    }
  };

  const handleUpdateBrand = async () => {
    setIsUpdatingBrand(true);
    const { error } = await supabase.from('brands').update(editingBrand).eq('id', editingBrand.id);
    if (!error) { setBrands(brands.map(b => b.id === editingBrand.id ? editingBrand : b)); setEditingBrand(null); }
    setIsUpdatingBrand(false);
  };

  const handleDeleteBrand = async (id) => {
    const { error } = await supabase.from('brands').delete().eq('id', id);
    if (!error) { setBrands(brands.filter(b => b.id !== id)); setConfirmingBrandDelete(null); }
  };

  // Banners
  const handleAddBanner = async () => {
    setIsUpdatingBanner(true);
    try {
      const bannerToInsert = { ...newBanner, id: generateUUID() };
      const { data, error } = await supabase.from('banners').insert([bannerToInsert]).select();
      if (!error) { 
        setBanners([...banners, data[0]]); 
        setIsAddingBanner(false); 
        setNewBanner({ image: '', title: '', target_type: 'none', target_value: '', is_active: true, order_index: 0 }); 
      } else {
        console.error('Error adding banner:', error);
        alert('שגיאה בהוספת באנר: ' + (error.message || 'שגיאה לא ידועה'));
      }
    } catch (err) {
      console.error('Unexpected error adding banner:', err);
      alert('שגיאה לא צפויה בהוספת באנר');
    } finally {
      setIsUpdatingBanner(false);
    }
  };

  const handleUpdateBanner = async () => {
    setIsUpdatingBanner(true);
    const { error } = await supabase.from('banners').update(editingBanner).eq('id', editingBanner.id);
    if (!error) { setBanners(banners.map(b => b.id === editingBanner.id ? editingBanner : b)); setEditingBanner(null); }
    setIsUpdatingBanner(false);
  };

  const handleDeleteBanner = async (id) => {
    const { error } = await supabase.from('banners').delete().eq('id', id);
    if (!error) { setBanners(banners.filter(b => b.id !== id)); setConfirmingBannerDelete(null); }
  };

  // Customers
  const formatCustomerError = (err) => {
    if (!err) return null;
    if (err.code === '23505') {
      if (err.message?.includes('business_name')) return 'שגיאה: שם העסק כבר קיים במערכת';
      if (err.message?.includes('email')) return 'שגיאה: כתובת האימייל כבר משויכת ללקוח אחר';
      return 'שגיאה: רשומה דומה כבר קיימת במערכת';
    }
    return err.message || 'שגיאה בשמירת הנתונים';
  };

  const handleAddCustomer = async (overrideCustomer = null) => {
    setCustomerError(null);
    setIsUpdatingCustomer(true);
    try {
      const { source, orderCount, lastOrderDate, ...customerData } = overrideCustomer || newCustomer;
      const { data, error } = await supabase.from('customers').upsert([{ 
        ...customerData, 
        id: customerData.id || generateUUID(),
        created_at: customerData.created_at || new Date().toISOString()
      }], { onConflict: 'business_name' }).select();
      
      if (!error) { 
        setCustomers([...customers, data[0]]); 
        setIsAddingCustomer(false); 
        setNewCustomer({ business_name: '', contact_name: '', email: '', phone: '', address: '', additional_contacts: [], notes: [] }); 
      } else {
        setCustomerError(formatCustomerError(error));
      }
    } catch (err) {
      console.error('Unexpected error adding customer:', err);
      alert('שגיאה לא צפויה בהוספת לקוח');
    } finally {
      setIsUpdatingCustomer(false);
    }
  };

  const handleUpdateCustomer = async () => {
    setCustomerError(null);
    setIsUpdatingCustomer(true);
    
    // Check if this is a "virtual" customer (no real DB record yet)
    if (editingCustomer.id && String(editingCustomer.id).startsWith('virtual-')) {
      const { id, source, orderCount, lastOrderDate, ...customerData } = editingCustomer;
      
      // 📧 Robust Collision Check (Case-insensitive & trimmed)
      const normEmail = customerData.email?.toLowerCase().trim();
      const normName = customerData.business_name?.toLowerCase().trim();
      
      const existingRecord = customers.find(c => 
        (normEmail && c.email?.toLowerCase().trim() === normEmail) ||
        (normName && c.business_name?.toLowerCase().trim() === normName)
      );
      
      const targetId = existingRecord ? existingRecord.id : generateUUID();

      const { data, error } = await supabase.from('customers').upsert([{ 
        ...customerData, 
        id: targetId,
        created_at: existingRecord ? existingRecord.created_at : new Date().toISOString()
      }], { onConflict: 'business_name' }).select();
      
      if (!error) { 
        const realCustomer = data[0];

        // 🚛 History Migration: If name changed during promotion, update orders
        const originalName = editingCustomer.id.replace('virtual-', '');
        if (customerData.business_name !== originalName) {
          await supabase.from('orders').update({ customer_name: customerData.business_name }).eq('customer_name', originalName);
          fetchData(); // Deep refresh for all data
        }

        // If we updated an existing record, replace it in the list
        if (existingRecord) {
          setCustomers(customers.map(c => c.id === targetId ? realCustomer : c));
        } else {
          setCustomers([...customers, realCustomer]); 
        }
        setEditingCustomer(null); 
        if (selectedCustomerDetails?.id === editingCustomer.id) {
          setSelectedCustomerDetails(realCustomer);
        }
      } else {
        setCustomerError(formatCustomerError(error));
      }
    } else {
      // Normal update for existing DB customer
      const { source, orderCount, lastOrderDate, ...customerData } = editingCustomer;
      const { error } = await supabase.from('customers').update(customerData).eq('id', editingCustomer.id);
      if (!error) { 
        setCustomers(customers.map(c => c.id === editingCustomer.id ? editingCustomer : c)); 
        setEditingCustomer(null); 
        if (selectedCustomerDetails?.id === editingCustomer.id) {
          setSelectedCustomerDetails(editingCustomer);
        }
      } else {
        setCustomerError(formatCustomerError(error));
      }
    }
    setIsUpdatingCustomer(false);
  };

  const handleDeleteCustomer = async (id) => {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (!error) { 
      setCustomers(customers.filter(c => c.id !== id)); 
      setConfirmingCustomerDelete(null); 
    } else {
      console.error('Error deleting customer:', error);
      alert('שגיאה במחיקת לקוח');
    }
  };

  const handleImportCustomers = async (file) => {
    try {
      const data = await parseCustomerExcel(file);
      for (const row of data) {
        // Simple check for existing email
        const existing = customers.find(c => c.email && c.email === row.email);
        if (existing) {
          await supabase.from('customers').update(row).eq('id', existing.id);
        } else {
          await handleAddCustomer(row);
        }
      }
      fetchData(); // Refresh all
      alert('ייבוא הלקוחות הושלם בהצלחה');
    } catch (err) {
      console.error('Error importing customers:', err);
      alert('שגיאה בייבוא לקוחות');
    }
  };

  const handleAddCustomerNote = async (text, author) => {
    setCustomerError(null);
    setIsSubmittingCustomerNote(true);
    let target = editingCustomer || selectedCustomerDetails;
    if (!target) return;

    const note = { text, author, timestamp: new Date().toISOString() };
    const notes = [...(target.notes || []), note];
    
    // 🚀 Promotion Logic: If virtual, create/link in DB first
    if (target.id && String(target.id).startsWith('virtual-')) {
      const { id, source, orderCount, lastOrderDate, ...customerData } = target;
      
      // 📧 Robust Collision Check
      const normEmail = customerData.email?.toLowerCase().trim();
      const normName = customerData.business_name?.toLowerCase().trim();
      
      const existingRecord = customers.find(c => 
        (normEmail && c.email?.toLowerCase().trim() === normEmail) ||
        (normName && c.business_name?.toLowerCase().trim() === normName)
      );

      const targetId = existingRecord ? existingRecord.id : generateUUID();

      const { data, error: promoError } = await supabase.from('customers').upsert([{ 
        ...customerData, 
        id: targetId,
        created_at: existingRecord ? existingRecord.created_at : new Date().toISOString(),
        notes: [...(existingRecord?.notes || []), ...notes] // Merge notes if linking
      }], { onConflict: 'business_name' }).select();

      if (!promoError && data) {
        const realCustomer = data[0];

        // 🚛 History Migration
        const originalName = target.id.replace('virtual-', '');
        if (customerData.business_name !== originalName) {
          await supabase.from('orders').update({ customer_name: customerData.business_name }).eq('customer_name', originalName);
          fetchData();
        }

        if (existingRecord) {
          setCustomers(customers.map(c => c.id === targetId ? realCustomer : c));
        } else {
          setCustomers([...customers, realCustomer]);
        }
        if (editingCustomer) setEditingCustomer(realCustomer);
        if (selectedCustomerDetails) setSelectedCustomerDetails(realCustomer);
      } else {
        setCustomerError(formatCustomerError(promoError));
      }
    } else {
      // Normal note update
      const { error } = await supabase.from('customers').update({ notes }).eq('id', target.id);
      if (!error) {
        const updated = { ...target, notes };
        if (editingCustomer) setEditingCustomer(updated);
        if (selectedCustomerDetails) setSelectedCustomerDetails(updated);
        setCustomers(customers.map(c => c.id === target.id ? updated : c));
      }
    }
    setIsSubmittingCustomerNote(false);
  };

  const handleDeleteCustomerNote = async (idx) => {
    const target = editingCustomer || selectedCustomerDetails;
    if (!target || !target.id) return;

    // We can't delete notes for virtual customers (they have 0 notes),
    // but if we ever allow it, ensure they aren't virtual.
    if (String(target.id).startsWith('virtual-')) return;

    const notes = target.notes.filter((_, i) => i !== idx);
    const { error } = await supabase.from('customers').update({ notes }).eq('id', target.id);
    
    if (!error) {
      const updated = { ...target, notes };
      if (editingCustomer) setEditingCustomer(updated);
      if (selectedCustomerDetails) setSelectedCustomerDetails(updated);
      setCustomers(customers.map(c => c.id === target.id ? updated : c));
    }
  };

  // Orders
  const handleDeleteOrder = async (id) => {
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (!error) { setOrders(orders.filter(o => o.id !== id)); setConfirmingOrderDelete(null); }
  };

  const handleBulkDeleteOrders = async () => {
    setIsBulkDeleting(true);
    const { error } = await supabase.from('orders').delete().in('id', selectedOrderIds);
    if (!error) { setOrders(orders.filter(o => !selectedOrderIds.includes(o.id))); setSelectedOrderIds([]); }
    setIsBulkDeleting(false);
  };

  const handleUpdateOrderStatus = async (id, status, cancelReason = null) => {
    const currentOrder = orders.find(o => o.id === id);
    if (!currentOrder) return;

    let updateData = { status };
    const oldStatusLabel = statusMap[currentOrder.status]?.label || currentOrder.status;
    const newStatusLabel = statusMap[status]?.label || status;

    const newNote = {
      author: 'מערכת',
      text: status === 'Canceled' && cancelReason 
        ? `ביטול: ${cancelReason}` 
        : `סטטוס השתנה מ"${oldStatusLabel}" ל"${newStatusLabel}"`,
      timestamp: new Date().toISOString()
    };
    
    updateData.notes = [...(currentOrder.notes || []), newNote];

    const { error } = await supabase.from('orders').update(updateData).eq('id', id);

    if (!error) {
      // Update the main orders list
      setOrders(orders.map(o => o.id === id ? { ...o, ...updateData } : o));
      
      // Critical: Update the currently selected order in the modal so it reflects the change instantly
      if (selectedOrder?.id === id) {
        setSelectedOrder(prev => ({ ...prev, ...updateData }));
      }
    }
  };

  // Order Detail Helpers
  

  
  const handleSaveOrderEdits = async (items, discount) => {
    setIsUpdatingOrder(true);
    const subtotal = items.reduce((s, i) => s + (parseFloat(i.price) * i.quantity), 0);
    const total = subtotal * (1 - discount / 100);
    const { error } = await supabase.from('orders').update({ 
      items: items, 
      discount_pct: discount, 
      total_price: total 
    }).eq('id', selectedOrder.id);
    
    if (!error) { 
      const updatedOrder = { ...selectedOrder, items, discount_pct: discount, total_price: total }; 
      setSelectedOrder(updatedOrder); 
      setOrders(orders.map(o => o.id === updatedOrder.id ? updatedOrder : o)); 
      setIsEditingOrder(false); 
    }
    setIsUpdatingOrder(false);
  };


  const handleAddNote = async () => {
    setIsSubmittingNote(true);
    const note = { text: newNoteText, author: adminName, timestamp: new Date().toISOString() };
    const notes = [...(selectedOrder.notes || []), note];
    const { error } = await supabase.from('orders').update({ notes }).eq('id', selectedOrder.id);
    if (!error) { const up = { ...selectedOrder, notes }; setSelectedOrder(up); setOrders(orders.map(o => o.id === up.id ? up : o)); setNewNoteText(''); localStorage.setItem('groopy_admin_name', adminName); }
    setIsSubmittingNote(false);
  };

  const handleDeleteNote = async (idx) => {
    const notes = selectedOrder.notes.filter((_, i) => i !== idx);
    const { error } = await supabase.from('orders').update({ notes }).eq('id', selectedOrder.id);
    if (!error) { const up = { ...selectedOrder, notes }; setSelectedOrder(up); setOrders(orders.map(o => o.id === up.id ? up : o)); setConfirmingNoteDelete(null); }
  };



  return (
    <div className="flex h-screen bg-[#FDFDFE] text-slate-900 overflow-hidden" dir="rtl">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} logo={logo} ordersStats={ordersStats} />
      <main className="flex-1 p-6 md:p-12 overflow-y-auto w-full">
        <Header activeTab={activeTab} productsCount={products.length} bannersCount={banners.length} setIsSidebarOpen={setIsSidebarOpen} setIsAddingProduct={setIsAddingProduct} setIsAddingAgent={setIsAddingAgent} setIsAddingBrand={setIsAddingBrand} setIsAddingBanner={setIsAddingBanner} setIsAddingCategory={setIsAddingCategory} setIsAddingCustomer={setIsAddingCustomer} />

        {activeTab === 'products' && <ProductManagement sortedProducts={sortedProducts} searchTerm={searchTerm} setSearchTerm={setSearchTerm} categories={categories} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} requestSort={(k) => setSortConfig({ key: k, direction: sortConfig.key === k && sortConfig.direction === 'asc' ? 'desc' : 'asc' })} sortConfig={sortConfig} selectedProductIds={selectedProductIds} toggleProductSelection={toggleProductSelection} toggleAllProducts={toggleAllProducts} isBulkUpdatingProducts={isBulkUpdatingProducts} isBulkCategoryMenuOpen={isBulkCategoryMenuOpen} setIsBulkCategoryMenuOpen={setIsBulkCategoryMenuOpen} handleBulkUpdateProductCategory={handleBulkUpdateProductCategory} isBulkFlagsMenuOpen={isBulkFlagsMenuOpen} setIsBulkFlagsMenuOpen={setIsBulkFlagsMenuOpen} handleBulkUpdateProductFlag={handleBulkUpdateProductFlag} setEditingProduct={setEditingProduct} confirmingProductDelete={confirmingProductDelete} setConfirmingProductDelete={setConfirmingProductDelete} handleDeleteProduct={handleDeleteProduct} />}
        {activeTab === 'agents' && <AgentManagement agents={agents} handleCopyAgentLink={handleCopyAgentLink} copyFeedback={copyFeedback} handleShareAgent={handleShareAgent} confirmingAgentDelete={confirmingAgentDelete} setConfirmingAgentDelete={setConfirmingAgentDelete} handleDeleteAgent={handleDeleteAgent} setEditingAgent={setEditingAgent} />}
        {activeTab === 'categories' && <CategoryManagement categories={categories} confirmingCategoryDelete={confirmingCategoryDelete} setConfirmingCategoryDelete={setConfirmingCategoryDelete} handleDeleteCategory={handleDeleteCategory} setEditingCategory={setEditingCategory} />}
        {activeTab === 'brands' && <BrandManagement brands={brands} confirmingBrandDelete={confirmingBrandDelete} setConfirmingBrandDelete={setConfirmingBrandDelete} handleDeleteBrand={handleDeleteBrand} setEditingBrand={setEditingBrand} />}
        {activeTab === 'banners' && <BannerManagement banners={banners} confirmingBannerDelete={confirmingBannerDelete} setConfirmingBannerDelete={setConfirmingBannerDelete} handleDeleteBanner={handleDeleteBanner} setEditingBanner={setEditingBanner} />}
        {activeTab === 'customers' && <CustomerManagement customers={customersWithStats} searchTerm={searchTerm} setSearchTerm={setSearchTerm} handleDownloadTemplate={downloadCustomerTemplate} handleImportExcel={handleImportCustomers} setEditingCustomer={setEditingCustomer} confirmingCustomerDelete={confirmingCustomerDelete} setConfirmingCustomerDelete={setConfirmingCustomerDelete} handleDeleteCustomer={handleDeleteCustomer} setSelectedCustomerDetails={setSelectedCustomerDetails} />}
        {activeTab === 'orders' && <OrderManagement orders={orders} selectedOrderIds={selectedOrderIds} handleBulkDeleteOrders={handleBulkDeleteOrders} isBulkDeleting={isBulkDeleting} setSelectedOrderIds={setSelectedOrderIds} toggleAllOrders={() => setSelectedOrderIds(selectedOrderIds.length === orders.length ? [] : orders.map(o => o.id))} toggleOrderSelection={(id) => setSelectedOrderIds(p => p.includes(id) ? p.filter(oid => oid !== id) : [...p, id])} activeStatusMenu={activeStatusMenu} setActiveStatusMenu={setActiveStatusMenu} handleUpdateOrderStatus={handleUpdateOrderStatus} setSelectedOrder={setSelectedOrder} setConfirmingOrderDelete={setConfirmingOrderDelete} confirmingOrderDelete={confirmingOrderDelete} handleDeleteOrder={handleDeleteOrder} />}
      </main>

      {(isAddingProduct || !!editingProduct) && <ProductFormModal isOpen={true} onClose={() => { setIsAddingProduct(false); setEditingProduct(null); }} product={editingProduct || newProduct} setProduct={editingProduct ? setEditingProduct : setNewProduct} categories={categories} onSave={editingProduct ? handleUpdateProduct : handleAddProduct} isUpdating={isUpdatingProduct} title={editingProduct ? 'עריכת מוצר' : 'הוספת מוצר חדש'} />}
      {(isAddingAgent || !!editingAgent) && <AgentFormModal isOpen={true} onClose={() => { setIsAddingAgent(false); setEditingAgent(null); }} agent={editingAgent || newAgent} setAgent={editingAgent ? setEditingAgent : setNewAgent} onSave={editingAgent ? handleUpdateAgent : handleAddAgent} isUpdating={isUpdatingAgent} title={editingAgent ? 'עריכת סוכן' : 'הוספת סוכן חדש'} />}
      {(isAddingCategory || !!editingCategory) && <CategoryFormModal isOpen={true} onClose={() => { setIsAddingCategory(false); setEditingCategory(null); }} category={editingCategory || newCategory} setCategory={editingCategory ? setEditingCategory : setNewCategory} onSave={editingCategory ? handleUpdateCategory : handleAddCategory} isUpdating={isUpdatingCategory} title={editingCategory ? 'עריכת קטגוריה' : 'הוספת קטגוריה חדשה'} />}
      {(isAddingBrand || !!editingBrand) && <BrandFormModal isOpen={true} onClose={() => { setIsAddingBrand(false); setEditingBrand(null); }} brand={editingBrand || newBrand} setBrand={editingBrand ? setEditingBrand : setNewBrand} onSave={editingBrand ? handleUpdateBrand : handleAddBrand} isUpdating={isUpdatingBrand} title={editingBrand ? 'עריכת מותג' : 'הוספת מותג חדש'} />}
      {(isAddingBanner || !!editingBanner) && <BannerFormModal isOpen={true} onClose={() => { setIsAddingBanner(false); setEditingBanner(null); }} banner={editingBanner || newBanner} setBanner={editingBanner ? setEditingBanner : setNewBanner} onSave={editingBanner ? handleUpdateBanner : handleAddBanner} isUpdating={isUpdatingBanner} title={editingBanner ? 'עריכת באנר' : 'הוספת באנר חדש'} categories={categories} products={products} />}
      {(isAddingCustomer || !!editingCustomer || !!selectedCustomerDetails) && (
        <CustomerFormModal 
          isOpen={true} 
          onClose={() => { setIsAddingCustomer(false); setEditingCustomer(null); setSelectedCustomerDetails(null); }} 
          customer={selectedCustomerDetails || editingCustomer || newCustomer} 
          setCustomer={selectedCustomerDetails ? setSelectedCustomerDetails : (editingCustomer ? setEditingCustomer : setNewCustomer)} 
          onSave={editingCustomer ? handleUpdateCustomer : handleAddCustomer} 
          isUpdating={isUpdatingCustomer} 
          title={selectedCustomerDetails ? 'פרטי לקוח' : (editingCustomer ? 'עריכת לקוח' : 'הוספת לקוח חדש')} 
          orders={orders}
          onOpenOrder={setSelectedOrder}
          onAddNote={handleAddCustomerNote}
          onDeleteNote={handleDeleteCustomerNote}
          isSubmittingNote={isSubmittingCustomerNote}
          error={customerError}
        />
      )}
      {selectedOrder && (
        <OrderDetailsModal 
          order={selectedOrder} 
          onClose={() => setSelectedOrder(null)} 
          setIsEditingOrder={setIsEditingOrder}
          handleUpdateOrderStatus={handleUpdateOrderStatus}
          setSelectedOrder={setSelectedOrder}
          adminName={adminName}
          setAdminName={setAdminName}
          newNoteText={newNoteText}
          setNewNoteText={setNewNoteText}
          handleAddNote={handleAddNote}
          isSubmittingNote={isSubmittingNote}
          confirmingNoteDelete={confirmingNoteDelete}
          setConfirmingNoteDelete={setConfirmingNoteDelete}
          handleDeleteNote={handleDeleteNote}
          customers={customers}
        />
      )}

      {isEditingOrder && selectedOrder && (
        <OrderEditModal
          isOpen={true}
          onClose={() => setIsEditingOrder(false)}
          order={selectedOrder}
          products={products}
          onSave={handleSaveOrderEdits}
          isUpdating={isUpdatingOrder}
        />
      )}


      {/* 🚀 Floating Status Dropdown (Portal-like) */}
      <AnimatePresence>
        {activeStatusMenu.id && activeStatusMenu.rect && (
          <>
            <div 
              className="fixed inset-0 z-[100]" 
              onClick={() => setActiveStatusMenu({ id: null, rect: null })}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              style={{
                position: 'fixed',
                top: activeStatusMenu.rect.bottom + 8,
                left: activeStatusMenu.rect.left,
                width: activeStatusMenu.rect.width,
                minWidth: '180px'
              }}
              className="bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] border border-slate-100 p-2 z-[101] overflow-hidden"
            >
              {Object.entries(statusMap).map(([key, s]) => {
                const currentOrder = orders.find(o => o.id === activeStatusMenu.id);
                const isActive = currentOrder?.status === key;
                return (
                  <button
                    key={key}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUpdateOrderStatus(activeStatusMenu.id, key);
                      setActiveStatusMenu({ id: null, rect: null });
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors rounded-xl text-right ${isActive ? 'bg-slate-50' : ''}`}
                  >
                    <s.icon size={14} className={s.color} />
                    <span className={`text-[10px] font-black uppercase tracking-widest ${s.color}`}>
                      {s.label}
                    </span>
                    {isActive && <Check size={12} className="mr-auto text-slate-400" />}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Admin;
