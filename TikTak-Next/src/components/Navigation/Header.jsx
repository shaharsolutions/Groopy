import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  Search,
  Bell,
  Plus,
  RefreshCw,
  UserCheck,
  ChevronDown,
  PackagePlus,
  UserPlus,
  PhoneCall,
  PawPrint,
  Building2
} from 'lucide-react';
import { ISOLATION_NOTICE } from '../../data/constants';

export function Header({
  currentRole,
  setCurrentRole,
  onQuickCreate,
  onResetMockClick,
  searchQuery,
  setSearchQuery,
  notifications = [],
  onNotificationClick,
  onMarkAllNotificationsRead
}) {
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  const quickMenuRef = useRef(null);
  const notifMenuRef = useRef(null);

  const unreadNotifs = notifications.filter(n => !n.read);

  useEffect(() => {
    function handleClickOutside(e) {
      if (quickMenuRef.current && !quickMenuRef.current.contains(e.target)) setShowQuickMenu(false);
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target)) setShowNotifMenu(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="app-header-container">
      {/* Safety Banner */}
      <div className="isolation-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={16} color="#34D399" />
          <span>מערכת מותאמת PAWZA • Instance V2 נפרד ומבודד</span>
        </div>
        <div className="isolation-badge">
          <span className="pulse-dot"></span>
          PAWZA Operational System
        </div>
      </div>

      {/* Main Top Header */}
      <div className="top-header">
        <div className="brand-section">
          <div className="brand-logo" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' }}>
            🐾
          </div>
          <div>
            <div className="brand-title">
              PAWZA
              <span className="brand-tag" style={{ background: '#2563EB' }}>V2</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              ניהול פיתוח, תוכן ולקוחות
            </div>
          </div>
        </div>

        {/* Global Search */}
        <div className="header-search-container">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="form-input header-search-input"
            placeholder="חיפוש משימה, ליד, לקוח, טלפון, אימייל..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery('')}>×</button>
          )}
        </div>

        {/* Quick Create Button with max 4 options */}
        <div className="header-actions">
          <div style={{ position: 'relative' }} ref={quickMenuRef}>
            <button
              className="btn btn-primary"
              onClick={() => setShowQuickMenu(!showQuickMenu)}
            >
              <Plus size={18} />
              <span>חדש</span>
              <ChevronDown size={14} />
            </button>

            {showQuickMenu && (
              <div className="dropdown-menu">
                <div
                  className="dropdown-item"
                  onClick={() => { setShowQuickMenu(false); onQuickCreate('task'); }}
                >
                  <PackagePlus size={16} color="#2563EB" />
                  <div>
                    <div style={{ fontWeight: 700 }}>משימה חדשה</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>פיתוח, עיצוב או שיווק</div>
                  </div>
                </div>

                <div
                  className="dropdown-item"
                  onClick={() => { setShowQuickMenu(false); onQuickCreate('lead'); }}
                >
                  <UserPlus size={16} color="#10B981" />
                  <div>
                    <div style={{ fontWeight: 700 }}>ליד חדש</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>פנסיון או בעל עסק מתעניין</div>
                  </div>
                </div>

                <div
                  className="dropdown-item"
                  onClick={() => { setShowQuickMenu(false); onQuickCreate('customer'); }}
                >
                  <Building2 size={16} color="#8B5CF6" />
                  <div>
                    <div style={{ fontWeight: 700 }}>לקוח חדש</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>לקוח פעיל / בהצטרפות</div>
                  </div>
                </div>

                <div
                  className="dropdown-item"
                  onClick={() => { setShowQuickMenu(false); onQuickCreate('activity'); }}
                >
                  <PhoneCall size={16} color="#F59E0B" />
                  <div>
                    <div style={{ fontWeight: 700 }}>פעילות חדשה</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>שיחה, WhatsApp, פגישה</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notifications */}
          <div style={{ position: 'relative' }} ref={notifMenuRef}>
            <button
              className="icon-btn"
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              title="התראות"
            >
              <Bell size={18} />
              {unreadNotifs.length > 0 && (
                <span className="notif-badge-count">{unreadNotifs.length}</span>
              )}
            </button>

            {showNotifMenu && (
              <div className="dropdown-menu notifications-dropdown">
                <div className="notif-header">
                  <span style={{ fontWeight: 700 }}>התראות PAWZA ({unreadNotifs.length})</span>
                  {unreadNotifs.length > 0 && (
                    <button className="text-btn" onClick={onMarkAllNotificationsRead}>
                      סמן הכל
                    </button>
                  )}
                </div>

                <div className="notif-list">
                  {notifications.length === 0 ? (
                    <div className="notif-empty">אין התראות חדשות</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`notif-item ${!n.read ? 'unread' : ''}`}
                        onClick={() => {
                          setShowNotifMenu(false);
                          if (onNotificationClick) onNotificationClick(n);
                        }}
                      >
                        <div className="notif-item-title">{n.title}</div>
                        <div className="notif-item-msg">{n.message}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Role selector */}
          <div className="role-switcher-container">
            <UserCheck size={16} color="var(--primary)" />
            <select
              className="role-select"
              value={currentRole}
              onChange={(e) => setCurrentRole(e.target.value)}
            >
              <option value="admin">מנהל (שחר)</option>
              <option value="project_manager">מובילת פרויקט (אלינה)</option>
              <option value="employee">חבר צוות</option>
            </select>
          </div>

          <button className="btn btn-secondary btn-sm" onClick={onResetMockClick} title="איפוס דמה">
            <RefreshCw size={14} />
            <span>איפוס</span>
          </button>
        </div>
      </div>
    </header>
  );
}
