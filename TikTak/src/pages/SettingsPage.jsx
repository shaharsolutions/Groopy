import { useState } from 'react';
import { NEW_TASK_FIELD_DEFINITIONS, NEW_TASK_FIELD_STYLES, normalizeNewTaskFields } from '../data/taskFieldConfig';
import { APP_VERSIONS, DEFAULT_APP_VERSION, getFeatureFlags } from '../utils/featureFlags';

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
const PRESET_BOARD_ICONS = ['📁', '📋', '🏷️', '🚀', '🎨', '📦', '⚡', '🎯', '📊', '⭐️', '✨', '💼', '📌', '🛠️', '🖨️'];

export default function SettingsPage({ settings, organizationName, onSaveSettings, onBack }) {
  const [localSettings, setLocalSettings] = useState(JSON.parse(JSON.stringify(settings)));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Inputs for adding status
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('badge-new');

  // Inputs for boards
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardIcon, setNewBoardIcon] = useState('📁');
  const [editingBoardId, setEditingBoardId] = useState(null);
  const [editingBoardName, setEditingBoardName] = useState('');
  const [editingBoardIcon, setEditingBoardIcon] = useState('📁');

  // Editing state for status names
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [taskFieldOptionDrafts, setTaskFieldOptionDrafts] = useState(() => Object.fromEntries(
    NEW_TASK_FIELD_DEFINITIONS
      .filter(field => field.options)
      .map(field => [field.key, normalizeNewTaskFields(settings.newTaskFields)[field.key].options.join(', ')])
  ));

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
        newTaskFields: normalizeNewTaskFields(localSettings.newTaskFields),
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

  const flags = getFeatureFlags(localSettings);

  // Board selected for status management
  const [selectedStatusBoardId, setSelectedStatusBoardId] = useState('active');

  const defaultBoardName = localSettings.boardTitle || (flags.isLegacy ? 'עבודות פעילות' : 'פרויקטים פעילים');
  const defaultBoardIcon = localSettings.boardIcon || (flags.isLegacy ? '📁' : '📋');

  const availableBoardsForStatuses = [
    { id: 'active', name: `${defaultBoardName} (ברירת מחדל)`, icon: defaultBoardIcon },
    ...(localSettings.boards || []).filter(b => b && b.id !== 'active')
  ];

  const isDefaultBoard = selectedStatusBoardId === 'active';
  const selectedBoardObj = (localSettings.boards || []).find(b => b && b.id === selectedStatusBoardId);
  const hasCustomStatuses = !isDefaultBoard && Array.isArray(selectedBoardObj?.statuses) && selectedBoardObj.statuses.length > 0;

  const currentBoardStatuses = isDefaultBoard
    ? (localSettings.statuses || [])
    : hasCustomStatuses
      ? selectedBoardObj.statuses
      : (localSettings.statuses || []);

  const currentBoardStatusColors = isDefaultBoard
    ? (localSettings.statusColors || {})
    : hasCustomStatuses
      ? { ...(localSettings.statusColors || {}), ...(selectedBoardObj.statusColors || {}) }
      : (localSettings.statusColors || {});

  const currentBoardDefaultStatus = isDefaultBoard
    ? (localSettings.defaultStatus || currentBoardStatuses[0] || 'חדש')
    : hasCustomStatuses
      ? (selectedBoardObj.defaultStatus || currentBoardStatuses[0] || 'חדש')
      : (localSettings.defaultStatus || 'חדש');

  // Status Handlers
  const handleAddStatus = (e) => {
    e.preventDefault();
    const nameTrimmed = newStatusName.trim();
    if (!nameTrimmed) return;

    if (currentBoardStatuses.includes(nameTrimmed)) {
      showMsg('סטטוס זה כבר קיים ברשימה', 'danger');
      return;
    }

    const updatedStatuses = [...currentBoardStatuses, nameTrimmed];
    const updatedColors = {
      ...currentBoardStatusColors,
      [nameTrimmed]: newStatusColor
    };

    if (isDefaultBoard) {
      setLocalSettings({
        ...localSettings,
        statuses: updatedStatuses,
        statusColors: updatedColors
      });
    } else {
      const existingBoards = Array.isArray(localSettings.boards) ? localSettings.boards : [];
      setLocalSettings({
        ...localSettings,
        boards: existingBoards.map(b => (b.id === selectedStatusBoardId ? {
          ...b,
          statuses: updatedStatuses,
          statusColors: updatedColors,
          defaultStatus: b.defaultStatus || updatedStatuses[0]
        } : b))
      });
    }
    setNewStatusName('');
    showMsg(`הסטטוס "${nameTrimmed}" נוסף לרשימה הזמנית.`);
  };

  const handleRemoveStatus = (statusToRemove) => {
    if (currentBoardStatuses.length <= 1) {
      showMsg('חייב להישאר לפחות סטטוס אחד בלוח', 'danger');
      return;
    }

    if (currentBoardDefaultStatus === statusToRemove) {
      showMsg('לא ניתן למחוק את הסטטוס המוגדר כברירת מחדל. שנו את ברירת המחדל תחילה.', 'danger');
      return;
    }

    const updatedStatuses = currentBoardStatuses.filter(s => s !== statusToRemove);
    const updatedColors = { ...currentBoardStatusColors };
    delete updatedColors[statusToRemove];

    if (isDefaultBoard) {
      setLocalSettings({
        ...localSettings,
        statuses: updatedStatuses,
        statusColors: updatedColors
      });
    } else {
      const existingBoards = Array.isArray(localSettings.boards) ? localSettings.boards : [];
      setLocalSettings({
        ...localSettings,
        boards: existingBoards.map(b => (b.id === selectedStatusBoardId ? {
          ...b,
          statuses: updatedStatuses,
          statusColors: updatedColors,
          defaultStatus: b.defaultStatus === statusToRemove ? updatedStatuses[0] : b.defaultStatus
        } : b))
      });
    }
    showMsg(`הסטטוס "${statusToRemove}" הוסר מהרשימה הזמנית.`);
  };

  const startEditing = (index, currentValue) => {
    setEditingIndex(index);
    setEditingValue(currentValue);
  };

  const saveEditedStatusName = (index) => {
    const oldValue = currentBoardStatuses[index];
    const newValue = editingValue.trim();
    if (!newValue) return;

    if (oldValue === newValue) {
      setEditingIndex(null);
      return;
    }

    if (currentBoardStatuses.includes(newValue)) {
      showMsg('סטטוס זה כבר קיים ברשימה', 'danger');
      return;
    }

    const updatedStatuses = [...currentBoardStatuses];
    updatedStatuses[index] = newValue;

    const updatedColors = { ...currentBoardStatusColors };
    const colorClass = updatedColors[oldValue] || 'badge-frozen';
    delete updatedColors[oldValue];
    updatedColors[newValue] = colorClass;

    if (isDefaultBoard) {
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
    } else {
      const existingBoards = Array.isArray(localSettings.boards) ? localSettings.boards : [];
      setLocalSettings({
        ...localSettings,
        boards: existingBoards.map(b => (b.id === selectedStatusBoardId ? {
          ...b,
          statuses: updatedStatuses,
          statusColors: updatedColors,
          defaultStatus: b.defaultStatus === oldValue ? newValue : b.defaultStatus
        } : b))
      });
    }
    setEditingIndex(null);
    showMsg(`שם הסטטוס "${oldValue}" שונה ל-"${newValue}"`);
  };

  const handleColorChange = (statusName, newColor) => {
    const updatedColors = {
      ...currentBoardStatusColors,
      [statusName]: newColor
    };

    if (isDefaultBoard) {
      setLocalSettings({
        ...localSettings,
        statusColors: updatedColors
      });
    } else {
      const existingBoards = Array.isArray(localSettings.boards) ? localSettings.boards : [];
      setLocalSettings({
        ...localSettings,
        boards: existingBoards.map(b => (b.id === selectedStatusBoardId ? {
          ...b,
          statuses: currentBoardStatuses,
          statusColors: updatedColors
        } : b))
      });
    }
  };

  const handleDefaultStatusChange = (newDefault) => {
    if (isDefaultBoard) {
      setLocalSettings({
        ...localSettings,
        defaultStatus: newDefault
      });
    } else {
      const existingBoards = Array.isArray(localSettings.boards) ? localSettings.boards : [];
      setLocalSettings({
        ...localSettings,
        boards: existingBoards.map(b => (b.id === selectedStatusBoardId ? {
          ...b,
          statuses: currentBoardStatuses,
          defaultStatus: newDefault
        } : b))
      });
    }
  };

  const handleToggleCustomStatusesForBoard = (enable) => {
    if (isDefaultBoard) return;
    const existingBoards = Array.isArray(localSettings.boards) ? localSettings.boards : [];
    if (enable) {
      setLocalSettings({
        ...localSettings,
        boards: existingBoards.map(b => (b.id === selectedStatusBoardId ? {
          ...b,
          statuses: [...(localSettings.statuses || ['חדש', 'בטיפול', 'נשלח לספק', 'אושר לספק', 'ארכיון'])],
          statusColors: { ...(localSettings.statusColors || {}) },
          defaultStatus: localSettings.defaultStatus || 'חדש'
        } : b))
      });
      showMsg('הופעלה התאמת סטטוסים ייחודיים ללוח זה.');
    } else {
      setLocalSettings({
        ...localSettings,
        boards: existingBoards.map(b => {
          if (b.id !== selectedStatusBoardId) return b;
          const { statuses: _s, statusColors: _sc, defaultStatus: _ds, ...rest } = b;
          return rest;
        })
      });
      showMsg('הלוח הוחזר לשימוש בסטטוסים של לוח ברירת המחדל.');
    }
  };

  // Boards Handlers
  const handleAddBoard = (e) => {
    e.preventDefault();
    const nameTrimmed = newBoardName.trim();
    if (!nameTrimmed) return;

    const existingBoards = Array.isArray(localSettings.boards) ? localSettings.boards : [];
    if (existingBoards.some(b => b.name === nameTrimmed) || nameTrimmed === 'פרויקטים פעילים') {
      showMsg('לוח בשם זה כבר קיים במערכת', 'danger');
      return;
    }

    const newBoard = {
      id: 'board_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      name: nameTrimmed,
      icon: newBoardIcon || '📁',
      createdAt: new Date().toISOString()
    };

    setLocalSettings({
      ...localSettings,
      boards: [...existingBoards.filter(b => b && b.id !== 'active'), newBoard]
    });
    setNewBoardName('');
    showMsg(`הלוח "${nameTrimmed}" נוסף לרשימה הזמנית. יש ללחוץ על "שמירת הגדרות" בסיום.`);
  };

  const handleRemoveBoard = (boardId) => {
    const existingBoards = Array.isArray(localSettings.boards) ? localSettings.boards : [];
    const targetBoard = existingBoards.find(b => b.id === boardId);
    setLocalSettings({
      ...localSettings,
      boards: existingBoards.filter(b => b.id !== boardId)
    });
    showMsg(`הלוח "${targetBoard?.name || ''}" הוסר מהרשימה הזמנית.`);
  };

  const startEditingBoard = (board) => {
    setEditingBoardId(board.id);
    setEditingBoardName(board.name);
    setEditingBoardIcon(board.icon || '📁');
  };

  const saveEditedBoard = (boardId) => {
    const nameTrimmed = editingBoardName.trim();
    if (!nameTrimmed) return;

    if (boardId === 'active') {
      setLocalSettings({
        ...localSettings,
        boardTitle: nameTrimmed,
        boardIcon: editingBoardIcon || '📋'
      });
      setEditingBoardId(null);
      showMsg('פרטי לוח ברירת המחדל עודכנו. יש ללחוץ על "שמירת הגדרות" לשמירה קבועה.');
      return;
    }

    const existingBoards = Array.isArray(localSettings.boards) ? localSettings.boards : [];
    setLocalSettings({
      ...localSettings,
      boards: existingBoards.map(b => (b.id === boardId ? { ...b, name: nameTrimmed, icon: editingBoardIcon || '📁' } : b))
    });
    setEditingBoardId(null);
    showMsg('פרטי הלוח עודכנו ברשימה הזמנית.');
  };

  const handleTaskFieldToggle = (fieldKey, enabled) => {
    const normalizedFields = normalizeNewTaskFields(localSettings.newTaskFields);
    setLocalSettings({
      ...localSettings,
      newTaskFields: {
        ...normalizedFields,
        [fieldKey]: { ...normalizedFields[fieldKey], enabled }
      }
    });
  };

  const handleTaskFieldDefaultChange = (fieldKey, defaultValue) => {
    const normalizedFields = normalizeNewTaskFields(localSettings.newTaskFields);
    setLocalSettings({
      ...localSettings,
      newTaskFields: {
        ...normalizedFields,
        [fieldKey]: { ...normalizedFields[fieldKey], defaultValue }
      }
    });
  };

  const handleTaskFieldConfigChange = (fieldKey, patch) => {
    const normalizedFields = normalizeNewTaskFields(localSettings.newTaskFields);
    setLocalSettings({
      ...localSettings,
      newTaskFields: {
        ...normalizedFields,
        [fieldKey]: { ...normalizedFields[fieldKey], ...patch }
      }
    });
  };

  const handleTaskFieldOptionsChange = (fieldKey, value) => {
    setTaskFieldOptionDrafts(current => ({ ...current, [fieldKey]: value }));
    const options = value.split(',').map(option => option.trim()).filter(Boolean);
    if (options.length === 0) return;
    const normalizedFields = normalizeNewTaskFields(localSettings.newTaskFields);
    const currentDefault = normalizedFields[fieldKey].defaultValue;
    handleTaskFieldConfigChange(fieldKey, {
      options,
      defaultValue: options.includes(currentDefault) ? currentDefault : options[0]
    });
  };

  const statuses = localSettings.statuses || [];

  return (
    <main className="dashboard-container" style={{ maxWidth: '950px', padding: '24px' }}>

      {/* Top Header Row */}
      <div className="flex-between" style={{ marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>⚙️ הגדרות מערכת</h2>
          {organizationName && (
            <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              שדות והעדפות פרויקטים עבור ארגון {organizationName}
            </p>
          )}
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

        {/* Section 0: Organization App Version / Feature Flags */}
        <div className="filter-panel" style={{ border: flags.isV2 ? '1px solid #bfdbfe' : '1px solid #fde68a', background: flags.isV2 ? '#f8faff' : '#fffbeb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '8px' }}>
            <h4 className="detail-section-title" style={{ margin: 0 }}>
              🚀 גרסת מערכת לארגון (Feature Flags)
            </h4>
            <span style={{
              padding: '4px 10px',
              borderRadius: '999px',
              fontWeight: '800',
              fontSize: '0.8rem',
              background: flags.isV2 ? '#dbeafe' : '#fef3c7',
              color: flags.isV2 ? '#1e40af' : '#92400e'
            }}>
              {flags.isV2 ? '✨ גרסה 2 (חדשה)' : '🏛️ גרסה קלאסית (Legacy)'}
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '14px' }}>
            קביעת גרסת המערכת והפיצ'רים שיוצגו לכלל משתמשי הארגון. ארגוני Legacy רואים את הממשק הקלאסי (לוח יחיד, מינוח עבודות).
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              borderRadius: '8px',
              background: '#ffffff',
              border: `2px solid ${flags.isV2 ? 'var(--primary)' : 'var(--border)'}`,
              cursor: 'pointer',
              flex: 1,
              minWidth: '220px'
            }}>
              <input
                type="radio"
                name="orgAppVersion"
                value={APP_VERSIONS.V2}
                checked={flags.isV2}
                onChange={() => setLocalSettings({ ...localSettings, appVersion: APP_VERSIONS.V2 })}
              />
              <div>
                <strong style={{ display: 'block', fontSize: '0.88rem', color: '#1e293b' }}>✨ גרסה חדשה (v2)</strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>לוחות פרויקטים מרובים, עיצוב מודרני ומינוח פרויקטים</span>
              </div>
            </label>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              borderRadius: '8px',
              background: '#ffffff',
              border: `2px solid ${flags.isLegacy ? '#d97706' : 'var(--border)'}`,
              cursor: 'pointer',
              flex: 1,
              minWidth: '220px'
            }}>
              <input
                type="radio"
                name="orgAppVersion"
                value={APP_VERSIONS.LEGACY}
                checked={flags.isLegacy}
                onChange={() => setLocalSettings({ ...localSettings, appVersion: APP_VERSIONS.LEGACY })}
              />
              <div>
                <strong style={{ display: 'block', fontSize: '0.88rem', color: '#1e293b' }}>🏛️ גרסה קלאסית (Legacy)</strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>לוח יחיד, ממשק קלאסי ומינוח עבודות</span>
              </div>
            </label>
          </div>
        </div>

        {/* Section 1: Dashboard Details */}
        <div className="filter-panel">
          <h4 className="detail-section-title">🖥️ נראות הלוח</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
            הגדרת מאפייני הכותרת והתצוגה הכלליים של לוח ה{flags.terms.items}.
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
              <span>הסתרת שעות עבודה ב{flags.terms.item}</span>
            </label>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '4px 0 0 26px' }}>
              כאשר מסומן, כרטיס "שעות עבודה" לא יופיע בפרטי ה{flags.terms.item} וכפתור "סיכום שעות" יוסתר.
            </p>
          </div>

        </div>

        {/* Section 2: Auto Archive */}
        <div className="filter-panel">
          <h4 className="detail-section-title">🗄️ ארכוב אוטומטי</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
            הגדרת מספר הימים ללא שינוי או עדכון ב{flags.terms.item}, שלאחריהם הוא יעבור אוטומטית לארכיון.
          </p>

          <div className="form-group" style={{ maxWidth: '320px' }}>
            <label className="form-label">מספר ימים עד העברה לארכיון</label>
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
          </div>
        </div>

        <div className="filter-panel">
          <h4 className="detail-section-title">🧩 שדות {flags.terms.item} חדש</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
            התאמת שם, סגנון, אפשרויות וברירת מחדל של השדות שיופיעו לכל משתמשי הארגון.
          </p>
          <div style={{ display: 'grid', gap: '10px' }}>
            {NEW_TASK_FIELD_DEFINITIONS.map(field => {
              const config = normalizeNewTaskFields(localSettings.newTaskFields)[field.key];
              return (
                <div key={field.key} style={{
                  display: 'grid',
                  gap: '12px',
                  padding: '13px 14px',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  background: config.enabled ? '#ffffff' : '#f8fafc'
                }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={config.enabled !== false}
                      onChange={(event) => handleTaskFieldToggle(field.key, event.target.checked)}
                      style={{ width: '18px', height: '18px', marginTop: '2px' }}
                    />
                    <span>
                      <strong style={{ display: 'block', color: '#1e293b' }}>{field.label}</strong>
                      {field.description && (
                        <span style={{ display: 'block', color: '#64748b', fontSize: '0.8rem', marginTop: '3px' }}>{field.description}</span>
                      )}
                    </span>
                  </label>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                    gap: '10px',
                    alignItems: 'end',
                    opacity: config.enabled === false ? 0.55 : 1
                  }}>
                    <label style={{ color: '#475569', fontSize: '0.82rem', fontWeight: '700' }}>
                      שם השדה
                      <input
                        className="form-control"
                        value={config.label}
                        onChange={(event) => handleTaskFieldConfigChange(field.key, { label: event.target.value })}
                        disabled={config.enabled === false}
                        style={{ marginTop: '5px' }}
                      />
                    </label>

                    <label style={{ color: '#475569', fontSize: '0.82rem', fontWeight: '700' }}>
                      סגנון תצוגה
                      <select
                        className="form-control"
                        value={config.style}
                        onChange={(event) => handleTaskFieldConfigChange(field.key, { style: event.target.value })}
                        disabled={config.enabled === false}
                        style={{ marginTop: '5px' }}
                      >
                        {NEW_TASK_FIELD_STYLES.map(style => <option key={style.value} value={style.value}>{style.label}</option>)}
                      </select>
                    </label>

                    {field.options && (
                      <label style={{ color: '#475569', fontSize: '0.82rem', fontWeight: '700' }}>
                        אפשרויות בחירה
                        <input
                          className="form-control"
                          value={taskFieldOptionDrafts[field.key] ?? (config.options || field.options).join(', ')}
                          onChange={(event) => handleTaskFieldOptionsChange(field.key, event.target.value)}
                          disabled={config.enabled === false}
                          style={{ marginTop: '5px' }}
                          placeholder="הפרדה באמצעות פסיק"
                        />
                      </label>
                    )}

                    {field.options && (
                      <label style={{ color: '#475569', fontSize: '0.82rem', fontWeight: '700' }}>
                        ברירת מחדל
                        <select
                          className="form-control"
                          value={config.defaultValue}
                          onChange={(event) => handleTaskFieldDefaultChange(field.key, event.target.value)}
                          disabled={config.enabled === false}
                          style={{ marginTop: '5px' }}
                        >
                          {(config.options || field.options).map(option => <option key={option} value={option}>{option}</option>)}
                        </select>
                      </label>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3: Statuses List Management */}
        <div className="filter-panel">
          <h4 id="status-section-title" className="detail-section-title">🔄 ניהול סטטוסים וצבעי אינדיקציה</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
            הוספה, הסרה, שינוי שם ובחירת צבע עבור שלבי הפרויקט. ניתן להגדיר סטטוסים שונים ונפרדים לכל לוח.
          </p>

          {/* Board selector for status editing - only when custom boards enabled */}
          {flags.enableCustomBoards && (
            <div style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ fontSize: '0.85rem', marginBottom: '8px' }}>בחירת לוח להגדרת סטטוסים:</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {availableBoardsForStatuses.map(b => {
                  const isSelected = selectedStatusBoardId === b.id;
                  const isCustomBoardWithCustomStatuses = b.id !== 'active' && Array.isArray(b.statuses) && b.statuses.length > 0;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                      style={{
                        padding: '7px 14px',
                        fontSize: '0.85rem',
                        fontWeight: isSelected ? '700' : '500',
                        borderRadius: '8px'
                      }}
                      onClick={() => {
                        setSelectedStatusBoardId(b.id);
                        setEditingIndex(null);
                      }}
                    >
                      {b.icon ? `${b.icon} ` : ''}{b.name}
                      {isCustomBoardWithCustomStatuses && (
                        <span style={{ marginInlineStart: '6px', fontSize: '0.72rem', opacity: 0.85, padding: '1px 5px', borderRadius: '4px', background: isSelected ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.08)' }}>
                          מותאם אישית
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Custom Statuses Info / Toggle banner for non-default boards */}
          {!isDefaultBoard && (
            <div style={{
              padding: '12px 16px',
              marginBottom: '16px',
              borderRadius: 'var(--radius-md)',
              background: hasCustomStatuses ? '#f0fdf4' : '#f8fafc',
              border: `1px solid ${hasCustomStatuses ? '#bbf7d0' : 'var(--border)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div>
                <strong style={{ display: 'block', fontSize: '0.85rem', color: hasCustomStatuses ? '#166534' : '#334155' }}>
                  {hasCustomStatuses ? '✨ לוח זה מוגדר עם סטטוסים מותאמים אישית' : 'ℹ️ לוח זה משתמש כרגע בסטטוסים של לוח ברירת המחדל'}
                </strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {hasCustomStatuses
                    ? 'שינויים ברשימה זו ישפיעו אך ורק על לוח זה.'
                    : 'באפשרותך להגדיר סטטוסים ייחודיים עבור לוח זה או להמשיך להשתמש בסטטוסי המערכת.'}
                </span>
              </div>
              {hasCustomStatuses ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '5px 10px' }}
                  onClick={() => handleToggleCustomStatusesForBoard(false)}
                >
                  ↩ איפוס וחזרה לסטטוסים גלובליים
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ fontSize: '0.8rem', padding: '5px 10px' }}
                  onClick={() => handleToggleCustomStatusesForBoard(true)}
                >
                  ⚙️ התאם אישית סטטוסים ללוח זה
                </button>
              )}
            </div>
          )}

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
                {currentBoardStatuses.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', padding: '16px' }}>
                      אין סטטוסים מוגדרים ללוח זה.
                    </td>
                  </tr>
                ) : (
                  currentBoardStatuses.map((st, index) => {
                    const isEditing = editingIndex === index;
                    const currentColor = currentBoardStatusColors[st] || 'badge-frozen';

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
              <label className="form-label" style={{ fontSize: '0.8rem' }}>שם סטטוס חדש ללוח נבחר</label>
              <input
                type="text"
                className="form-control"
                placeholder="לדוגמה: בדיקות QA, מוכן לייצור..."
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
                <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }} disabled={saving || !newStatusName.trim()}>
                  ➕ הוספה
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Section 4: Default Workflow Settings */}
        <div className="filter-panel">
          <h4 className="detail-section-title">
            ⚙️ סטטוס ברירת מחדל {flags.enableCustomBoards ? (isDefaultBoard ? `(${defaultBoardName})` : `(${selectedBoardObj?.name || ''})`) : ''}
          </h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '12px' }}>
            הסטטוס שיוקצה אוטומטית לכל {flags.terms.item} חדש שנוצר{flags.enableCustomBoards ? ' בלוח הנבחר' : ''}.
          </p>
          <div className="form-group" style={{ maxWidth: '350px' }}>
            <select
              className="form-control"
              value={currentBoardDefaultStatus}
              onChange={(e) => handleDefaultStatusChange(e.target.value)}
            >
              {currentBoardStatuses.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Section 5: Boards Management (v2 only) */}
        {flags.enableCustomBoards && (
          <div className="filter-panel">
            <h4 className="detail-section-title">📋 {flags.terms.boardManagement} במערכת</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
              ניהול הלוחות המוצגים בסרגל הראשי. לוח "{defaultBoardName}" הוא לוח ברירת המחדל.
            </p>

            <div className="table-container" style={{ marginBottom: '20px' }}>
              <table className="task-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>אייקון</th>
                    <th>שם הלוח</th>
                    <th style={{ width: '180px' }}>סוג וסטטוסים</th>
                    <th style={{ width: '170px' }}>פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Default Board */}
                  <tr>
                    <td style={{ fontSize: '1.2rem', textAlign: 'center' }}>
                      {editingBoardId === 'active' ? (
                        <select
                          className="form-control"
                          style={{ padding: '2px 4px', fontSize: '1rem', width: '60px' }}
                          value={editingBoardIcon}
                          onChange={e => setEditingBoardIcon(e.target.value)}
                        >
                          {PRESET_BOARD_ICONS.map(ic => (
                            <option key={ic} value={ic}>{ic}</option>
                          ))}
                        </select>
                      ) : (
                        defaultBoardIcon
                      )}
                    </td>
                    <td style={{ fontWeight: '700' }}>
                      {editingBoardId === 'active' ? (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="text"
                            className="form-control"
                            value={editingBoardName}
                            onChange={e => setEditingBoardName(e.target.value)}
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === 'Enter') saveEditedBoard('active');
                              if (e.key === 'Escape') setEditingBoardId(null);
                            }}
                          />
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                            onClick={() => saveEditedBoard('active')}
                          >
                            שמור
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                            onClick={() => setEditingBoardId(null)}
                          >
                            ביטול
                          </button>
                        </div>
                      ) : (
                        defaultBoardName
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '999px', background: '#dbeafe', color: '#1e40af', fontWeight: '700' }}>
                        ברירת מחדל ראשית
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {editingBoardId !== 'active' && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '3px 8px', fontSize: '0.78rem' }}
                            onClick={() => startEditingBoard({ id: 'active', name: defaultBoardName, icon: defaultBoardIcon })}
                          >
                            ✏️ עריכה
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '3px 8px', fontSize: '0.78rem' }}
                          onClick={() => {
                            setSelectedStatusBoardId('active');
                            const el = document.getElementById('status-section-title');
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                          }}
                        >
                          🔄 סטטוסים
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Custom Boards */}
                  {(localSettings.boards || []).filter(b => b && b.id !== 'active').map(board => {
                    const isEditing = editingBoardId === board.id;
                    const isCustomStatus = Array.isArray(board.statuses) && board.statuses.length > 0;
                    return (
                      <tr key={board.id}>
                        <td style={{ fontSize: '1.2rem', textAlign: 'center' }}>
                          {isEditing ? (
                            <select
                              className="form-control"
                              style={{ padding: '2px 4px', fontSize: '1rem', width: '60px' }}
                              value={editingBoardIcon}
                              onChange={e => setEditingBoardIcon(e.target.value)}
                            >
                              {PRESET_BOARD_ICONS.map(ic => (
                                <option key={ic} value={ic}>{ic}</option>
                              ))}
                            </select>
                          ) : (
                            board.icon || '📁'
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <input
                                type="text"
                                className="form-control"
                                value={editingBoardName}
                                onChange={e => setEditingBoardName(e.target.value)}
                                autoFocus
                                onKeyDown={e => {
                                  if (e.key === 'Enter') saveEditedBoard(board.id);
                                  if (e.key === 'Escape') setEditingBoardId(null);
                                }}
                              />
                              <button
                                type="button"
                                className="btn btn-primary"
                                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                onClick={() => saveEditedBoard(board.id)}
                              >
                                שמור
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                onClick={() => setEditingBoardId(null)}
                              >
                                ביטול
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontWeight: '600' }}>{board.name}</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                            <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '999px', background: '#f1f5f9', color: '#475569', fontWeight: '600' }}>
                              לוח מותאם אישית
                            </span>
                            <span style={{ fontSize: '0.72rem', color: isCustomStatus ? '#166534' : 'var(--text-muted)', fontWeight: isCustomStatus ? '700' : '500' }}>
                              {isCustomStatus ? `✨ סטטוסים ייחודיים (${board.statuses.length})` : '🌐 סטטוסים גלובליים'}
                            </span>
                          </div>
                        </td>
                        <td>
                          {!isEditing && (
                            <div className="actions-cell">
                              <button
                                type="button"
                                className="btn btn-secondary btn-icon"
                                style={{ padding: '4px' }}
                                title="עריכת סטטוסי לוח"
                                onClick={() => {
                                  setSelectedStatusBoardId(board.id);
                                  const el = document.getElementById('status-section-title');
                                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                                }}
                              >
                                🔄
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-icon"
                                style={{ padding: '4px' }}
                                title="עריכת לוח"
                                onClick={() => startEditingBoard(board)}
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                className="btn btn-danger btn-icon"
                                style={{ padding: '4px' }}
                                title="מחיקת לוח"
                                onClick={() => handleRemoveBoard(board.id)}
                              >
                                🗑️
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Add Board Form */}
            <form onSubmit={handleAddBoard} className="form-grid-2col" style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>שם לוח חדש</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="לדוגמה: דפוס, מיתוג, סניף צפון..."
                  value={newBoardName}
                  onChange={e => setNewBoardName(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>אייקון לוח</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <select
                    className="form-control"
                    value={newBoardIcon}
                    onChange={e => setNewBoardIcon(e.target.value)}
                    style={{ width: '80px', fontSize: '1.1rem' }}
                  >
                    {PRESET_BOARD_ICONS.map(ic => (
                      <option key={ic} value={ic}>{ic}</option>
                    ))}
                  </select>
                  <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }} disabled={saving || !newBoardName.trim()}>
                    ➕ הוספת לוח
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

      </div>

      {/* Floating Save Panel at the bottom */}
      <div className="filter-panel flex-between" style={{ marginTop: '24px', backgroundColor: '#f8fafc' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          שמירת ההגדרות תעדכן את טופס ה{flags.terms.item} והלוח עבור כלל משתמשי הארגון באופן מיידי.
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
