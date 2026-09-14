import React, { useState } from 'react';
import {
  UserPlus,
  Building2,
  Search,
  Plus,
  Phone,
  MessageCircle,
  Mail,
  UserCheck,
  Calendar,
  ArrowRightLeft,
  CheckCircle2,
  FileText,
  DollarSign,
  ExternalLink,
  ChevronRight,
  Filter,
  Trash2,
  RotateCcw,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { db } from '../../services/db';
import { ConfirmModal } from '../Common/ConfirmModal';

export function CrmPage({
  contacts = [],
  tasks = [],
  users = [],
  onSelectContact,
  onNewContactClick,
  onContactUpdate,
  showToast
}) {
  const [activeTab, setActiveTab] = useState('leads'); // 'leads', 'customers', or 'recycleBin'
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Convert Lead to Customer modal state
  const [convertingLead, setConvertingLead] = useState(null);
  const [convertPackage, setConvertPackage] = useState('Pro');
  const [convertPrice, setConvertPrice] = useState(350);
  const [convertJoiningDate, setConvertJoiningDate] = useState(new Date().toISOString().split('T')[0]);

  // Soft Delete, Permanent Delete & Empty Trash Confirm State
  const [softDeletingContact, setSoftDeletingContact] = useState(null);
  const [permDeletingContact, setPermDeletingContact] = useState(null);

  const leads = contacts.filter(c => c.contactType === 'lead');
  const customers = contacts.filter(c => c.contactType === 'customer');
  const recycleBin = db.getRecycleBinContacts();

  const activeList = activeTab === 'leads'
    ? leads
    : activeTab === 'customers'
      ? customers
      : recycleBin;

  const filteredList = activeList.filter(c => {
    if (activeTab !== 'recycleBin' && statusFilter !== 'all') {
      const currentStatus = activeTab === 'leads' ? c.leadStatus : c.customerStatus;
      if (currentStatus !== statusFilter) return false;
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.businessName.toLowerCase().includes(q) ||
      c.contactPerson?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.nextAction?.toLowerCase().includes(q)
    );
  });

  const handleExecuteConvert = (e) => {
    e.preventDefault();
    if (!convertingLead) return;

    db.convertLeadToCustomer(convertingLead.id, {
      packageName: convertPackage,
      monthlyPrice: Number(convertPrice),
      joiningDate: convertJoiningDate
    });

    if (showToast) {
      showToast(`הליד ${convertingLead.businessName} הומר בהצלחה ללקוח מסוג ${convertPackage}! משימות קליטת לקוח נוצרו.`, 'success');
    }

    setConvertingLead(null);
    setActiveTab('customers');
  };

  const handleAssigneeChange = (contactId, newAssigneeId) => {
    if (onContactUpdate) {
      onContactUpdate(contactId, { assigneeId: newAssigneeId });
    } else {
      db.updateContact(contactId, { assigneeId: newAssigneeId });
    }

    const assignedUser = users.find(u => u.id === newAssigneeId);
    if (showToast) {
      showToast(assignedUser ? `אחראי טיפול עודכן: ${assignedUser.name}` : `הוסר אחראי טיפול`, 'success');
    }
  };

  const handleSoftDeleteContact = () => {
    if (!softDeletingContact) return;
    db.softDeleteContact(softDeletingContact.id);
    if (showToast) {
      showToast(`הרשומה "${softDeletingContact.businessName}" הועברה לסל המחזור ל-30 ימים`, 'info');
    }
    setSoftDeletingContact(null);
  };

  const handleRestoreContact = (contact) => {
    db.restoreContact(contact.id);
    if (showToast) {
      showToast(`הרשומה "${contact.businessName}" שוחזרה בהצלחה!`, 'success');
    }
  };

  const handlePermanentDeleteContact = () => {
    if (!permDeletingContact) return;
    db.permanentlyDeleteContact(permDeletingContact.id);
    if (showToast) {
      showToast(`הרשומה "${permDeletingContact.businessName}" נמחקה לצמיתות`, 'error');
    }
    setPermDeletingContact(null);
  };


  const getDaysRemaining = (deletedExpiresAt) => {
    if (!deletedExpiresAt) return 30;
    const diff = new Date(deletedExpiresAt).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 3600 * 24));
    return days > 0 ? days : 0;
  };

  const packageColors = {
    "בסיסית": "#64748B",
    "Pro": "#2563EB",
    "Premium": "#8B5CF6",
    "מותאמת אישית": "#F59E0B"
  };

  return (
    <div className="pawza-crm-page">
      {/* Top Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">ניהול לקוחות ולידים (PAWZA CRM)</h1>
          <p className="page-subtitle">מעקב פניות, לידים, תהליכי סגירה וניהול פנסיונים פעילים</p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>

          {activeTab !== 'recycleBin' && (
            <button
              className="btn btn-primary"
              onClick={() => onNewContactClick(activeTab === 'leads' ? 'lead' : 'customer')}
            >
              <Plus size={18} />
              <span>{activeTab === 'leads' ? 'ליד חדש' : 'לקוח חדש'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Tabs: Leads vs Customers vs Recycle Bin */}
      <div className="pawza-top-tabs">
        <button
          className={`tab-btn ${activeTab === 'leads' ? 'active' : ''}`}
          onClick={() => { setActiveTab('leads'); setStatusFilter('all'); }}
        >
          <UserPlus size={16} color="#10B981" />
          <span>לידים ({leads.length})</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'customers' ? 'active' : ''}`}
          onClick={() => { setActiveTab('customers'); setStatusFilter('all'); }}
        >
          <Building2 size={16} color="#2563EB" />
          <span>לקוחות פנסיונים ({customers.length})</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'recycleBin' ? 'active' : ''}`}
          style={{ marginRight: 'auto' }}
          onClick={() => { setActiveTab('recycleBin'); setStatusFilter('all'); }}
        >
          <Trash2 size={16} color="#EF4444" />
          <span>סל מחזור ({recycleBin.length})</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="filter-bar">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="form-input"
            placeholder={
              activeTab === 'leads'
                ? "חיפוש ליד לפי שם פנסיון, איש קשר, טלפון..."
                : activeTab === 'customers'
                  ? "חיפוש לקוח, חבילה, טלפון..."
                  : "חיפוש בסל המחזור..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {activeTab !== 'recycleBin' && (
          <div className="filter-group">
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">כל הסטטוסים</option>
              {activeTab === 'leads' ? (
                <>
                  <option value="ליד חדש">ליד חדש</option>
                  <option value="נוצר קשר">נוצר קשר</option>
                  <option value="נקבעה הדגמה">נקבעה הדגמה</option>
                  <option value="בוצעה הדגמה">בוצעה הדגמה</option>
                  <option value="נשלחה הצעה">נשלחה הצעה</option>
                  <option value="במעקב">במעקב</option>
                  <option value="לא רלוונטי">לא רלוונטי</option>
                </>
              ) : (
                <>
                  <option value="בתהליך הצטרפות">בתהליך הצטרפות</option>
                  <option value="בתקופת ניסיון">בתקופת ניסיון</option>
                  <option value="פעיל">פעיל</option>
                  <option value="ממתין לתשלום">ממתין לתשלום</option>
                  <option value="דורש טיפול">דורש טיפול</option>
                  <option value="לא פעיל">לא פעיל</option>
                </>
              )}
            </select>
          </div>
        )}
      </div>

      {/* Table Content */}
      <div className="table-responsive monday-table-wrapper">
        <table className="monday-table">
          <thead>
            {activeTab === 'leads' ? (
              <tr>
                <th style={{ minWidth: '220px' }}>שם העסק / פנסיון</th>
                <th style={{ width: '130px' }}>איש קשר</th>
                <th style={{ width: '130px' }}>טלפון & WhatsApp</th>
                <th style={{ width: '130px' }}>מקור הליד</th>
                <th style={{ width: '130px' }}>סטטוס</th>
                <th style={{ width: '120px' }}>תאריך מעקב</th>
                <th style={{ minWidth: '200px' }}>הפעולה הבאה *</th>
                <th style={{ width: '130px' }}>אחראי טיפול</th>
                <th style={{ width: '150px', textAlign: 'center' }}>פעולות</th>
              </tr>
            ) : activeTab === 'customers' ? (
              <tr>
                <th style={{ minWidth: '220px' }}>שם העסק / פנסיון</th>
                <th style={{ width: '130px' }}>איש קשר</th>
                <th style={{ width: '130px' }}>טלפון & WhatsApp</th>
                <th style={{ width: '120px' }}>חבילת PAWZA</th>
                <th style={{ width: '130px' }}>סטטוס לקוח</th>
                <th style={{ width: '100px' }}>מחיר חודשי</th>
                <th style={{ width: '120px' }}>תאריך הצטרפות</th>
                <th style={{ minWidth: '180px' }}>הפעולה הבאה</th>
                <th style={{ width: '130px' }}>אחראי טיפול</th>
                <th style={{ width: '120px', textAlign: 'center' }}>פעולות</th>
              </tr>
            ) : (
              /* Recycle Bin Headers */
              <tr>
                <th style={{ minWidth: '220px' }}>שם העסק / פנסיון</th>
                <th style={{ width: '130px' }}>איש קשר</th>
                <th style={{ width: '120px' }}>סוג מקורי</th>
                <th style={{ width: '130px' }}>תאריך מחיקה</th>
                <th style={{ width: '160px' }}>נותר למחיקה לצמיתות</th>
                <th style={{ width: '160px', textAlign: 'center' }}>פעולות שחזור / מחיקה</th>
              </tr>
            )}
          </thead>
          <tbody>
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '35px', color: 'var(--text-muted)' }}>
                  {activeTab === 'recycleBin'
                    ? 'סל המחזור ריק מכל רשומה'
                    : `אין כרגע ${activeTab === 'leads' ? 'לידים' : 'לקוחות'} במערכת. לחץ על "+ ${activeTab === 'leads' ? 'ליד חדש' : 'לקוח חדש'}" ליצירת רשומה.`}
                </td>
              </tr>
            ) : activeTab === 'leads' ? (
              /* Leads Table Rows */
              filteredList.map(lead => (
                <tr key={lead.id} className="monday-task-row">
                  <td className="task-title-cell clickable" onClick={() => onSelectContact(lead)}>
                    <strong style={{ color: 'var(--primary)' }}>{lead.businessName}</strong>
                    {lead.address && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{lead.address}</div>}
                  </td>
                  <td>{lead.contactPerson || '-'}</td>

                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{lead.phone}</span>
                      {lead.phone && (
                        <a
                          href={`https://wa.me/972${lead.phone.replace(/^0/, '').replace(/-/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="whatsapp-btn-sm"
                          title="פתח שיחת WhatsApp"
                        >
                          <MessageCircle size={14} />
                        </a>
                      )}
                    </div>
                  </td>

                  <td>
                    <span className="source-tag">{lead.leadSource || 'אתר'}</span>
                  </td>

                  <td>
                    <select
                      className="inline-select"
                      value={lead.leadStatus || 'ליד חדש'}
                      onChange={(e) => onContactUpdate && onContactUpdate(lead.id, { leadStatus: e.target.value })}
                    >
                      <option value="ליד חדש">ליד חדש</option>
                      <option value="נוצר קשר">נוצר קשר</option>
                      <option value="נקבעה הדגמה">נקבעה הדגמה</option>
                      <option value="בוצעה הדגמה">בוצעה הדגמה</option>
                      <option value="נשלחה הצעה">נשלחה הצעה</option>
                      <option value="במעקב">במעקב</option>
                      <option value="לא רלוונטי">לא רלוונטי</option>
                    </select>
                  </td>

                  <td>
                    <input
                      type="date"
                      className="inline-date-input"
                      value={lead.nextFollowUpDate || ''}
                      onChange={(e) => onContactUpdate && onContactUpdate(lead.id, { nextFollowUpDate: e.target.value })}
                    />
                  </td>

                  <td className="editable-text-cell">
                    <span className="editable-cell-text">{lead.nextAction || 'להתקשר לליד'}</span>
                  </td>

                  <td>
                    <select
                      className="inline-select"
                      value={lead.assigneeId || ''}
                      onChange={(e) => handleAssigneeChange(lead.id, e.target.value)}
                    >
                      <option value="">ללא אחראי</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </td>

                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ background: '#10B981', borderColor: 'transparent' }}
                        onClick={() => setConvertingLead(lead)}
                        title="המר ליד זה ללקוח פנסיון פעיל"
                      >
                        <ArrowRightLeft size={14} />
                        <span>המר ללקוח</span>
                      </button>

                      <button
                        className="icon-btn-sm text-danger"
                        onClick={() => setSoftDeletingContact(lead)}
                        title="העבר לסל המחזור"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : activeTab === 'customers' ? (
              /* Customers Table Rows */
              filteredList.map(cust => (
                <tr key={cust.id} className="monday-task-row">
                  <td className="task-title-cell clickable" onClick={() => onSelectContact(cust)}>
                    <strong style={{ color: 'var(--text-main)' }}>{cust.businessName}</strong>
                    {cust.address && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{cust.address}</div>}
                  </td>

                  <td>{cust.contactPerson}</td>

                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{cust.phone}</span>
                      {cust.phone && (
                        <a
                          href={`https://wa.me/972${cust.phone.replace(/^0/, '').replace(/-/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="whatsapp-btn-sm"
                        >
                          <MessageCircle size={14} />
                        </a>
                      )}
                    </div>
                  </td>

                  <td>
                    <span
                      className="package-tag"
                      style={{ backgroundColor: packageColors[cust.packageName] || '#2563EB', color: '#FFF' }}
                    >
                      {cust.packageName || 'Pro'}
                    </span>
                  </td>

                  <td>
                    <select
                      className="inline-select"
                      value={cust.customerStatus || 'פעיל'}
                      onChange={(e) => onContactUpdate && onContactUpdate(cust.id, { customerStatus: e.target.value })}
                    >
                      <option value="בתהליך הצטרפות">בתהליך הצטרפות</option>
                      <option value="בתקופת ניסיון">בתקופת ניסיון</option>
                      <option value="פעיל">פעיל</option>
                      <option value="ממתין לתשלום">ממתין לתשלום</option>
                      <option value="דורש טיפול">דורש טיפול</option>
                      <option value="לא פעיל">לא פעיל</option>
                    </select>
                  </td>

                  <td><strong>₪{cust.monthlyPrice || 350}</strong></td>
                  <td>{cust.joiningDate || '-'}</td>
                  <td>{cust.nextAction || '-'}</td>

                  <td>
                    <select
                      className="inline-select"
                      value={cust.assigneeId || ''}
                      onChange={(e) => handleAssigneeChange(cust.id, e.target.value)}
                    >
                      <option value="">ללא אחראי</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </td>

                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                      <button className="icon-btn-sm" onClick={() => onSelectContact(cust)} title="פתח כרטיס לקוח">
                        <ExternalLink size={15} />
                      </button>

                      <button
                        className="icon-btn-sm text-danger"
                        onClick={() => setSoftDeletingContact(cust)}
                        title="העבר לסל המחזור"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              /* Recycle Bin Rows */
              filteredList.map(item => {
                const daysRem = getDaysRemaining(item.deletedExpiresAt);
                return (
                  <tr key={item.id} className="monday-task-row">
                    <td className="task-title-cell">
                      <strong>{item.businessName}</strong>
                    </td>
                    <td>{item.contactPerson || '-'}</td>
                    <td>
                      <span className={`crm-type-badge ${item.contactType}`}>
                        {item.contactType === 'lead' ? 'ליד' : 'לקוח'}
                      </span>
                    </td>
                    <td>{item.deletedAt ? new Date(item.deletedAt).toLocaleDateString('he-IL') : '-'}</td>

                    <td>
                      <span className="badge-overdue" style={{ background: '#FEF3C7', color: '#D97706' }}>
                        נותרו {daysRem} ימים
                      </span>
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleRestoreContact(item)}
                          title="שחזר רשומה זו מתוך סל המחזור"
                        >
                          <RotateCcw size={14} color="#10B981" />
                          <span>שחזר</span>
                        </button>

                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => setPermDeletingContact(item)}
                          title="מחק לצמיתות מסל המחזור"
                        >
                          <Trash2 size={14} />
                          <span>מחק לצמיתות</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Convert Lead Modal */}
      {convertingLead && (
        <div className="modal-overlay" onClick={() => setConvertingLead(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <div style={{ fontWeight: 800, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ArrowRightLeft size={20} color="#10B981" />
                <span>המרת ליד ללקוח - {convertingLead.businessName}</span>
              </div>
            </div>

            <form onSubmit={handleExecuteConvert}>
              <div className="modal-body">
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  פעולה זו תהפוך את {convertingLead.businessName} ללקוח פעיל במערכת, ותייצר אוטומטית 3 משימות קליטת לקוח (פתיחת משתמש, קבלת לוגו, הדרכת Zoom).
                </p>

                <div className="form-group">
                  <label className="form-label">חבילת PAWZA נבחרת</label>
                  <select
                    className="form-select"
                    value={convertPackage}
                    onChange={(e) => {
                      setConvertPackage(e.target.value);
                      if (e.target.value === 'בסיסית') setConvertPrice(250);
                      if (e.target.value === 'Pro') setConvertPrice(350);
                      if (e.target.value === 'Premium') setConvertPrice(500);
                    }}
                  >
                    <option value="בסיסית">בסיסית (250 ₪/חודש)</option>
                    <option value="Pro">Pro (350 ₪/חודש)</option>
                    <option value="Premium">Premium (500 ₪/חודש)</option>
                    <option value="מותאמת אישית">מותאמת אישית</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">מחיר חודשי (₪)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={convertPrice}
                    onChange={(e) => setConvertPrice(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">תאריך הצטרפות</label>
                  <input
                    type="date"
                    className="form-input"
                    value={convertJoiningDate}
                    onChange={(e) => setConvertJoiningDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setConvertingLead(null)}>
                  ביטול
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: '#10B981' }}>
                  אשר המרה ללקוח
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HTML Confirm Soft Delete Modal */}
      <ConfirmModal
        isOpen={Boolean(softDeletingContact)}
        title={`העברת ${softDeletingContact?.contactType === 'lead' ? 'ליד' : 'לקוח'} לסל המחזור`}
        message={softDeletingContact ? `הרשומה "${softDeletingContact.businessName}" תועבר לסל המחזור ותישמר לשם בטיחות ל-30 ימים, עד למחיקתה לצמיתות.` : ''}
        confirmText="העבר לסל המחזור"
        cancelText="ביטול"
        onConfirm={handleSoftDeleteContact}
        onCancel={() => setSoftDeletingContact(null)}
      />

      {/* HTML Confirm Permanent Delete Modal */}
      <ConfirmModal
        isOpen={Boolean(permDeletingContact)}
        title="מחיקה לצמיתות מסל המחזור"
        message={permDeletingContact ? `אזהרה: פעולה זו תמחק לצמיתות את הרשומה "${permDeletingContact.businessName}" מסל המחזור. לא ניתן יהיה לשחזר אותה בעתיד.` : ''}
        confirmText="מחק לצמיתות"
        cancelText="ביטול"
        onConfirm={handlePermanentDeleteContact}
        onCancel={() => setPermDeletingContact(null)}
      />


    </div>
  );
}
