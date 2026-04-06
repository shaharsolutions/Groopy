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

// Modals
import ProductFormModal from '../components/admin/Modals/ProductFormModal';
import AgentFormModal from '../components/admin/Modals/AgentFormModal';
import CategoryFormModal from '../components/admin/Modals/CategoryFormModal';
import BrandFormModal from '../components/admin/Modals/BrandFormModal';
import BannerFormModal from '../components/admin/Modals/BannerFormModal';
import OrderDetailsModal from '../components/admin/Modals/OrderDetailsModal';


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
  const [newBanner, setNewBanner] = useState({ image: '', title: '', target_type: 'none', target_value: '', is_active: true, order_index: 0 });

  // Order Details / Edit State
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [tempOrderItems, setTempOrderItems] = useState([]);
  const [tempOrderDiscount, setTempOrderDiscount] = useState(0);
  const [editingOrderSearch, setEditingOrderSearch] = useState('');
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);
  const [adminName, setAdminName] = useState(localStorage.getItem('groopy_admin_name') || '');
  const [newNoteText, setNewNoteText] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [confirmingNoteDelete, setConfirmingNoteDelete] = useState(null);

  useEffect(() => {
    if (selectedOrder) {
      setTempOrderItems(selectedOrder.items || []);
      setTempOrderDiscount(selectedOrder.discount_pct || 0);
      setIsEditingOrder(false);
      setEditingOrderSearch('');
    }
  }, [selectedOrder]);

  // --- CRUD Handlers ---

  // Products
  const handleAddProduct = async () => {
    setIsUpdatingProduct(true);
    try {
      const { data, error } = await supabase.from('products').insert([{ ...newProduct, price: parseFloat(newProduct.price) }]).select();
      if (!error) { setProducts([...products, data[0]]); setIsAddingProduct(false); setNewProduct({ name: '', sku: '', price: '', category: '', location: '', description: '', image: '', is_new: false, is_clearing: false, is_best_seller: false, is_hot_deal: false, default_quantity: 12 }); }
    } finally { setIsUpdatingProduct(false); }
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
    const { data, error } = await supabase.from('agents').insert([newAgent]).select();
    if (!error) { setAgents([...agents, data[0]]); setIsAddingAgent(false); setNewAgent({ name: '', phone: '', image: '' }); }
    setIsUpdatingAgent(false);
  };

  const handleUpdateAgent = async () => {
    setIsUpdatingAgent(true);
    const { error } = await supabase.from('agents').update(editingAgent).eq('id', editingAgent.id);
    if (!error) { setAgents(agents.map(a => a.id === editingAgent.id ? editingAgent : a)); setEditingAgent(null); }
    setIsUpdatingAgent(false);
  };

  const handleDeleteAgent = async (id) => {
    const { error } = await supabase.from('agents').delete().eq('id', id);
    if (!error) { setAgents(agents.filter(a => a.id !== id)); setConfirmingAgentDelete(null); }
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
    const { data, error } = await supabase.from('categories').insert([newCategory]).select();
    if (!error) { setCategories([...categories, data[0]]); setIsAddingCategory(false); setNewCategory({ name: '' }); }
    setIsUpdatingCategory(false);
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
    const { data, error } = await supabase.from('brands').insert([newBrand]).select();
    if (!error) { setBrands([...brands, data[0]]); setIsAddingBrand(false); setNewBrand({ name: '', logo: '', type: '', show_in_carousel: true }); }
    setIsUpdatingBrand(false);
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
    const { data, error } = await supabase.from('banners').insert([newBanner]).select();
    if (!error) { setBanners([...banners, data[0]]); setIsAddingBanner(false); setNewBanner({ image: '', title: '', target_type: 'none', target_value: '', is_active: true, order_index: 0 }); }
    setIsUpdatingBanner(false);
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
    let updateData = { status };
    
    // If canceling, add a system note with the reason
    if (status === 'Canceled' && cancelReason) {
      const currentOrder = orders.find(o => o.id === id);
      const newNote = {
        author: 'מערכת (ביטול)',
        text: `סיבת ביטול: ${cancelReason}`,
        timestamp: new Date().toISOString()
      };
      updateData.notes = [...(currentOrder?.notes || []), newNote];
    }

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
  const handleUpdateItemQuantity = (sku, delta) => setTempOrderItems(p => p.map(it => it.sku === sku ? { ...it, quantity: Math.max(1, it.quantity + delta) } : it));
  const handleRemoveItemFromOrder = (sku) => setTempOrderItems(p => p.filter(it => it.sku !== sku));
  const handleAddItemToOrder = (prod) => {
    const qty = prod.default_quantity || 12;
    setTempOrderItems(prev => {
      const exists = prev.find(it => it.sku === prod.sku);
      if (exists) {
        return prev.map(it => it.sku === prod.sku ? { ...it, quantity: it.quantity + qty } : it);
      }
      return [...prev, { ...prod, quantity: qty }];
    });
    setEditingOrderSearch('');
  };
  
  const handleSaveOrderEdits = async () => {
    setIsUpdatingOrder(true);
    const subtotal = tempOrderItems.reduce((s, i) => s + (parseFloat(i.price) * i.quantity), 0);
    const total = subtotal * (1 - tempOrderDiscount / 100);
    const { error } = await supabase.from('orders').update({ items: tempOrderItems, discount_pct: tempOrderDiscount, total_price: total }).eq('id', selectedOrder.id);
    if (!error) { const up = { ...selectedOrder, items: tempOrderItems, discount_pct: tempOrderDiscount, total_price: total }; setSelectedOrder(up); setOrders(orders.map(o => o.id === up.id ? up : o)); setIsEditingOrder(false); }
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

  const filteredProductsForEditing = useMemo(() => editingOrderSearch.trim() ? products.filter(p => p.name.includes(editingOrderSearch) || p.sku.includes(editingOrderSearch)).slice(0, 5) : [], [products, editingOrderSearch]);

  return (
    <div className="flex h-screen bg-[#FDFDFE] text-slate-900 overflow-hidden" dir="rtl">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} logo={logo} ordersStats={ordersStats} />
      <main className="flex-1 p-6 md:p-12 overflow-y-auto w-full">
        <Header activeTab={activeTab} productsCount={products.length} bannersCount={banners.length} setIsSidebarOpen={setIsSidebarOpen} setIsAddingProduct={setIsAddingProduct} setIsAddingAgent={setIsAddingAgent} setIsAddingBrand={setIsAddingBrand} setIsAddingBanner={setIsAddingBanner} setIsAddingCategory={setIsAddingCategory} />

        {activeTab === 'products' && <ProductManagement sortedProducts={sortedProducts} searchTerm={searchTerm} setSearchTerm={setSearchTerm} categories={categories} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} requestSort={(k) => setSortConfig({ key: k, direction: sortConfig.key === k && sortConfig.direction === 'asc' ? 'desc' : 'asc' })} sortConfig={sortConfig} selectedProductIds={selectedProductIds} toggleProductSelection={toggleProductSelection} toggleAllProducts={toggleAllProducts} isBulkUpdatingProducts={isBulkUpdatingProducts} isBulkCategoryMenuOpen={isBulkCategoryMenuOpen} setIsBulkCategoryMenuOpen={setIsBulkCategoryMenuOpen} handleBulkUpdateProductCategory={handleBulkUpdateProductCategory} isBulkFlagsMenuOpen={isBulkFlagsMenuOpen} setIsBulkFlagsMenuOpen={setIsBulkFlagsMenuOpen} handleBulkUpdateProductFlag={handleBulkUpdateProductFlag} setEditingProduct={setEditingProduct} confirmingProductDelete={confirmingProductDelete} setConfirmingProductDelete={setConfirmingProductDelete} handleDeleteProduct={handleDeleteProduct} />}
        {activeTab === 'agents' && <AgentManagement agents={agents} handleCopyAgentLink={handleCopyAgentLink} copyFeedback={copyFeedback} handleShareAgent={handleShareAgent} confirmingAgentDelete={confirmingAgentDelete} setConfirmingAgentDelete={setConfirmingAgentDelete} handleDeleteAgent={handleDeleteAgent} setEditingAgent={setEditingAgent} />}
        {activeTab === 'categories' && <CategoryManagement categories={categories} confirmingCategoryDelete={confirmingCategoryDelete} setConfirmingCategoryDelete={setConfirmingCategoryDelete} handleDeleteCategory={handleDeleteCategory} setEditingCategory={setEditingCategory} />}
        {activeTab === 'brands' && <BrandManagement brands={brands} confirmingBrandDelete={confirmingBrandDelete} setConfirmingBrandDelete={setConfirmingBrandDelete} handleDeleteBrand={handleDeleteBrand} setEditingBrand={setEditingBrand} />}
        {activeTab === 'banners' && <BannerManagement banners={banners} confirmingBannerDelete={confirmingBannerDelete} setConfirmingBannerDelete={setConfirmingBannerDelete} handleDeleteBanner={handleDeleteBanner} setEditingBanner={setEditingBanner} />}
        {activeTab === 'orders' && <OrderManagement orders={orders} selectedOrderIds={selectedOrderIds} handleBulkDeleteOrders={handleBulkDeleteOrders} isBulkDeleting={isBulkDeleting} setSelectedOrderIds={setSelectedOrderIds} toggleAllOrders={() => setSelectedOrderIds(selectedOrderIds.length === orders.length ? [] : orders.map(o => o.id))} toggleOrderSelection={(id) => setSelectedOrderIds(p => p.includes(id) ? p.filter(oid => oid !== id) : [...p, id])} activeStatusMenu={activeStatusMenu} setActiveStatusMenu={setActiveStatusMenu} handleUpdateOrderStatus={handleUpdateOrderStatus} setSelectedOrder={setSelectedOrder} setConfirmingOrderDelete={setConfirmingOrderDelete} confirmingOrderDelete={confirmingOrderDelete} handleDeleteOrder={handleDeleteOrder} />}
      </main>

      {(isAddingProduct || !!editingProduct) && <ProductFormModal isOpen={true} onClose={() => { setIsAddingProduct(false); setEditingProduct(null); }} product={editingProduct || newProduct} setProduct={editingProduct ? setEditingProduct : setNewProduct} categories={categories} onSave={editingProduct ? handleUpdateProduct : handleAddProduct} isUpdating={isUpdatingProduct} title={editingProduct ? 'עריכת מוצר' : 'הוספת מוצר חדש'} />}
      {(isAddingAgent || !!editingAgent) && <AgentFormModal isOpen={true} onClose={() => { setIsAddingAgent(false); setEditingAgent(null); }} agent={editingAgent || newAgent} setAgent={editingAgent ? setEditingAgent : setNewAgent} onSave={editingAgent ? handleUpdateAgent : handleAddAgent} isUpdating={isUpdatingAgent} title={editingAgent ? 'עריכת סוכן' : 'הוספת סוכן חדש'} />}
      {(isAddingCategory || !!editingCategory) && <CategoryFormModal isOpen={true} onClose={() => { setIsAddingCategory(false); setEditingCategory(null); }} category={editingCategory || newCategory} setCategory={editingCategory ? setEditingCategory : setNewCategory} onSave={editingCategory ? handleUpdateCategory : handleAddCategory} isUpdating={isUpdatingCategory} title={editingCategory ? 'עריכת קטגוריה' : 'הוספת קטגוריה חדשה'} />}
      {(isAddingBrand || !!editingBrand) && <BrandFormModal isOpen={true} onClose={() => { setIsAddingBrand(false); setEditingBrand(null); }} brand={editingBrand || newBrand} setBrand={editingBrand ? setEditingBrand : setNewBrand} onSave={editingBrand ? handleUpdateBrand : handleAddBrand} isUpdating={isUpdatingBrand} title={editingBrand ? 'עריכת מותג' : 'הוספת מותג חדש'} />}
      {(isAddingBanner || !!editingBanner) && <BannerFormModal isOpen={true} onClose={() => { setIsAddingBanner(false); setEditingBanner(null); }} banner={editingBanner || newBanner} setBanner={editingBanner ? setEditingBanner : setNewBanner} onSave={editingBanner ? handleUpdateBanner : handleAddBanner} isUpdating={isUpdatingBanner} title={editingBanner ? 'עריכת באנר' : 'הוספת באנר חדש'} categories={categories} products={products} />}
      {selectedOrder && <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} isEditingOrder={isEditingOrder} setIsEditingOrder={setIsEditingOrder} tempOrderItems={tempOrderItems} handleUpdateItemQuantity={handleUpdateItemQuantity} handleRemoveItemFromOrder={handleRemoveItemFromOrder} editingOrderSearch={editingOrderSearch} setEditingOrderSearch={setEditingOrderSearch} filteredProductsForEditing={filteredProductsForEditing} handleAddItemToOrder={handleAddItemToOrder} tempOrderDiscount={tempOrderDiscount} setTempOrderDiscount={setTempOrderDiscount} handleSaveOrderEdits={handleSaveOrderEdits} isUpdatingOrder={isUpdatingOrder} adminName={adminName} setAdminName={setAdminName} newNoteText={newNoteText} setNewNoteText={setNewNoteText} handleAddNote={handleAddNote} isSubmittingNote={isSubmittingNote} confirmingNoteDelete={confirmingNoteDelete} setConfirmingNoteDelete={setConfirmingNoteDelete} handleDeleteNote={handleDeleteNote} handleUpdateOrderStatus={handleUpdateOrderStatus} setSelectedOrder={setSelectedOrder} />}
    </div>
  );
};

export default Admin;
