import { useState } from 'react';

const PRESET_COLORS = [
  { value: 'badge-new', label: 'כחול עדין', previewClass: 'badge-new' },
  { value: 'badge-in-progress', label: 'אינדיגו', previewClass: 'badge-in-progress' },
  { value: 'badge-waiting-info', label: 'צהוב', previewClass: 'badge-waiting-info' },
  { value: 'badge-waiting-china', label: 'כתום', previewClass: 'badge-waiting-china' },
  { value: 'badge-waiting-approval', label: 'סגול בהיר', previewClass: 'badge-waiting-approval' },
  { value: 'badge-needs-revision', label: 'אדום', previewClass: 'badge-needs-revision' },
  { value: 'badge-approved', label: 'ירוק אמרלד', previewClass: 'badge-approved' },
  { value: 'badge-sent-production', label: 'טורקיז', previewClass: 'badge-sent-production' },
  { value: 'badge-completed', label: 'ירוק מנטה', previewClass: 'badge-completed' },
  { value: 'badge-frozen', label: 'אפור', previewClass: 'badge-frozen' }
];

const DEFAULT_AUTO_ARCHIVE_INACTIVE_DAYS = 45;

export default function SettingsPage({ settings, onSaveSettings, onBack }) {
  const [localSettings, setLocalSettings] = useState(JSON.parse(JSON.stringify(settings)));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Inputs for adding status
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('badge-new');

  // Editing state for status names
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingValue, setEditingValue] = useState('');

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  const handleSave = async () => {
    const autoArchiveDays = Number(localSettings.autoArchiveInactiveDays);
    if (!Number.isFinite(autoArchiveDays) || autoArchiveDays < 1) {
      showMsg('יש להזין מספר ימים תקין לארכוב אוטומטי', 'danger');
      return;
    }

    setSaving(true);
    try {
      await onSaveSettings({
        ...localSettings,
        autoArchiveInactiveDays: Math.floor(autoArchiveDays)
      });
      showMsg('ההגדרות נשמרו בהצלחה בשרת!', 'success');
    } catch (e) {
      console.error(e);
      showMsg('שגיאה בשמירת ההגדרות. נסו שנית.', 'danger');
    } finally {
      setSaving(false);
    }
  };

  // Status Handlers
  const handleAddStatus = (e) => {
    e.preventDefault();
    const nameTrimmed = newStatusName.trim();
    if (!nameTrimmed) return;

    if ((localSettings.statuses || []).includes(nameTrimmed)) {
      showMsg('סטטוס זה כבר קיים ברשימה', 'danger');
      return;
    }

    const updatedStatuses = [...(localSettings.statuses || []), nameTrimmed];
    const updatedColors = {
      ...(localSettings.statusColors || {}),
      [nameTrimmed]: newStatusColor
    };

    setLocalSettings({
      ...localSettings,
      statuses: updatedStatuses,
      statusColors: updatedColors
    });
    setNewStatusName('');
    showMsg(`הסטטוס "${nameTrimmed}" נוסף לרשימה הזמנית. יש ללחוץ על "שמירת הגדרות" בסיום.`);
  };

  const handleRemoveStatus = (statusToRemove) => {
    const statuses = localSettings.statuses || [];
    if (statuses.length <= 1) {
      showMsg('חייב להישאר לפחות סטטוס אחד במערכת', 'danger');
      return;
    }

    if (localSettings.defaultStatus === statusToRemove) {
      showMsg('לא ניתן למחוק את הסטטוס המוגדר כברירת מחדל. שנה את ברירת המחדל תחילה.', 'danger');
      return;
    }

    const updatedStatuses = statuses.filter(s => s !== statusToRemove);
    const updatedColors = { ...(localSettings.statusColors || {}) };
    delete updatedColors[statusToRemove];

    setLocalSettings({
      ...localSettings,
      statuses: updatedStatuses,
      statusColors: updatedColors
    });
    showMsg(`הסטטוס "${statusToRemove}" הוסר מהרשימה הזמנית.`);
  };

  const startEditing = (index, currentValue) => {
    setEditingIndex(index);
    setEditingValue(currentValue);
  };

  const saveEditedStatusName = (index) => {
    const oldValue = localSettings.statuses[index];
    const newValue = editingValue.trim();
    if (!newValue) return;

    if (oldValue === newValue) {
      setEditingIndex(null);
      return;
    }

    if (localSettings.statuses.includes(newValue)) {
      showMsg('סטטוס זה כבר קיים ברשימה', 'danger');
      return;
    }

    const updatedStatuses = [...localSettings.statuses];
    updatedStatuses[index] = newValue;

    const updatedColors = { ...(localSettings.statusColors || {}) };
    const colorClass = updatedColors[oldValue] || 'badge-frozen';
    delete updatedColors[oldValue];
    updatedColors[newValue] = colorClass;

    let updatedDefault = localSettings.defaultStatus;
    if (localSettings.defaultStatus === oldValue) {
      updatedDefault = newValue;
    }

    setLocalSettings({
      ...localSettings,
      statuses: updatedStatuses,
      statusColors: updatedColors,
      defaultStatus: updatedDefault
    });
    setEditingIndex(null);
    showMsg(`שם הסטטוס "${oldValue}" שונה ל-"${newValue}"`);
  };

  const handleColorChange = (statusName, newColor) => {
    setLocalSettings({
      ...localSettings,
      statusColors: {
        ...(localSettings.statusColors || {}),
        [statusName]: newColor
      }
    });
  };

  const statuses = localSettings.statuses || [];

  return (
    <main className="dashboard-container" style={{ maxWidth: '950px', padding: '24px' }}>

      {/* Top Header Row */}
      <div className="flex-between" style={{ marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>⚙️ הגדרות מערכת</h2>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={onBack} disabled={saving}>
            📋 חזרה ללוח המשימות
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? '⏳ שומר...' : '💾 שמירת הגדרות'}
          </button>
        </div>
      </div>

      {/* Message feedback */}
      {message.text && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px',
          fontSize: '0.95rem',
          fontWeight: '500',
          backgroundColor: message.type === 'danger' ? 'var(--priority-urgent-bg)' : 'var(--primary-light)',
          color: message.type === 'danger' ? 'var(--priority-urgent-text)' : 'var(--primary)',
          border: `1px solid ${message.type === 'danger' ? '#fecaca' : '#bfdbfe'}`,
          transition: 'all 0.3s ease'
        }}>
          {message.text}
        </div>
      )}

      {/* Settings Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Section 1: Dashboard Details */}
        <div className="filter-panel">
          <h4 className="detail-section-title">🖥️ נראות הלוח</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
            הגדרת מאפייני הכותרת והתצוגה הכלליים של לוח העבודה.
          </p>

          <div className="form-group" style={{ maxWidth: '500px' }}>
            <label className="form-label">שם הלוח (כותרת ראשית בדאשבורד)</label>
            <input
              type="text"
              className="form-control"
              value={localSettings.boardTitle || ''}
              onChange={(e) => setLocalSettings({ ...localSettings, boardTitle: e.target.value })}
            />
          </div>

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '500' }}>
              <input
                type="checkbox"
                checked={localSettings.hideWeeklyHours || false}
                onChange={(e) => setLocalSettings({ ...localSettings, hideWeeklyHours: e.target.checked })}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span>הסתרת שעות עבודה בפרויקט</span>
            </label>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '4px 0 0 26px' }}>
              כאשר מסומן, כרטיס "שעות עבודה בפרויקט" לא יופיע בפרטי המשימה וכפתור "סיכום שעות" יוסתר.
            </p>
          </div>

          <div className="form-group" style={{ maxWidth: '320px', marginTop: '16px' }}>
            <label className="form-label">ארכוב אוטומטי לאחר חוסר פעילות</label>
            <input
              type="number"
              min="1"
              step="1"
              className="form-control"
              value={localSettings.autoArchiveInactiveDays ?? DEFAULT_AUTO_ARCHIVE_INACTIVE_DAYS}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                autoArchiveInactiveDays: e.target.value
              })}
            />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '6px' }}>
              פרויקטים שלא עודכנו במשך מספר הימים שהוגדר יועברו אוטומטית לסטטוס "ארכיון".
            </p>
          </div>
        </div>

        {/* Section 2: Statuses List Management */}
        <div className="filter-panel">
          <h4 className="detail-section-title">🔄 ניהול סטטוסים וצבעי אינדיקציה</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
            הוספה, הסרה, שינוי שם ובחירת צבע עבור שלבי העבודה השונים (טורים בלוח).
          </p>

          <div className="table-container" style={{ marginBottom: '20px', overflowX: 'auto' }}>
            <table className="task-table" style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th style={{ padding: '8px' }}>שם הסטטוס</th>
                  <th style={{ padding: '8px', width: '200px' }}>צבע תצוגה</th>
                  <th style={{ padding: '8px', width: '120px' }}>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {statuses.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', padding: '16px' }}>
                      אין סטטוסים מוגדרים.
                    </td>
                  </tr>
                ) : (
                  statuses.map((st, index) => {
                    const isEditing = editingIndex === index;
                    const currentColor = (localSettings.statusColors || {})[st] || 'badge-frozen';

                    return (
                      <tr key={index}>
                        <td style={{ padding: '8px' }}>
                          {isEditing ? (
                            <input
                              type="text"
                              className="form-control"
                              style={{ padding: '4px 8px', fontSize: '0.85rem', height: '28px' }}
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                            />
                          ) : (
                            <span className={`badge ${currentColor}`} style={{ display: 'inline-block', padding: '4px 10px', fontSize: '0.85rem', fontWeight: '600' }}>
                              {st}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '8px' }}>
                          <select
                            className="form-control"
                            style={{ padding: '2px 8px', fontSize: '0.85rem', height: '28px' }}
                            value={currentColor}
                            onChange={(e) => handleColorChange(st, e.target.value)}
                          >
                            {PRESET_COLORS.map(color => (
                              <option key={color.value} value={color.value}>
                                {color.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: '8px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {isEditing ? (
                              <>
                                <button
                                  className="btn btn-secondary btn-icon"
                                  style={{ padding: '4px', color: '#10b981', borderColor: '#10b981' }}
                                  onClick={() => saveEditedStatusName(index)}
                                >
                                  ✔️
                                </button>
                                <button
                                  className="btn btn-secondary btn-icon"
                                  style={{ padding: '4px', color: '#ef4444', borderColor: '#ef4444' }}
                                  onClick={() => setEditingIndex(null)}
                                >
                                  ❌
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  className="btn btn-secondary btn-icon"
                                  style={{ padding: '4px' }}
                                  title="שינוי שם הסטטוס"
                                  onClick={() => startEditing(index, st)}
                                >
                                  ✏️
                                </button>
                                <button
                                  className="btn btn-danger btn-icon"
                                  style={{ padding: '4px' }}
                                  title="מחיקת הסטטוס"
                                  onClick={() => handleRemoveStatus(st)}
                                >
                                  🗑️
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Add Status Form */}
          <form onSubmit={handleAddStatus} className="form-grid-2col" style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>שם סטטוס חדש</label>
              <input
                type="text"
                className="form-control"
                value={newStatusName}
                onChange={(e) => setNewStatusName(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>בחירת צבע</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <select
                  className="form-control"
                  value={newStatusColor}
                  onChange={(e) => setNewStatusColor(e.target.value)}
                >
                  {PRESET_COLORS.map(color => (
                    <option key={color.value} value={color.value}>
                      {color.label}
                    </option>
                  ))}
                </select>
                <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }} disabled={saving}>
                  ➕ הוספה
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Section 3: Default Workflow Settings */}
        <div className="filter-panel">
          <h4 className="detail-section-title">⚙️ סטטוס ברירת מחדל</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '12px' }}>
            הסטטוס שיוקצה אוטומטית לכל משימה/פרויקט חדש שנוצר במערכת.
          </p>
          <div className="form-group" style={{ maxWidth: '350px' }}>
            <select
              className="form-control"
              value={localSettings.defaultStatus || 'חדש'}
              onChange={(e) => setLocalSettings({ ...localSettings, defaultStatus: e.target.value })}
            >
              {statuses.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>
        </div>

      </div>

      {/* Floating Save Panel at the bottom */}
      <div className="filter-panel flex-between" style={{ marginTop: '24px', backgroundColor: '#f8fafc' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          שמירה של ההגדרות תעדכן את סביבת העבודה ואת הלוח עבור כלל המשתמשים במערכת באופן מיידי.
        </span>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={onBack} disabled={saving}>
            ביטול
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? '⏳ שומר...' : '💾 שמור הגדרות עכשיו'}
          </button>
        </div>
      </div>

    </main>
  );
}
