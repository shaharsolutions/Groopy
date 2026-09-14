import { useState } from 'react';
import { exportPersonalBackupExcel, exportPersonalBackupJson } from '../utils/personalBackupHelper';

/**
 * OrganizationSuspendedView
 * 
 * Rendered when a user belongs to an organization that has been suspended (active === false).
 * Completely blocks access to boards, settings, and workspace features,
 * while allowing the user to export and download ONLY their personal content (Excel / JSON)
 * and safely log out.
 */
export default function OrganizationSuspendedView({ user, organization, onLogout }) {
  const [downloadingFormat, setDownloadingFormat] = useState(null); // 'excel' | 'json' | null
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: string, stats?: object }

  const organizationName = organization?.name || organization?.id || 'ארגון ללא שם';
  const userEmail = user?.email || user?.uid || '';

  const handleDownloadExcel = async () => {
    if (downloadingFormat) return;
    setDownloadingFormat('excel');
    setFeedback(null);
    try {
      const stats = await exportPersonalBackupExcel({ user, organizationName });
      setFeedback({
        type: 'success',
        message: `קובץ האקסל "${stats.filename}" הורד בהצלחה למכשירך!`,
        stats
      });
    } catch (err) {
      console.error('Failed to export Excel personal backup', err);
      setFeedback({
        type: 'error',
        message: `שגיאה בעת הפקת קובץ האקסל: ${err.message || 'אנא נסו שנית'}`
      });
    } finally {
      setDownloadingFormat(null);
    }
  };

  const handleDownloadJson = async () => {
    if (downloadingFormat) return;
    setDownloadingFormat('json');
    setFeedback(null);
    try {
      const stats = await exportPersonalBackupJson({ user, organizationName });
      setFeedback({
        type: 'success',
        message: `קובץ הגיבוי "${stats.filename}" (JSON) הורד בהצלחה למכשירך!`,
        stats
      });
    } catch (err) {
      console.error('Failed to export JSON personal backup', err);
      setFeedback({
        type: 'error',
        message: `שגיאה בעת הפקת קובץ ה-JSON: ${err.message || 'אנא נסו שנית'}`
      });
    } finally {
      setDownloadingFormat(null);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f1f5f9',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: 'Rubik, sans-serif',
      direction: 'rtl'
    }}>
      <main style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
        border: '1px solid #e2e8f0',
        maxWidth: '620px',
        width: '100%',
        padding: '36px 28px',
        boxSizing: 'border-box'
      }}>
        {/* Top Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <img
            src="/logo.png"
            alt="לוגו תיקתק"
            style={{
              width: '64px',
              height: '64px',
              objectFit: 'cover',
              borderRadius: '12px',
              marginBottom: '16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}
          />

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#fee2e2',
            color: '#b91c1c',
            border: '1px solid #fecaca',
            padding: '4px 14px',
            borderRadius: '999px',
            fontSize: '0.85rem',
            fontWeight: '700',
            marginBottom: '12px'
          }}>
            <span>🔒</span>
            <span>ארגון מושבת</span>
          </div>

          <h1 style={{
            fontSize: '1.6rem',
            fontWeight: '800',
            color: '#0f172a',
            margin: '0 0 8px 0',
            lineHeight: '1.3'
          }}>
            הגישה למערכת חסומה
          </h1>

          <p style={{
            color: '#64748b',
            fontSize: '0.96rem',
            margin: 0,
            lineHeight: '1.5'
          }}>
            הארגון <strong style={{ color: '#1e293b' }}>{organizationName}</strong> הושבת על ידי מנהל המערכת.
          </p>
        </div>

        {/* User details card */}
        <div style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '14px 18px',
          marginBottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          fontSize: '0.88rem',
          color: '#475569'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <span>משתמש מחובר:</span>
            <strong style={{ color: '#0f172a', direction: 'ltr' }}>{userEmail}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <span>שם הארגון:</span>
            <strong style={{ color: '#0f172a' }}>{organizationName}</strong>
          </div>
          <div style={{
            marginTop: '6px',
            paddingTop: '8px',
            borderTop: '1px dashed #cbd5e1',
            color: '#64748b',
            fontSize: '0.82rem',
            lineHeight: '1.4'
          }}>
            במצב זה לוחות העבודה, המשימות וההגדרות אינם נגישים. לבירור נוסף או להפעלה מחדש של הארגון, אנא פנו למנהל המערכת.
          </div>
        </div>

        {/* Personal Backup Section */}
        <section style={{
          border: '1px solid #bbf7d0',
          backgroundColor: '#f0fdf4',
          borderRadius: '14px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>📥</span>
            <div>
              <h2 style={{
                fontSize: '1.05rem',
                fontWeight: '700',
                color: '#166534',
                margin: 0
              }}>
                הורדת גיבוי של התוכן שלך
              </h2>
              <p style={{
                margin: '3px 0 0 0',
                fontSize: '0.84rem',
                color: '#15803d',
                lineHeight: '1.4'
              }}>
                קובץ הגיבוי יכלול אך ורק את הרשומות שנוצרו על ידך במערכת:
              </p>
            </div>
          </div>

          {/* Included Items Checklist */}
          <ul style={{
            margin: '12px 0 16px 0',
            padding: '0 20px',
            color: '#14532d',
            fontSize: '0.84rem',
            lineHeight: '1.8'
          }}>
            <li>כל הפרויקטים והמשימות האישיים שלך (כולל משימות בסל המחזור)</li>
            <li>כל התגובות, ההתכתבויות וההערות הפרטיות שלך</li>
            <li>תתי-משימות ומעקב ביצוע של המשימות שלך</li>
            <li>ספר אנשי הקשר והספקים שהזנת</li>
          </ul>

          {/* Feedback alerts */}
          {feedback && (
            <div style={{
              padding: '12px 14px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '0.88rem',
              fontWeight: '600',
              backgroundColor: feedback.type === 'success' ? '#dcfce7' : '#fee2e2',
              color: feedback.type === 'success' ? '#166534' : '#991b1b',
              border: `1px solid ${feedback.type === 'success' ? '#86efac' : '#fca5a5'}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{feedback.type === 'success' ? '✅' : '⚠️'}</span>
                <span>{feedback.message}</span>
              </div>
              {feedback.stats && (
                <div style={{
                  fontSize: '0.8rem',
                  fontWeight: '400',
                  marginTop: '6px',
                  paddingTop: '6px',
                  borderTop: '1px dashed #86efac',
                  color: '#14532d'
                }}>
                  נכללו: {feedback.stats.totalProjects} פרויקטים · {feedback.stats.totalComments} תגובות · {feedback.stats.totalSuppliers} ספקים · {feedback.stats.totalContacts} אנשי קשר
                </div>
              )}
            </div>
          )}

          {/* Export action buttons */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <button
              type="button"
              onClick={handleDownloadExcel}
              disabled={Boolean(downloadingFormat)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                padding: '12px 16px',
                backgroundColor: '#16a34a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '0.94rem',
                cursor: downloadingFormat ? 'not-allowed' : 'pointer',
                opacity: downloadingFormat ? 0.7 : 1,
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                fontFamily: 'inherit',
                transition: 'background-color 0.2s ease'
              }}
            >
              <span>📊</span>
              <span>
                {downloadingFormat === 'excel'
                  ? 'מכין קובץ אקסל ומוריד...'
                  : 'הורדת גיבוי מלא לאקסל (Excel .xlsx)'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleDownloadJson}
              disabled={Boolean(downloadingFormat)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                padding: '10px 16px',
                backgroundColor: '#ffffff',
                color: '#166534',
                border: '1px solid #86efac',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '0.88rem',
                cursor: downloadingFormat ? 'not-allowed' : 'pointer',
                opacity: downloadingFormat ? 0.7 : 1,
                fontFamily: 'inherit',
                transition: 'background-color 0.2s ease'
              }}
            >
              <span>💾</span>
              <span>
                {downloadingFormat === 'json'
                  ? 'מכין קובץ JSON ומוריד...'
                  : 'הורדת גיבוי מובנה כקובץ נתונים (JSON)'}
              </span>
            </button>
          </div>
        </section>

        {/* Footer Logout Button */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          paddingTop: '16px',
          borderTop: '1px solid #e2e8f0'
        }}>
          <button
            type="button"
            onClick={onLogout}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 20px',
              backgroundColor: '#f8fafc',
              color: '#475569',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '0.9rem',
              cursor: 'pointer',
              fontFamily: 'inherit'
            }}
          >
            <span>🚪</span>
            <span>התנתקות מהמערכת</span>
          </button>

          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            ניתן להתנתק ולהתחבר מחדש עם משתמש אחר
          </span>
        </div>
      </main>
    </div>
  );
}
