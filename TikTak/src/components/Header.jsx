import { useState } from 'react';

/**
 * Header Component - Groopy Work Manager
 *
 * Top bar with logo, share link generator for admin, and role toggling.
 */
export default function Header({ userRole, onChangeRole, showSwitcher, currentView, onViewChange, onLogout, userId, userEmail }) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?mode=viewer&userId=${userId}`;
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
        <img src="/favicon.png" className="header-logo" alt="לוגו תיקתק" style={{ objectFit: 'cover', background: 'white', padding: '2px' }} />
        <div>
          <h1 className="header-title">תיקתק</h1>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>מערכת מעקב וניהול משימות</p>
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
            title="העתק קישור שיתוף עבור שותפים לפרויקט שצריכים רק לצפות במערכת"
          >
            {copied ? '✔️ הועתק בהצלחה!' : '🔗 העתקת קישור לשיתוף'}
          </button>
        )}

        {userEmail === 'shaharsolutions@gmail.com' && onViewChange && (
          currentView === 'users' ? (
            <button
              className="btn btn-secondary"
              onClick={() => onViewChange('dashboard')}
              style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '8px' }}
            >
              📋 חזרה ללוח המשימות
            </button>
          ) : (
            <button
              className="btn btn-secondary"
              onClick={() => onViewChange('users')}
              style={{
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#eef2ff',
                color: '#3730a3',
                borderColor: '#c7d2fe',
                marginLeft: '8px'
              }}
              title="מעבר לפאנל ניהול משתמשים"
            >
              👥 ניהול משתמשים
            </button>
          )
        )}

        {userRole === 'admin' && onViewChange && currentView !== 'users' && (
          <div style={{ display: 'flex', gap: '8px' }}>
            {/* Show Back Button if in secondary admin views */}
            {(['settings', 'suppliers_contacts', 'activity_log'].includes(currentView)) ? (
              <button
                className="btn btn-secondary"
                onClick={() => onViewChange('dashboard')}
                style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                📋 חזרה ללוח המשימות
              </button>
            ) : null}

            {/* Suppliers & Contacts button */}
            {currentView !== 'suppliers_contacts' && (
              <button
                className="btn btn-secondary"
                onClick={() => onViewChange('suppliers_contacts')}
                style={{
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#eef2ff',
                  color: '#3730a3',
                  borderColor: '#c7d2fe'
                }}
                title="מעבר לניהול ספקים ואנשי קשר"
              >
                👥 ספקים ואנשי קשר
              </button>
            )}

            {/* Activity Log button */}
            {currentView !== 'activity_log' && (
              <button
                className="btn btn-secondary"
                onClick={() => onViewChange('activity_log')}
                style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}
                title="מעבר ליומן פעולות"
              >
                🧾 יומן פעולות
              </button>
            )}

            {/* Settings button */}
            {currentView !== 'settings' && (
              <button
                className="btn btn-secondary"
                onClick={() => onViewChange('settings')}
                style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}
                title="מעבר להגדרות מערכת"
              >
                ⚙️ הגדרות
              </button>
            )}
          </div>
        )}

        <div className="user-badge">
          <span>👤</span>
          <span>
            {userRole === 'admin' ? 'סביבת מנהל/ת מערכת' : 'מצב צפייה ושיתוף (עבור שותפים לפרויקט)'}
          </span>
        </div>

        {showSwitcher && userRole === 'admin' && (
          <button
            className="btn btn-secondary"
            onClick={() => onChangeRole('external')}
            style={{ backgroundColor: 'var(--secondary)', color: 'white', borderColor: 'var(--secondary)' }}
          >
            👀 מעבר למצב צפייה
          </button>
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
