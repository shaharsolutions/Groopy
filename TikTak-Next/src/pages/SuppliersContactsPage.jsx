import React, { useState } from 'react';
import { Truck, Phone, Mail, MapPin, Plus, UserCheck } from 'lucide-react';
import { db } from '../services/db';

export function SuppliersContactsPage({ suppliers, onRefresh }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState('מתקני תצוגה ושלטון');
  const [address, setAddress] = useState('');

  const handleAddSupplier = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    db.addSupplier({
      name: name.trim(),
      contactPerson: contactPerson.trim(),
      email: email.trim(),
      phone: phone.trim(),
      category,
      address: address.trim()
    });

    setShowAddModal(false);
    setName('');
    setContactPerson('');
    setEmail('');
    setPhone('');
    setAddress('');
    if (onRefresh) onRefresh();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Truck size={24} color="var(--primary)" />
            ניהול ספקים ואנשי קשר
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            רשימת הספקים המורשים במערכת TikTak Next
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={18} /> הוסף ספק חדש
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {suppliers.map((sup) => (
          <div key={sup.id} className="task-card" style={{ cursor: 'default' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{sup.name}</h3>
                <span className="badge" style={{ background: 'var(--primary-light)', color: 'var(--primary)', marginTop: '4px' }}>
                  {sup.category}
                </span>
              </div>
              <span className="badge" style={{ background: '#F1F5F9', color: 'var(--text-muted)' }}>
                {sup.activeTasksCount || 0} משימות
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem', color: 'var(--text-main)', marginTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserCheck size={16} color="var(--text-muted)" />
                <span>איש קשר: <strong>{sup.contactPerson || '-'}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Phone size={16} color="var(--text-muted)" />
                <span>טלפון: {sup.phone || '-'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={16} color="var(--text-muted)" />
                <span>מייל: {sup.email || '-'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={16} color="var(--text-muted)" />
                <span>כתובת: {sup.address || '-'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 800 }}>הוספת ספק חדש ל-TikTak Next</h3>
            </div>
            <form onSubmit={handleAddSupplier}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">שם הספק / החברה *</label>
                  <input type="text" className="form-input" required value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">שם איש הקשר</label>
                  <input type="text" className="form-input" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">טלפון</label>
                    <input type="text" className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">דואר אלקטרוני</label>
                    <input type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">תחום התמחות</label>
                  <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="מתקני תצוגה ושלטון">מתקני תצוגה ושלטון</option>
                    <option value="מדפים וברזל">מדפים וברזל</option>
                    <option value="מקררים ומכשירי קור">מקררים ומכשירי קור</option>
                    <option value="תאורה וחשמל">תאורה וחשמל</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>ביטול</button>
                <button type="submit" className="btn btn-primary">שמור ספק</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
