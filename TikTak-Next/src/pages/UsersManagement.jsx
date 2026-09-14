import React, { useState } from 'react';
import { Users, Plus, Shield, UserCheck, Mail, Phone } from 'lucide-react';
import { db } from '../services/db';

export function UsersManagement({ users, onRefresh }) {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('admin');

  const handleAddUser = (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    db.addUser({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      role
    });

    setShowModal(false);
    setName('');
    setEmail('');
    setPhone('');
    if (onRefresh) onRefresh();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={24} color="var(--primary)" />
            ניהול משתמשים והרשאות (RBAC)
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            ניהול משתמשי המערכת, מנהלי רשתות וספקים מורשים
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> הוסף משתמש חדש
        </button>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>שם מלא</th>
            <th>דואר אלקטרוני</th>
            <th>טלפון</th>
            <th>תפקיד / הרשאה</th>
            <th>סטטוס</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td style={{ fontWeight: 700 }}>{u.name}</td>
              <td>{u.email}</td>
              <td>{u.phone || '-'}</td>
              <td>
                <span className="badge" style={{
                  background: u.role === 'admin' ? 'rgba(79, 70, 229, 0.15)' : 'rgba(14, 165, 233, 0.15)',
                  color: u.role === 'admin' ? 'var(--primary)' : 'var(--secondary)'
                }}>
                  {u.role === 'admin' ? 'מנהל מערכת' : u.role === 'supplier' ? 'ספק מורשה' : 'משתמש חיצוני'}
                </span>
              </td>
              <td>
                <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}>
                  {u.status || 'פעיל'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 800 }}>הוספת משתמש חדש ל-TikTak Next</h3>
            </div>
            <form onSubmit={handleAddUser}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">שם מלא *</label>
                  <input type="text" className="form-input" required value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">דואר אלקטרוני *</label>
                  <input type="email" className="form-input" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">טלפון</label>
                  <input type="text" className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">תפקיד במערכת</label>
                  <select className="form-select" value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="admin">מנהל מערכת (Admin)</option>
                    <option value="supplier">ספק מורשה (Supplier)</option>
                    <option value="external">משתמש חיצוני (External Client)</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>ביטול</button>
                <button type="submit" className="btn btn-primary">צור משתמש</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
