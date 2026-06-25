import { useMemo, useState, useEffect } from 'react';
import {
  addSupplier,
  updateSupplier,
  deleteSupplier,
  addContact,
  updateContact,
  deleteContact
} from '../utils/storage';

const normalizeSearch = (value = '') => value.toString().trim().toLowerCase();
const hasValue = (value) => Boolean(value && value.toString().trim());
const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase();
};

export default function SuppliersContactsPage({ suppliers = [], contacts = [], userId, onBack, autoOpenSupplierId, autoOpenContactId, onClearAutoOpen }) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [supplierSearch, setSupplierSearch] = useState('');
  const [contactSearch, setContactSearch] = useState('');

  const [newSupplier, setNewSupplier] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [newContactRole, setNewContactRole] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');

  const [editingSupplier, setEditingSupplier] = useState({ id: null, value: '' });
  const [editingContact, setEditingContact] = useState({
    id: null,
    name: '',
    role: '',
    phone: '',
    email: ''
  });

  const [activeSupplierCard, setActiveSupplierCard] = useState(null);
  const [activeContactCard, setActiveContactCard] = useState(null);
  const [pendingDeletion, setPendingDeletion] = useState(null);

  // Listen to autoOpenSupplierId or autoOpenContactId from global search
  useEffect(() => {
    if (autoOpenSupplierId && suppliers.length > 0) {
      const supplier = suppliers.find(s => s.id === autoOpenSupplierId);
      if (supplier) {
        setActiveSupplierCard({ id: supplier.id, data: { ...supplier } });
        if (onClearAutoOpen) onClearAutoOpen();
      }
    }
  }, [autoOpenSupplierId, suppliers, onClearAutoOpen]);

  useEffect(() => {
    if (autoOpenContactId && contacts.length > 0) {
      const contact = contacts.find(c => c.id === autoOpenContactId);
      if (contact) {
        setActiveContactCard({ id: contact.id, data: { ...contact } });
        if (onClearAutoOpen) onClearAutoOpen();
      }
    }
  }, [autoOpenContactId, contacts, onClearAutoOpen]);

  const filteredSuppliers = useMemo(() => {
    const query = normalizeSearch(supplierSearch);
    if (!query) return suppliers;
    return suppliers.filter((supplier) => [
      supplier.name,
      supplier.contactPerson,
      supplier.phone,
      supplier.email,
      supplier.address,
      supplier.notes
    ].some((value) => normalizeSearch(value).includes(query)));
  }, [suppliers, supplierSearch]);

  const filteredContacts = useMemo(() => {
    const query = normalizeSearch(contactSearch);
    if (!query) return contacts;
    return contacts.filter((contact) => [
      contact.name,
      contact.role,
      contact.phone,
      contact.email,
      contact.address,
      contact.notes
    ].some((value) => normalizeSearch(value).includes(query)));
  }, [contacts, contactSearch]);

  const suppliersWithDetails = useMemo(
    () => suppliers.filter((supplier) => hasValue(supplier.email) || hasValue(supplier.phone) || hasValue(supplier.contactPerson)).length,
    [suppliers]
  );

  const contactsWithDetails = useMemo(
    () => contacts.filter((contact) => hasValue(contact.email) || hasValue(contact.phone) || hasValue(contact.role)).length,
    [contacts]
  );

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

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

  const renderSupplierActions = (supplier) => {
    const isEditing = editingSupplier.id === supplier.id;
    if (isEditing) {
      return (
        <div className="directory-actions editing-actions">
          <button type="button" className="directory-icon-button success" title="שמירת שם הספק" onClick={() => saveEditedSupplierInline(supplier.id)}>
            ✓
          </button>
          <button type="button" className="directory-icon-button" title="ביטול עריכה" onClick={() => setEditingSupplier({ id: null, value: '' })}>
            ×
          </button>
        </div>
      );
    }

    return (
      <div className="directory-actions">
        <button type="button" className="directory-icon-button" title="פתיחת כרטיס ספק מלא" onClick={() => setActiveSupplierCard({ id: supplier.id, data: { ...supplier } })}>
          פרטים
        </button>
        <button type="button" className="directory-icon-button" title="עריכת שם הספק" onClick={() => setEditingSupplier({ id: supplier.id, value: supplier.name })}>
          עריכה
        </button>
        <button type="button" className="directory-icon-button danger" title="מחיקת ספק" onClick={() => setPendingDeletion({ type: 'supplier', id: supplier.id, name: supplier.name })}>
          מחיקה
        </button>
      </div>
    );
  };

  const renderContactActions = (contact) => {
    const isEditing = editingContact.id === contact.id;
    if (isEditing) {
      return (
        <div className="directory-actions editing-actions">
          <button type="button" className="directory-icon-button success" title="שמירת פרטי איש קשר" onClick={() => saveEditedContactInline(contact.id)}>
            ✓
          </button>
          <button type="button" className="directory-icon-button" title="ביטול עריכה" onClick={() => setEditingContact({ id: null, name: '', role: '', phone: '', email: '' })}>
            ×
          </button>
        </div>
      );
    }

    return (
      <div className="directory-actions">
        <button type="button" className="directory-icon-button" title="פתיחת כרטיס איש קשר מלא" onClick={() => setActiveContactCard({ id: contact.id, data: { ...contact } })}>
          פרטים
        </button>
        <button type="button" className="directory-icon-button" title="עריכת פרטים מהירה" onClick={() => setEditingContact({ id: contact.id, name: contact.name, role: contact.role || '', phone: contact.phone || '', email: contact.email || '' })}>
          עריכה
        </button>
        <button type="button" className="directory-icon-button danger" title="מחיקת איש קשר" onClick={() => setPendingDeletion({ type: 'contact', id: contact.id, name: contact.name })}>
          מחיקה
        </button>
      </div>
    );
  };

  return (
    <main className="dashboard-container directory-page">
      <section className="directory-hero">
        <div>
          <p className="directory-eyebrow">ספר ספקים ואנשי קשר</p>
          <h2>ספקים ואנשי קשר</h2>
          <p className="directory-hero-text">
            כל הגורמים שמופיעים בהשלמות האוטומטיות במשימות, עם חיפוש מהיר, עריכה במקום וכרטיס מידע מלא.
          </p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={onBack} disabled={saving}>
          חזרה ללוח המשימות
        </button>
      </section>

      <section className="directory-stats" aria-label="תקציר ספקים ואנשי קשר">
        <div className="directory-stat">
          <span className="directory-stat-value">{suppliers.length}</span>
          <span className="directory-stat-label">ספקים</span>
        </div>
        <div className="directory-stat accent-green">
          <span className="directory-stat-value">{contacts.length}</span>
          <span className="directory-stat-label">אנשי קשר</span>
        </div>
        <div className="directory-stat accent-amber">
          <span className="directory-stat-value">{suppliersWithDetails + contactsWithDetails}</span>
          <span className="directory-stat-label">כרטיסים עם פרטי התקשרות</span>
        </div>
      </section>

      {message.text && (
        <div className={`directory-message ${message.type === 'danger' ? 'danger' : ''}`} role="status">
          {message.text}
        </div>
      )}

      <div className="directory-layout">
        <section className="directory-panel">
          <div className="directory-panel-header">
            <div>
              <h3>ספקים</h3>
              <p>רשימת הספקים לביצוע עבודות והפקות.</p>
            </div>
            <span className="directory-count">{filteredSuppliers.length} מתוך {suppliers.length}</span>
          </div>

          <div className="directory-toolbar">
            <label className="directory-search">
              <span>חיפוש ספק</span>
              <input
                type="search"
                className="form-control"
                placeholder="שם, איש קשר, טלפון או אימייל"
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
              />
            </label>
          </div>

          <form onSubmit={handleAddSupplier} className="directory-add-row">
            <input
              type="text"
              className="form-control"
              placeholder="שם ספק חדש"
              value={newSupplier}
              onChange={(e) => setNewSupplier(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" disabled={saving || !newSupplier.trim()}>
              הוספה
            </button>
          </form>

          <div className="directory-table-wrap">
            <table className="directory-table">
              <thead>
                <tr>
                  <th>שם הספק</th>
                  <th>איש קשר</th>
                  <th>תקשורת</th>
                  <th>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan="4">
                      <div className="directory-empty">לא נמצאו ספקים להצגה.</div>
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((supplier) => {
                    const isEditing = editingSupplier.id === supplier.id;
                    return (
                      <tr key={supplier.id}>
                        <td>
                          <div className="directory-name-cell">
                            <span className="directory-avatar">{getInitials(supplier.name)}</span>
                            {isEditing ? (
                              <input
                                type="text"
                                className="form-control directory-inline-input"
                                value={editingSupplier.value}
                                onChange={(e) => setEditingSupplier({ ...editingSupplier, value: e.target.value })}
                              />
                            ) : (
                              <strong>{supplier.name}</strong>
                            )}
                          </div>
                        </td>
                        <td>{supplier.contactPerson || <span className="muted-text">לא הוגדר</span>}</td>
                        <td>
                          <div className="directory-contact-lines">
                            {supplier.phone ? <a className="directory-phone-link direction-ltr" href={`tel:${supplier.phone.replace(/\s+/g, '')}`}>{supplier.phone}</a> : null}
                            {supplier.email ? <a className="direction-ltr" href={`mailto:${supplier.email}`}>{supplier.email}</a> : null}
                            {!supplier.phone && !supplier.email ? <span className="muted-text">אין פרטי התקשרות</span> : null}
                          </div>
                        </td>
                        <td>{renderSupplierActions(supplier)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="directory-panel contacts-panel">
          <div className="directory-panel-header">
            <div>
              <h3>אנשי קשר ובעלי תפקידים</h3>
              <p>אנשי הקשר שיופיעו כהשלמה אוטומטית במשימות.</p>
            </div>
            <span className="directory-count">{filteredContacts.length} מתוך {contacts.length}</span>
          </div>

          <div className="directory-toolbar">
            <label className="directory-search">
              <span>חיפוש איש קשר</span>
              <input
                type="search"
                className="form-control"
                placeholder="שם, תפקיד, טלפון או אימייל"
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
              />
            </label>
          </div>

          <form onSubmit={handleAddContact} className="directory-contact-form">
            <div className="form-grid-2col">
              <div className="form-group">
                <label className="form-label">שם מלא *</label>
                <input type="text" className="form-control" value={newContactName} onChange={(e) => setNewContactName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">תפקיד</label>
                <input type="text" className="form-control" value={newContactRole} onChange={(e) => setNewContactRole(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">טלפון</label>
                <input type="text" className="form-control text-left direction-ltr" value={newContactPhone} onChange={(e) => setNewContactPhone(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">אימייל</label>
                <input type="email" className="form-control text-left direction-ltr" value={newContactEmail} onChange={(e) => setNewContactEmail(e.target.value)} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving || !newContactName.trim()}>
              הוספת איש קשר
            </button>
          </form>

          <div className="directory-table-wrap">
            <table className="directory-table contacts-table">
              <thead>
                <tr>
                  <th>שם</th>
                  <th>טלפון</th>
                  <th>אימייל</th>
                  <th>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.length === 0 ? (
                  <tr>
                    <td colSpan="4">
                      <div className="directory-empty">לא נמצאו אנשי קשר להצגה.</div>
                    </td>
                  </tr>
                ) : (
                  filteredContacts.map((contact) => {
                    const isEditing = editingContact.id === contact.id;
                    return (
                      <tr key={contact.id}>
                        <td>
                          <div className="directory-name-cell">
                            <span className="directory-avatar contact">{getInitials(contact.name)}</span>
                            {isEditing ? (
                              <input type="text" className="form-control directory-inline-input" value={editingContact.name} onChange={(e) => setEditingContact({ ...editingContact, name: e.target.value })} />
                            ) : (
                              <strong>{contact.name}</strong>
                            )}
                          </div>
                        </td>
                        <td>
                          {isEditing ? (
                            <input type="text" className="form-control direction-ltr text-left directory-inline-input" value={editingContact.phone} onChange={(e) => setEditingContact({ ...editingContact, phone: e.target.value })} />
                          ) : (
                            contact.phone ? <a className="directory-phone-link direction-ltr" href={`tel:${contact.phone.replace(/\s+/g, '')}`}>{contact.phone}</a> : <span className="muted-text">לא הוגדר</span>
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <input type="email" className="form-control direction-ltr text-left directory-inline-input" value={editingContact.email} onChange={(e) => setEditingContact({ ...editingContact, email: e.target.value })} />
                          ) : (
                            contact.email ? <a className="direction-ltr" href={`mailto:${contact.email}`}>{contact.email}</a> : <span className="muted-text">לא הוגדר</span>
                          )}
                        </td>
                        <td>{renderContactActions(contact)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="directory-sync-note">
        השינויים נשמרים ומסונכרנים בזמן אמת בבסיס הנתונים.
      </div>

      {activeSupplierCard && (
        <div className="modal-overlay" onClick={() => setActiveSupplierCard(null)}>
          <div className="modal-content directory-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">כרטיס ספק: {activeSupplierCard.data.name}</h3>
              <button className="modal-close" onClick={() => setActiveSupplierCard(null)}>&times;</button>
            </div>
            <div className="modal-body directory-modal-body">
              <div className="form-group">
                <label className="form-label">שם הספק *</label>
                <input type="text" className="form-control" value={activeSupplierCard.data.name} onChange={(e) => setActiveSupplierCard({ ...activeSupplierCard, data: { ...activeSupplierCard.data, name: e.target.value } })} />
              </div>
              <div className="form-group">
                <label className="form-label">איש קשר אצל הספק</label>
                <input type="text" className="form-control" value={activeSupplierCard.data.contactPerson || ''} onChange={(e) => setActiveSupplierCard({ ...activeSupplierCard, data: { ...activeSupplierCard.data, contactPerson: e.target.value } })} />
              </div>
              <div className="form-grid-2col">
                <div className="form-group">
                  <label className="form-label">טלפון</label>
                  <input type="text" className="form-control text-left direction-ltr" value={activeSupplierCard.data.phone || ''} onChange={(e) => setActiveSupplierCard({ ...activeSupplierCard, data: { ...activeSupplierCard.data, phone: e.target.value } })} />
                </div>
                <div className="form-group">
                  <label className="form-label">אימייל</label>
                  <input type="email" className="form-control text-left direction-ltr" value={activeSupplierCard.data.email || ''} onChange={(e) => setActiveSupplierCard({ ...activeSupplierCard, data: { ...activeSupplierCard.data, email: e.target.value } })} />
                </div>
              </div>
              <div className="form-grid-2col">
                <div className="form-group">
                  <label className="form-label">כתובת</label>
                  <input type="text" className="form-control" value={activeSupplierCard.data.address || ''} onChange={(e) => setActiveSupplierCard({ ...activeSupplierCard, data: { ...activeSupplierCard.data, address: e.target.value } })} />
                </div>
                <div className="form-group">
                  <label className="form-label">WeChat / WhatsApp</label>
                  <input type="text" className="form-control text-left direction-ltr" value={activeSupplierCard.data.wechat || ''} onChange={(e) => setActiveSupplierCard({ ...activeSupplierCard, data: { ...activeSupplierCard.data, wechat: e.target.value } })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">הערות ופרטים נוספים</label>
                <textarea className="form-control" rows="3" value={activeSupplierCard.data.notes || ''} onChange={(e) => setActiveSupplierCard({ ...activeSupplierCard, data: { ...activeSupplierCard.data, notes: e.target.value } })}></textarea>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setActiveSupplierCard(null)}>ביטול</button>
              <button className="btn btn-primary" onClick={() => {
                if (!activeSupplierCard.data.name.trim()) {
                  showMsg('שם ספק הוא שדה חובה', 'danger');
                  return;
                }
                handleSaveSupplierCard(activeSupplierCard.id, activeSupplierCard.data);
                setActiveSupplierCard(null);
              }}>
                שמור שינויים
              </button>
            </div>
          </div>
        </div>
      )}

      {activeContactCard && (
        <div className="modal-overlay" onClick={() => setActiveContactCard(null)}>
          <div className="modal-content directory-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">כרטיס איש קשר: {activeContactCard.data.name}</h3>
              <button className="modal-close" onClick={() => setActiveContactCard(null)}>&times;</button>
            </div>
            <div className="modal-body directory-modal-body">
              <div className="form-group">
                <label className="form-label">שם מלא *</label>
                <input type="text" className="form-control" value={activeContactCard.data.name} onChange={(e) => setActiveContactCard({ ...activeContactCard, data: { ...activeContactCard.data, name: e.target.value } })} />
              </div>
              <div className="form-group">
                <label className="form-label">תפקיד</label>
                <input type="text" className="form-control" value={activeContactCard.data.role || ''} onChange={(e) => setActiveContactCard({ ...activeContactCard, data: { ...activeContactCard.data, role: e.target.value } })} />
              </div>
              <div className="form-grid-2col">
                <div className="form-group">
                  <label className="form-label">טלפון</label>
                  <input type="text" className="form-control text-left direction-ltr" value={activeContactCard.data.phone || ''} onChange={(e) => setActiveContactCard({ ...activeContactCard, data: { ...activeContactCard.data, phone: e.target.value } })} />
                </div>
                <div className="form-group">
                  <label className="form-label">אימייל</label>
                  <input type="email" className="form-control text-left direction-ltr" value={activeContactCard.data.email || ''} onChange={(e) => setActiveContactCard({ ...activeContactCard, data: { ...activeContactCard.data, email: e.target.value } })} />
                </div>
              </div>
              <div className="form-grid-2col">
                <div className="form-group">
                  <label className="form-label">כתובת</label>
                  <input type="text" className="form-control" value={activeContactCard.data.address || ''} onChange={(e) => setActiveContactCard({ ...activeContactCard, data: { ...activeContactCard.data, address: e.target.value } })} />
                </div>
                <div className="form-group">
                  <label className="form-label">WeChat / WhatsApp</label>
                  <input type="text" className="form-control text-left direction-ltr" value={activeContactCard.data.wechat || ''} onChange={(e) => setActiveContactCard({ ...activeContactCard, data: { ...activeContactCard.data, wechat: e.target.value } })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">הערות ופרטים נוספים</label>
                <textarea className="form-control" rows="3" value={activeContactCard.data.notes || ''} onChange={(e) => setActiveContactCard({ ...activeContactCard, data: { ...activeContactCard.data, notes: e.target.value } })}></textarea>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setActiveContactCard(null)}>ביטול</button>
              <button className="btn btn-primary" onClick={() => {
                if (!activeContactCard.data.name.trim()) {
                  showMsg('שם מלא הוא שדה חובה', 'danger');
                  return;
                }
                handleSaveContactCard(activeContactCard.id, activeContactCard.data);
                setActiveContactCard(null);
              }}>
                שמור שינויים
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingDeletion && (
        <div className="modal-overlay" onClick={() => !saving && setPendingDeletion(null)}>
          <div className="modal-content confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{pendingDeletion.type === 'supplier' ? 'מחיקת ספק' : 'מחיקת איש קשר'}</h3>
              <button type="button" className="modal-close" onClick={() => setPendingDeletion(null)} disabled={saving} aria-label="סגירת חלון האישור">
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p>
                האם למחוק את {pendingDeletion.type === 'supplier' ? 'הספק' : 'איש הקשר'} <strong>"{pendingDeletion.name}"</strong>?
              </p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setPendingDeletion(null)} disabled={saving}>
                ביטול
              </button>
              <button type="button" className="btn btn-danger" disabled={saving} onClick={() => {
                if (pendingDeletion.type === 'supplier') {
                  handleRemoveSupplier(pendingDeletion.id, pendingDeletion.name);
                } else {
                  handleRemoveContact(pendingDeletion.id, pendingDeletion.name);
                }
              }}>
                {saving ? 'מוחק...' : 'מחיקה'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
