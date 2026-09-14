import React from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  Calendar,
  Settings,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  PawPrint
} from 'lucide-react';

export function Sidebar({ activeTab, setActiveTab, isCollapsed, setIsCollapsed, openTasksCount = 0, crmFollowupsCount = 0 }) {
  const menuItems = [
    { id: 'dashboard', label: 'דשבורד', icon: LayoutDashboard },
    { id: 'tasks', label: 'משימות', icon: CheckSquare, badge: openTasksCount, badgeColor: '#2563EB' },
    { id: 'crm', label: 'לקוחות ולידים', icon: Users, badge: crmFollowupsCount > 0 ? crmFollowupsCount : null, badgeColor: '#10B981' },
    { id: 'calendar', label: 'לוח שנה', icon: Calendar },
    { id: 'settings', label: 'הגדרות', icon: Settings },
  ];

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        {!isCollapsed && (
          <div className="sidebar-brand-title">
            <PawPrint size={22} color="var(--primary)" />
            <span>PAWZA System</span>
          </div>
        )}
        <button
          className="sidebar-toggle-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "הרחב סרגל" : "כווץ סרגל"}
        >
          {isCollapsed ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>

      <div className="sidebar-menu">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <div
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
              title={isCollapsed ? item.label : ''}
            >
              <Icon className="nav-item-icon" />
              {!isCollapsed && <span className="nav-item-label">{item.label}</span>}
              {!isCollapsed && item.badge && (
                <span
                  className="nav-item-badge"
                  style={{ backgroundColor: item.badgeColor || 'var(--primary-light)', color: '#FFF' }}
                >
                  {item.badge}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
