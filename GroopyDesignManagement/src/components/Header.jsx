import { useState } from 'react';

/**
 * Header Component - Groopy Work Manager
 * 
 * Top bar with logo, share link generator for admin, and role toggling.
 */
export default function Header({ userRole, onChangeRole, showSwitcher, currentView, onViewChange, onOpenGuide }) {
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

        <button 
          type="button"
          onClick={onOpenGuide}
          className="btn btn-secondary"
          style={{ 
            fontWeight: '600', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            fontSize: '0.9rem',
            padding: '8px 14px'
          }}
          title="מדריך לשימוש במערכת"
        >
          📖 מדריך למערכת
        </button>

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
      </div>
    </header>
  );
}


