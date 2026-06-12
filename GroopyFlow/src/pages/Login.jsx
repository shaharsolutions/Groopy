import { useState } from 'react';

/**
 * Login Component - Groopy Work Manager
 * 
 * Authenticates users using a shared password.
 * Admin password: Kefy0507
 */
export default function Login({ onLogin }) {
  const [activeTab, setActiveTab] = useState('admin'); // 'admin' or 'external'
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      if (activeTab === 'admin') {
        if (!password) {
          setError('אנא הזן סיסמת כניסה.');
          setLoading(false);
          return;
        }
        if (password !== 'Kefy0507') {
          setError('סיסמה שגויה. אנא נסי שנית.');
          setLoading(false);
          return;
        }
        // Correct password
        localStorage.setItem('groopy_admin_authenticated', 'true');
        onLogin('admin');
      } else {
        // External viewer mode - no password required
        onLogin('external');
      }
      setLoading(false);
    }, 400); // Small delay for premium feel / visual transition
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">G</div>
          <h2>Groopy Work Manager</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>מערכת מעקב וניהול משימות עיצוב גרפי</p>
        </div>

        <div className="login-tabs">
          <button
            type="button"
            className={`login-tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('admin');
              setError('');
              setPassword('');
            }}
            disabled={loading}
          >
            כניסת מנהלת
          </button>
          <button
            type="button"
            className={`login-tab-btn ${activeTab === 'external' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('external');
              setError('');
              setPassword('');
            }}
            disabled={loading}
          >
            צפייה חיצונית
          </button>
        </div>

        <form onSubmit={handleLoginSubmit}>
          {activeTab === 'admin' ? (
            <div className="form-group">
              <label className="form-label" htmlFor="password">סיסמת כניסה</label>
              <div className="password-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-control"
                  placeholder="הזינו סיסמת מנהלת..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  style={{ textAlign: 'right', direction: 'rtl' }}
                />
                <button
                  type="button"
                  className="password-toggle-text"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? 'הסתר' : 'הצג'}
                </button>
              </div>
            </div>
          ) : (
            <div className="form-group" style={{ textAlign: 'center', margin: '24px 0 32px 0' }}>
              <p style={{ fontSize: '1rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                התחברות מהירה במצב <strong>שותפים ולקוחות</strong> לצורך צפייה בלבד במצב המשימות וניהול שיח בבקרת ייצור.
              </p>
            </div>
          )}

          {error && <div className="form-error" style={{ marginBottom: '16px', textAlign: 'center' }}>⚠️ {error}</div>}

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '12px' }}
            disabled={loading}
          >
            {loading ? 'מתחבר למערכת...' : 'התחברות למערכת'}
          </button>
        </form>

        {activeTab !== 'admin' && (
          <div style={{ marginTop: '24px', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: '1.4' }}>
            <span>אין צורך בסיסמה לצורך צפייה חיצונית בלוח המשימות.</span>
          </div>
        )}
      </div>
    </div>
  );
}



