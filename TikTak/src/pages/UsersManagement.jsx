import { useMemo, useState, useEffect } from 'react';

let storageApiPromise = null;

const loadStorageApi = () => {
  storageApiPromise ??= import('../utils/storage');
  return storageApiPromise;
};

const adminActions = [
  {
    view: 'dashboard',
    icon: '📋',
    title: 'לוח המשימות',
    description: 'מעבר לניהול ומעקב המשימות הפעילות במערכת'
  },
  {
    view: 'settings',
    icon: '⚙️',
    title: 'הגדרות מערכת',
    description: 'ניהול סטטוסים, סוגי עבודה והעדפות מערכת'
  },
  {
    view: 'suppliers_contacts',
    icon: '👥',
    title: 'ספקים ואנשי קשר',
    description: 'ניהול ספר הספקים, אנשי הקשר ופרטי ההתקשרות'
  },
  {
    view: 'activity_log',
    icon: '🧾',
    title: 'יומן פעולות',
    description: 'מעקב אחר פעולות, עדכונים ושינויים שבוצעו במערכת'
  }
];

export default function UsersManagement({ onImpersonate, onBack, onNavigate }) {
  const [users, setUsers] = useState([]);
  const [usageStats, setUsageStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [relativeNow, setRelativeNow] = useState(0);

  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoading(true);
        setError('');
        const { getAllUsers, getUserManagementStats } = await loadStorageApi();
        const [usersList, statsByUser] = await Promise.all([
          getAllUsers(),
          getUserManagementStats()
        ]);
        // Sort by lastLogin descending
        usersList.sort((a, b) => new Date(b.lastLogin || 0) - new Date(a.lastLogin || 0));
        setUsers(usersList);
        setUsageStats(statsByUser);
        setRelativeNow(Date.now());
      } catch (err) {
        console.error("Failed to load users list", err);
        setError("שגיאה בטעינת רשימת המשתמשים. אנא ודאו שאתם מחוברים כאל מנהל מערכת מורשה.");
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  const totals = useMemo(() => users.reduce((acc, user) => {
    const stats = usageStats[user.uid] || {};
    acc.projectCount += stats.projectCount || 0;
    acc.activeProjectCount += stats.activeProjectCount || 0;
    acc.activityCount += stats.activityCount || 0;
    acc.weeklyHoursTotal += stats.weeklyHoursTotal || 0;
    if (stats.lastActivityAt && new Date(stats.lastActivityAt) > new Date(acc.lastActivityAt || 0)) {
      acc.lastActivityAt = stats.lastActivityAt;
    }
    return acc;
  }, { projectCount: 0, activeProjectCount: 0, activityCount: 0, weeklyHoursTotal: 0, lastActivityAt: '' }), [users, usageStats]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.toLowerCase();
    return users.filter(user =>
      (user.email || '').toLowerCase().includes(normalizedSearch)
    );
  }, [users, searchTerm]);

  const formatNumber = (value) => (Number(value) || 0).toLocaleString('he-IL');
  const maxProjectCount = Math.max(1, ...users.map(user => usageStats[user.uid]?.projectCount || 0));

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
    } catch {
      return isoString;
    }
  };

  const formatCompactDateTime = (isoString) => {
    if (!isoString) return 'אין נתונים';
    try {
      const date = new Date(isoString);
      return date.toLocaleString('he-IL', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  const formatRelativeActivity = (isoString) => {
    if (!isoString) return 'ללא פעילות מתועדת';
    if (!relativeNow) return 'פעיל לאחרונה';
    const diffMs = relativeNow - new Date(isoString).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (!Number.isFinite(diffDays) || diffDays < 0) return 'פעיל לאחרונה';
    if (diffDays === 0) return 'פעילות היום';
    if (diffDays === 1) return 'פעילות אתמול';
    if (diffDays < 7) return `לפני ${diffDays} ימים`;
    if (diffDays < 30) return `לפני ${Math.floor(diffDays / 7)} שבועות`;
    return `לפני ${Math.floor(diffDays / 30)} חודשים`;
  };

  const getInitials = (email = '') => {
    const name = email.split('@')[0] || '?';
    return name
      .split(/[._\-\s]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('') || '?';
  };

  const getActivityTone = (isoString) => {
    if (!isoString) return { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' };
    if (!relativeNow) return { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' };
    const diffDays = Math.floor((relativeNow - new Date(isoString).getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 7) return { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' };
    if (diffDays <= 30) return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
    return { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' };
  };

  const renderMetricPill = (label, value, tone = '#334155') => (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      minHeight: '28px',
      padding: '5px 9px',
      borderRadius: '999px',
      background: '#f8fafc',
      border: '1px solid #e2e8f0',
      color: tone,
      fontSize: '0.82rem',
      fontWeight: '700',
      whiteSpace: 'nowrap'
    }}>
      <span style={{ color: '#64748b', fontWeight: '600' }}>{label}</span>
      {value}
    </span>
  );

  const renderProgressBar = (value, maxValue) => {
    const percentage = Math.max(4, Math.min(100, Math.round(((Number(value) || 0) / maxValue) * 100)));
    return (
      <div style={{
        height: '8px',
        width: '100%',
        borderRadius: '999px',
        background: '#e2e8f0',
        overflow: 'hidden',
        marginTop: '10px'
      }}>
        <div style={{
          width: `${percentage}%`,
          height: '100%',
          borderRadius: 'inherit',
          background: 'linear-gradient(90deg, #0f766e, #2563eb)'
        }} />
      </div>
    );
  };

  const renderSummaryCard = (label, value, tone = '#3730a3') => (
    <div style={{
      background: 'rgba(255, 255, 255, 0.82)',
      border: '1px solid rgba(226, 232, 240, 0.9)',
      borderRadius: '12px',
      padding: '18px',
      boxShadow: '0 8px 18px -12px rgba(15, 23, 42, 0.35)'
    }}>
      <span style={{ display: 'block', color: '#64748b', fontSize: '0.88rem', fontWeight: '600', marginBottom: '8px' }}>{label}</span>
      <strong style={{ display: 'block', color: tone, fontSize: '1.55rem', lineHeight: 1.1 }}>{value}</strong>
    </div>
  );

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
          <h2 style={{ fontSize: '1.8rem', color: '#1e293b', fontWeight: '700' }}>🛠️ פאנל ניהול</h2>
        </div>
      </div>

      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '14px',
        marginBottom: '24px'
      }}>
        {adminActions.map((action) => (
          <button
            key={action.view}
            type="button"
            onClick={() => (action.view === 'dashboard' ? onBack() : onNavigate?.(action.view))}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              minHeight: '108px',
              padding: '18px',
              textAlign: 'right',
              border: '1px solid rgba(226, 232, 240, 0.9)',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.82)',
              boxShadow: '0 8px 18px -12px rgba(15, 23, 42, 0.35)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              color: '#1e293b'
            }}
          >
            <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>{action.icon}</span>
            <span>
              <span style={{ display: 'block', fontWeight: '700', marginBottom: '6px' }}>{action.title}</span>
              <span style={{ display: 'block', color: '#64748b', fontSize: '0.9rem', lineHeight: 1.45 }}>{action.description}</span>
            </span>
          </button>
        ))}
      </section>

      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '14px',
        marginBottom: '24px'
      }}>
        {renderSummaryCard('משתמשים במערכת', loading ? '...' : formatNumber(users.length))}
        {renderSummaryCard('פרויקטים במערכת', loading ? '...' : formatNumber(totals.projectCount), '#0f766e')}
        {renderSummaryCard('פרויקטים פעילים', loading ? '...' : formatNumber(totals.activeProjectCount), '#1d4ed8')}
        {renderSummaryCard('פעולות מתועדות', loading ? '...' : formatNumber(totals.activityCount), '#7c2d12')}
        {renderSummaryCard('שעות עבודה מדווחות', loading ? '...' : formatNumber(totals.weeklyHoursTotal), '#6d28d9')}
      </section>

      <div style={{
        background: 'rgba(255, 255, 255, 0.75)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(226, 232, 240, 0.8)',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '14px',
          marginBottom: '18px',
          flexWrap: 'wrap'
        }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', color: '#1e293b', fontWeight: '700', margin: 0 }}>משתמשים ונתוני שימוש</h3>
          </div>
          <span style={{ color: '#64748b', fontWeight: '600', fontSize: '0.92rem' }}>
            {loading ? 'טוען נתוני ניהול...' : `פעילות אחרונה: ${formatDateTime(totals.lastActivityAt)}`}
          </span>
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: '24px' }}>
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="חיפוש משתמשים"
            placeholder="חיפוש לפי אימייל..."
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
              minWidth: '920px',
              borderCollapse: 'collapse',
              textAlign: 'right'
            }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', width: '33%' }}>משתמש</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', width: '28%' }}>עומס פרויקטים</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', width: '27%' }}>פעילות ושימוש</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '600', textAlign: 'center' }}>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const stats = usageStats[user.uid] || {};
                  const activityTone = getActivityTone(stats.lastActivityAt || user.lastLogin);
                  return (
                    <tr
                      key={user.uid}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '16px', color: '#1e293b' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flex: '0 0 42px',
                            width: '42px',
                            height: '42px',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #eef2ff, #ecfeff)',
                            border: '1px solid #c7d2fe',
                            color: '#3730a3',
                            fontWeight: '800'
                          }}>
                            {getInitials(user.email)}
                          </span>
                          <span style={{ minWidth: 0 }}>
                            <span style={{
                              display: 'block',
                              maxWidth: '260px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontWeight: '800',
                              color: '#0f172a'
                            }}>
                              {user.email || 'ללא אימייל'}
                            </span>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              marginTop: '7px',
                              padding: '4px 8px',
                              borderRadius: '999px',
                              background: activityTone.bg,
                              color: activityTone.color,
                              border: `1px solid ${activityTone.border}`,
                              fontSize: '0.78rem',
                              fontWeight: '700'
                            }}>
                              {formatRelativeActivity(stats.lastActivityAt || user.lastLogin)}
                            </span>
                            {user.email === 'shaharsolutions@gmail.com' && (
                              <span style={{
                                display: 'inline-flex',
                                marginRight: '8px',
                                fontSize: '0.75rem',
                                backgroundColor: '#e0e7ff',
                                color: '#4f46e5',
                                padding: '4px 8px',
                                borderRadius: '999px',
                                fontWeight: '700'
                              }}>אני (מנהל)</span>
                            )}
                            <span style={{
                              display: 'block',
                              color: '#64748b',
                              fontSize: '0.82rem',
                              marginTop: '7px',
                              lineHeight: 1.35
                            }}>
                              חיבור אחרון: {formatCompactDateTime(user.lastLogin)}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '16px', color: '#475569' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'baseline' }}>
                          <strong style={{ color: '#0f172a', fontSize: '1.08rem' }}>{formatNumber(stats.projectCount)} פרויקטים</strong>
                          <span style={{ color: '#64748b', fontSize: '0.82rem', fontWeight: '700' }}>
                            {stats.projectCount ? `${Math.round(((stats.activeProjectCount || 0) / stats.projectCount) * 100)}% פעילים` : 'אין פרויקטים'}
                          </span>
                        </div>
                        {renderProgressBar(stats.projectCount, maxProjectCount)}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                          {renderMetricPill('פעילים', formatNumber(stats.activeProjectCount), '#047857')}
                          {renderMetricPill('ארכיון', formatNumber(stats.archivedProjectCount), '#475569')}
                        </div>
                      </td>
                      <td style={{ padding: '16px', color: '#475569' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                          {renderMetricPill('פעולות', formatNumber(stats.activityCount), '#7c2d12')}
                          {renderMetricPill('שעות', formatNumber(stats.weeklyHoursTotal), '#6d28d9')}
                        </div>
                        <div style={{ display: 'grid', gap: '5px', color: '#64748b', fontSize: '0.84rem', lineHeight: 1.45 }}>
                          <span><strong style={{ color: '#334155' }}>עדכון פרויקט:</strong> {formatCompactDateTime(stats.lastProjectUpdatedAt)}</span>
                          <span><strong style={{ color: '#334155' }}>פעילות אחרונה:</strong> {formatCompactDateTime(stats.lastActivityAt)}</span>
                        </div>
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
