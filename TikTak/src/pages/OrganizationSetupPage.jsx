import { useState, useMemo } from 'react';
import { completeOrganizationSetup } from '../utils/storage';
import { APP_VERSIONS } from '../utils/featureFlags';
import { DEFAULT_NEW_TASK_FIELDS, normalizeNewTaskFields, createCustomFieldConfig, FIELD_TYPES } from '../data/taskFieldConfig';
import IconPickerModal from '../components/IconPickerModal';

const POPULAR_BOARD_ICONS = ['📋', '📁', '🚀', '🎨', '🏷️', '💡', '🏗️', '📦', '💻', '🎯', '⭐', '⚡'];

const STATUS_COLOR_OPTIONS = [
  { label: 'כחול', value: 'badge-new', color: '#2563eb' },
  { label: 'כתום', value: 'badge-in-progress', color: '#ea580c' },
  { label: 'צהוב', value: 'badge-waiting-approval', color: '#d97706' },
  { label: 'ירוק', value: 'badge-approved', color: '#16a34a' },
  { label: 'סגול', value: 'badge-purple', color: '#9333ea' },
  { label: 'אפור (ארכיון)', value: 'badge-archive', color: '#64748b' }
];

const PROJECT_CARD_FIELD_DEFAULTS = [
  { key: 'contactPerson', icon: '👤', defaultLabel: 'איש קשר', typeLabel: 'טקסט קצר', hint: 'שם איש קשר, לקוח או מנהל תיק' },
  { key: 'contactPhone', icon: '📞', defaultLabel: 'טלפון איש קשר', typeLabel: 'טלפון', hint: 'מספר טלפון ליצירת קשר ובירורים' },
  { key: 'supplierContactEmail', icon: '✉️', defaultLabel: 'אימייל איש קשר', typeLabel: 'אימייל', hint: 'כתובת דוא"ל לעדכונים ודיוור' },
  { key: 'description', icon: '📝', defaultLabel: 'תיאור ופרטים נוספים', typeLabel: 'טקסט ארוך', hint: 'הנחיות, דגשים ופירוט העבודה' },
  { key: 'internalNotes', icon: '🔒', defaultLabel: 'הערות פנימיות', typeLabel: 'טקסט ארוך', hint: 'הערות גלויות לצוות הארגון בלבד' },
  { key: 'workOrderFiles', icon: '📋', defaultLabel: 'הזמנת עבודה', typeLabel: 'העלאת קבצים', hint: 'הזמנה, חוזה, בריף או קבצים מצורפים' },
  { key: 'planogramFile', icon: '🗺️', defaultLabel: 'פלנוגרמה', typeLabel: 'קובץ תוכנית', hint: 'שרטוט, סקיצה או תוכנית עבודה' },
  { key: 'standardsInstituteRequired', icon: '🏛️', defaultLabel: 'דרישות מכון תקנים', typeLabel: 'בחירה (כן/לא)', hint: 'סימון האם נדרש אישור תקינה' },
  { key: 'diecutsStatus', icon: '📐', defaultLabel: 'דייקאטים', typeLabel: 'בחירה', hint: 'סטטוס דייקאטים או שבלונות' },
  { key: 'imagesStatus', icon: '🖼️', defaultLabel: 'תמונות', typeLabel: 'בחירה', hint: 'קבצי מדיה ותמונות' }
];

const SETUP_STEPS = [
  { id: 'org', label: 'פרטי ארגון', icon: '🏢', stepNum: 1, subtitle: 'שם ופרטי קשר' },
  { id: 'boards', label: 'לוחות פרויקטים', icon: '📋', stepNum: 2, subtitle: 'ניהול לוחות' },
  { id: 'statuses', label: 'שלבי עבודה', icon: '🔄', stepNum: 3, subtitle: 'התאמת סטטוסים' },
  { id: 'fields', label: 'שדות כרטיס', icon: '🧩', stepNum: 4, subtitle: 'שמות ואייקונים' },
  { id: 'archive', label: 'ארכוב אוטומטי', icon: '🗄️', stepNum: 5, subtitle: 'שמירה על סדר' }
];

