import React from 'react';
import { History, Clock, User, ShieldAlert } from 'lucide-react';
import { formatDateTime } from '../utils/helpers';

export function ActivityLogPage({ auditLogs }) {
  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <History size={24} color="var(--primary)" />
          לוג דיווחים ופעילות ב-TikTak Next
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          תיעוד אוטומטי של כל הפעולות, שינויי הסטטוס והעדכונים שבוצעו במערכת
        </p>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>זמן פעולה</th>
            <th>משתמש מבצע</th>
            <th>סוג פעולה</th>
            <th>תיאור מפורט</th>
          </tr>
        </thead>
        <tbody>
          {auditLogs.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                טרם נרשמו פעילויות
              </td>
            </tr>
          ) : (
            auditLogs.map((log) => (
              <tr key={log.id}>
                <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  <Clock size={13} style={{ display: 'inline', marginLeft: 4 }} />
                  {formatDateTime(log.timestamp)}
                </td>
                <td style={{ fontWeight: 700 }}>
                  <User size={14} style={{ display: 'inline', marginLeft: 4, color: 'var(--primary)' }} />
                  {log.userName}
                </td>
                <td>
                  <span className="badge" style={{ background: '#F1F5F9', color: 'var(--text-main)' }}>
                    {log.action}
                  </span>
                </td>
                <td>{log.details}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
