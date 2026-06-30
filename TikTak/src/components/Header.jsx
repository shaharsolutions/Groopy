import { useState } from 'react';
import { getTasks } from '../utils/storage';

const SUMMARY_CACHE_TTL_MS = 60 * 1000;
const summaryCache = new Map();

function getSundayOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const diff = d.getDate() - day; // Adjust to Sunday
  const sunday = new Date(d.setDate(diff));
  const yyyy = sunday.getFullYear();
  const mm = String(sunday.getMonth() + 1).padStart(2, '0');
  const dd = String(sunday.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getAggregatedMonthlySummary(tasks) {
  const monthlyData = {};
  const days = [
    { key: 'sunday', offset: 0 },
    { key: 'monday', offset: 1 },
    { key: 'tuesday', offset: 2 },
    { key: 'wednesday', offset: 3 },
    { key: 'thursday', offset: 4 }
  ];

  tasks.forEach(task => {
    const weeklyHoursObj = task.weeklyHours;
    if (!weeklyHoursObj) return;

    const projectTitle = task.title || 'פרויקט ללא שם';
    const projectKey = task.id || projectTitle;

    const addHours = (monthKey, hours) => {
      if (hours <= 0) return;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { total: 0, projects: {} };
      }
      monthlyData[monthKey].total += hours;
      if (!monthlyData[monthKey].projects[projectKey]) {
        monthlyData[monthKey].projects[projectKey] = {
          title: projectTitle,
          taskId: task.id,
          hours: 0
        };
      }
      monthlyData[monthKey].projects[projectKey].hours += hours;
    };

    if (weeklyHoursObj.sunday !== undefined || weeklyHoursObj.monday !== undefined) {
      const currentWeekSunday = getSundayOfWeek(new Date());
      const [yyyy, mm, dd] = currentWeekSunday.split('-').map(Number);
      
      days.forEach(day => {
        const hours = weeklyHoursObj[day.key] || 0;
        if (hours > 0) {
          const d = new Date(yyyy, mm - 1, dd + day.offset);
          const yKey = d.getFullYear();
          const mKey = String(d.getMonth() + 1).padStart(2, '0');
          const monthKey = `${yKey}-${mKey}`;
          addHours(monthKey, hours);
        }
      });
    } else {
      Object.entries(weeklyHoursObj).forEach(([sundayStr, weekData]) => {
        if (!sundayStr.match(/^\d{4}-\d{2}-\d{2}$/)) return;
        const [yyyy, mm, dd] = sundayStr.split('-').map(Number);

        days.forEach(day => {
          const hours = weekData[day.key] || 0;
          if (hours > 0) {
            const d = new Date(yyyy, mm - 1, dd + day.offset);
            const yKey = d.getFullYear();
            const mKey = String(d.getMonth() + 1).padStart(2, '0');
            const monthKey = `${yKey}-${mKey}`;
            addHours(monthKey, hours);
          }
        });
      });
    }
  });

  const roundedData = {};
  Object.entries(monthlyData).forEach(([monthKey, data]) => {
    const roundedProjects = {};
    Object.entries(data.projects).forEach(([projectKey, project]) => {
      roundedProjects[projectKey] = {
        ...project,
        hours: Number(project.hours.toFixed(2))
      };
    });
    roundedData[monthKey] = {
      total: Number(data.total.toFixed(2)),
      projects: roundedProjects
    };
  });

  return roundedData;
}

/**
 * Header Component - Groopy Work Manager
 *
 * Top bar with logo, share link generator for admin, and role toggling.
 */
