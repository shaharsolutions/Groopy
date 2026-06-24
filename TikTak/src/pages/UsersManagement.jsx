import { useState, useEffect } from 'react';
import { getAllUsers } from '../utils/storage';

export default function UsersManagement({ onImpersonate, onBack }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoading(true);
        setError('');
        const usersList = await getAllUsers();
        // Sort by lastLogin descending
        usersList.sort((a, b) => new Date(b.lastLogin || 0) - new Date(a.lastLogin || 0));
        setUsers(usersList);
      } catch (err) {
        console.error("Failed to load users list", err);
        setError("שגיאה בטעינת רשימת המשתמשים. אנא ודאו שאתם מחוברים כאל מנהל מערכת מורשה.");
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user => 
    (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.uid || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDateTime = (isoString) => {
    if (!isoString) return 'לא ידוע';
    try {
      const date = new Date(isoString);
      return date.toLocaleString('he-IL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '40px auto',
      padding: '0 20px',
      fontFamily: 'Rubik, sans-serif',
      direction: 'rtl'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px'
      }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', color: '#1e293b', fontWeight: '700' }}>👥 ניהול ופיקוח משתמשים</h2>
        </div>
        <button 
          className="btn btn-secondary" 
          onClick={onBack}
          style={{ fontWeight: '600' }}
        >
          📋 חזרה ללוח המשימות
        </button>
      </div>

      <div style={{
        background: 'rgba(255, 255, 255, 0.75)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(226, 232, 240, 0.8)',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)'
      }}>
        {/* Search Bar */}
        <div style={{ marginBottom: '24px' }}>
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '1rem',
              outline: 'none',
              fontFamily: 'inherit',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
            }}
          />
        </div>

        {error && (
          <div style={{
            backgroundColor: 'var(--priority-urgent-bg)',
            color: 'var(--priority-urgent-text)',
            padding: '14px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontWeight: '500'
          }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: 'var(--text-muted)'
          }}>
            טוען רשימת משתמשים...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: 'var(--text-muted)'
          }}>
            {searchTerm ? 'לא נמצאו משתמשים התואמים את החיפוש.' : 'אין משתמשים רשומים במערכת.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'right'
            }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '600' }}>אימייל</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '600' }}>חיבור אחרון</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '600' }}>מזהה ייחודי (UID)</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '600', textAlign: 'center' }}>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr 
                    key={user.uid}
                    style={{ 
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '14px 16px', fontWeight: '500', color: '#1e293b' }}>
                      {user.email} {user.email === 'shaharsolutions@gmail.com' && (
                        <span style={{
                          fontSize: '0.75rem',
                          backgroundColor: '#e0e7ff',
                          color: '#4f46e5',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          marginRight: '6px',
                          fontWeight: '600'
                        }}>אני (מנהל)</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#475569' }}>
                      {formatDateTime(user.lastLogin)}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '0.9rem', fontFamily: 'monospace' }}>
                      {user.uid}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      {user.email !== 'shaharsolutions@gmail.com' ? (
                        <button 
                          className="btn btn-secondary"
                          onClick={() => onImpersonate(user.uid, user.email)}
                          style={{
                            backgroundColor: '#eff6ff',
                            color: '#1d4ed8',
                            borderColor: '#3b82f6',
                            fontWeight: '600',
                            padding: '6px 14px',
                            fontSize: '0.9rem'
                          }}
                        >
                          👁️ להתחזות ולערוך
                        </button>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>אין אפשרות להתחזות לעצמך</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
