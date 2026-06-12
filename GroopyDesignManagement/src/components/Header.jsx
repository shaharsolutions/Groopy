import { useState } from 'react';

/**
 * Header Component - Groopy Work Manager
 * 
 * Top bar with logo, share link generator for admin, and role toggling.
 */
export default function Header({ userRole, onChangeRole, showSwitcher, currentView, onViewChange, onLogout }) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?mode=viewer`;
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error("Failed to copy link", err);
      });
  };

  return (
    <header className="app-header">
      <div className="header-brand" onClick={() => onViewChange && onViewChange('dashboard')} style={{ cursor: 'pointer' }}>
        <div className="header-logo">G</div>
        <div>
          <h1 className="header-title">Groopy Work Manager</h1>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ניהול משימות עיצוב גרפי</p>
        </div>
      </div>
      
      <div className="header-actions">
        {userRole === 'admin' && currentView === 'dashboard' && (
          <button 
            className="btn btn-secondary" 
            onClick={handleCopyLink}
            style={{ 
              backgroundColor: '#e6f7ed', 
              color: '#1e4620', 
              borderColor: '#1e4620',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px'
            }}
            title="העתק קישור שיתוף עבור ספקים או לקוחות שצריכים רק לצפות במערכת"
          >
            {copied ? '✔️ הועתק בהצלחה!' : '🔗 העתקת קישור לשיתוף'}
          </button>
        )}

        {userRole === 'admin' && onViewChange && (
          currentView === 'settings' ? (
            <button 
              className="btn btn-secondary"
              onClick={() => onViewChange('dashboard')}
              style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              📋 חזרה ללוח המשימות
            </button>
          ) : (
            <button 
              className="btn btn-secondary"
              onClick={() => onViewChange('settings')}
              style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}
              title="מעבר להגדרות מערכת"
            >
              ⚙️ הגדרות
            </button>
          )
        )}

        <a 
          href="/guide.html" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="btn btn-secondary"
          style={{ 
            fontWeight: '600', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            textDecoration: 'none',
            fontSize: '0.9rem',
            padding: '8px 14px'
          }}
          title="מדריך לשימוש במערכת"
        >
          📖 מדריך למערכת
        </a>

        <div className="user-badge">
          <span>👤</span>
          <span>
            {userRole === 'admin' ? 'סביבת מנהלת (מעצבת)' : 'מצב צפייה ושיתוף'}
          </span>
        </div>
        
        {showSwitcher && (
          userRole === 'admin' ? (
            <button 
              className="btn btn-secondary" 
              onClick={() => onChangeRole('external')}
              style={{ backgroundColor: 'var(--secondary)', color: 'white', borderColor: 'var(--secondary)' }}
            >
              👀 מעבר למצב צפייה
            </button>
          ) : (
            <button 
              className="btn btn-primary" 
              onClick={() => onChangeRole('admin')}
            >
              ✏️ מעבר למצב מנהלת
            </button>
          )
        )}

        {onLogout && (
          <button 
            className="btn btn-secondary" 
            onClick={onLogout}
            style={{ 
              backgroundColor: 'var(--priority-urgent-bg)', 
              color: 'var(--priority-urgent-text)', 
              borderColor: 'rgba(239, 68, 68, 0.2)',
              fontWeight: '600'
            }}
            title="התנתקות ונעילת המערכת"
          >
            🔒 התנתקות
          </button>
        )}
      </div>
    </header>
  );
}


