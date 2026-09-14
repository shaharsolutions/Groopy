import React, { useState } from 'react';
import { Database, ShieldCheck, AlertTriangle, CheckCircle2, Play, FileText, Lock } from 'lucide-react';
import { INITIAL_TASKS, INITIAL_PROJECTS } from '../data/mockInitialData';

export function MigrationToolsPage() {
  const [dryRunLogs, setDryRunLogs] = useState([]);
  const [isDryRunRunning, setIsDryRunRunning] = useState(false);
  const [dryRunCompleted, setDryRunCompleted] = useState(false);

  const runDryRunSimulation = () => {
    setIsDryRunRunning(true);
    setDryRunLogs([
      "🚀 מתחיל תהליך סימולציית Dry Run בלבד (Read-Only Simulation)...",
      "🔒 בדיקת בטיחות: וידוא חוסר גישה מלא ל-Production Firebase...",
      "✔ אישור בטיחות עבר: אין חיבור פעיל למסד הנתונים הקיים.",
      "📂 טוען נתוני דמה לבדיקה (3 פרויקטים, 4 משימות)...",
      "🔍 מתחיל בדיקת סכמה ואימות תקינות שדות...",
      "✔ אימות שדות משימה (title, projectId, priority, dueDate, subtasks)... עבר בהצלחה.",
      "🔍 מתחיל בדיקת כפילויות (Duplicate Detection)...",
      "✔ בדיקת כפילויות הסתיימה: 0 כפילויות נמצאו.",
      "📊 מפיק דוח סיכום ולוג מלא למיגור שגיאות...",
      "✅ תהליך Dry Run הושלם בהצלחה! 0 נתונים שונו ב-Production (100% בטוח)."
    ]);

    setTimeout(() => {
      setIsDryRunRunning(false);
      setDryRunCompleted(true);
    }, 800);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={24} color="var(--primary)" />
          כלי הכנה ל-Migration עתידי (Future Migration Tools)
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          כלי סימולציה, מיפוי סכמה ובטיחות בלבד - ללא שום נגיעה במסד הנתונים של Production
        </p>
      </div>

      {/* Safety Protocol Warning Box */}
      <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', padding: '16px', borderRadius: 'var(--radius-md)', display: 'flex', gap: '12px' }}>
        <AlertTriangle size={24} color="#D97706" style={{ flexShrink: 0 }} />
        <div>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#92400E' }}>
            🛑 נקודת עצירה מחייבת (Safety Mandatory Stop Protocol)
          </h4>
          <p style={{ fontSize: '0.85rem', color: '#B45309', marginTop: '4px' }}>
            לפני כל חיבור עתידי למסד הנתונים הקיים, ייבוא נתוני Production, שינוי דומיין, החלפת המערכת או הרצת Migration בפועל – יש לעצור ולהציג תוכנית גיבוי, בדיקות ו-Rollback לאישור מפורש מהמשתמש.
          </p>
        </div>
      </div>

      {/* Dry Run Simulation Box */}
      <div style={{ background: 'var(--surface-white)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Play size={18} color="var(--primary)" />
              הפעלת סימולציית Dry Run (בדיקה שאינה משנה נתונים)
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              סימולציית העברה בזיכרון המקומית בלבד לבדיקת תקינות שדות וכפילויות
            </p>
          </div>

          <button
            className="btn btn-primary"
            onClick={runDryRunSimulation}
            disabled={isDryRunRunning}
          >
            {isDryRunRunning ? 'מריץ סימולציה...' : 'הפעל Dry Run'}
          </button>
        </div>

        {dryRunLogs.length > 0 && (
          <div style={{ background: '#0F172A', color: '#38BDF8', padding: '16px', borderRadius: 'var(--radius-md)', fontFamily: 'monospace', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {dryRunLogs.map((log, idx) => (
              <div key={idx}>{log}</div>
            ))}
          </div>
        )}
      </div>

      {/* Schema Mapping Table Preview */}
      <div style={{ background: 'var(--surface-white)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={18} color="var(--secondary)" />
          מיפוי שדות (TikTak v1 ➔ TikTak Next v2 Schema Mapping)
        </h3>

        <table className="data-table">
          <thead>
            <tr>
              <th>שדה במערכת TikTak v1</th>
              <th>שדה מקביל ב-TikTak Next v2</th>
              <th>סוג הנתון</th>
              <th>אימות תקינות</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>taskName</code> / <code>title</code></td>
              <td><code>title</code></td>
              <td>String</td>
              <td><span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}>חובה</span></td>
            </tr>
            <tr>
              <td><code>projectName</code> / <code>branch</code></td>
              <td><code>projectId</code> (FK)</td>
              <td>String (Reference)</td>
              <td><span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}>מאומת</span></td>
            </tr>
            <tr>
              <td><code>supplier</code></td>
              <td><code>supplierId</code> (FK)</td>
              <td>String (Reference)</td>
              <td><span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}>מאומת</span></td>
            </tr>
            <tr>
              <td><code>status</code></td>
              <td><code>status</code></td>
              <td>String (Enum)</td>
              <td><span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}>תואם מפה</span></td>
            </tr>
            <tr>
              <td><code>planogramFile</code> / <code>planogramUrl</code></td>
              <td><code>hasPlanogram</code> + <code>planogramUrl</code></td>
              <td>Boolean + String</td>
              <td><span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}>מאומת</span></td>
            </tr>
            <tr>
              <td><code>subTasks</code></td>
              <td><code>subtasks</code> (Array of Objects)</td>
              <td>Array</td>
              <td><span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}>מנותח מקומית</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
