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
  const [activeTab, setActiveTab] = useState('suppliers_contacts');
  const [localSettings, setLocalSettings] = useState(JSON.parse(JSON.stringify(settings)));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Inputs for adding items
  const [newStatus, setNewStatus] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('badge-new');
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

  const [activeSupplierCard, setActiveSupplierCard] = useState(null); // { index, data }
  const [activeContactCard, setActiveContactCard] = useState(null); // { index, data }

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
  const addSupplier = async (e) => {
    e.preventDefault();
    if (!newSupplier.trim()) return;
    const suppliers = localSettings.suppliers || [];
    if (suppliers.some(s => (typeof s === 'string' ? s : s.name).trim() === newSupplier.trim())) {
      showMsg('ספק זה כבר קיים ברשימה', 'danger');
      return;
    }
    const newSupplierObj = {
      name: newSupplier.trim(),
      email: '',
      phone: '',
      address: '',
      wechat: '',
      notes: '',
      contactPerson: ''
    };
    const updatedSettings = {
      ...localSettings,
      suppliers: [...suppliers, newSupplierObj]
    };
    setLocalSettings(updatedSettings);
    setNewSupplier('');
    try {
      await onSaveSettings(updatedSettings);
      showMsg(`הספק "${newSupplierObj.name}" נוסף ונשמר בהצלחה`);
    } catch (e) {
      console.error(e);
      showMsg('שגיאה בשמירת השינויים בשרת', 'danger');
    }
  };

  const removeSupplier = async (supplierName) => {
    const suppliers = localSettings.suppliers || [];
    const updatedSettings = {
      ...localSettings,
      suppliers: suppliers.filter(s => (typeof s === 'string' ? s : s.name) !== supplierName)
    };
    setLocalSettings(updatedSettings);
    try {
      await onSaveSettings(updatedSettings);
      showMsg(`הספק "${supplierName}" הוסר ונשמר בהצלחה`);
    } catch (e) {
      console.error(e);
      showMsg('שגיאה בשמירת השינויים בשרת', 'danger');
    }
  };

  const saveEditedSupplier = async (index) => {
    const suppliers = localSettings.suppliers || [];
    const oldValueObj = suppliers[index];
    const oldValueName = typeof oldValueObj === 'string' ? oldValueObj : oldValueObj.name;
    const newValue = editingSupplier.value.trim();
    if (!newValue) return;
    if (oldValueName === newValue) {
      setEditingSupplier({ index: null, value: '' });
      return;
    }
    if (suppliers.some((s, idx) => idx !== index && (typeof s === 'string' ? s : s.name).trim() === newValue)) {
      showMsg('ספק זה כבר קיים ברשימה', 'danger');
      return;
    }

    const updated = [...suppliers];
    if (typeof oldValueObj === 'string') {
      updated[index] = { name: newValue, email: '', phone: '', address: '', wechat: '', notes: '', contactPerson: '' };
    } else {
      updated[index] = { ...oldValueObj, name: newValue };
    }
    const updatedSettings = {
      ...localSettings,
      suppliers: updated
    };
    setLocalSettings(updatedSettings);
    setEditingSupplier({ index: null, value: '' });
    try {
      await onSaveSettings(updatedSettings);
      showMsg(`שם הספק שונה ל-"${newValue}" ונשמר בהצלחה`);
    } catch (e) {
      console.error(e);
      showMsg('שגיאה בשמירת השינויים בשרת', 'danger');
    }
  };

  // Contact Handlers
  const addContact = async (e) => {
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
      email: newContactEmail.trim(),
      address: '',
      wechat: '',
      notes: ''
    };

    const updatedSettings = {
      ...localSettings,
      contacts: [...contacts, newContactObj]
    };
    setLocalSettings(updatedSettings);
    setNewContactName('');
    setNewContactRole('');
    setNewContactPhone('');
    setNewContactEmail('');
    try {
      await onSaveSettings(updatedSettings);
      showMsg(`איש הקשר "${newContactObj.name}" נוסף ונשמר בהצלחה`);
    } catch (e) {
      console.error(e);
      showMsg('שגיאה בשמירת השינויים בשרת', 'danger');
    }
  };

  const removeContact = async (contactName) => {
    const contacts = localSettings.contacts || [];
    const updatedSettings = {
      ...localSettings,
      contacts: contacts.filter(c => c.name !== contactName)
    };
    setLocalSettings(updatedSettings);
    try {
      await onSaveSettings(updatedSettings);
      showMsg(`איש הקשר "${contactName}" הוסר ונשמר בהצלחה`);
    } catch (e) {
      console.error(e);
      showMsg('שגיאה בשמירת השינויים בשרת', 'danger');
    }
  };

  const saveEditedContact = async (index) => {
    const contacts = localSettings.contacts || [];
    const newName = editingContact.name.trim();
    if (!newName) return;
    
    if (contacts.some((c, idx) => idx !== index && c.name.trim() === newName)) {
      showMsg('איש קשר עם שם זה כבר קיים ברשימה', 'danger');
      return;
    }

    const updated = [...contacts];
    updated[index] = {
      ...contacts[index],
      name: newName,
      role: editingContact.role.trim(),
      phone: editingContact.phone.trim(),
      email: editingContact.email.trim()
    };

    const updatedSettings = {
      ...localSettings,
      contacts: updated
    };
    setLocalSettings(updatedSettings);
    setEditingContact({ index: null, name: '', role: '', phone: '', email: '' });
    try {
      await onSaveSettings(updatedSettings);
      showMsg(`פרטי איש הקשר "${newName}" עודכנו ונשמרו בהצלחה`);
    } catch (e) {
      console.error(e);
      showMsg('שגיאה בשמירת השינויים בשרת', 'danger');
    }
  };

  const saveSupplierCard = async (index, updatedFields) => {
    const suppliers = localSettings.suppliers || [];
    const updated = [...suppliers];
    const normalizedOld = typeof suppliers[index] === 'string' ? { name: suppliers[index] } : suppliers[index];
    updated[index] = {
      ...normalizedOld,
      ...updatedFields,
      name: updatedFields.name.trim()
    };
    const updatedSettings = {
      ...localSettings,
      suppliers: updated
    };
    setLocalSettings(updatedSettings);
    try {
      await onSaveSettings(updatedSettings);
      showMsg(`כרטיס הספק "${updated[index].name}" עודכן ונשמר בהצלחה`);
    } catch (e) {
      console.error(e);
      showMsg('שגיאה בשמירת השינויים בשרת', 'danger');
    }
  };

  const saveContactCard = async (index, updatedFields) => {
    const contacts = localSettings.contacts || [];
    const updated = [...contacts];
    updated[index] = {
      ...contacts[index],
      ...updatedFields,
      name: updatedFields.name.trim()
    };
    const updatedSettings = {
      ...localSettings,
      contacts: updated
    };
    setLocalSettings(updatedSettings);
    try {
      await onSaveSettings(updatedSettings);
      showMsg(`כרטיס איש הקשר "${updated[index].name}" עודכן ונשמר בהצלחה`);
    } catch (e) {
      console.error(e);
      showMsg('שגיאה בשמירת השינויים בשרת', 'danger');
    }
  };

  return (
    <main className="dashboard-container" style={{ maxWidth: '1200px' }}>
      
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
          className={`login-tab-btn ${activeTab === 'suppliers_contacts' ? 'active' : ''}`}
          onClick={() => setActiveTab('suppliers_contacts')}
        >
          🏭 ספקים ואנשי קשר
        </button>
        <button 
          className={`login-tab-btn ${activeTab === 'workflow' ? 'active' : ''}`}
          onClick={() => setActiveTab('workflow')}
        >
          🔄 הגדרות זרימת עבודה
        </button>
      </div>

      {/* TAB 1: WORKFLOW & STATUSES */}
      {activeTab === 'workflow' && (
        <div className="filter-panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Default Status Selection */}
          <div>
            <h4 className="detail-section-title">סטטוס ברירת מחדל לפרויקטים חדשים</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '12px' }}>
              הסטטוס שיוקצה אוטומטית לכל משימה/פרויקט חדש שנוצר במערכת.
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
        </div>
      )}

      {/* TAB 4: SUPPLIERS & CONTACTS */}
      {activeTab === 'suppliers_contacts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="settings-grid-1to2col">
            
            {/* Suppliers List Panel */}
            <div className="filter-panel">
              <h4 className="detail-section-title">🏭 ספקים</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
                ניהול רשימת הספקים במערכת.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                {(localSettings.suppliers || []).length === 0 ? (
                  <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>הרשימה ריקה. הזן ספקים למטה.</span>
                ) : (
                  (localSettings.suppliers || []).map((sup, index) => {
                    const isEditing = editingSupplier.index === index;
                    const name = typeof sup === 'string' ? sup : sup.name;
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
                          <span style={{ fontWeight: '500' }}>{name}</span>
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
                                title="עריכת כרטיס ספק"
                                onClick={() => {
                                  const supObj = typeof sup === 'string' ? { name: sup } : sup;
                                  setActiveSupplierCard({
                                    index,
                                    data: {
                                      name: supObj.name || '',
                                      email: supObj.email || '',
                                      phone: supObj.phone || '',
                                      address: supObj.address || '',
                                      wechat: supObj.wechat || '',
                                      notes: supObj.notes || '',
                                      contactPerson: supObj.contactPerson || ''
                                    }
                                  });
                                }}
                              >
                                📇
                              </button>
                              <button 
                                className="btn btn-secondary btn-icon" 
                                style={{ padding: '4px' }} 
                                onClick={() => setEditingSupplier({ index, value: name })}
                              >
                                ✏️
                              </button>
                              <button 
                                className="btn btn-danger btn-icon" 
                                style={{ padding: '4px' }} 
                                onClick={() => removeSupplier(name)}
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
                      <th style={{ padding: '8px', whiteSpace: 'nowrap' }}>שם איש קשר</th>
                      <th style={{ padding: '8px', whiteSpace: 'nowrap' }}>תפקיד</th>
                      <th style={{ padding: '8px', whiteSpace: 'nowrap' }}>טלפון</th>
                      <th style={{ padding: '8px', whiteSpace: 'nowrap' }}>אימייל</th>
                      <th style={{ padding: '8px', width: '110px', whiteSpace: 'nowrap' }}>פעולות</th>
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
                            <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>
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
                            <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>
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
                            <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>
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
                            <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>
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
                                      title="עריכת כרטיס איש קשר"
                                      onClick={() => {
                                        setActiveContactCard({
                                          index,
                                          data: {
                                            name: c.name || '',
                                            role: c.role || '',
                                            phone: c.phone || '',
                                            email: c.email || '',
                                            address: c.address || '',
                                            wechat: c.wechat || '',
                                            notes: c.notes || ''
                                          }
                                        });
                                      }}
                                    >
                                      📇
                                    </button>
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

      {/* Supplier Card Modal */}
      {activeSupplierCard && (
        <div className="modal-overlay" onClick={() => setActiveSupplierCard(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">📇 כרטיס ספק: {activeSupplierCard.data.name}</h3>
              <button className="modal-close" onClick={() => setActiveSupplierCard(null)}>&times;</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'right', direction: 'rtl' }}>
              <div className="form-group">
                <label className="form-label">שם הספק *</label>
                <input 
                  type="text" 
                  className="form-control"
                  value={activeSupplierCard.data.name}
                  onChange={(e) => setActiveSupplierCard({
                    ...activeSupplierCard,
                    data: { ...activeSupplierCard.data, name: e.target.value }
                  })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">איש קשר אצל הספק</label>
                <input 
                  type="text" 
                  className="form-control"
                  placeholder="לדוגמה: Mr. Li"
                  value={activeSupplierCard.data.contactPerson}
                  onChange={(e) => setActiveSupplierCard({
                    ...activeSupplierCard,
                    data: { ...activeSupplierCard.data, contactPerson: e.target.value }
                  })}
                />
              </div>
              <div className="form-grid-2col">
                <div className="form-group">
                  <label className="form-label">טלפון</label>
                  <input 
                    type="text" 
                    className="form-control text-left direction-ltr"
                    value={activeSupplierCard.data.phone}
                    onChange={(e) => setActiveSupplierCard({
                      ...activeSupplierCard,
                      data: { ...activeSupplierCard.data, phone: e.target.value }
                    })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">אימייל</label>
                  <input 
                    type="email" 
                    className="form-control text-left direction-ltr"
                    value={activeSupplierCard.data.email}
                    onChange={(e) => setActiveSupplierCard({
                      ...activeSupplierCard,
                      data: { ...activeSupplierCard.data, email: e.target.value }
                    })}
                  />
                </div>
              </div>
              <div className="form-grid-2col">
                <div className="form-group">
                  <label className="form-label">כתובת</label>
                  <input 
                    type="text" 
                    className="form-control"
                    value={activeSupplierCard.data.address}
                    onChange={(e) => setActiveSupplierCard({
                      ...activeSupplierCard,
                      data: { ...activeSupplierCard.data, address: e.target.value }
                    })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">WeChat / WhatsApp</label>
                  <input 
                    type="text" 
                    className="form-control text-left direction-ltr"
                    value={activeSupplierCard.data.wechat}
                    onChange={(e) => setActiveSupplierCard({
                      ...activeSupplierCard,
                      data: { ...activeSupplierCard.data, wechat: e.target.value }
                    })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">הערות ופרטים נוספים</label>
                <textarea 
                  className="form-control" 
                  rows="3" 
                  style={{ resize: 'vertical' }}
                  value={activeSupplierCard.data.notes}
                  onChange={(e) => setActiveSupplierCard({
                    ...activeSupplierCard,
                    data: { ...activeSupplierCard.data, notes: e.target.value }
                  })}
                ></textarea>
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', direction: 'rtl' }}>
              <button className="btn btn-secondary" onClick={() => setActiveSupplierCard(null)}>ביטול</button>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  if (!activeSupplierCard.data.name.trim()) {
                    showMsg('שם ספק הוא שדה חובה', 'danger');
                    return;
                  }
                  saveSupplierCard(activeSupplierCard.index, activeSupplierCard.data);
                  setActiveSupplierCard(null);
                }}
              >
                שמור שינויים
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Card Modal */}
      {activeContactCard && (
        <div className="modal-overlay" onClick={() => setActiveContactCard(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">📇 כרטיס איש קשר: {activeContactCard.data.name}</h3>
              <button className="modal-close" onClick={() => setActiveContactCard(null)}>&times;</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'right', direction: 'rtl' }}>
              <div className="form-group">
                <label className="form-label">שם מלא *</label>
                <input 
                  type="text" 
                  className="form-control"
                  value={activeContactCard.data.name}
                  onChange={(e) => setActiveContactCard({
                    ...activeContactCard,
                    data: { ...activeContactCard.data, name: e.target.value }
                  })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">תפקיד</label>
                <input 
                  type="text" 
                  className="form-control"
                  value={activeContactCard.data.role}
                  onChange={(e) => setActiveContactCard({
                    ...activeContactCard,
                    data: { ...activeContactCard.data, role: e.target.value }
                  })}
                />
              </div>
              <div className="form-grid-2col">
                <div className="form-group">
                  <label className="form-label">טלפון</label>
                  <input 
                    type="text" 
                    className="form-control text-left direction-ltr"
                    value={activeContactCard.data.phone}
                    onChange={(e) => setActiveContactCard({
                      ...activeContactCard,
                      data: { ...activeContactCard.data, phone: e.target.value }
                    })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">אימייל</label>
                  <input 
                    type="email" 
                    className="form-control text-left direction-ltr"
                    value={activeContactCard.data.email}
                    onChange={(e) => setActiveContactCard({
                      ...activeContactCard,
                      data: { ...activeContactCard.data, email: e.target.value }
                    })}
                  />
                </div>
              </div>
              <div className="form-grid-2col">
                <div className="form-group">
                  <label className="form-label">כתובת</label>
                  <input 
                    type="text" 
                    className="form-control"
                    value={activeContactCard.data.address}
                    onChange={(e) => setActiveContactCard({
                      ...activeContactCard,
                      data: { ...activeContactCard.data, address: e.target.value }
                    })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">WeChat / WhatsApp</label>
                  <input 
                    type="text" 
                    className="form-control text-left direction-ltr"
                    value={activeContactCard.data.wechat}
                    onChange={(e) => setActiveContactCard({
                      ...activeContactCard,
                      data: { ...activeContactCard.data, wechat: e.target.value }
                    })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">הערות ופרטים נוספים</label>
                <textarea 
                  className="form-control" 
                  rows="3" 
                  style={{ resize: 'vertical' }}
                  value={activeContactCard.data.notes}
                  onChange={(e) => setActiveContactCard({
                    ...activeContactCard,
                    data: { ...activeContactCard.data, notes: e.target.value }
                  })}
                ></textarea>
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', direction: 'rtl' }}>
              <button className="btn btn-secondary" onClick={() => setActiveContactCard(null)}>ביטול</button>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  if (!activeContactCard.data.name.trim()) {
                    showMsg('שם מלא הוא שדה חובה', 'danger');
                    return;
                  }
                  saveContactCard(activeContactCard.index, activeContactCard.data);
                  setActiveContactCard(null);
                }}
              >
                שמור שינויים
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