export default function Header({ userRole, onChangeRole, showSwitcher, currentView, onViewChange, onLogout, userId, userEmail, onSearchTrigger, onOpenTask, settings }) {
  const [copied, setCopied] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [summaryData, setSummaryData] = useState({});
  const [expandedMonths, setExpandedMonths] = useState({});
  const [loading, setLoading] = useState(false);

  const toggleMonth = (key) => {
    setExpandedMonths(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleOpenProject = (taskId) => {
    if (!taskId || !onOpenTask) return;
    setIsSummaryOpen(false);
    onViewChange?.('dashboard');
    onOpenTask(taskId);
  };

  const handleOpenSummary = async () => {
    setIsSummaryOpen(true);
    setLoading(true);
    try {
      const cacheKey = userId || 'anonymous';
      const cached = summaryCache.get(cacheKey);
      if (cached && Date.now() - cached.createdAt < SUMMARY_CACHE_TTL_MS) {
        setSummaryData(cached.summary);
        setExpandedMonths(cached.expandedMonths);
        return;
      }

      const tasks = await getTasks(userId);
      const summary = getAggregatedMonthlySummary(tasks);
      setSummaryData(summary);
      
      const keys = Object.keys(summary);
      let nextExpandedMonths = {};
      if (keys.length > 0) {
        const latestKey = keys.sort()[keys.length - 1];
        nextExpandedMonths = { [latestKey]: true };
      }
      setExpandedMonths(nextExpandedMonths);
      summaryCache.set(cacheKey, {
        createdAt: Date.now(),
        summary,
        expandedMonths: nextExpandedMonths
      });
    } catch (err) {
      console.error("Failed to load hours summary:", err);
    } finally {
      setLoading(false);
    }
  };

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
        <button
          className="btn btn-secondary"
          onClick={onSearchTrigger}
          style={{
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#f1f5f9',
            color: 'var(--text)',
            borderColor: 'var(--border)',
            marginLeft: '8px'
          }}
          title="חיפוש גלובלי בכל המערכת (Ctrl+K)"
        >
          🔍 חיפוש במערכת
        </button>

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
              title="מעבר לפאנל ניהול"
            >
              🛠️ פאנל ניהול
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

        {userId && !settings?.hideWeeklyHours && (
          <button
            className="btn btn-secondary"
            onClick={handleOpenSummary}
            style={{
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#eef2ff',
              color: '#3730a3',
              borderColor: '#c7d2fe',
              padding: '6px 12px'
            }}
            title="סיכום שעות עבודה מדווחות בכל הפרויקטים"
          >
            סיכום שעות
          </button>
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

      {isSummaryOpen && (
        <div className="modal-overlay" onClick={() => setIsSummaryOpen(false)} style={{ direction: 'rtl' }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">📊 סיכום שעות עבודה</h3>
              <button className="modal-close" onClick={() => setIsSummaryOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  טוען נתונים...
                </div>
              ) : Object.keys(summaryData).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text-muted)' }}>
                  <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '12px' }}>⏱️</span>
                  <strong>אין שעות עבודה מדווחות במערכת</strong>
                </div>
              ) : (
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
                    ריכוז שעות העבודה המדווחות בכל הפרויקטים בסיכום לפי חודש:
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {Object.keys(summaryData).sort().map(key => {
                      const [yyyy, mm] = key.split('-').map(Number);
                      const date = new Date(yyyy, mm - 1, 1);
                      const monthName = date.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
                      const monthInfo = summaryData[key];
                      const isExpanded = !!expandedMonths[key];
                      return (
                        <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div 
                            onClick={() => toggleMonth(key)}
                            style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              padding: '12px 16px',
                              backgroundColor: 'var(--background)',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid var(--border)',
                              cursor: 'pointer',
                              userSelect: 'none',
                              transition: 'background-color 0.2s'
                            }}
                          >
                            <span style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{isExpanded ? '▼' : '◀'}</span>
                              <span>{monthName}</span>
                            </span>
                            <span style={{ fontWeight: '700', color: 'var(--primary)', fontSize: '1.05rem' }}>{monthInfo.total} שעות</span>
                          </div>
                          
                          {isExpanded && (
                            <div 
                              style={{ 
                                padding: '8px 16px 12px 16px',
                                marginRight: '16px',
                                borderRight: '2px solid var(--primary-light)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px'
                              }}
                            >
                              {Object.entries(monthInfo.projects).map(([projectKey, project]) => (
                                <button
                                  key={projectKey}
                                  type="button"
                                  className="hours-summary-project-row"
                                  onClick={() => handleOpenProject(project.taskId)}
                                  disabled={!project.taskId || !onOpenTask}
                                  aria-label={`פתיחת כרטיס הפרויקט ${project.title}`}
                                  style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '12px',
                                    fontSize: '0.85rem',
                                    cursor: project.taskId && onOpenTask ? 'pointer' : 'default',
                                    fontFamily: 'inherit',
                                    textAlign: 'right'
                                  }}
                                >
                                  <span className="hours-summary-project-title">• {project.title}</span>
                                  <span className="hours-summary-project-hours">{project.hours} שעות</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsSummaryOpen(false)}>סגור</button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
