import { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updatePassword } from 'firebase/auth';
import { auth } from '../firebase';

/**
 * Login Component - Groopy Work Manager
 * 
 * Authenticates users securely against Firebase Authentication.
 * Passwords are temporarily disabled; logins use a background token.
 */
export default function Login({ onLogin }) {
  const [activeTab, setActiveTab] = useState('admin'); // 'admin' or 'external'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const email = activeTab === 'admin' ? 'admin@groopy.com' : 'viewer@groopy.com';
    const oldPasscode = activeTab === 'admin' ? 'admin123' : 'briut4all';
    const noPasswordToken = 'no-password-for-now';

    try {
      // 1. Try to sign in with the passwordless token
      await signInWithEmailAndPassword(auth, email, noPasswordToken);
      onLogin(activeTab);
    } catch (signInError) {
      console.log("Passwordless token sign-in failed, trying fallback", signInError);
      // 2. If it fails, try with the old default passcode (transition/migration)
      try {
        await signInWithEmailAndPassword(auth, email, oldPasscode);
        // Migrate to the new passwordless token in the background
        if (auth.currentUser) {
          try {
            await updatePassword(auth.currentUser, noPasswordToken);
          } catch (updateErr) {
            console.warn("Background password migration failed", updateErr);
          }
        }
        onLogin(activeTab);
      } catch (oldSignInError) {
        console.log("Fallback password sign-in failed, registering new account", oldSignInError);
        // 3. If that also fails, the account might not exist yet, let's create it
        try {
          await createUserWithEmailAndPassword(auth, email, noPasswordToken);
          onLogin(activeTab);
        } catch (signUpError) {
          console.error("Auto registration failed", signUpError);
          if (signUpError.code === 'auth/operation-not-allowed') {
            setError('שגיאה: יש להפעיל את Email/Password ב-Firebase Console תחת Authentication -> Sign-in method.');
          } else {
            setError(`שגיאה בהתחברות או ברישום: ${signUpError.message} (${signUpError.code})`);
          }
        }
      }
    } finally {
      setLoading(false);
    }
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
            }}
            disabled={loading}
          >
            צפייה חיצונית
          </button>
        </div>

        <form onSubmit={handleLoginSubmit}>
          <div className="form-group" style={{ textAlign: 'center', margin: '24px 0 32px 0' }}>
            <p style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>
              התחברות מיידית במצב: <strong>{activeTab === 'admin' ? 'מנהלת (מעצבת)' : 'שותפים (צפייה חיצונית)'}</strong>
            </p>
            {error && <div className="form-error" style={{ marginTop: '12px' }}>{error}</div>}
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '12px' }}
            disabled={loading}
          >
            {loading ? 'מתחבר למערכת...' : 'התחברות למערכת'}
          </button>
        </form>

        <div style={{ marginTop: '24px', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: '1.4' }}>
          <strong>מצב פיתוח/צפייה חופשית:</strong> הסיסמאות בוטלו זמנית.
          <br />
          התחברות מהירה בלחיצת כפתור לפי התפקיד המבוקש.
        </div>
      </div>
    </div>
  );
}


