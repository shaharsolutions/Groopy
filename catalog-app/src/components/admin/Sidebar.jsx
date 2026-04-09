import React from 'react';
import { Link } from 'react-router-dom';
import { 
  X, 
  Package, 
  ShoppingBag, 
  Users, 
  Tag, 
  Star, 
  Image, 
  ChevronRight 
} from 'lucide-react';

const Sidebar = ({ 
    activeTab, 
    setActiveTab, 
    isSidebarOpen, 
    setIsSidebarOpen, 
    logo, 
    ordersStats 
}) => {
  const menuItems = [
    { id: 'products', label: 'ניהול מוצרים', icon: Package },
    { id: 'orders', label: 'ניהול הזמנות', icon: ShoppingBag, badge: ordersStats.new },
    { id: 'customers', label: 'ניהול לקוחות', icon: Users },
    { id: 'agents', label: 'ניהול סוכנים', icon: Users },
    { id: 'categories', label: 'ניהול קטגוריות', icon: Tag },
    { id: 'brands', label: 'ניהול מותגים', icon: Star },
    { id: 'banners', label: 'ניהול באנרים', icon: Image },
  ];

  return (
    <>
      {/* 🏙️ SIDEBAR OVERLAY (MOBILE) */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      {/* 🏙️ SIDEBAR */}
      <aside className={`
        fixed inset-y-0 right-0 z-50 w-80 bg-white border-l border-slate-200 flex flex-col transition-transform duration-300 md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : 'translate-x-[100%] md:translate-x-0'}
      `}>
        <div className="flex items-center justify-between p-8 pb-0 mb-8">
          <div className="flex items-center gap-3">
            <div className="h-20 bg-white rounded-3xl flex items-center justify-center shadow-sm overflow-hidden p-1 border border-slate-100">
              <img src={logo} alt="Groopy Logo" className="w-full h-full object-contain" />
            </div>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 text-slate-400 hover:text-slate-900 md:hidden"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto thin-scrollbar px-8 space-y-3">
          {menuItems.map((item) => (
            <button 
              key={item.id}
              onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
              className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${
                activeTab === item.id 
                ? 'bg-primary-500 text-white shadow-lg shadow-primary-200' 
                : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-4">
                <item.icon size={20} />
                <span className="font-black text-base">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {item.badge > 0 && (
                  <span className={`${activeTab === item.id ? 'bg-white text-primary-500' : 'bg-red-500 text-white'} text-xs font-black px-2 py-0.5 rounded-full`}>
                    {item.badge}
                  </span>
                )}
                <ChevronRight size={16} className={activeTab === item.id ? '' : 'text-slate-300'} />
              </div>
            </button>
          ))}
        </nav>

        <div className="p-8 pt-6 border-t border-slate-100">
           <Link 
            to="/"
            className="flex items-center gap-3 text-slate-400 hover:text-slate-900 font-bold text-sm transition-colors"
           >
             <ChevronRight /> חזרה לממשק הלקוח
           </Link>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
