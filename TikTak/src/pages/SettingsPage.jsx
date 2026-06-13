import { useState } from 'react';

// Preset color options for statuses, matched to index.css rules
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

export default function SettingsPage({ settings, onSaveSettings, onBack }) {
  const [activeTab, setActiveTab] = useState('workflow'); // 'workflow', 'classification', 'lists'
  const [localSettings, setLocalSettings] = useState(JSON.parse(JSON.stringify(settings)));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Inputs for adding items
  const [newStatus, setNewStatus] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('badge-new');
  const [newWorkType, setNewWorkType] = useState('');
  const [newPriority, setNewPriority] = useState('');
  const [newStore, setNewStore] = useState('');
  const [newManager, setNewManager] = useState('');
  const [newSupplier, setNewSupplier] = useState('');

  // Contact States
  const [newContactName, setNewContactName] = useState('');
  const [newContactRole, setNewContactRole] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');

  // Inline editing states
  const [editingStatus, setEditingStatus] = useState({ index: null, value: '' });
  const [editingWorkType, setEditingWorkType] = useState({ index: null, value: '' });
  const [editingPriority, setEditingPriority] = useState({ index: null, value: '' });
  const [editingStore, setEditingStore] = useState({ index: null, value: '' });
  const [editingManager, setEditingManager] = useState({ index: null, value: '' });
  const [editingSupplier, setEditingSupplier] = useState({ index: null, value: '' });
  const [editingContact, setEditingContact] = useState({
    index: null,
    name: '',
    role: '',
    phone: '',
    email: ''
  });

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveSettings(localSettings);
      showMsg('ההגדרות נשמרו בהצלחה בשרת!', 'success');
    } catch (e) {
      console.error(e);
      showMsg('שגיאה בשמירת ההגדרות. נסו שנית.', 'danger');
    } finally {
      setSaving(false);
    }
  };

  // Inline editing save handlers
  const saveEditedStatus = (index) => {
    const oldValue = localSettings.statuses[index];
    const newValue = editingStatus.value.trim();
    if (!newValue) return;
    if (oldValue === newValue) {
      setEditingStatus({ index: null, value: '' });
      return;
    }
    if (localSettings.statuses.includes(newValue)) {
      showMsg('סטטוס זה כבר קיים ברשימה', 'danger');
      return;
    }

    const updatedStatuses = [...localSettings.statuses];
    updatedStatuses[index] = newValue;

    const updatedColors = { ...localSettings.statusColors };
    const color = updatedColors[oldValue] || 'badge-frozen';
    delete updatedColors[oldValue];
    updatedColors[newValue] = color;

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
    setEditingStatus({ index: null, value: '' });
    showMsg(`הסטטוס "${oldValue}" שונה ל-"${newValue}"`);
  };

  const saveEditedWorkType = (index) => {
    const oldValue = localSettings.workTypes[index];
    const newValue = editingWorkType.value.trim();
    if (!newValue) return;
    if (oldValue === newValue) {
      setEditingWorkType({ index: null, value: '' });
      return;
    }
    if (localSettings.workTypes.includes(newValue)) {
      showMsg('סוג עבודה זה כבר קיים ברשימה', 'danger');
      return;
    }

    const updatedTypes = [...localSettings.workTypes];
    updatedTypes[index] = newValue;

    setLocalSettings({
      ...localSettings,
      workTypes: updatedTypes
    });
    setEditingWorkType({ index: null, value: '' });
    showMsg(`סוג העבודה שונה ל-"${newValue}"`);
  };

  const saveEditedPriority = (index) => {
    const oldValue = localSettings.priorities[index];
    const newValue = editingPriority.value.trim();
    if (!newValue) return;
    if (oldValue === newValue) {
      setEditingPriority({ index: null, value: '' });
      return;
    }
    if (localSettings.priorities.includes(newValue)) {
      showMsg('עדיפות זו כבר קיימת ברשימה', 'danger');
      return;
    }

    const updatedPriorities = [...localSettings.priorities];
    updatedPriorities[index] = newValue;

    const updatedColors = { ...localSettings.priorityColors };
    const color = updatedColors[oldValue] || 'priority-normal';
    delete updatedColors[oldValue];
    updatedColors[newValue] = color;

    setLocalSettings({
      ...localSettings,
      priorities: updatedPriorities,
      priorityColors: updatedColors
    });
    setEditingPriority({ index: null, value: '' });
    showMsg(`העדיפות שונתה ל-"${newValue}"`);
  };

  const saveEditedStore = (index) => {
    const oldValue = localSettings.stores[index];
    const newValue = editingStore.value.trim();
    if (!newValue) return;
    if (oldValue === newValue) {
      setEditingStore({ index: null, value: '' });
      return;
    }
    if (localSettings.stores.includes(newValue)) {
      showMsg('סניף זה כבר קיים ברשימה', 'danger');
      return;
    }

    const updatedStores = [...localSettings.stores];
    updatedStores[index] = newValue;

    setLocalSettings({
      ...localSettings,
      stores: updatedStores
    });
    setEditingStore({ index: null, value: '' });
    showMsg(`שם הסניף שונה ל-"${newValue}"`);
  };

  const saveEditedManager = (index) => {
    const oldValue = localSettings.importManagers[index];
    const newValue = editingManager.value.trim();
    if (!newValue) return;
    if (oldValue === newValue) {
      setEditingManager({ index: null, value: '' });
      return;
    }
    if (localSettings.importManagers.includes(newValue)) {
      showMsg('איש קשר זה כבר קיים ברשימה', 'danger');
      return;
    }

    const updatedManagers = [...localSettings.importManagers];
    updatedManagers[index] = newValue;

    setLocalSettings({
      ...localSettings,
      importManagers: updatedManagers
    });
    setEditingManager({ index: null, value: '' });
    showMsg(`שם איש הקשר שונה ל-"${newValue}"`);
  };

  // Add handlers
  const addStatus = (e) => {
    e.preventDefault();
    if (!newStatus.trim()) return;
    if (localSettings.statuses.includes(newStatus.trim())) {
      showMsg('סטטוס זה כבר קיים ברשימה', 'danger');
      return;
    }
    const updatedStatuses = [...localSettings.statuses, newStatus.trim()];
    const updatedColors = { ...localSettings.statusColors, [newStatus.trim()]: newStatusColor };
    
    setLocalSettings({
      ...localSettings,
      statuses: updatedStatuses,
      statusColors: updatedColors
    });
    setNewStatus('');
    showMsg(`הסטטוס "${newStatus}" נוסף בהצלחה`);
  };

  const removeStatus = (statusName) => {
    if (localSettings.statuses.length <= 1) {
      showMsg('חייב להישאר לפחות סטטוס אחד במערכת', 'danger');
      return;
    }
    const updatedStatuses = localSettings.statuses.filter(s => s !== statusName);
    const updatedColors = { ...localSettings.statusColors };
    delete updatedColors[statusName];
    
    // Adjust default status if removed
    let newDefault = localSettings.defaultStatus;
    if (localSettings.defaultStatus === statusName) {
      newDefault = updatedStatuses[0];
    }

    setLocalSettings({
      ...localSettings,
      statuses: updatedStatuses,
      statusColors: updatedColors,
      defaultStatus: newDefault
    });
    showMsg(`הסטטוס "${statusName}" הוסר`);
  };

  const addWorkType = (e) => {
    e.preventDefault();
    if (!newWorkType.trim()) return;
    if (localSettings.workTypes.includes(newWorkType.trim())) {
      showMsg('סוג עבודה זה כבר קיים במערכת', 'danger');
      return;
    }
    setLocalSettings({
      ...localSettings,
      workTypes: [...localSettings.workTypes, newWorkType.trim()]
    });
    setNewWorkType('');
    showMsg(`סוג העבודה "${newWorkType}" נוסף בהצלחה`);
  };

  const removeWorkType = (type) => {
    if (localSettings.workTypes.length <= 1) {
      showMsg('חייב להישאר לפחות סוג עבודה אחד במערכת', 'danger');
      return;
    }
    setLocalSettings({
      ...localSettings,
      workTypes: localSettings.workTypes.filter(t => t !== type)
    });
    showMsg(`סוג העבודה "${type}" הוסר`);
  };

  const addPriority = (e) => {
    e.preventDefault();
    if (!newPriority.trim()) return;
    if (localSettings.priorities.includes(newPriority.trim())) {
      showMsg('רמת עדיפות זו כבר קיימת', 'danger');
      return;
    }
    const priorityColors = { ...localSettings.priorityColors };
    // Assign generic priority class if not mapped
    if (!priorityColors[newPriority.trim()]) {
      priorityColors[newPriority.trim()] = 'priority-normal';
    }

    setLocalSettings({
      ...localSettings,
      priorities: [...localSettings.priorities, newPriority.trim()],
      priorityColors
    });
    setNewPriority('');
    showMsg(`עדיפות "${newPriority}" נוספה`);
  };

  const removePriority = (priorityName) => {
    if (localSettings.priorities.length <= 1) {
      showMsg('חייב להישאר לפחות סדר עדיפות אחד במערכת', 'danger');
      return;
    }
    setLocalSettings({
      ...localSettings,
      priorities: localSettings.priorities.filter(p => p !== priorityName)
    });
    showMsg(`העדיפות "${priorityName}" הוסרה`);
  };

  const addStore = (e) => {
    e.preventDefault();
    if (!newStore.trim()) return;
    if (localSettings.stores.includes(newStore.trim())) {
      showMsg('סניף זה כבר קיים ברשימה', 'danger');
      return;
    }
    setLocalSettings({
      ...localSettings,
      stores: [...localSettings.stores, newStore.trim()]
    });
    setNewStore('');
  };

  const removeStore = (storeName) => {
    setLocalSettings({
      ...localSettings,
      stores: localSettings.stores.filter(s => s !== storeName)
    });
  };

  const addManager = (e) => {
    e.preventDefault();
    if (!newManager.trim()) return;
    if (localSettings.importManagers.includes(newManager.trim())) {
      showMsg('איש קשר זה כבר קיים ברשימה', 'danger');
      return;
    }
    setLocalSettings({
      ...localSettings,
      importManagers: [...localSettings.importManagers, newManager.trim()]
    });
    setNewManager('');
  };

  const removeManager = (managerName) => {
    setLocalSettings({
      ...localSettings,
      importManagers: localSettings.importManagers.filter(m => m !== managerName)
    });
  };

  const handleStatusColorChange = (statusName, newColor) => {
    setLocalSettings({
      ...localSettings,
      statusColors: {
        ...localSettings.statusColors,
        [statusName]: newColor
      }
    });
  };

  // Supplier Handlers
  const addSupplier = (e) => {
    e.preventDefault();
    if (!newSupplier.trim()) return;
    const suppliers = localSettings.suppliers || [];
    if (suppliers.includes(newSupplier.trim())) {
      showMsg('ספק זה כבר קיים ברשימה', 'danger');
      return;
    }
    setLocalSettings({
      ...localSettings,
      suppliers: [...suppliers, newSupplier.trim()]
    });
    setNewSupplier('');
    showMsg(`הספק "${newSupplier.trim()}" נוסף בהצלחה`);
  };

  const removeSupplier = (supplierName) => {
    const suppliers = localSettings.suppliers || [];
    setLocalSettings({
      ...localSettings,
      suppliers: suppliers.filter(s => s !== supplierName)
    });
    showMsg(`הספק "${supplierName}" הוסר`);
  };

  const saveEditedSupplier = (index) => {
    const suppliers = localSettings.suppliers || [];
    const oldValue = suppliers[index];
    const newValue = editingSupplier.value.trim();
    if (!newValue) return;
    if (oldValue === newValue) {
      setEditingSupplier({ index: null, value: '' });
      return;
    }
    if (suppliers.includes(newValue)) {
      showMsg('ספק זה כבר קיים ברשימה', 'danger');
      return;
    }

    const updated = [...suppliers];
    updated[index] = newValue;
    setLocalSettings({
      ...localSettings,
      suppliers: updated
    });
    setEditingSupplier({ index: null, value: '' });
    showMsg(`שם הספק שונה ל-"${newValue}"`);
  };

  // Contact Handlers
  const addContact = (e) => {
    e.preventDefault();
    if (!newContactName.trim()) {
      showMsg('שם איש קשר הוא שדה חובה', 'danger');
      return;
    }
    const contacts = localSettings.contacts || [];
    if (contacts.some(c => c.name.trim() === newContactName.trim())) {
      showMsg('איש קשר עם שם זה כבר קיים ברשימה', 'danger');
      return;
    }

    const newContactObj = {
      name: newContactName.trim(),
      role: newContactRole.trim(),
      phone: newContactPhone.trim(),
      email: newContactEmail.trim()
    };

    setLocalSettings({
      ...localSettings,
      contacts: [...contacts, newContactObj]
    });

    setNewContactName('');
    setNewContactRole('');
    setNewContactPhone('');
    setNewContactEmail('');
    showMsg(`איש הקשר "${newContactObj.name}" נוסף בהצלחה`);
  };

  const removeContact = (contactName) => {
    const contacts = localSettings.contacts || [];
    setLocalSettings({
      ...localSettings,
      contacts: contacts.filter(c => c.name !== contactName)
    });
    showMsg(`איש הקשר "${contactName}" הוסר`);
  };

  const saveEditedContact = (index) => {
    const contacts = localSettings.contacts || [];
    const newName = editingContact.name.trim();
    if (!newName) return;
    
    if (contacts.some((c, idx) => idx !== index && c.name.trim() === newName)) {
      showMsg('איש קשר עם שם זה כבר קיים ברשימה', 'danger');
      return;
    }

    const updated = [...contacts];
    updated[index] = {
      name: newName,
      role: editingContact.role.trim(),
      phone: editingContact.phone.trim(),
      email: editingContact.email.trim()
    };

    setLocalSettings({
      ...localSettings,
      contacts: updated
    });
    setEditingContact({ index: null, name: '', role: '', phone: '', email: '' });
    showMsg(`פרטי איש הקשר "${newName}" עודכנו בהצלחה`);
  };

  return (
    <main className="dashboard-container" style={{ maxWidth: '900px' }}>
      
      {/* Top Header Row */}
      <div className="flex-between" style={{ marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>הגדרות מערכת</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>ניהול סוגי עבודות, סטטוסים, סניפים ומאפייני סביבת העבודה</p>
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

      {/* Settings Navigation Tabs */}
      <div className="login-tabs" style={{ marginBottom: '24px' }}>
        <button 
          className={`login-tab-btn ${activeTab === 'workflow' ? 'active' : ''}`}
          onClick={() => setActiveTab('workflow')}
        >
          🔄 סטטוסים ותהליך עבודה
        </button>
        <button 
          className={`login-tab-btn ${activeTab === 'classification' ? 'active' : ''}`}
          onClick={() => setActiveTab('classification')}
        >
          🏷️ סיווג המשימות <br /> (סוגי עבודה ועדיפויות)
        </button>
        <button 
          className={`login-tab-btn ${activeTab === 'lists' ? 'active' : ''}`}
          onClick={() => setActiveTab('lists')}
        >
          👥 רשימות מוזנות מראש <br /> (סניפים ואנשי קשר)
        </button>
        <button 
          className={`login-tab-btn ${activeTab === 'suppliers_contacts' ? 'active' : ''}`}
          onClick={() => setActiveTab('suppliers_contacts')}
        >
          🏭 ספקים ואנשי קשר <br /> (ספקים ואנשי קשר)
        </button>
      </div>

      {/* TAB 1: WORKFLOW & STATUSES */}
      {activeTab === 'workflow' && (
        <div className="filter-panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Default Status Selection */}
          <div>
            <h4 className="detail-section-title">סטטוס ברירת מחדל</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '12px' }}>
              הסטטוס שיוקצה אוטומטית לכל משימה חדשה שנוצרת במערכת.
            </p>
            <select 
              className="form-control" 
              style={{ maxWidth: '300px' }}
              value={localSettings.defaultStatus}
              onChange={(e) => setLocalSettings({ ...localSettings, defaultStatus: e.target.value })}
            >
              {localSettings.statuses.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Statuses Grid Management */}
          <div>
            <h4 className="detail-section-title">ניהול סטטוסים וצבעי תצוגה</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
              כאן ניתן לראות את כל הסטטוסים במערכת, לעדכן את הצבעים שלהם (בשינוי מהיר) או להסירם.
            </p>

            <div className="table-container" style={{ marginBottom: '20px' }}>
              <table className="task-table" style={{ fontSize: '0.9rem' }}>
                <thead>
                  <tr>
                    <th>שם הסטטוס</th>
                    <th>תצוגה מקדימה</th>
                    <th>בחירת צבע</th>
                    <th style={{ width: '80px' }}>פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {localSettings.statuses.map((st, index) => {
                    const colorClass = localSettings.statusColors[st] || 'badge-frozen';
                    const isEditing = editingStatus.index === index;
                    return (
                      <tr key={index}>
                        <td>
                          {isEditing ? (
                            <input 
                              type="text" 
                              className="form-control"
                              value={editingStatus.value}
                              onChange={(e) => setEditingStatus({ ...editingStatus, value: e.target.value })}
                              style={{ padding: '6px 10px', fontSize: '0.9rem' }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEditedStatus(index);
                                if (e.key === 'Escape') setEditingStatus({ index: null, value: '' });
                              }}
                              autoFocus
                            />
                          ) : (
                            <span style={{ fontWeight: '600' }}>{st}</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${colorClass}`}>
                            {isEditing ? editingStatus.value || st : st}
                          </span>
                        </td>
                        <td>
                          <select 
                            className="form-control" 
                            style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                            value={colorClass}
                            onChange={(e) => handleStatusColorChange(st, e.target.value)}
                            disabled={isEditing}
                          >
                            {PRESET_COLORS.map(color => (
                              <option key={color.value} value={color.value}>
                                {color.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {isEditing ? (
                              <>
                                <button 
                                  className="btn btn-secondary btn-icon"
                                  title="אישור"
                                  onClick={() => saveEditedStatus(index)}
                                  style={{ color: '#10b981', borderColor: '#10b981', padding: '6px' }}
                                >
                                  ✔️
                                </button>
                                <button 
                                  className="btn btn-secondary btn-icon"
                                  title="ביטול"
                                  onClick={() => setEditingStatus({ index: null, value: '' })}
                                  style={{ color: '#ef4444', borderColor: '#ef4444', padding: '6px' }}
                                >
                                  ❌
                                </button>
                              </>
                            ) : (
                              <>
                                <button 
                                  className="btn btn-secondary btn-icon"
                                  title="עריכת שם"
                                  onClick={() => setEditingStatus({ index, value: st })}
                                  style={{ padding: '6px' }}
                                >
                                  ✏️
                                </button>
                                <button 
                                  className="btn btn-danger btn-icon" 
                                  title="מחיקת סטטוס"
                                  onClick={() => removeStatus(st)}
                                  style={{ padding: '6px' }}
                                >
                                  🗑️
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Add new status form */}
            <form onSubmit={addStatus} className="filter-panel" style={{ margin: 0, backgroundColor: '#f8fafc', borderStyle: 'dashed' }}>
              <h5 style={{ fontWeight: '600', marginBottom: '12px' }}>➕ הוספת סטטוס חדש לתהליך</h5>
              <div className="form-grid-3col">
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">שם הסטטוס</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="לדוגמה: ממתין למנהל מוצר"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">צבע הבאדג'</label>
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
                </div>
                <button type="submit" className="btn btn-primary" style={{ height: '44px' }}>
                  הוסף סטטוס
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* TAB 2: CLASSIFICATION */}
      {activeTab === 'classification' && (
        <div className="settings-grid-2col">
          
          {/* Work Types panel */}
          <div className="filter-panel">
            <h4 className="detail-section-title">סוגי עבודה</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
              סיווגי המשימה עבור המעצבת הגרפית (יופיעו ככפתורי בחירה מהירים בטופס).
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {localSettings.workTypes.map((type, index) => {
                const isEditing = editingWorkType.index === index;
                return (
                  <div key={index} className="flex-between" style={{ padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    {isEditing ? (
                      <input 
                        type="text" 
                        className="form-control"
                        value={editingWorkType.value}
                        onChange={(e) => setEditingWorkType({ ...editingWorkType, value: e.target.value })}
                        style={{ padding: '4px 8px', fontSize: '0.9rem', height: '32px' }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEditedWorkType(index);
                          if (e.key === 'Escape') setEditingWorkType({ index: null, value: '' });
                        }}
                        autoFocus
                      />
                    ) : (
                      <span style={{ fontWeight: '500' }}>{type}</span>
                    )}
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {isEditing ? (
                        <>
                          <button 
                            className="btn btn-secondary btn-icon" 
                            style={{ padding: '4px', color: '#10b981', borderColor: '#10b981' }} 
                            onClick={() => saveEditedWorkType(index)}
                          >
                            ✔️
                          </button>
                          <button 
                            className="btn btn-secondary btn-icon" 
                            style={{ padding: '4px', color: '#ef4444', borderColor: '#ef4444' }} 
                            onClick={() => setEditingWorkType({ index: null, value: '' })}
                          >
                            ❌
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            className="btn btn-secondary btn-icon" 
                            style={{ padding: '4px' }} 
                            onClick={() => setEditingWorkType({ index, value: type })}
                          >
                            ✏️
                          </button>
                          <button 
                            className="btn btn-danger btn-icon" 
                            style={{ padding: '4px' }} 
                            onClick={() => removeWorkType(type)}
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={addWorkType} style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="למשל: סרטון מוצר" 
                value={newWorkType}
                onChange={(e) => setNewWorkType(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
                ➕ הוספה
              </button>
            </form>
          </div>

          {/* Priorities panel */}
          <div className="filter-panel">
            <h4 className="detail-section-title">רמות עדיפות</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
              רמות הדחיפות להשלמת העיצוב. כדאי להגדיר 2-4 רמות.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {localSettings.priorities.map((prio, index) => {
                let badgeClass = 'priority-normal';
                if (prio === 'גבוהה') badgeClass = 'priority-high';
                if (prio === 'דחופה' || prio === 'דחוף') badgeClass = 'priority-urgent';
                const isEditing = editingPriority.index === index;
                return (
                  <div key={index} className="flex-between" style={{ padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    {isEditing ? (
                      <input 
                        type="text" 
                        className="form-control"
                        value={editingPriority.value}
                        onChange={(e) => setEditingPriority({ ...editingPriority, value: e.target.value })}
                        style={{ padding: '4px 8px', fontSize: '0.9rem', height: '32px' }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEditedPriority(index);
                          if (e.key === 'Escape') setEditingPriority({ index: null, value: '' });
                        }}
                        autoFocus
                      />
                    ) : (
                      <span className={`priority-badge ${badgeClass}`}>{prio}</span>
                    )}
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {isEditing ? (
                        <>
                          <button 
                            className="btn btn-secondary btn-icon" 
                            style={{ padding: '4px', color: '#10b981', borderColor: '#10b981' }} 
                            onClick={() => saveEditedPriority(index)}
                          >
                            ✔️
                          </button>
                          <button 
                            className="btn btn-secondary btn-icon" 
                            style={{ padding: '4px', color: '#ef4444', borderColor: '#ef4444' }} 
                            onClick={() => setEditingPriority({ index: null, value: '' })}
                          >
                            ❌
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            className="btn btn-secondary btn-icon" 
                            style={{ padding: '4px' }} 
                            onClick={() => setEditingPriority({ index, value: prio })}
                          >
                            ✏️
                          </button>
                          <button 
                            className="btn btn-danger btn-icon" 
                            style={{ padding: '4px' }} 
                            onClick={() => removePriority(prio)}
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={addPriority} style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="למשל: עדיפות על" 
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
                ➕ הוספה
              </button>
            </form>
          </div>

        </div>
      )}

      {/* TAB 3: LISTS (STORES & MANAGERS) */}
      {activeTab === 'lists' && (
        <div className="settings-grid-2col">
          
          {/* Prepopulated Stores List */}
          <div className="filter-panel">
            <h4 className="detail-section-title">חנויות וסניפים (השלמה אוטומטית)</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
              רשימת סניפי החנות שיוצעו כהשלמה אוטומטית בטופס. המשתמש עדיין יוכל להקליד שם סניף חופשי שאינו ברשימה.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {localSettings.stores.length === 0 ? (
                <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>הרשימה ריקה. הזן סניפים למטה.</span>
              ) : (
                localSettings.stores.map((st, index) => {
                  const isEditing = editingStore.index === index;
                  return (
                    <div key={index} className="flex-between" style={{ padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      {isEditing ? (
                        <input 
                          type="text" 
                          className="form-control"
                          value={editingStore.value}
                          onChange={(e) => setEditingStore({ ...editingStore, value: e.target.value })}
                          style={{ padding: '4px 8px', fontSize: '0.9rem', height: '32px' }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEditedStore(index);
                            if (e.key === 'Escape') setEditingStore({ index: null, value: '' });
                          }}
                          autoFocus
                        />
                      ) : (
                        <span style={{ fontWeight: '500' }}>{st}</span>
                      )}
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {isEditing ? (
                          <>
                            <button 
                              className="btn btn-secondary btn-icon" 
                              style={{ padding: '4px', color: '#10b981', borderColor: '#10b981' }} 
                              onClick={() => saveEditedStore(index)}
                            >
                              ✔️
                            </button>
                            <button 
                              className="btn btn-secondary btn-icon" 
                              style={{ padding: '4px', color: '#ef4444', borderColor: '#ef4444' }} 
                              onClick={() => setEditingStore({ index: null, value: '' })}
                            >
                              ❌
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              className="btn btn-secondary btn-icon" 
                              style={{ padding: '4px' }} 
                              onClick={() => setEditingStore({ index, value: st })}
                            >
                              ✏️
                            </button>
                            <button 
                              className="btn btn-danger btn-icon" 
                              style={{ padding: '4px' }} 
                              onClick={() => removeStore(st)}
                            >
                              🗑️
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={addStore} style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="שם חנות / סניף חדש" 
                value={newStore}
                onChange={(e) => setNewStore(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
                ➕ הוספה
              </button>
            </form>
          </div>

          {/* Prepopulated Import Managers List */}
          <div className="filter-panel">
            <h4 className="detail-section-title">אנשי קשר</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
              רשימת אנשי הקשר שיופיעו כהצעה להשלמה מהירה בשדה "איש קשר".
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {localSettings.importManagers.length === 0 ? (
                <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>הרשימה ריקה. הזן שמות אנשי קשר למטה.</span>
              ) : (
                localSettings.importManagers.map((mgr, index) => {
                  const isEditing = editingManager.index === index;
                  return (
                    <div key={index} className="flex-between" style={{ padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      {isEditing ? (
                        <input 
                          type="text" 
                          className="form-control"
                          value={editingManager.value}
                          onChange={(e) => setEditingManager({ ...editingManager, value: e.target.value })}
                          style={{ padding: '4px 8px', fontSize: '0.9rem', height: '32px' }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEditedManager(index);
                            if (e.key === 'Escape') setEditingManager({ index: null, value: '' });
                          }}
                          autoFocus
                        />
                      ) : (
                        <span style={{ fontWeight: '500' }}>{mgr}</span>
                      )}
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {isEditing ? (
                          <>
                            <button 
                              className="btn btn-secondary btn-icon" 
                              style={{ padding: '4px', color: '#10b981', borderColor: '#10b981' }} 
                              onClick={() => saveEditedManager(index)}
                            >
                              ✔️
                            </button>
                            <button 
                              className="btn btn-secondary btn-icon" 
                              style={{ padding: '4px', color: '#ef4444', borderColor: '#ef4444' }} 
                              onClick={() => setEditingManager({ index: null, value: '' })}
                            >
                              ❌
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              className="btn btn-secondary btn-icon" 
                              style={{ padding: '4px' }} 
                              onClick={() => setEditingManager({ index, value: mgr })}
                            >
                              ✏️
                            </button>
                            <button 
                              className="btn btn-danger btn-icon" 
                              style={{ padding: '4px' }} 
                              onClick={() => removeManager(mgr)}
                            >
                              🗑️
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={addManager} style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="שם איש/ת קשר" 
                value={newManager}
                onChange={(e) => setNewManager(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
                ➕ הוספה
              </button>
            </form>
          </div>

        </div>
      )}

      {/* TAB 4: SUPPLIERS & CONTACTS */}
      {activeTab === 'suppliers_contacts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="settings-grid-1to2col">
            
            {/* Suppliers List Panel */}
            <div className="filter-panel">
              <h4 className="detail-section-title">🏭 ספקים מוגדרים מראש</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
                רשימת הספקים שיוצעו כהשלמה אוטומטית בשדה "שם הספק בסין / בארץ" בטופס המשימה.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                {(localSettings.suppliers || []).length === 0 ? (
                  <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>הרשימה ריקה. הזן ספקים למטה.</span>
                ) : (
                  (localSettings.suppliers || []).map((sup, index) => {
                    const isEditing = editingSupplier.index === index;
                    return (
                      <div key={index} className="flex-between" style={{ padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                        {isEditing ? (
                          <input 
                            type="text" 
                            className="form-control"
                            value={editingSupplier.value}
                            onChange={(e) => setEditingSupplier({ ...editingSupplier, value: e.target.value })}
                            style={{ padding: '4px 8px', fontSize: '0.9rem', height: '32px' }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEditedSupplier(index);
                              if (e.key === 'Escape') setEditingSupplier({ index: null, value: '' });
                            }}
                            autoFocus
                          />
                        ) : (
                          <span style={{ fontWeight: '500' }}>{sup}</span>
                        )}
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {isEditing ? (
                            <>
                              <button 
                                className="btn btn-secondary btn-icon" 
                                style={{ padding: '4px', color: '#10b981', borderColor: '#10b981' }} 
                                onClick={() => saveEditedSupplier(index)}
                              >
                                ✔️
                              </button>
                              <button 
                                className="btn btn-secondary btn-icon" 
                                style={{ padding: '4px', color: '#ef4444', borderColor: '#ef4444' }} 
                                onClick={() => setEditingSupplier({ index: null, value: '' })}
                              >
                                ❌
                              </button>
                            </>
                          ) : (
                            <>
                              <button 
                                className="btn btn-secondary btn-icon" 
                                style={{ padding: '4px' }} 
                                onClick={() => setEditingSupplier({ index, value: sup })}
                              >
                                ✏️
                              </button>
                              <button 
                                className="btn btn-danger btn-icon" 
                                style={{ padding: '4px' }} 
                                onClick={() => removeSupplier(sup)}
                              >
                                🗑️
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form onSubmit={addSupplier} style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="שם ספק חדש" 
                  value={newSupplier}
                  onChange={(e) => setNewSupplier(e.target.value)}
                />
                <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
                  ➕ הוספה
                </button>
              </form>
            </div>

            {/* Contacts Management Panel */}
            <div className="filter-panel">
              <h4 className="detail-section-title">👥 אנשי קשר ובעלי תפקידים</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
                ניהול אנשי הקשר לביצוע עבודות. שמות אנשי הקשר יופיעו כהשלמה אוטומטית בשדה "איש קשר אצל הספק".
              </p>

              <div className="table-container" style={{ marginBottom: '20px', overflowX: 'auto' }}>
                <table className="task-table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '8px' }}>שם איש קשר</th>
                      <th style={{ padding: '8px' }}>תפקיד</th>
                      <th style={{ padding: '8px' }}>טלפון</th>
                      <th style={{ padding: '8px' }}>אימייל</th>
                      <th style={{ padding: '8px', width: '90px' }}>פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(localSettings.contacts || []).length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', padding: '16px' }}>
                          אין אנשי קשר מוגדרים. הוסף איש קשר למטה.
                        </td>
                      </tr>
                    ) : (
                      (localSettings.contacts || []).map((c, index) => {
                        const isEditing = editingContact.index === index;
                        return (
                          <tr key={index}>
                            <td style={{ padding: '8px' }}>
                              {isEditing ? (
                                <input 
                                  type="text"
                                  className="form-control"
                                  style={{ padding: '4px 8px', fontSize: '0.85rem', height: '28px' }}
                                  value={editingContact.name}
                                  onChange={(e) => setEditingContact({ ...editingContact, name: e.target.value })}
                                />
                              ) : (
                                <strong>{c.name}</strong>
                              )}
                            </td>
                            <td style={{ padding: '8px' }}>
                              {isEditing ? (
                                <input 
                                  type="text"
                                  className="form-control"
                                  style={{ padding: '4px 8px', fontSize: '0.85rem', height: '28px' }}
                                  value={editingContact.role}
                                  onChange={(e) => setEditingContact({ ...editingContact, role: e.target.value })}
                                />
                              ) : (
                                c.role || '-'
                              )}
                            </td>
                            <td style={{ padding: '8px' }}>
                              {isEditing ? (
                                <input 
                                  type="text"
                                  className="form-control text-left direction-ltr"
                                  style={{ padding: '4px 8px', fontSize: '0.85rem', height: '28px' }}
                                  value={editingContact.phone}
                                  onChange={(e) => setEditingContact({ ...editingContact, phone: e.target.value })}
                                />
                              ) : (
                                <span className="direction-ltr">{c.phone || '-'}</span>
                              )}
                            </td>
                            <td style={{ padding: '8px' }}>
                              {isEditing ? (
                                <input 
                                  type="text"
                                  className="form-control text-left direction-ltr"
                                  style={{ padding: '4px 8px', fontSize: '0.85rem', height: '28px' }}
                                  value={editingContact.email}
                                  onChange={(e) => setEditingContact({ ...editingContact, email: e.target.value })}
                                />
                              ) : (
                                <span className="direction-ltr">{c.email || '-'}</span>
                              )}
                            </td>
                            <td style={{ padding: '8px' }}>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                {isEditing ? (
                                  <>
                                    <button 
                                      className="btn btn-secondary btn-icon" 
                                      style={{ padding: '4px', color: '#10b981', borderColor: '#10b981' }} 
                                      onClick={() => saveEditedContact(index)}
                                    >
                                      ✔️
                                    </button>
                                    <button 
                                      className="btn btn-secondary btn-icon" 
                                      style={{ padding: '4px', color: '#ef4444', borderColor: '#ef4444' }} 
                                      onClick={() => setEditingContact({ index: null, name: '', role: '', phone: '', email: '' })}
                                    >
                                      ❌
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button 
                                      className="btn btn-secondary btn-icon" 
                                      style={{ padding: '4px' }} 
                                      onClick={() => setEditingContact({ index, name: c.name, role: c.role || '', phone: c.phone || '', email: c.email || '' })}
                                    >
                                      ✏️
                                    </button>
                                    <button 
                                      className="btn btn-danger btn-icon" 
                                      style={{ padding: '4px' }} 
                                      onClick={() => removeContact(c.name)}
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

              {/* Add New Contact Form */}
              <form onSubmit={addContact} style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)' }}>
                <h5 style={{ fontWeight: '600', marginBottom: '12px' }}>➕ הוספת איש קשר חדש</h5>
                <div className="form-grid-2col" style={{ marginBottom: '12px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>שם מלא *</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="לדוגמה: Mr. Li"
                      value={newContactName}
                      onChange={(e) => setNewContactName(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>תפקיד</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="לדוגמה: מנהל מכירות ספק סין"
                      value={newContactRole}
                      onChange={(e) => setNewContactRole(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-grid-2col" style={{ marginBottom: '16px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>טלפון</label>
                    <input 
                      type="text" 
                      className="form-control text-left direction-ltr" 
                      placeholder="לדוגמה: 052-1234567"
                      value={newContactPhone}
                      onChange={(e) => setNewContactPhone(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>אימייל</label>
                    <input 
                      type="email" 
                      className="form-control text-left direction-ltr" 
                      placeholder="לדוגמה: li@company.com"
                      value={newContactEmail}
                      onChange={(e) => setNewContactEmail(e.target.value)}
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                  ➕ הוסף איש קשר לרשימה
                </button>
              </form>
            </div>

          </div>

        </div>
      )}


      {/* Save Button Floating Panel at the bottom */}
      <div className="filter-panel flex-between" style={{ marginTop: '24px', backgroundColor: '#f8fafc' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          יש לשמור את ההגדרות על מנת שהשינויים יחולו על כלל המשתמשים במערכת (מעצבת, לקוחות וספקים).
        </span>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={onBack} disabled={saving}>
            ביטול
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? '⏳ שומר הגדרות...' : '💾 שמור הגדרות עכשיו'}
          </button>
        </div>
      </div>

    </main>
  );
}
