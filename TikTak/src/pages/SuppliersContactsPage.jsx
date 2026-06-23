import { useState } from 'react';
import { 
  addSupplier, 
  updateSupplier, 
  deleteSupplier, 
  addContact, 
  updateContact, 
  deleteContact 
} from '../utils/storage';

export default function SuppliersContactsPage({ suppliers = [], contacts = [], userId, onBack }) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Inputs for adding items
  const [newSupplier, setNewSupplier] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [newContactRole, setNewContactRole] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');

  // Inline editing states (simple names in the table)
  const [editingSupplier, setEditingSupplier] = useState({ id: null, value: '' });
  const [editingContact, setEditingContact] = useState({
    id: null,
    name: '',
    role: '',
    phone: '',
    email: ''
  });

  // Expand card modals
  const [activeSupplierCard, setActiveSupplierCard] = useState(null); // { id, data }
  const [activeContactCard, setActiveContactCard] = useState(null); // { id, data }
  const [pendingDeletion, setPendingDeletion] = useState(null); // { type, id, name }

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  // Supplier handlers
  const handleAddSupplier = async (e) => {
    e.preventDefault();
    if (!newSupplier.trim()) return;

    if (suppliers.some(s => s.name.trim().toLowerCase() === newSupplier.trim().toLowerCase())) {
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

    setSaving(true);
    try {
      await addSupplier(newSupplierObj, userId);
      setNewSupplier('');
      showMsg(`הספק "${newSupplierObj.name}" נוסף בהצלחה`);
    } catch (e) {
      console.error(e);
      showMsg('שגיאה בהוספת הספק. נסו שנית.', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSupplier = async (supplierId, supplierName) => {
    setSaving(true);
    try {
      await deleteSupplier(supplierId);
      setPendingDeletion(null);
      showMsg(`הספק "${supplierName}" הוסר בהצלחה`);
    } catch (e) {
      console.error(e);
      showMsg('שגיאה בהסרת הספק.', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const saveEditedSupplierInline = async (supplierId) => {
    const newValue = editingSupplier.value.trim();
    if (!newValue) return;

    const original = suppliers.find(s => s.id === supplierId);
    if (!original) return;

    if (original.name === newValue) {
      setEditingSupplier({ id: null, value: '' });
      return;
    }

    if (suppliers.some(s => s.id !== supplierId && s.name.trim().toLowerCase() === newValue.toLowerCase())) {
      showMsg('ספק זה כבר קיים ברשימה', 'danger');
      return;
    }

    setSaving(true);
    try {
      await updateSupplier(supplierId, { ...original, name: newValue });
      setEditingSupplier({ id: null, value: '' });
      showMsg(`שם הספק עודכן ל-"${newValue}"`);
    } catch (e) {
      console.error(e);
      showMsg('שגיאה בעדכון שם הספק.', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSupplierCard = async (supplierId, updatedFields) => {
    const original = suppliers.find(s => s.id === supplierId);
    if (!original) return;

    setSaving(true);
    try {
      await updateSupplier(supplierId, {
        ...original,
        ...updatedFields,
        name: updatedFields.name.trim()
      });
      showMsg(`כרטיס הספק "${updatedFields.name}" עודכן בהצלחה`);
    } catch (e) {
      console.error(e);
      showMsg('שגיאה בעדכון כרטיס ספק.', 'danger');
    } finally {
      setSaving(false);
    }
  };

  // Contact handlers
  const handleAddContact = async (e) => {
    e.preventDefault();
    if (!newContactName.trim()) {
      showMsg('שם איש קשר הוא שדה חובה', 'danger');
      return;
    }

    if (contacts.some(c => c.name.trim().toLowerCase() === newContactName.trim().toLowerCase())) {
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

    setSaving(true);
    try {
      await addContact(newContactObj, userId);
      setNewContactName('');
      setNewContactRole('');
      setNewContactPhone('');
      setNewContactEmail('');
      showMsg(`איש הקשר "${newContactObj.name}" נוסף בהצלחה`);
    } catch (e) {
      console.error(e);
      showMsg('שגיאה בהוספת איש קשר.', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveContact = async (contactId, contactName) => {
    setSaving(true);
    try {
      await deleteContact(contactId);
      setPendingDeletion(null);
      showMsg(`איש הקשר "${contactName}" הוסר בהצלחה`);
    } catch (e) {
      console.error(e);
      showMsg('שגיאה בהסרת איש קשר.', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const saveEditedContactInline = async (contactId) => {
    const newName = editingContact.name.trim();
    if (!newName) return;

    const original = contacts.find(c => c.id === contactId);
    if (!original) return;

    if (contacts.some(c => c.id !== contactId && c.name.trim().toLowerCase() === newName.toLowerCase())) {
      showMsg('איש קשר עם שם זה כבר קיים ברשימה', 'danger');
      return;
    }

    setSaving(true);
    try {
      await updateContact(contactId, {
        ...original,
        name: newName,
        role: editingContact.role.trim(),
        phone: editingContact.phone.trim(),
        email: editingContact.email.trim()
      });
      setEditingContact({ id: null, name: '', role: '', phone: '', email: '' });
      showMsg(`פרטי איש הקשר "${newName}" עודכנו בהצלחה`);
    } catch (e) {
      console.error(e);
      showMsg('שגיאה בעדכון פרטי איש קשר.', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveContactCard = async (contactId, updatedFields) => {
    const original = contacts.find(c => c.id === contactId);
    if (!original) return;

    setSaving(true);
    try {
      await updateContact(contactId, {
        ...original,
        ...updatedFields,
        name: updatedFields.name.trim()
      });
      showMsg(`כרטיס איש הקשר "${updatedFields.name}" עודכן בהצלחה`);
    } catch (e) {
      console.error(e);
      showMsg('שגיאה בעדכון כרטיס איש קשר.', 'danger');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="dashboard-container" style={{ maxWidth: '1250px', padding: '24px' }}>
      
      {/* Top Header Row */}
      <div className="flex-between" style={{ marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>👥 ספקים ואנשי קשר</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>ניהול רשימות הספקים, אנשי הקשר וכרטיסי המידע במערכת</p>
        </div>
        <button className="btn btn-secondary" onClick={onBack} disabled={saving}>
          📋 חזרה ללוח המשימות
        </button>
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

      {/* Main Layout Grid */}
      <div className="settings-grid-1to2col">
        
        {/* Suppliers Panel */}
        <div className="filter-panel">
          <h4 className="detail-section-title">🏭 ספקים</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
            ניהול רשימת הספקים לביצוע עבודות.
          </p>

          <div className="table-container" style={{ marginBottom: '20px' }}>
            <table className="task-table" style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th style={{ padding: '8px' }}>שם הספק</th>
                  <th style={{ padding: '8px', width: '120px' }}>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.length === 0 ? (
                  <tr>
                    <td colSpan="2" style={{ textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', padding: '16px' }}>
                      אין ספקים מוגדרים במערכת.
                    </td>
                  </tr>
                ) : (
                  suppliers.map((sup) => {
                    const isEditing = editingSupplier.id === sup.id;
                    return (
                      <tr key={sup.id}>
                        <td style={{ padding: '8px' }}>
                          {isEditing ? (
                            <input 
                              type="text" 
                              className="form-control"
                              style={{ padding: '4px 8px', fontSize: '0.85rem', height: '28px' }}
                              value={editingSupplier.value}
                              onChange={(e) => setEditingSupplier({ ...editingSupplier, value: e.target.value })}
                            />
                          ) : (
                            <strong>{sup.name}</strong>
                          )}
                        </td>
                        <td style={{ padding: '8px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {isEditing ? (
                              <>
                                <button 
                                  className="btn btn-secondary btn-icon" 
                                  style={{ padding: '4px', color: '#10b981', borderColor: '#10b981' }} 
                                  onClick={() => saveEditedSupplierInline(sup.id)}
                                >
                                  ✔️
                                </button>
                                <button 
                                  className="btn btn-secondary btn-icon" 
                                  style={{ padding: '4px', color: '#ef4444', borderColor: '#ef4444' }} 
                                  onClick={() => setEditingSupplier({ id: null, value: '' })}
                                >
                                  ❌
                                </button>
                              </>
                            ) : (
                              <>
                                <button 
                                  className="btn btn-secondary btn-icon" 
                                  style={{ padding: '4px' }} 
                                  title="כרטיס מידע מלא ספק"
                                  onClick={() => setActiveSupplierCard({ id: sup.id, data: { ...sup } })}
                                >
                                  📇
                                </button>
                                <button 
                                  className="btn btn-secondary btn-icon" 
                                  style={{ padding: '4px' }} 
                                  onClick={() => setEditingSupplier({ id: sup.id, value: sup.name })}
                                >
                                  ✏️
                                </button>
                                <button 
                                  className="btn btn-danger btn-icon" 
                                  style={{ padding: '4px' }} 
                                  onClick={() => setPendingDeletion({ type: 'supplier', id: sup.id, name: sup.name })}
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

          {/* Add Supplier Form */}
          <form onSubmit={handleAddSupplier} className="flex-row-gap-sm" style={{ marginTop: '16px' }}>
            <input 
              type="text" 
              className="form-control" 
              placeholder="שם ספק חדש..." 
              value={newSupplier}
              onChange={(e) => setNewSupplier(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }} disabled={saving}>
              ➕ הוספה
            </button>
          </form>
        </div>

        {/* Contacts Panel */}
        <div className="filter-panel">
          <h4 className="detail-section-title">👥 אנשי קשר ובעלי תפקידים</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
            ניהול אנשי הקשר לביצוע עבודות. שמות אנשי הקשר יופיעו כהשלמה אוטומטית במשימות.
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
                {contacts.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', padding: '16px' }}>
                      אין אנשי קשר מוגדרים במערכת.
                    </td>
                  </tr>
                ) : (
                  contacts.map((c) => {
                    const isEditing = editingContact.id === c.id;
                    return (
                      <tr key={c.id}>
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
                                  onClick={() => saveEditedContactInline(c.id)}
                                >
                                  ✔️
                                </button>
                                <button 
                                  className="btn btn-secondary btn-icon" 
                                  style={{ padding: '4px', color: '#ef4444', borderColor: '#ef4444' }} 
                                  onClick={() => setEditingContact({ id: null, name: '', role: '', phone: '', email: '' })}
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
                                  onClick={() => setActiveContactCard({ id: c.id, data: { ...c } })}
                                >
                                  📇
                                </button>
                                <button 
                                  className="btn btn-secondary btn-icon" 
                                  style={{ padding: '4px' }} 
                                  onClick={() => setEditingContact({ id: c.id, name: c.name, role: c.role || '', phone: c.phone || '', email: c.email || '' })}
                                >
                                  ✏️
                                </button>
                                <button 
                                  className="btn btn-danger btn-icon" 
                                  style={{ padding: '4px' }} 
                                  onClick={() => setPendingDeletion({ type: 'contact', id: c.id, name: c.name })}
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

          {/* Add Contact Form */}
          <form onSubmit={handleAddContact} style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)' }}>
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
                  placeholder="לדוגמה: מנהל ייצור"
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
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={saving}>
              ➕ הוסף איש קשר לרשימה
            </button>
          </form>
        </div>

      </div>

      <div style={{ marginTop: '24px', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', backgroundColor: '#fafaf9', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
        ⚙️ השינויים נשמרים ומסונכרנים באופן אוטומטי בזמן אמת בבסיס הנתונים.
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
                  value={activeSupplierCard.data.contactPerson || ''}
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
                    value={activeSupplierCard.data.phone || ''}
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
                    value={activeSupplierCard.data.email || ''}
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
                    value={activeSupplierCard.data.address || ''}
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
                    value={activeSupplierCard.data.wechat || ''}
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
                  value={activeSupplierCard.data.notes || ''}
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
                  handleSaveSupplierCard(activeSupplierCard.id, activeSupplierCard.data);
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
                  value={activeContactCard.data.role || ''}
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
                    value={activeContactCard.data.phone || ''}
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
                    value={activeContactCard.data.email || ''}
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
                    value={activeContactCard.data.address || ''}
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
                    value={activeContactCard.data.wechat || ''}
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
                  value={activeContactCard.data.notes || ''}
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
                  handleSaveContactCard(activeContactCard.id, activeContactCard.data);
                  setActiveContactCard(null);
                }}
              >
                שמור שינויים
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-app HTML delete confirmation */}
      {pendingDeletion && (
        <div className="modal-overlay" onClick={() => !saving && setPendingDeletion(null)}>
          <div className="modal-content confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {pendingDeletion.type === 'supplier' ? 'מחיקת ספק' : 'מחיקת איש קשר'}
              </h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setPendingDeletion(null)}
                disabled={saving}
                aria-label="סגירת חלון האישור"
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p>
                האם למחוק את {pendingDeletion.type === 'supplier' ? 'הספק' : 'איש הקשר'} <strong>"{pendingDeletion.name}"</strong>?
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setPendingDeletion(null)}
                disabled={saving}
              >
                ביטול
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={saving}
                onClick={() => {
                  if (pendingDeletion.type === 'supplier') {
                    handleRemoveSupplier(pendingDeletion.id, pendingDeletion.name);
                  } else {
                    handleRemoveContact(pendingDeletion.id, pendingDeletion.name);
                  }
                }}
              >
                {saving ? 'מוחק...' : 'מחיקה'}
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
