import React from 'react';
import { Calendar as CalendarIcon, CheckSquare, PhoneCall, ChevronLeft, ChevronRight } from 'lucide-react';

export function PawzaCalendarPage({ tasks = [], contacts = [], onTaskClick, onContactClick }) {
  const events = [
    ...tasks.filter(t => t.dueDate).map(t => ({
      id: t.id,
      title: t.title,
      date: t.dueDate,
      type: 'task',
      domain: t.domain,
      item: t
    })),
    ...contacts.filter(c => c.nextFollowUpDate).map(c => ({
      id: c.id,
      title: `מעקב: ${c.businessName}`,
      date: c.nextFollowUpDate,
      type: 'followup',
      item: c
    }))
  ];

  return (
    <div className="pawza-calendar-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">לוח שנה ומעקבים</h1>
          <p className="page-subtitle">מציג תאריכי יעד של משימות פיתוח, עיצוב ומעקבי CRM מול לידים ולקוחות</p>
        </div>
      </div>

      <div className="dashboard-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '16px', fontWeight: 700 }}>
            <span style={{ color: '#2563EB', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckSquare size={16} /> משימות תאריך יעד
            </span>
            <span style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <PhoneCall size={16} /> מעקבי לידים/לקוחות
            </span>
          </div>

          <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>
            אוגוסט 2026
          </div>
        </div>

        <div className="dashboard-list">
          {events.length === 0 ? (
            <p className="text-muted">אין אירועים או מעקבים מתוזמנים</p>
          ) : (
            events.map(evt => (
              <div
                key={evt.id}
                className="dashboard-list-item clickable"
                onClick={() => evt.type === 'task' ? onTaskClick(evt.item) : onContactClick(evt.item)}
              >
                <span className={`badge ${evt.type === 'task' ? 'status-בטיפול' : 'status-הושלם'}`}>
                  {evt.type === 'task' ? 'משימה' : 'מעקב CRM'}
                </span>

                <div className="dashboard-item-info">
                  <div className="item-title">{evt.title}</div>
                  <div className="item-meta">תאריך: {evt.date}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
