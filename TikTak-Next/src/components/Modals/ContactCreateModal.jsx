import React, { useState } from 'react';
import { X, UserPlus, Building2 } from 'lucide-react';
import { db } from '../../services/db';

export function ContactCreateModal({ initialType = 'lead', users = [], onClose, onContactCreated }) {
  const [contactType, setContactType] = useState(initialType);
  const [businessName, setBusinessName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [leadSource, setLeadSource] = useState('פנייה מהאתר');
  const [nextAction, setNextAction] = useState('להתקשר לליד');
  const [packageName, setPackageName] = useState('Pro');
  const [monthlyPrice, setMonthlyPrice] = useState(350);
  const [assigneeId, setAssigneeId] = useState(users[0]?.id || 'usr_alina');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!businessName.trim()) return;

    const newContact = db.addContact({
      contactType,
      businessName: businessName.trim(),
      contactPerson: contactPerson.trim(),
      phone: phone.trim(),
      email: email.trim(),
      leadSource,
      assigneeId,
      nextAction: nextAction.trim() || (contactType === 'lead' ? 'להתקשר לליד' : 'מעקב קליטה'),
      packageName,
      monthlyPrice: Number(monthlyPrice)
    });

    if (onContactCreated) onContactCreated(newContact);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '550px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '1.2rem' }}>
            {contactType === 'lead' ? <UserPlus size={20} color="#10B981" /> : <Building2 size={20} color="#2563EB" />}
            <span>הוספת {contactType === 'lead' ? 'ליד חדש' : 'לקוח פנסיון חדש'}</span>
          </div>
          <button className="icon-btn-sm" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">סוג רשומה</label>
              <select className="form-select" value={contactType} onChange={(e) => setContactType(e.target.value)}>
                <option value="lead">ליד מתעניין</option>
                <option value="customer">לקוח פנסיון פעיל</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">שם העסק / פנסיון *</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="לדוגמה: פנסיון ביתי ליזה"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </div>

            <div className="fields-2col">
              <div className="form-group">
                <label className="form-label">שם איש קשר</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="לדוגמה: ליזה כהן"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">טלפון (WhatsApp)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="05X-XXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="fields-2col">
              <div className="form-group">
                <label className="form-label">אימייל</label>
                <input
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">אחראי טיפול</label>
                <select className="form-select" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                  <option value="">ללא אחראי</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {contactType === 'lead' ? (
              <div className="form-group">
                <label className="form-label">מקור הליד</label>
                <select className="form-select" value={leadSource} onChange={(e) => setLeadSource(e.target.value)}>
                  <option value="פנייה מהאתר">פנייה מהאתר</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Instagram">Instagram</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="המלצה">המלצה</option>
                  <option value="פנייה יזומה">פנייה יזומה</option>
                  <option value="Google">Google</option>
                  <option value="אחר">אחר</option>
                </select>
              </div>
            ) : (
              <div className="fields-2col">
                <div className="form-group">
                  <label className="form-label">חבילת PAWZA</label>
                  <select className="form-select" value={packageName} onChange={(e) => setPackageName(e.target.value)}>
                    <option value="בסיסית">בסיסית (250 ₪)</option>
                    <option value="Pro">Pro (350 ₪)</option>
                    <option value="Premium">Premium (500 ₪)</option>
                    <option value="מותאמת אישית">מותאמת אישית</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">מחיר חודשי (₪)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={monthlyPrice}
                    onChange={(e) => setMonthlyPrice(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">הפעולה הבאה (Next Action) *</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="לדוגמה: להתקשר ביום ראשון / לשלוח הצעת מחיר"
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>ביטול</button>
            <button type="submit" className="btn btn-primary" style={{ background: contactType === 'lead' ? '#10B981' : '#2563EB' }}>
              צור {contactType === 'lead' ? 'ליד' : 'לקוח'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
