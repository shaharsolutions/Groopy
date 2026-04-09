import { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { supabase } from '../supabaseClient';

export const useAdminData = () => {
  const [activeTab, setActiveTab] = useState('products');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [agents, setAgents] = useState([]);
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [banners, setBanners] = useState([]);
  const [customers, setCustomers] = useState([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  
  const fetchData = async () => {
    try {
      const [
        { data: productsData },
        { data: agentsData },
        { data: categoriesData },
        { data: ordersData },
        { data: brandsData },
        { data: bannersData },
        { data: customersData }
      ] = await Promise.all([
        supabase.from('products').select('*').order('name'),
        supabase.from('agents').select('*').order('name'),
        supabase.from('categories').select('*').order('order_index', { ascending: true }),
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('brands').select('*').order('type', { ascending: true, nullsFirst: false }).order('name'),
        supabase.from('banners').select('*').order('order_index', { ascending: true }),
        supabase.from('customers').select('*').order('business_name')
      ]);

      if (productsData) setProducts(productsData);
      if (agentsData) setAgents(agentsData);
      if (categoriesData) setCategories(categoriesData);
      if (ordersData) setOrders(ordersData);
      if (brandsData) setBrands(brandsData);
      if (bannersData) setBanners(bannersData);
      if (customersData) setCustomers(customersData);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const deferredSearchTerm = useDeferredValue(searchTerm);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = 
        p.name.toLowerCase().includes(deferredSearchTerm.toLowerCase()) || 
        p.sku.toLowerCase().includes(deferredSearchTerm.toLowerCase());
      
      const matchesCategory = 
        selectedCategory === 'All' || 
        p.category === selectedCategory;
        
      return matchesSearch && matchesCategory;
    });
  }, [products, deferredSearchTerm, selectedCategory]);

  const sortedProducts = useMemo(() => {
    const sortableItems = [...filteredProducts];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === 'price') {
          aValue = parseFloat(aValue) || 0;
          bValue = parseFloat(bValue) || 0;
        } else {
          aValue = String(aValue || '').toLowerCase();
          bValue = String(bValue || '').toLowerCase();
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredProducts, sortConfig]);

  const ordersWithIds = useMemo(() => {
    return orders.map((order, idx) => ({
      ...order,
      // Add a stable display number
      sequentialId: orders.length - idx
    }));
  }, [orders]);

  const ordersStats = useMemo(() => ({
    new: ordersWithIds.filter(o => o.status === 'New').length,
    total: ordersWithIds.length
  }), [ordersWithIds]);

  const customersWithStats = useMemo(() => {
    // 1. Get all unique customer names from orders
    const orderCustomerNames = [...new Set(orders.map(o => o.customer_name).filter(Boolean))];
    
    // 2. Map existing customers from DB
    const dbCustomers = customers.map(c => ({ ...c, source: 'crm' }));
    
    // 3. Find names in orders that aren't in the CRM table yet AND aren't linked via email
    const virtualCustomers = orderCustomerNames
      .filter(name => {
        // If the name already exists in CRM, it's not virtual
        if (customers.some(c => c.business_name === name)) return false;
        
        // If any order for this name matches a CRM customer by email,
        // we treat this name as an alias/old-name and don't create a new record.
        const ordersForName = orders.filter(o => o.customer_name === name);
        const isLinkedToCRM = ordersForName.some(o => 
          o.customer_email && customers.some(c => c.email === o.customer_email)
        );
        
        return !isLinkedToCRM;
      })
      .map(name => ({
        id: `virtual-${name}`,
        business_name: name,
        source: 'orders'
      }));
    
    // 4. Combine both lists
    const allUniqueCustomers = [...dbCustomers, ...virtualCustomers];

    // 5. Calculate stats for each
    return allUniqueCustomers.map(customer => {
      const customerOrders = orders.filter(o => 
        o.customer_name === customer.business_name || (customer.email && o.customer_email === customer.email)
      );
      
      return {
        ...customer,
        orderCount: customerOrders.length,
        lastOrderDate: customerOrders.length > 0 
          ? customerOrders[0].created_at 
          : null
      };
    });
  }, [customers, orders]);

  const sortedCustomers = useMemo(() => {
    const sortableItems = [...customersWithStats];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === 'orderCount') {
          aValue = parseInt(aValue) || 0;
          bValue = parseInt(bValue) || 0;
        } else if (sortConfig.key === 'lastOrderDate') {
          aValue = aValue ? new Date(aValue).getTime() : 0;
          bValue = bValue ? new Date(bValue).getTime() : 0;
        } else {
          aValue = String(aValue || '').toLowerCase();
          bValue = String(bValue || '').toLowerCase();
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [customersWithStats, sortConfig]);

  return {
    activeTab, setActiveTab,
    isSidebarOpen, setIsSidebarOpen,
    products, setProducts,
    sortedProducts,
    agents, setAgents,
    orders: ordersWithIds, setOrders,
    categories, setCategories,
    brands, setBrands,
    banners, setBanners,
    searchTerm, setSearchTerm,
    selectedCategory, setSelectedCategory,
    sortConfig, setSortConfig,
    ordersStats,
    customers, setCustomers,
    customersWithStats,
    sortedCustomers,
    fetchData
  };
};
