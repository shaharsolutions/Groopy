import { useState } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from 'firebase/auth';
import { auth } from '../firebase';

/**
 * Login Component - Groopy Work Manager
 * 
 * Authenticates users using Google Sign-In or Email & Password.
 * Supports explicit registration for non-Google users.
 */
export default function Login() {
  const [activeTab, setActiveTab] = useState('admin'); // 'admin' or 'external'
  const [isSignUp, setIsSignUp] = useState(false); // Toggle between Login and Sign Up
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('rememberMe') === 'true';
  });
  const [email, setEmail] = useState(() => {
    return localStorage.getItem('rememberMe') === 'true' ? (localStorage.getItem('rememberedEmail') || '') : '';
  });
  const [password, setPassword] = useState(() => {
    return localStorage.getItem('rememberMe') === 'true' ? (localStorage.getItem('rememberedPassword') || '') : '';
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Google Sign-In Error:", err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('שגיאה בהתחברות עם גוגל. נסה שנית.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailPasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email.trim() || !password.trim()) {
      setError('אנא הזן אימייל וסיסמה.');
      return;
    }
    
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
        localStorage.setItem('rememberedEmail', email.trim());
        localStorage.setItem('rememberedPassword', password);
      } else {
        localStorage.removeItem('rememberMe');
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberedPassword');
      }
    } catch (signInError) {
      console.error("Sign-in failed:", signInError);
      if (
        signInError.code === 'auth/wrong-password' || 
        signInError.code === 'auth/invalid-credential' || 
        signInError.code === 'auth/user-not-found'
      ) {
        setError('אימייל או סיסמה שגויים.');
      } else if (signInError.code === 'auth/invalid-email') {
        setError('כתובת אימייל לא תקינה.');
      } else {
        setError(`שגיאה בהתחברות למערכת: ${signInError.message || signInError.code}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('אנא מלאו את כל השדות.');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('הסיסמאות אינן תואמות.');
      return;
    }
    
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), password);
    } catch (signUpError) {
      console.error("Registration failed:", signUpError);
      if (signUpError.code === 'auth/email-already-in-use') {
        setError('אימייל זה כבר רשום במערכת.');
      } else if (signUpError.code === 'auth/invalid-email') {
        setError('כתובת אימייל לא תקינה.');
      } else if (signUpError.code === 'auth/weak-password') {
        setError('הסיסמה צריכה להיות באורך של 6 תווים לפחות.');
      } else {
        setError(`שגיאה במהלך ההרשמה: ${signUpError.message || signUpError.code}`);
      }
    } finally {
      setLoading(false);
    }
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
              setIsSignUp(false);
              setError('');
            }}
            disabled={loading}
          >
            כניסת משתמש/ת
          </button>
          <button
            type="button"
            className={`login-tab-btn ${activeTab === 'external' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('external');
              setIsSignUp(false);
              setError('');
            }}
            disabled={loading}
          >
            צפייה חיצונית
          </button>
        </div>

        {activeTab === 'admin' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {!isSignUp ? (
              <>
                {/* Google Login Button */}
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    backgroundColor: 'white',
                    color: '#3c4043',
                    border: '1px solid #dadce0',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: '600',
                    boxShadow: '0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15)',
                    cursor: 'pointer'
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18">
                    <path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84c-.21 1.12-.84 2.07-1.8 2.71v2.24h2.91c1.7-1.56 2.69-3.87 2.69-6.58z"/>
                    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.23l-2.91-2.24c-.8.54-1.84.87-3.05.87-2.34 0-4.33-1.58-5.04-3.71H.92v2.3C2.4 15.96 5.43 18 9 18z"/>
                    <path fill="#FBBC05" d="M3.96 10.69c-.18-.54-.28-1.12-.28-1.69s.1-1.15.28-1.69V5.01H.92C.33 6.2.01 7.56.01 9s.32 2.8.91 3.99l3.04-2.3z"/>
                    <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35L15 2A8.99 8.99 0 0 0 .92 5.01l3.04 2.3C4.67 5.16 6.66 3.58 9 3.58z"/>
                  </svg>
                  התחברות מהירה עם Google
                </button>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.8rem',
                  margin: '8px 0'
                }}>
                  <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }} />
                  <span style={{ padding: '0 10px' }}>או באמצעות אימייל וסיסמה</span>
                  <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }} />
                </div>

                <form onSubmit={handleEmailPasswordSubmit}>
                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label className="form-label" htmlFor="email">אימייל</label>
                    <input
                      id="email"
                      type="email"
                      className="form-control"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      style={{ textAlign: 'left', direction: 'ltr' }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '24px' }}>
                    <label className="form-label" htmlFor="password">סיסמה</label>
                    <div className="password-wrapper">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        className="form-control"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        style={{ textAlign: 'left', direction: 'ltr' }}
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

                  <div className="form-group" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', direction: 'rtl' }}>
                    <input 
                      id="remember-me" 
                      type="checkbox" 
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      disabled={loading}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                    <label htmlFor="remember-me" style={{ cursor: 'pointer', userSelect: 'none', fontSize: '0.9rem', color: 'var(--text-main)' }}>זכור אותי</label>
                  </div>

                  {error && <div className="form-error" style={{ marginBottom: '16px', textAlign: 'center' }}>⚠️ {error}</div>}

                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ width: '100%', padding: '12px' }}
                    disabled={loading}
                  >
                    {loading ? 'מתחבר למערכת...' : 'התחברות'}
                  </button>

                  <div style={{ textAlign: 'center', marginTop: '16px' }}>
                    <button 
                      type="button" 
                      onClick={() => {
                        setIsSignUp(true);
                        setError('');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        textDecoration: 'underline'
                      }}
                    >
                      אין לכם חשבון? הרשמו כאן
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <form onSubmit={handleSignUpSubmit}>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label" htmlFor="signup-email">אימייל להרשמה</label>
                  <input
                    id="signup-email"
                    type="email"
                    className="form-control"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    style={{ textAlign: 'left', direction: 'ltr' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label" htmlFor="signup-password">סיסמה</label>
                  <div className="password-wrapper">
                    <input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      className="form-control"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      style={{ textAlign: 'left', direction: 'ltr' }}
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

                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="form-label" htmlFor="signup-confirm-password">אימות סיסמה</label>
                  <input
                    id="signup-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-control"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    style={{ textAlign: 'left', direction: 'ltr' }}
                  />
                </div>

                {error && <div className="form-error" style={{ marginBottom: '16px', textAlign: 'center' }}>⚠️ {error}</div>}

                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ width: '100%', padding: '12px' }}
                  disabled={loading}
                >
                  {loading ? 'רושם משתמש...' : 'הרשמה למערכת'}
                </button>

                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsSignUp(false);
                      setError('');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      textDecoration: 'underline'
                    }}
                  >
                    כבר רשומים? התחברו כאן
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <div className="form-group" style={{ textAlign: 'center', margin: '24px 0 32px 0' }}>
            <p style={{ fontSize: '1rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
              על מנת לצפות בלוח המשימות כשותף/ה לפרויקט, אנא השתמשו בקישור השיתוף הייעודי שנשלח אליכם על ידי מנהל/ת המערכת.
            </p>
          </div>
        )}

        {activeTab === 'external' && (
          <div style={{ marginTop: '24px', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: '1.4' }}>
            <span>קישור שיתוף מכיל את המזהה הדרוש לטעינת הנתונים המתאימים.</span>
          </div>
        )}
      </div>
    </div>
  );
}


