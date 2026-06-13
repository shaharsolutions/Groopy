import { useState } from 'react';

/**
 * Login Component - Groopy Work Manager
 * 
 * Authenticates users using a shared password.
 * Admin password is configured in the environment variables (VITE_ADMIN_PASSWORD).
 */
export default function Login({ onLogin }) {
  const [activeTab, setActiveTab] = useState('admin'); // 'admin' or 'external'
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('tiktak_remember_me') === 'true';
  });
  const [password, setPassword] = useState(() => {
    const savedPassword = localStorage.getItem('tiktak_remembered_password');
    const remember = localStorage.getItem('tiktak_remember_me') === 'true';
    return (remember && savedPassword) ? savedPassword : '';
  });
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
        const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'Kefy0507';
        if (password !== adminPassword) {
          setError('סיסמה שגויה. אנא נסי שנית.');
          setLoading(false);
          return;
        }
        // Correct password
        localStorage.setItem('tiktak_admin_authenticated', 'true');
        
        // Save or remove password in localStorage based on rememberMe option
        if (rememberMe) {
          localStorage.setItem('tiktak_remember_me', 'true');
          localStorage.setItem('tiktak_remembered_password', password);
        } else {
          localStorage.setItem('tiktak_remember_me', 'false');
          localStorage.removeItem('tiktak_remembered_password');
        }
        
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
          <img src="/logo.png" className="login-logo" alt="לוגו תיקתק" style={{ objectFit: 'cover', background: 'white', padding: '4px' }} />
          <h2>תיקתק</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>מערכת מעקב וניהול משימות</p>
        </div>

        <div className="login-tabs">
          <button
            type="button"
            className={`login-tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('admin');
              setError('');
              const savedPassword = localStorage.getItem('tiktak_remembered_password');
              const remember = localStorage.getItem('tiktak_remember_me') === 'true';
              setPassword((remember && savedPassword) ? savedPassword : '');
            }}
            disabled={loading}
          >
            כניסת מנהל/ת
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
                  placeholder="הזינו סיסמת מנהל/ת..."
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

              <div className="remember-me-container">
                <input
                  id="rememberMe"
                  type="checkbox"
                  className="remember-me-checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                />
                <label htmlFor="rememberMe" className="remember-me-label">
                  זכור אותי במכשיר זה
                </label>
              </div>
            </div>
          ) : (
            <div className="form-group" style={{ textAlign: 'center', margin: '24px 0 32px 0' }}>
              <p style={{ fontSize: '1rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                התחברות מהירה במצב <strong>שותפים לפרויקט</strong> לצורך צפייה בלבד במצב המשימות וניהול שיח בבקרת ייצור.
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



