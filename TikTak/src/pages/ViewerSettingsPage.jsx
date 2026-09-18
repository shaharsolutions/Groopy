import React, { useState, useMemo } from 'react';
import { getAllTaskFieldDefinitions } from '../data/taskFieldConfig';
import { getFeatureFlags } from '../utils/featureFlags';

const SORT_PREFERENCE_KEY = 'tiktak_external_sort_preference';
const TABLE_DENSITY_KEY = 'tiktak_external_table_density';
const HIDDEN_COLUMNS_KEY = 'tiktak_external_hidden_columns';

export default function ViewerSettingsPage({ settings, organizationName, onBack }) {
  const flags = getFeatureFlags(settings);

  // 1. Sort preferences
  const [sortPref, setSortPref] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SORT_PREFERENCE_KEY) || '{}');
      return {
        mode: typeof saved.mode === 'string' && saved.mode ? saved.mode : 'default',
        direction: saved.direction === 'desc' ? 'desc' : 'asc'
      };
    } catch {
      return { mode: 'default', direction: 'asc' };
    }
  });

  // 2. Table density
  const [density, setDensity] = useState(() => {
    try {
      return localStorage.getItem(TABLE_DENSITY_KEY) || 'normal';
    } catch {
      return 'normal';
    }
  });

  // 3. Hidden columns
  const [hiddenColumns, setHiddenColumns] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(HIDDEN_COLUMNS_KEY) || '[]');
    } catch {
      return [];
    }
  });

  const [savedMessage, setSavedMessage] = useState('');

  // All available fields in this organization
  const availableFields = useMemo(() => {
    return getAllTaskFieldDefinitions(settings?.newTaskFields, {
      includeDeleted: false,
      taskFieldOrder: settings?.taskFieldOrder
    }).filter(field => field.enabled !== false && !field.deleted);
  }, [settings?.newTaskFields, settings?.taskFieldOrder]);

  const showSavedNotice = (msg = 'ההגדרות נשמרו בהצלחה!') => {
    setSavedMessage(msg);
    setTimeout(() => setSavedMessage(''), 3000);
  };

  const handleSaveSortPref = (newPref) => {
    setSortPref(newPref);
    try {
      localStorage.setItem(SORT_PREFERENCE_KEY, JSON.stringify(newPref));
      showSavedNotice();
    } catch (e) {
      console.warn('Could not save sort preference', e);
    }
  };

  const handleSaveDensity = (newDensity) => {
    setDensity(newDensity);
    try {
      localStorage.setItem(TABLE_DENSITY_KEY, newDensity);
      showSavedNotice();
    } catch (e) {
      console.warn('Could not save density', e);
    }
  };

  const handleToggleColumn = (fieldKey) => {
    let nextHidden;
    if (hiddenColumns.includes(fieldKey)) {
      nextHidden = hiddenColumns.filter(k => k !== fieldKey);
    } else {
      nextHidden = [...hiddenColumns, fieldKey];
    }
    setHiddenColumns(nextHidden);
    try {
      localStorage.setItem(HIDDEN_COLUMNS_KEY, JSON.stringify(nextHidden));
      showSavedNotice();
    } catch (e) {
      console.warn('Could not save hidden columns', e);
    }
  };

  const handleResetDefaults = () => {
    const defaultSort = { mode: 'default', direction: 'asc' };
    setSortPref(defaultSort);
    setDensity('normal');
    setHiddenColumns([]);
    try {
      localStorage.removeItem(SORT_PREFERENCE_KEY);
      localStorage.removeItem(TABLE_DENSITY_KEY);
      localStorage.removeItem(HIDDEN_COLUMNS_KEY);
      showSavedNotice('ההגדרות אופסו לברירת המחדל');
    } catch (e) {
      console.warn('Could not reset preferences', e);
    }
  };

  const fallbackStatuses = flags?.isLegacy
    ? ['חדש', 'בטיפול', 'נשלח לספק', 'אושר לספק', 'ארכיון']
    : ['חדש', 'בטיפול', 'נשלח', 'אושר', 'ארכיון'];
  const statuses = Array.isArray(settings?.statuses) ? settings.statuses : fallbackStatuses;
  const statusColors = settings?.statusColors || {};

  return (
    <main className="dashboard-container" style={{ maxWidth: '850px', padding: '24px', margin: '0 auto' }}>
      
      {/* Top Header */}
      <div className="flex-between" style={{ marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⚙️ הגדרות תצוגה והעדפות צפייה
          </h2>
          <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            התאמה אישית של תצוגת לוח ה{flags.terms.items} במכשיר זה
            {organizationName ? ` · ${organizationName}` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleResetDefaults}
            title="איפוס כל ההעדפות לברירת המחדל"
            style={{ fontWeight: '500' }}
          >
            🔄 איפוס לברירת מחדל
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onBack}
            style={{ fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            📋 חזרה ללוח המשימות
          </button>
        </div>
      </div>

      {/* Save Notification */}
      {savedMessage && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px',
          fontSize: '0.95rem',
          fontWeight: '600',
          backgroundColor: '#e6f7ed',
          color: '#166534',
          border: '1px solid #bbf7d0',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          ✔️ {savedMessage}
        </div>
      )}

      {/* Info Callout */}
      <div style={{
        backgroundColor: '#f0f9ff',
        border: '1px solid #bae6fd',
        borderRadius: 'var(--radius-md)',
        padding: '16px 18px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px'
      }}>
        <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>👁️</span>
        <div style={{ fontSize: '0.88rem', color: '#0369a1', lineHeight: '1.5' }}>
          <strong>הנך מחובר/ת במצב צפייה</strong>
          <br />
          ההעדפות בעמוד זה נשמרות בדפדפן הנוכחי שלך בלבד (כמו סדר מיון, שדות גלויים וצפיפות שורות).
          הגדרות מערכתיות כגון הוספת שדות, עדכון סטטוסים או שינוי נתוני משימות מנוהלות על ידי מנהלי הארגון.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Section 1: Sort Preferences */}
        <div className="filter-panel">
          <h4 className="detail-section-title">🔀 מיון ברירת מחדל</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '14px' }}>
            בחר/י כיצד ה{flags.terms.items} יסודרו בטבלה בעת פתיחת המערכת.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            <div>
              <label className="form-label" style={{ fontSize: '0.85rem' }}>שדה למיון:</label>
              <select
                className="form-control"
                value={sortPref.mode}
                onChange={(e) => handleSaveSortPref({ ...sortPref, mode: e.target.value })}
              >
                <option value="default">ברירת מחדל של הלוח</option>
                <option value="title">שם ה{flags.terms.item}</option>
                <option value="status">סטטוס</option>
                <option value="contactPerson">איש קשר</option>
                <option value="updatedAt">תאריך עדכון אחרון</option>
                {availableFields.map(f => (
                  !['title', 'status', 'contactPerson'].includes(f.key) && (
                    <option key={f.key} value={f.key}>{f.label}</option>
                  )
                ))}
              </select>
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '0.85rem' }}>כיוון מיון:</label>
              <select
                className="form-control"
                value={sortPref.direction}
                onChange={(e) => handleSaveSortPref({ ...sortPref, direction: e.target.value })}
              >
                <option value="asc">סדר עולה (א-ת / מהישן לחדש)</option>
                <option value="desc">סדר יורד (ת-א / מהחדש לישן)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Table Row Density */}
        <div className="filter-panel">
          <h4 className="detail-section-title">📏 צפיפות תצוגת הטבלה</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '14px' }}>
            התאמת גובה השורות בטבלת ה{flags.terms.items} לנוחות קריאה מרבית.
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '8px',
              background: '#ffffff',
              border: `2px solid ${density === 'normal' ? 'var(--primary)' : 'var(--border)'}`,
              cursor: 'pointer',
              flex: 1,
              minWidth: '200px'
            }}>
              <input
                type="radio"
                name="density"
                value="normal"
                checked={density === 'normal'}
                onChange={() => handleSaveDensity('normal')}
              />
              <div>
                <strong style={{ display: 'block', fontSize: '0.9rem' }}>רגיל (סטנדרטי)</strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>ריווח מרווח ונוח לקריאה במסך</span>
              </div>
            </label>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '8px',
              background: '#ffffff',
              border: `2px solid ${density === 'compact' ? 'var(--primary)' : 'var(--border)'}`,
              cursor: 'pointer',
              flex: 1,
              minWidth: '200px'
            }}>
              <input
                type="radio"
                name="density"
                value="compact"
                checked={density === 'compact'}
                onChange={() => handleSaveDensity('compact')}
              />
              <div>
                <strong style={{ display: 'block', fontSize: '0.9rem' }}>קומפקטי (צפוף)</strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>שורות צרות יותר לצפייה בכמות גדולה של נתונים</span>
              </div>
            </label>
          </div>
        </div>

        {/* Section 3: Visible Table Columns */}
        <div className="filter-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
            <h4 className="detail-section-title" style={{ margin: 0 }}>
              👁️ עמודות מוצגות בטבלה
            </h4>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {availableFields.length - hiddenColumns.length} מתוך {availableFields.length} עמודות גלויות
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
            סמן/י את העמודות שברצונך לראות בטבלת ה{flags.terms.items}. עמודות שלא יסומנו יוסתרו מהטבלה אך יישארו זמינות במסך פרטי המשימה.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '10px',
            backgroundColor: '#f8fafc',
            padding: '14px',
            borderRadius: '8px',
            border: '1px solid var(--border)'
          }}>
            {availableFields.map(field => {
              const isHidden = hiddenColumns.includes(field.key);
              return (
                <label
                  key={field.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    userSelect: 'none',
                    backgroundColor: '#ffffff',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!isHidden}
                    onChange={() => handleToggleColumn(field.key)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                  />
                  <span style={{ fontWeight: !isHidden ? '600' : '400', color: !isHidden ? 'var(--text)' : 'var(--text-muted)' }}>
                    {field.label}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Section 4: Statuses Legend (Read-Only) */}
        <div className="filter-panel">
          <h4 className="detail-section-title">🔄 מקרא סטטוסים וצבעים</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '14px' }}>
            רשימת הסטטוסים הפעילים בארגון ומשמעות הצבעים שלהם בלוח.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {statuses.map(st => {
              const colorClass = statusColors[st] || 'badge-default';
              return (
                <div
                  key={st}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    backgroundColor: '#ffffff'
                  }}
                >
                  <span className={`badge ${colorClass}`} style={{ fontSize: '0.85rem' }}>
                    {st}
                  </span>
                  {st === settings?.defaultStatus && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                      (ברירת מחדל)
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Bottom Back Button */}
      <div style={{ marginTop: '30px', textAlign: 'center' }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onBack}
          style={{ padding: '10px 24px', fontSize: '1rem', fontWeight: '600' }}
        >
          📋 חזרה ללוח המשימות
        </button>
      </div>

    </main>
  );
}