export default function OrganizationSetupPage({
  organizationId,
  initialOrganizationName = '',
  userEmail = '',
  userName = '',
  initialSettings = null,
  onLogout,
  onComplete
}) {
  const [activeTab, setActiveTab] = useState('org'); // 'org' | 'boards' | 'statuses' | 'fields' | 'archive'
  const [orgName, setOrgName] = useState(initialOrganizationName || '');
  const [contactName, setContactName] = useState(userName || '');
  const [contactPhone, setContactPhone] = useState('');
  
  // Board settings
  const [mainBoardName, setMainBoardName] = useState(initialSettings?.boardTitle || 'פרויקטים פעילים');
  const [mainBoardIcon, setMainBoardIcon] = useState(initialSettings?.boardIcon || '📋');
  const [extraBoards, setExtraBoards] = useState(initialSettings?.boards || []);
  const [newExtraBoardName, setNewExtraBoardName] = useState('');
  const [newExtraBoardIcon, setNewExtraBoardIcon] = useState('📁');

  // Statuses
  const [statuses, setStatuses] = useState(initialSettings?.statuses || ['חדש', 'בטיפול', 'נשלח לספק', 'אושר לספק', 'ארכיון']);
  const [defaultStatus, setDefaultStatus] = useState(initialSettings?.defaultStatus || 'חדש');
  const [statusColors, setStatusColors] = useState(initialSettings?.statusColors || {
    'חדש': 'badge-new',
    'בטיפול': 'badge-in-progress',
    'נשלח לספק': 'badge-waiting-approval',
    'אושר לספק': 'badge-approved',
    'ארכיון': 'badge-archive'
  });
  const [newStatusInput, setNewStatusInput] = useState('');
  const [editingStatusIndex, setEditingStatusIndex] = useState(null);
  const [editingStatusDraft, setEditingStatusDraft] = useState('');

  // Fields
  const [fields, setFields] = useState(() => {
    return normalizeNewTaskFields(initialSettings?.newTaskFields || DEFAULT_NEW_TASK_FIELDS);
  });
  const [hideWeeklyHours, setHideWeeklyHours] = useState(initialSettings?.hideWeeklyHours || false);
  const [newCustomFieldName, setNewCustomFieldName] = useState('');
  const [newCustomFieldType, setNewCustomFieldType] = useState('text');
  const [newCustomFieldIcon, setNewCustomFieldIcon] = useState('✨');

  // Icon Picker State
  const [iconPickerState, setIconPickerState] = useState({
    isOpen: false,
    title: 'בחירת אייקון',
    currentIcon: '📋',
    defaultIcon: '📋',
    onSelect: null
  });

  const openIconPicker = ({ title, currentIcon, defaultIcon, onSelect }) => {
    setIconPickerState({
      isOpen: true,
      title: title || 'בחירת אייקון',
      currentIcon: currentIcon || '📋',
      defaultIcon: defaultIcon || currentIcon || '📋',
      onSelect
    });
  };

  const closeIconPicker = () => {
    setIconPickerState(prev => ({ ...prev, isOpen: false }));
  };

  // Auto-Archive
  const [autoArchiveDays, setAutoArchiveDays] = useState(initialSettings?.autoArchiveInactiveDays ?? 45);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Current Step Calculation
  const currentStepIndex = useMemo(() => {
    return SETUP_STEPS.findIndex(s => s.id === activeTab);
  }, [activeTab]);

  const progressPercent = useMemo(() => {
    return Math.round(((currentStepIndex + 1) / SETUP_STEPS.length) * 100);
  }, [currentStepIndex]);

  const handleAddExtraBoard = () => {
    if (!newExtraBoardName.trim()) return;
    const newBoard = {
      id: `board_${Date.now()}`,
      name: newExtraBoardName.trim(),
      icon: newExtraBoardIcon || '📁',
      color: '#3b82f6'
    };
    setExtraBoards([...extraBoards, newBoard]);
    setNewExtraBoardName('');
  };

  const handleRemoveExtraBoard = (id) => {
    setExtraBoards(extraBoards.filter(b => b.id !== id));
  };

  const handleAddStatus = () => {
    const trimmed = newStatusInput.trim();
    if (!trimmed) return;
    if (statuses.includes(trimmed)) {
      setError('סטטוס זה כבר קיים ברשימה.');
      return;
    }
    setError('');
    setStatuses([...statuses, trimmed]);
    setStatusColors({ ...statusColors, [trimmed]: 'badge-in-progress' });
    setNewStatusInput('');
  };

  const handleStartRenameStatus = (index) => {
    setEditingStatusIndex(index);
    setEditingStatusDraft(statuses[index] || '');
    setError('');
  };

  const handleSaveStatusRename = (index) => {
    const oldName = statuses[index];
    const newName = editingStatusDraft.trim();
    if (!newName) {
      setError('שם הסטטוס אינו יכול להיות ריק.');
      return;
    }
    if (newName !== oldName && statuses.includes(newName)) {
      setError(`הסטטוס "${newName}" כבר קיים ברשימה.`);
      return;
    }
    setError('');
    const updatedStatuses = [...statuses];
    updatedStatuses[index] = newName;
    setStatuses(updatedStatuses);

    // Update statusColors
    const updatedColors = { ...statusColors };
    const prevColor = updatedColors[oldName] || 'badge-in-progress';
    delete updatedColors[oldName];
    updatedColors[newName] = prevColor;
    setStatusColors(updatedColors);

    // Update defaultStatus if needed
    if (defaultStatus === oldName) {
      setDefaultStatus(newName);
    }

    setEditingStatusIndex(null);
    setEditingStatusDraft('');
  };

  const handleCancelStatusRename = () => {
    setEditingStatusIndex(null);
    setEditingStatusDraft('');
  };

  const handleRemoveStatus = (statusName) => {
    if (statuses.length <= 1) {
      setError('חייב להישאר לפחות סטטוס אחד במערכת.');
      return;
    }
    setError('');
    const updated = statuses.filter(s => s !== statusName);
    setStatuses(updated);
    if (defaultStatus === statusName) {
      setDefaultStatus(updated[0]);
    }
    if (editingStatusIndex !== null) {
      setEditingStatusIndex(null);
      setEditingStatusDraft('');
    }
  };

  const handleToggleField = (fieldKey) => {
    setFields(prev => ({
      ...prev,
      [fieldKey]: {
        ...(prev[fieldKey] || {}),
        enabled: prev[fieldKey]?.enabled !== undefined ? !prev[fieldKey].enabled : false
      }
    }));
  };

  const handleFieldLabelChange = (fieldKey, newLabel) => {
    setFields(prev => ({
      ...prev,
      [fieldKey]: {
        ...(prev[fieldKey] || {}),
        label: newLabel
      }
    }));
  };

  const handleFieldIconChange = (fieldKey, newIcon) => {
    setFields(prev => ({
      ...prev,
      [fieldKey]: {
        ...(prev[fieldKey] || {}),
        icon: newIcon
      }
    }));
  };

  const handleAddCustomField = () => {
    const trimmed = newCustomFieldName.trim();
    if (!trimmed) return;
    const newField = createCustomFieldConfig({
      label: trimmed,
      type: newCustomFieldType,
      icon: newCustomFieldIcon || '✨'
    });
    setFields(prev => ({
      ...prev,
      [newField.key]: newField
    }));
    setNewCustomFieldName('');
    setNewCustomFieldIcon('✨');
  };

  const handleRemoveCustomField = (fieldKey) => {
    setFields(prev => {
      const updated = { ...prev };
      delete updated[fieldKey];
      return updated;
    });
  };

  const handleSaveAndFinish = async () => {
    if (!orgName.trim()) {
      setError('יש להזין שם עבור הארגון.');
      setActiveTab('org');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const finalSettings = {
        ...(initialSettings || {}),
        boardTitle: mainBoardName.trim() || 'פרויקטים פעילים',
        boardIcon: mainBoardIcon || '📋',
        boards: extraBoards,
        boardOrder: extraBoards.map(b => b.id),
        statuses,
        defaultStatus: statuses.includes(defaultStatus) ? defaultStatus : statuses[0],
        statusColors,
        newTaskFields: fields,
        hideWeeklyHours,
        autoArchiveInactiveDays: autoArchiveDays,
        appVersion: APP_VERSIONS.V2, // Guarantee V2
        updatedAt: new Date().toISOString()
      };

      let effectiveOrgId = organizationId;
      if (!effectiveOrgId) {
        const { auth } = await import('../firebase');
        const { registerNewOrganizationAndUser } = await import('../utils/storage');
        const result = await registerNewOrganizationAndUser({
          user: auth.currentUser,
          organizationName: orgName.trim(),
          displayName: contactName.trim(),
          contactName: contactName.trim(),
          contactPhone: contactPhone.trim(),
          setupCompleted: true,
          initialSettings: finalSettings
        });
        effectiveOrgId = result.organization.id;
      } else {
        await completeOrganizationSetup(effectiveOrgId, {
          organizationName: orgName.trim(),
          settings: finalSettings,
          contactName: contactName.trim(),
          contactPhone: contactPhone.trim()
        });
      }

      if (onComplete) {
        onComplete(effectiveOrgId, orgName.trim(), finalSettings);
      }
    } catch (err) {
      console.error('Failed to complete organization setup:', err);
      setError('שמירת ההגדרות נכשלה. אנא נסו שוב.');
      setSaving(false);
    }
  };

  return (
    <div className="setup-page-wrapper" style={{
      minHeight: '100vh',
      backgroundColor: '#f1f5f9',
      backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
      backgroundSize: '24px 24px',
      padding: '32px 16px 48px',
      direction: 'rtl',
      fontFamily: 'Rubik, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <style>{`
        .setup-card-container {
          max-width: 900px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 20px;
          box-shadow: 0 12px 36px -4px rgba(15, 23, 42, 0.08), 0 4px 12px -2px rgba(15, 23, 42, 0.03);
          border: 1px solid #e2e8f0;
          overflow: hidden;
          transition: all 0.25s ease;
        }

        .setup-header-bg {
          position: relative;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #1e3a8a 100%);
          color: #ffffff;
          padding: 32px 28px 28px;
          overflow: hidden;
        }

        .setup-header-glow {
          position: absolute;
          top: -60px;
          left: -40px;
          width: 240px;
          height: 240px;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.25) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
        }

        .setup-step-btn {
          position: relative;
          flex: 1;
          min-width: 120px;
          padding: 14px 10px;
          border: none;
          background: transparent;
          cursor: pointer;
          font-family: inherit;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          transition: all 0.2s ease;
          border-bottom: 3px solid transparent;
        }

        .setup-step-btn:hover:not(.active) {
          background-color: rgba(241, 245, 249, 0.6);
        }

        .setup-step-btn.active {
          background-color: #ffffff;
          border-bottom: 3px solid #2563eb;
        }

        .setup-step-number {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          font-weight: 700;
          transition: all 0.2s;
        }

        .setup-input {
          width: 100%;
          padding: 10px 14px;
          border-radius: 9px;
          border: 1px solid #cbd5e1;
          font-size: 0.92rem;
          color: #1e293b;
          font-family: inherit;
          transition: all 0.15s ease;
          box-sizing: border-box;
          background-color: #ffffff;
        }

        .setup-input:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3.5px rgba(37, 99, 235, 0.15);
        }

        .field-card-item {
          transition: all 0.2s ease;
        }

        .field-card-item:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          transform: translateY(-1px);
        }

        .icon-hover-btn {
          transition: all 0.15s ease;
        }
        .icon-hover-btn:hover {
          transform: scale(1.08);
          border-color: #2563eb !important;
          background-color: #eff6ff !important;
        }

        .primary-action-btn {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          color: #ffffff;
          border: none;
          border-radius: 11px;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 28px;
          font-family: inherit;
        }

        .primary-action-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(37, 99, 235, 0.45);
        }

        .primary-action-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .pipeline-node {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        @keyframes pulseTrial {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.88; transform: scale(0.98); }
        }
      `}</style>

      <div className="setup-card-container">
        {/* Header with Dark Gradient & Atmospheric Glow */}
        <div className="setup-header-bg">
          <div className="setup-header-glow" />

          {onLogout && (
            <button
              onClick={onLogout}
              type="button"
              style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                color: '#e2e8f0',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: '9px',
                padding: '7px 14px',
                fontSize: '0.84rem',
                fontWeight: '500',
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backdropFilter: 'blur(6px)',
                transition: 'all 0.2s ease'
              }}
              title="התנתקות מהחשבון"
            >
              <span>🚪</span>
              <span>התנתקות</span>
            </button>
          )}

          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid rgba(96, 165, 250, 0.35)',
              borderRadius: '999px',
              padding: '4px 14px',
              fontSize: '0.8rem',
              color: '#93c5fd',
              fontWeight: '600',
              marginBottom: '12px'
            }}>
              <span>⚡</span>
              <span>TikTak • אשף הקמת ארגון חדש</span>
            </div>

            <h1 style={{ margin: '0 0 8px 0', fontSize: '1.75rem', fontWeight: '800', letterSpacing: '-0.02em', color: '#ffffff' }}>
              ברוכים הבאים! בואו נגדיר את הארגון שלכם
            </h1>
            <p style={{ margin: '0 0 18px 0', color: '#cbd5e1', fontSize: '0.94rem', lineHeight: '1.5' }}>
              התאימו את המערכת לצורכי הסטודיו או העסק שלכם תוך 2 דקות בלבד.
            </p>

            {/* 1-Month Free Trial Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: 'rgba(30, 58, 138, 0.55)',
              border: '1px solid rgba(147, 197, 253, 0.45)',
              borderRadius: '999px',
              padding: '8px 20px',
              fontSize: '0.9rem',
              color: '#dbeafe',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)'
            }}>
              <span style={{ fontSize: '1.2rem', animation: 'pulseTrial 2.5s infinite ease-in-out' }}>🎁</span>
              <strong style={{ color: '#ffffff' }}>חודש ניסיון מלא מופעל כעת:</strong>
              <span>30 ימי גישה מלאה ללא עלות וללא צורך בהזנת כרטיס אשראי.</span>
            </div>
          </div>
        </div>

        {/* Dynamic Progress Bar */}
        <div style={{ backgroundColor: '#e2e8f0', height: '4px', width: '100%' }}>
          <div style={{
            height: '100%',
            width: `${progressPercent}%`,
            background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }} />
        </div>

        {/* Stepper Tabs Bar */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#f8fafc',
          overflowX: 'auto'
        }}>
          {SETUP_STEPS.map((step, idx) => {
            const isActive = activeTab === step.id;
            const isCompleted = idx < currentStepIndex;

            return (
              <button
                key={step.id}
                type="button"
                className={`setup-step-btn ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(step.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    className="setup-step-number"
                    style={{
                      backgroundColor: isActive ? '#2563eb' : (isCompleted ? '#16a34a' : '#e2e8f0'),
                      color: isActive || isCompleted ? '#ffffff' : '#64748b'
                    }}
                  >
                    {isCompleted ? '✓' : step.stepNum}
                  </span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: '0.88rem',
                      fontWeight: isActive ? '700' : '600',
                      color: isActive ? '#1e40af' : (isCompleted ? '#334155' : '#64748b')
                    }}>
                      {step.label}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                      {step.subtitle}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div style={{ padding: '28px 32px' }}>
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 18px',
              backgroundColor: '#fee2e2',
              border: '1px solid #fca5a5',
              borderRadius: '10px',
              color: '#991b1b',
              marginBottom: '24px',
              fontSize: '0.92rem',
              fontWeight: '500'
            }}>
              <span style={{ fontSize: '1.2rem' }}>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: Organization Details */}
          {activeTab === 'org' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '22px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>
                    🏢 פרטי הארגון והעסק
                  </h3>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                    שם הארגון יופיע בכותרת המערכת, בראש כרטיסי הפרויקטים ובדוחות המופקים.
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                {/* Inputs Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '0.88rem', color: '#334155' }}>
                      שם הארגון / הסטודיו <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        className="setup-input"
                        value={orgName}
                        onChange={(e) => { setOrgName(e.target.value); setError(''); }}
                        placeholder="למשל: סטודיו רקפת, מיתוג פלוס, משרד עיצוב..."
                        autoFocus
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '0.88rem', color: '#334155' }}>
                      שם מנהל/ת הארגון
                    </label>
                    <input
                      type="text"
                      className="setup-input"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="שם מלא של מנהל/ת המערכת"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '0.88rem', color: '#334155' }}>
                      טלפון ליצירת קשר
                    </label>
                    <input
                      type="tel"
                      className="setup-input"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="050-0000000"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '0.88rem', color: '#334155' }}>
                      כתובת אימייל משויכת
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="email"
                        className="setup-input"
                        value={userEmail}
                        disabled
                        style={{ backgroundColor: '#f8fafc', color: '#64748b', cursor: 'not-allowed', direction: 'ltr', textAlign: 'right' }}
                      />
                      <span style={{ fontSize: '0.78rem', backgroundColor: '#e2e8f0', color: '#475569', padding: '4px 8px', borderRadius: '6px', whiteSpace: 'nowrap', fontWeight: '600' }}>
                        🔒 מחובר
                      </span>
                    </div>
                  </div>
                </div>

                {/* Info Card Column */}
                <div style={{
                  padding: '20px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '16px'
                }}>
                  <div>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '0.98rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>💡</span>
                      <span>למה מיועדים פרטים אלו?</span>
                    </h4>
                    <p style={{ margin: '0 0 12px 0', fontSize: '0.86rem', color: '#64748b', lineHeight: '1.5' }}>
                      פרטים אלו משמשים לזיהוי הארגון, להגדרת משתמש הניהול הראשי ומופיעים בחתימת הודעות וקבצי אקסל המופקים מהמערכת.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.84rem', color: '#334155' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#16a34a' }}>✓</span>
                        <span>ארגון חדש נוצר אוטומטית בגרסה המתקדמת V2.</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#16a34a' }}>✓</span>
                        <span>תוכלו לעדכן פרטים אלו בכל עת מעמוד ההגדרות.</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#16a34a' }}>✓</span>
                        <span>שמירת נתונים מאובטחת ועצמאית עבור הארגון שלכם בלבד.</span>
                      </div>
                    </div>
                  </div>

                  <div style={{
                    padding: '12px 14px',
                    backgroundColor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '10px',
                    fontSize: '0.82rem',
                    color: '#1e40af',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{ fontSize: '1.1rem' }}>🛡️</span>
                    <span>סביבת העבודה שלכם מבודדת ומאובטחת באופן מלא.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Boards */}
          {activeTab === 'boards' && (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>
                  📋 לוחות פרויקטים (Project Boards)
                </h3>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                  TikTak מאפשרת לכם לנהל פרויקטים במספר לוחות נפרדים (למשל: לוח מרכזי, לוח לקוחות VIP, לוח דפוס והפקות).
                </p>
              </div>

              {/* Live Preview Bar */}
              <div style={{
                padding: '14px 18px',
                backgroundColor: '#0f172a',
                borderRadius: '12px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap'
              }}>
                <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: '600' }}>
                  תצוגה מקדימה בסרגל הלוחות:
                </span>
                <span style={{
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '0.88rem',
                  fontWeight: '700',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)'
                }}>
                  <span>{mainBoardIcon}</span>
                  <span>{mainBoardName.trim() || 'פרויקטים פעילים'}</span>
                </span>
                {extraBoards.map(board => (
                  <span
                    key={board.id}
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      color: '#cbd5e1',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: '500',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>{board.icon}</span>
                    <span>{board.name}</span>
                  </span>
                ))}
              </div>

              {/* Main Board Setup */}
              <div style={{
                padding: '18px 20px',
                backgroundColor: '#ffffff',
                borderRadius: '14px',
                border: '1px solid #bfdbfe',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.06)',
                marginBottom: '24px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <span style={{ fontSize: '1.2rem' }}>⭐</span>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#1e3a8a' }}>
                    לוח פרויקטים ראשי (ברירת מחדל)
                  </h4>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', alignItems: 'center' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '600', marginBottom: '6px', color: '#334155' }}>
                      שם הלוח הראשי
                    </label>
                    <input
                      type="text"
                      className="setup-input"
                      value={mainBoardName}
                      onChange={(e) => setMainBoardName(e.target.value)}
                      placeholder="פרויקטים פעילים"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '600', marginBottom: '6px', color: '#334155' }}>
                      אייקון הלוח
                    </label>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {POPULAR_BOARD_ICONS.slice(0, 7).map(icon => (
                        <button
                          key={icon}
                          type="button"
                          className="icon-hover-btn"
                          onClick={() => setMainBoardIcon(icon)}
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            border: mainBoardIcon === icon ? '2px solid #2563eb' : '1px solid #cbd5e1',
                            backgroundColor: mainBoardIcon === icon ? '#eff6ff' : '#ffffff',
                            cursor: 'pointer',
                            fontSize: '1.15rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0
                          }}
                        >
                          {icon}
                        </button>
                      ))}
                      {!POPULAR_BOARD_ICONS.slice(0, 7).includes(mainBoardIcon) && (
                        <button
                          type="button"
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            border: '2px solid #2563eb',
                            backgroundColor: '#eff6ff',
                            cursor: 'pointer',
                            fontSize: '1.15rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0
                          }}
                          title="אייקון נבחר מותאם"
                        >
                          {mainBoardIcon}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          openIconPicker({
                            title: 'בחירת אייקון ללוח הראשי',
                            currentIcon: mainBoardIcon,
                            defaultIcon: '📋',
                            onSelect: (selectedIcon) => setMainBoardIcon(selectedIcon)
                          });
                        }}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '8px',
                          border: '1px dashed #3b82f6',
                          backgroundColor: '#eff6ff',
                          color: '#2563eb',
                          cursor: 'pointer',
                          fontSize: '0.84rem',
                          fontWeight: '600',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontFamily: 'inherit'
                        }}
                        title="פתיחת מאגר אייקונים נרחב ומסווג"
                      >
                        <span>🎨 מאגר אייקונים...</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Extra Boards Section */}
              <div style={{
                padding: '20px',
                backgroundColor: '#f8fafc',
                borderRadius: '14px',
                border: '1px solid #e2e8f0'
              }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.98rem', fontWeight: '700', color: '#0f172a' }}>
                  לוחות פרויקטים נוספים (אופציונלי)
                </h4>

                {extraBoards.length === 0 ? (
                  <p style={{ fontSize: '0.86rem', color: '#94a3b8', fontStyle: 'italic', margin: '0 0 16px 0' }}>
                    לא הוגדרו עדיין לוחות נוספים. תוכלו להוסיף לוחות כעת או בכל עת מההגדרות.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                    {extraBoards.map(board => (
                      <div
                        key={board.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 16px',
                          backgroundColor: '#ffffff',
                          borderRadius: '10px',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <button
                            type="button"
                            className="icon-hover-btn"
                            onClick={() => {
                              openIconPicker({
                                title: `בחירת אייקון ללוח "${board.name}"`,
                                currentIcon: board.icon,
                                defaultIcon: '📁',
                                onSelect: (newIcon) => {
                                  setExtraBoards(extraBoards.map(b => b.id === board.id ? { ...b, icon: newIcon } : b));
                                }
                              });
                            }}
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #cbd5e1',
                              borderRadius: '7px',
                              width: '34px',
                              height: '34px',
                              cursor: 'pointer',
                              fontSize: '1.2rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: 0
                            }}
                            title="לחצו להחלפת אייקון הלוח"
                          >
                            {board.icon}
                          </button>
                          <strong style={{ fontSize: '0.92rem', color: '#1e293b' }}>{board.name}</strong>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveExtraBoard(board.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            fontSize: '0.84rem',
                            fontWeight: '600',
                            padding: '4px 8px',
                            borderRadius: '6px'
                          }}
                        >
                          ✕ הסר
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="icon-hover-btn"
                    onClick={() => {
                      openIconPicker({
                        title: 'בחירת אייקון ללוח נוסף',
                        currentIcon: newExtraBoardIcon,
                        defaultIcon: '📁',
                        onSelect: (selectedIcon) => setNewExtraBoardIcon(selectedIcon)
                      });
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '42px',
                      height: '42px',
                      borderRadius: '9px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      fontSize: '1.3rem',
                      cursor: 'pointer',
                      padding: 0
                    }}
                    title="בחירת אייקון מתוך מאגר אייקונים נרחב"
                  >
                    {newExtraBoardIcon}
                  </button>
                  <input
                    type="text"
                    className="setup-input"
                    value={newExtraBoardName}
                    onChange={(e) => setNewExtraBoardName(e.target.value)}
                    placeholder="שם לוח נוסף (למשל: דפוס, קמפיינים, מיתוג)..."
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddExtraBoard(); } }}
                    style={{ flex: 1, minWidth: '200px' }}
                  />
                  <button
                    type="button"
                    onClick={handleAddExtraBoard}
                    style={{
                      padding: '10px 18px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '9px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '0.88rem',
                      color: '#1e40af',
                      fontFamily: 'inherit'
                    }}
                  >
                    + הוסף לוח
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Statuses */}
          {activeTab === 'statuses' && (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>
                  🔄 שלבי עבודה וסטטוסים
                </h3>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                  הגדירו את מסלול הטיפול בפרויקטים בארגון שלכם. תוכלו לשנות שמות, צבעים ולקבוע את סטטוס ברירת המחדל.
                </p>
              </div>

              {/* Interactive Workflow Pipeline Visualization */}
              <div style={{
                padding: '16px 20px',
                backgroundColor: '#f8fafc',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                marginBottom: '24px'
              }}>
                <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569', marginBottom: '10px' }}>
                  📊 מסלול שלבי העבודה שיוצג בטבלת הפרויקטים:
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  overflowX: 'auto',
                  paddingBottom: '4px'
                }}>
                  {statuses.map((st, i) => (
                    <div key={st} className="pipeline-node" style={{ whiteSpace: 'nowrap' }}>
                      <span className={`badge ${statusColors[st] || 'badge-in-progress'}`} style={{ fontSize: '0.86rem', padding: '6px 12px' }}>
                        {defaultStatus === st && '⭐ '}
                        {st}
                      </span>
                      {i < statuses.length - 1 && (
                        <span style={{ color: '#94a3b8', fontSize: '1.1rem', fontWeight: '700', padding: '0 2px' }}>
                          ←
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Status List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                {statuses.map((st, index) => {
                  const isEditingThis = editingStatusIndex === index;
                  return (
                    <div
                      key={`${st}_${index}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 18px',
                        backgroundColor: '#ffffff',
                        borderRadius: '10px',
                        border: isEditingThis ? '2px solid #2563eb' : '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        gap: '12px',
                        flexWrap: 'wrap'
                      }}
                    >
                      {isEditingThis ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
                          <input
                            type="text"
                            value={editingStatusDraft}
                            onChange={(e) => setEditingStatusDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') { e.preventDefault(); handleSaveStatusRename(index); }
                              if (e.key === 'Escape') { handleCancelStatusRename(); }
                            }}
                            placeholder="שם הסטטוס החדש..."
                            autoFocus
                            style={{
                              padding: '6px 12px',
                              borderRadius: '7px',
                              border: '1px solid #2563eb',
                              fontSize: '0.9rem',
                              fontWeight: '600',
                              flex: 1,
                              maxWidth: '260px'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveStatusRename(index)}
                            style={{
                              padding: '6px 14px',
                              backgroundColor: '#2563eb',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '7px',
                              fontWeight: '600',
                              fontSize: '0.84rem',
                              cursor: 'pointer'
                            }}
                          >
                            ✓ שמור
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelStatusRename}
                            style={{
                              padding: '6px 10px',
                              backgroundColor: '#f1f5f9',
                              color: '#64748b',
                              border: '1px solid #cbd5e1',
                              borderRadius: '7px',
                              fontSize: '0.84rem',
                              cursor: 'pointer'
                            }}
                          >
                            ביטול
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span className={`badge ${statusColors[st] || 'badge-in-progress'}`} style={{ fontSize: '0.88rem', padding: '5px 12px' }}>
                            {st}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleStartRenameStatus(index)}
                            style={{
                              background: 'none',
                              border: '1px solid #bfdbfe',
                              color: '#1e40af',
                              backgroundColor: '#eff6ff',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontWeight: '600'
                            }}
                            title="לחצו לעריכת שם הסטטוס"
                          >
                            ✏️ ערוך שם
                          </button>
                          {defaultStatus === st && (
                            <span style={{ fontSize: '0.75rem', backgroundColor: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '999px', fontWeight: '700' }}>
                              ברירת מחדל לפרויקט חדש
                            </span>
                          )}
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginRight: 'auto' }}>
                        <select
                          value={statusColors[st] || 'badge-in-progress'}
                          onChange={(e) => setStatusColors({ ...statusColors, [st]: e.target.value })}
                          style={{ padding: '5px 10px', borderRadius: '7px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: '500' }}
                        >
                          {STATUS_COLOR_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        {defaultStatus !== st && (
                          <button
                            type="button"
                            onClick={() => setDefaultStatus(st)}
                            style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600', textDecoration: 'underline' }}
                          >
                            הגדר כברירת מחדל
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveStatus(st)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.9rem', padding: '4px' }}
                          title="הסר סטטוס"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Status */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  className="setup-input"
                  value={newStatusInput}
                  onChange={(e) => setNewStatusInput(e.target.value)}
                  placeholder="הזינו שם לסטטוס חדש (למשל: ממתין למשלוח, בהגהה)..."
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddStatus(); } }}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={handleAddStatus}
                  style={{
                    padding: '10px 18px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '9px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '0.88rem',
                    color: '#1e40af',
                    fontFamily: 'inherit',
                    whiteSpace: 'nowrap'
                  }}
                >
                  + הוסף סטטוס
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: Fields */}
          {activeTab === 'fields' && (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>
                  🧩 שדות כרטיס פרויקט והתאמת שמות
                </h3>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                  סמנו אילו שדות ברצונכם להפעיל בכרטיסי הפרויקט, והתאימו את שמם ואת האייקון המייצג שלהם כרצונכם:
                </p>
              </div>

              {/* Built-in Field Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                {PROJECT_CARD_FIELD_DEFAULTS.map(item => {
                  const fieldConfig = fields[item.key] || {};
                  const isEnabled = fieldConfig.enabled !== false;
                  const currentLabel = fieldConfig.label !== undefined ? fieldConfig.label : item.defaultLabel;
                  const currentIcon = fieldConfig.icon || item.icon;
                  const isRenamed = currentLabel !== item.defaultLabel;
                  const isIconChanged = currentIcon !== item.icon;

                  return (
                    <div
                      key={item.key}
                      className="field-card-item"
                      style={{
                        padding: '14px 16px',
                        borderRadius: '12px',
                        border: isEnabled ? (isRenamed || isIconChanged ? '1.5px solid #60a5fa' : '1px solid #bfdbfe') : '1px solid #e2e8f0',
                        backgroundColor: isEnabled ? '#ffffff' : '#f8fafc',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="checkbox"
                            id={`field-toggle-${item.key}`}
                            checked={isEnabled}
                            onChange={() => handleToggleField(item.key)}
                            style={{ width: '17px', height: '17px', cursor: 'pointer' }}
                          />
                          <button
                            type="button"
                            className="icon-hover-btn"
                            disabled={!isEnabled}
                            onClick={() => {
                              openIconPicker({
                                title: `בחירת אייקון עבור שדה "${currentLabel}"`,
                                currentIcon,
                                defaultIcon: item.icon,
                                onSelect: (newIcon) => handleFieldIconChange(item.key, newIcon)
                              });
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '34px',
                              height: '34px',
                              borderRadius: '8px',
                              border: isIconChanged ? '2px solid #2563eb' : '1px solid #cbd5e1',
                              backgroundColor: isIconChanged ? '#eff6ff' : (isEnabled ? '#ffffff' : '#f1f5f9'),
                              cursor: isEnabled ? 'pointer' : 'default',
                              fontSize: '1.2rem',
                              padding: 0
                            }}
                            title={isEnabled ? "לחצו להחלפת אייקון מתוך מאגר אייקונים נרחב" : "יש להפעיל את השדה כדי לשנות אייקון"}
                          >
                            {currentIcon}
                          </button>
                          <label
                            htmlFor={`field-toggle-${item.key}`}
                            style={{
                              fontSize: '0.92rem',
                              color: isEnabled ? '#1e293b' : '#94a3b8',
                              fontWeight: '700',
                              cursor: 'pointer',
                              margin: 0
                            }}
                          >
                            {item.defaultLabel}
                          </label>
                        </div>
                        <span style={{ fontSize: '0.72rem', backgroundColor: '#f1f5f9', color: '#64748b', padding: '2px 7px', borderRadius: '5px', fontWeight: '500' }}>
                          {item.typeLabel}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <label style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600', whiteSpace: 'nowrap' }}>
                          שם השדה:
                        </label>
                        <input
                          type="text"
                          value={currentLabel}
                          placeholder={item.defaultLabel}
                          onChange={(e) => handleFieldLabelChange(item.key, e.target.value)}
                          disabled={!isEnabled}
                          style={{
                            flex: 1,
                            padding: '5px 10px',
                            borderRadius: '6px',
                            border: isRenamed ? '1px solid #2563eb' : '1px solid #cbd5e1',
                            backgroundColor: isEnabled ? '#ffffff' : '#f1f5f9',
                            color: isEnabled ? '#1e293b' : '#94a3b8',
                            fontSize: '0.86rem'
                          }}
                        />
                        {(isRenamed || isIconChanged) && (
                          <button
                            type="button"
                            onClick={() => {
                              if (isRenamed) handleFieldLabelChange(item.key, item.defaultLabel);
                              if (isIconChanged) handleFieldIconChange(item.key, item.icon);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#2563eb',
                              cursor: 'pointer',
                              fontSize: '0.76rem',
                              textDecoration: 'underline',
                              padding: '0 2px',
                              whiteSpace: 'nowrap',
                              fontWeight: '600'
                            }}
                            title="איפוס שם ואייקון לברירת מחדל"
                          >
                            איפוס
                          </button>
                        )}
                      </div>
                      {item.hint && (
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: '1.3' }}>
                          {item.hint}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Custom Fields (if any) */}
              {Object.entries(fields).some(([k, f]) => f?.isCustom) && (
                <div style={{ marginBottom: '22px' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '0.98rem', fontWeight: '700', color: '#3730a3', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>✨</span>
                    <span>שדות מותאמים אישית שנוספו:</span>
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                    {Object.entries(fields).filter(([k, f]) => f?.isCustom).map(([key, customField]) => (
                      <div
                        key={key}
                        style={{
                          padding: '14px 16px',
                          borderRadius: '12px',
                          border: '1px solid #c7d2fe',
                          backgroundColor: '#f5f7ff',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              type="button"
                              className="icon-hover-btn"
                              onClick={() => {
                                openIconPicker({
                                  title: `בחירת אייקון עבור שדה "${customField.label || 'שדה מותאם'}"`,
                                  currentIcon: customField.icon || '✨',
                                  defaultIcon: '✨',
                                  onSelect: (newIcon) => handleFieldIconChange(key, newIcon)
                                });
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '34px',
                                height: '34px',
                                borderRadius: '8px',
                                border: '1px solid #c7d2fe',
                                backgroundColor: '#ffffff',
                                fontSize: '1.2rem',
                                cursor: 'pointer',
                                padding: 0
                              }}
                              title="לחצו להחלפת אייקון מתוך מאגר אייקונים נרחב"
                            >
                              {customField.icon || '✨'}
                            </button>
                            <span style={{ fontWeight: '700', fontSize: '0.92rem', color: '#3730a3' }}>
                              {customField.label || 'שדה מותאם'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomField(key)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600' }}
                            title="הסר שדה"
                          >
                            🗑️ הסר
                          </button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <label style={{ fontSize: '0.78rem', color: '#475569', fontWeight: '600', whiteSpace: 'nowrap' }}>
                            שם השדה:
                          </label>
                          <input
                            type="text"
                            value={customField.label || ''}
                            onChange={(e) => handleFieldLabelChange(key, e.target.value)}
                            style={{
                              flex: 1,
                              padding: '5px 10px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.86rem',
                              backgroundColor: '#ffffff'
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Custom Field Section */}
              <div style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'center',
                padding: '14px 18px',
                backgroundColor: '#f8fafc',
                borderRadius: '12px',
                border: '1.5px dashed #cbd5e1',
                marginBottom: '24px',
                flexWrap: 'wrap'
              }}>
                <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#334155' }}>
                  ➕ הוספת שדה חדש:
                </span>
                <button
                  type="button"
                  className="icon-hover-btn"
                  onClick={() => {
                    openIconPicker({
                      title: 'בחירת אייקון לשדה החדש',
                      currentIcon: newCustomFieldIcon,
                      defaultIcon: '✨',
                      onSelect: (newIcon) => setNewCustomFieldIcon(newIcon)
                    });
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    fontSize: '1.25rem',
                    cursor: 'pointer',
                    padding: 0
                  }}
                  title="בחירת אייקון מתוך מאגר אייקונים נרחב"
                >
                  {newCustomFieldIcon}
                </button>
                <input
                  type="text"
                  className="setup-input"
                  value={newCustomFieldName}
                  onChange={(e) => setNewCustomFieldName(e.target.value)}
                  placeholder="שם שדה חדש (למשל: ספק, תאריך יעד, סניף)..."
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomField(); } }}
                  style={{ flex: 1, minWidth: '200px' }}
                />
                <select
                  value={newCustomFieldType}
                  onChange={(e) => setNewCustomFieldType(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.86rem', fontWeight: '500' }}
                >
                  {FIELD_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddCustomField}
                  style={{
                    padding: '9px 18px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #2563eb',
                    color: '#2563eb',
                    borderRadius: '8px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    fontSize: '0.88rem',
                    fontFamily: 'inherit'
                  }}
                >
                  + הוסף שדה
                </button>
              </div>

              {/* Weekly Hours Option */}
              <div style={{
                padding: '16px 20px',
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={!hideWeeklyHours}
                    onChange={(e) => setHideWeeklyHours(!e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.94rem', color: '#0f172a' }}>⏱️ מעקב שעות עבודה שבועיות</strong>
                    <span style={{ fontSize: '0.82rem', color: '#64748b' }}>מאפשר דיווח שעות עבודה שבועיות בכל כרטיס פרויקט לצורך מעקב תפוקה ותמחור.</span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* TAB 5: Auto-Archive */}
          {activeTab === 'archive' && (
            <div>
              <div style={{ marginBottom: '22px' }}>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>
                  🗄️ ארכוב אוטומטי של פרויקטים
                </h3>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                  פרויקטים שהסתיימו יועברו לארכיון לאחר פרק זמן ללא פעילות, כדי לשמור על לוח פרויקטים פעיל ונקי.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                {[
                  { days: 30, label: '30 ימים', desc: 'מתאים לקצב עבודה מהיר מאוד' },
                  { days: 45, label: '45 ימים (מומלץ)', desc: 'איזון מעולה בין זמינות לסדר', isPopular: true },
                  { days: 60, label: '60 ימים', desc: 'מתאים לפרויקטים ארוכי טווח' },
                  { days: 90, label: '90 ימים', desc: 'ארכוב פעם ברבעון' },
                  { days: 0, label: 'ללא ארכוב אוטומטי', desc: 'העברה לארכיון ידנית בלבד' }
                ].map(opt => {
                  const isSelected = autoArchiveDays === opt.days;
                  return (
                    <label
                      key={opt.days}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        padding: '16px 18px',
                        borderRadius: '12px',
                        border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                        cursor: 'pointer',
                        boxShadow: isSelected ? '0 2px 10px rgba(37, 99, 235, 0.1)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="radio"
                            name="autoArchiveOpt"
                            checked={isSelected}
                            onChange={() => setAutoArchiveDays(opt.days)}
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                          <strong style={{ fontSize: '0.95rem', color: isSelected ? '#1e40af' : '#1e293b' }}>
                            {opt.label}
                          </strong>
                        </div>
                        {opt.isPopular && (
                          <span style={{ fontSize: '0.7rem', backgroundColor: '#2563eb', color: '#ffffff', padding: '2px 8px', borderRadius: '999px', fontWeight: '700' }}>
                            מומלץ
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.8rem', color: '#64748b', marginRight: '24px' }}>
                        {opt.desc}
                      </span>
                    </label>
                  );
                })}
              </div>

              {/* Archive Info Box */}
              <div style={{
                padding: '16px 20px',
                backgroundColor: '#f8fafc',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <span style={{ fontSize: '1.4rem' }}>📁</span>
                <div style={{ fontSize: '0.86rem', color: '#475569', lineHeight: '1.5' }}>
                  <strong>הערה:</strong> פרויקטים המועברים לארכיון אינם נמחקים לעולם! תוכלו לצפות בהם, לחפש אותם ולשחזר אותם ללוח הפעיל בכל עת מתוך לשונית ״ארכיון״.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 32px',
          borderTop: '1px solid #e2e8f0',
          backgroundColor: '#f8fafc',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {activeTab !== 'org' && (
              <button
                type="button"
                onClick={() => {
                  const tabs = ['org', 'boards', 'statuses', 'fields', 'archive'];
                  const currentIndex = tabs.indexOf(activeTab);
                  if (currentIndex > 0) setActiveTab(tabs[currentIndex - 1]);
                }}
                disabled={saving}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 20px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '9px',
                  fontWeight: '600',
                  color: '#475569',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>→</span>
                <span>שלב קודם</span>
              </button>
            )}
            {activeTab !== 'archive' && (
              <button
                type="button"
                onClick={() => {
                  const tabs = ['org', 'boards', 'statuses', 'fields', 'archive'];
                  const currentIndex = tabs.indexOf(activeTab);
                  if (currentIndex < tabs.length - 1) setActiveTab(tabs[currentIndex + 1]);
                }}
                disabled={saving}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 20px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '9px',
                  fontWeight: '600',
                  color: '#1e40af',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>שלב הבא</span>
                <span>←</span>
              </button>
            )}
          </div>

          <button
            type="button"
            className="primary-action-btn"
            onClick={handleSaveAndFinish}
            disabled={saving}
          >
            <span>🚀</span>
            <span>{saving ? 'שומר הגדרות...' : 'סיום הגדרה וכניסה למערכת'}</span>
          </button>
        </div>
      </div>

      {/* Extensive Icon Picker Modal */}
      <IconPickerModal
        isOpen={iconPickerState.isOpen}
        title={iconPickerState.title}
        currentIcon={iconPickerState.currentIcon}
        defaultIcon={iconPickerState.defaultIcon}
        onSelectIcon={(selectedIcon) => {
          if (iconPickerState.onSelect) {
            iconPickerState.onSelect(selectedIcon);
          }
          closeIconPicker();
        }}
        onClose={closeIconPicker}
      />
    </div>
  );
}
