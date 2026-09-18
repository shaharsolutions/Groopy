import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseDb';
import { exportPersonalBackupExcel, exportPersonalBackupJson } from '../utils/personalBackupHelper';
import PaymentModal from '../components/PaymentModal';
import ThankYouPage from './ThankYouPage';
import Footer from '../components/Footer';
import { getPaymentConfig, TRANZILA_DEFAULT_CONFIG } from '../utils/paymentConfig';

/**
 * OrganizationSuspendedView
 * 
 * Rendered when a user belongs to an organization that has been suspended (active === false).
 * Completely blocks access to boards, settings, and workspace features,
 * while allowing the user to export and download ONLY their personal content (Excel / JSON)
 * and safely log out.
 */
export default function OrganizationSuspendedView({ user, organization, onLogout, onReactivated }) {
  const [downloadingFormat, setDownloadingFormat] = useState(null); // 'excel' | 'json' | null
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: string, stats?: object }
  const [reopenPrice, setReopenPrice] = useState(TRANZILA_DEFAULT_CONFIG.defaultReopenPrice);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentSuccessNotice, setPaymentSuccessNotice] = useState(false);
  const [paymentCompletedData, setPaymentCompletedData] = useState(null);

  const organizationName = organization?.name || organization?.id || 'ארגון ללא שם';
  const userEmail = user?.email || user?.uid || '';

  const [resolvedContactMethod, setResolvedContactMethod] = useState(() => {
    if (organization?.suspendedContactMethod && organization.suspendedContactMethod !== 'default') {
      return organization.suspendedContactMethod;
    }
    return 'whatsapp';
  });

  useEffect(() => {
    let cancelled = false;
    const loadMethod = async () => {
      if (organization?.suspendedContactMethod && organization.suspendedContactMethod !== 'default') {
        setResolvedContactMethod(organization.suspendedContactMethod);
        return;
      }
      try {
        const { getSystemSuspendedContactMethod } = await import('../utils/storage');
        const systemMethod = await getSystemSuspendedContactMethod();
        if (!cancelled && systemMethod) {
          setResolvedContactMethod(systemMethod);
        }
      } catch (err) {
        console.warn('Could not load system suspended contact method:', err);
      }
    };
    loadMethod();
    return () => { cancelled = true; };
  }, [organization?.suspendedContactMethod]);

  useEffect(() => {
    let isCancelled = false;
    const loadPrice = async () => {
      try {
        const config = await getPaymentConfig();
        if (!isCancelled) {
          if (organization?.reopenPrice !== undefined && Number(organization.reopenPrice) > 0) {
            setReopenPrice(Number(organization.reopenPrice));
          } else if (config?.reopenPrice) {
            setReopenPrice(Number(config.reopenPrice));
          }
        }
      } catch (err) {
        console.warn('Failed to load reopen price in suspended view:', err);
      }
    };
    loadPrice();
    return () => { isCancelled = true; };
  }, [organization?.reopenPrice]);

  // Real-time listener: if the organization is reactivated while user is viewing suspended view
  useEffect(() => {
    const orgId = organization?.id;
    if (!orgId) return;
    const orgDocRef = doc(db, 'organizations', orgId);
    const unsubscribe = onSnapshot(orgDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        // If active in Firestore and user does NOT have PaymentModal open:
        // (e.g. another admin or user reactivated the org) -> unblock smoothly!
        if (data.active === true && !isPaymentModalOpen) {
          if (onReactivated) {
            onReactivated();
          }
        }
      }
    });
    return () => unsubscribe();
  }, [organization?.id, isPaymentModalOpen, onReactivated]);

  const whatsappMessage = encodeURIComponent(`שלום, אני פונה בנוגע להשבתת הארגון "${organizationName}" במערכת תיקתק.\nמשתמש: ${userEmail}`);
  const whatsappUrl = `https://wa.me/972528366744?text=${whatsappMessage}`;

  const emailSubject = encodeURIComponent(`פנייה בנוגע להשבתת ארגון: ${organizationName}`);
  const emailBody = encodeURIComponent(`שלום,\n\nאני פונה בנוגע להשבתת הארגון "${organizationName}" במערכת תיקתק.\nמשתמש: ${userEmail}\n\n`);
  const emailUrl = `mailto:shaharsolutions@gmail.com?subject=${emailSubject}&body=${emailBody}`;

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

  if (paymentCompletedData) {
    return (
      <ThankYouPage
        organizationName={paymentCompletedData.organizationName || organizationName}
        organizationId={paymentCompletedData.organizationId || organization?.id}
        amount={paymentCompletedData.amount || reopenPrice}
        confirmationCode={paymentCompletedData.confirmationCode || ''}
        transactionId={paymentCompletedData.transactionId || ''}
        userEmail={userEmail}
        onEnterSystem={() => {
          if (onReactivated) {
            onReactivated(paymentCompletedData);
          }
        }}
      />
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f1f5f9',
      display: 'flex',
      flexDirection: 'column',
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
            <span>{organization?.isTrialExpired ? '⏰' : '🔒'}</span>
            <span>{organization?.isTrialExpired ? 'הסתיימה תקופת הניסיון' : 'ארגון מושבת'}</span>
          </div>

          <h1 style={{
            fontSize: '1.6rem',
            fontWeight: '800',
            color: '#0f172a',
            margin: '0 0 8px 0',
            lineHeight: '1.3'
          }}>
            {organization?.isTrialExpired ? 'תקופת הניסיון החינמית הסתיימה' : 'הגישה למערכת חסומה'}
          </h1>

          <p style={{
            color: '#64748b',
            fontSize: '0.96rem',
            margin: 0,
            lineHeight: '1.5'
          }}>
            {organization?.isTrialExpired ? (
              <>הסתיימו 30 ימי הניסיון החינם עבור הארגון <strong style={{ color: '#1e293b' }}>{organizationName}</strong>. כדי להמשיך לעבוד במערכת ללא הפרעה, אנא הפעילו מנוי חודשי.</>
            ) : (
              <>הארגון <strong style={{ color: '#1e293b' }}>{organizationName}</strong> הושבת על ידי מנהל המערכת.</>
            )}
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
            <div>במצב זה לוחות העבודה, המשימות וההגדרות אינם נגישים. לבירור נוסף או להפעלה מחדש של הארגון, אנא פנו למנהל המערכת.</div>
            {resolvedContactMethod === 'whatsapp' && (
              <div style={{ marginTop: '10px' }}>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    backgroundColor: '#dcfce7',
                    color: '#15803d',
                    fontWeight: '700',
                    fontSize: '0.84rem',
                    textDecoration: 'none',
                    border: '1px solid #86efac',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span>💬</span>
                  <span>פנייה ישירה ב-WhatsApp (052-8366744)</span>
                </a>
              </div>
            )}
            {resolvedContactMethod === 'email' && (
              <div style={{ marginTop: '10px' }}>
                <a
                  href={emailUrl}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    backgroundColor: '#dbeafe',
                    color: '#1d4ed8',
                    fontWeight: '700',
                    fontSize: '0.84rem',
                    textDecoration: 'none',
                    border: '1px solid #93c5fd',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span>✉️</span>
                  <span>שליחת הודעה למייל (shaharsolutions@gmail.com)</span>
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Payment Section to Reactivate Organization */}
        <section style={{
          border: '1px solid #bfdbfe',
          background: 'linear-gradient(145deg, #f0fdf4 0%, #eff6ff 100%)',
          borderRadius: '14px',
          padding: '22px',
          marginBottom: '24px',
          boxShadow: '0 4px 15px -3px rgba(37, 99, 235, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.6rem' }}>💳</span>
              <div>
                <h2 style={{
                  fontSize: '1.15rem',
                  fontWeight: '800',
                  color: '#1e3a8a',
                  margin: 0
                }}>
                  הסדרת מנוי חודשי ופתיחה מיידית של המערכת
                </h2>
                <p style={{
                  margin: '4px 0 0 0',
                  fontSize: '0.85rem',
                  color: '#3b82f6',
                  lineHeight: '1.4'
                }}>
                  חידוש הגישה עבור כל משתמשי הארגון {organizationName} באמצעות מנוי חודשי
                </p>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '4px',
              backgroundColor: '#ffffff',
              padding: '6px 14px',
              borderRadius: '999px',
              border: '1px solid #bfdbfe',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <span style={{ fontSize: '0.82rem', color: '#64748b' }}>עלות:</span>
              <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1d4ed8' }}>₪{reopenPrice}</span>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>/ חודש</span>
            </div>
          </div>

          <p style={{
            color: '#334155',
            fontSize: '0.88rem',
            lineHeight: '1.5',
            margin: '0 0 16px 0'
          }}>
            לפתיחה מיידית של הגישה ללוחות המשימות, לפרטי הפרויקטים ולהגדרות העבודה, ניתן להסדיר מנוי חודשי (הוראת קבע) מאובטח באמצעות כרטיס אשראי. עם אישור התשלום, המערכת תשתחרר מיידית לכל חברי הארגון.
          </p>

          <button
            type="button"
            onClick={() => setIsPaymentModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              width: '100%',
              padding: '14px 20px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontWeight: '800',
              fontSize: '1rem',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.28)',
              fontFamily: 'inherit',
              transition: 'all 0.2s ease'
            }}
          >
            <span>💳</span>
            <span>לתשלום והפעלת מנוי חודשי (₪{reopenPrice}/חודש)</span>
          </button>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginTop: '12px',
            fontSize: '0.78rem',
            color: '#64748b',
            flexWrap: 'wrap'
          }}>
            <span>🔒 סליקה מאובטחת בתקן PCI-DSS Level 1 על ידי Tranzila</span>
            <span>·</span>
            <span>הוראת קבע חודשית ללא התחייבות</span>
            <span>·</span>
            <span>חשבונית מס קבלה תופק עם אישור התשלום</span>
          </div>
        </section>

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

      <Footer transparent style={{ marginTop: '24px' }} />

      {/* Floating Contact Button if configured */}
      <FloatingContactButton
        method={resolvedContactMethod}
        organizationName={organizationName}
        userEmail={userEmail}
      />

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        organization={organization}
        user={user}
        amount={reopenPrice}
        onPaymentSuccess={(paymentRecord) => {
          setIsPaymentModalOpen(false);
          if (onReactivated) {
            onReactivated(paymentRecord);
          }
        }}
      />
    </div>
  );
}

function FloatingContactButton({ method, organizationName, userEmail }) {
  const [isHovered, setIsHovered] = useState(false);

  if (!method || method === 'none') return null;

  const isWhatsApp = method === 'whatsapp';
  const whatsappMessage = encodeURIComponent(`שלום, אני פונה בנוגע לחסימת הגישה לארגון "${organizationName}" במערכת תיקתק.\nמשתמש: ${userEmail}`);
  const whatsappUrl = `https://wa.me/972528366744?text=${whatsappMessage}`;

  const emailSubject = encodeURIComponent(`פנייה בנוגע להשבתת ארגון: ${organizationName}`);
  const emailBody = encodeURIComponent(`שלום,\n\nאני פונה בנוגע להשבתת הארגון "${organizationName}" במערכת תיקתק.\nמשתמש: ${userEmail}\n\n`);
  const emailUrl = `mailto:shaharsolutions@gmail.com?subject=${emailSubject}&body=${emailBody}`;

  const targetUrl = isWhatsApp ? whatsappUrl : emailUrl;
  const bgColor = isWhatsApp ? '#25D366' : '#2563eb';
  const hoverBgColor = isWhatsApp ? '#20bd5a' : '#1d4ed8';
  const shadowColor = isWhatsApp ? 'rgba(37, 211, 102, 0.45)' : 'rgba(37, 99, 235, 0.45)';
  const tooltipText = isWhatsApp
    ? 'פנייה ב-WhatsApp (052-8366744)'
    : 'שליחת מייל (shaharsolutions@gmail.com)';

  return (
    <aside
      aria-label="ערוץ פנייה למנהל המערכת"
      style={{
        position: 'fixed',
        bottom: '28px',
        left: '28px',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        direction: 'rtl'
      }}
    >
      <a
        href={targetUrl}
        target={isWhatsApp ? '_blank' : undefined}
        rel={isWhatsApp ? 'noopener noreferrer' : undefined}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title={tooltipText}
        aria-label={tooltipText}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: isHovered ? '12px 20px' : '15px',
          borderRadius: '999px',
          backgroundColor: isHovered ? hoverBgColor : bgColor,
          color: '#ffffff',
          textDecoration: 'none',
          boxShadow: `0 8px 24px ${shadowColor}, 0 2px 8px rgba(0,0,0,0.15)`,
          transform: isHovered ? 'translateY(-3px) scale(1.04)' : 'translateY(0) scale(1)',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          cursor: 'pointer'
        }}
      >
        {isWhatsApp ? (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.48 2 2 6.48 2 12C2 13.85 2.5 15.58 3.38 17.07L2 22L7.07 20.66C8.52 21.52 10.21 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" fill="white" />
            <path d="M17.47 14.81C17.24 14.69 16.08 14.12 15.87 14.04C15.65 13.96 15.5 13.92 15.34 14.15C15.19 14.38 14.76 14.88 14.63 15.03C14.5 15.19 14.37 15.21 14.14 15.09C13.91 14.98 12.93 14.66 11.78 13.63C10.88 12.83 10.27 11.84 10.04 11.45C9.81 11.07 10.02 10.86 10.13 10.74C10.24 10.63 10.37 10.45 10.49 10.32C10.61 10.19 10.65 10.09 10.73 9.94C10.81 9.78 10.77 9.65 10.71 9.53C10.65 9.42 10.19 8.28 10 7.82C9.81 7.37 9.62 7.43 9.47 7.42C9.33 7.41 9.18 7.41 9.02 7.41C8.87 7.41 8.62 7.47 8.41 7.7C8.2 7.93 7.6 8.49 7.6 9.64C7.6 10.79 8.43 11.89 8.55 12.05C8.67 12.21 10.19 14.55 12.52 15.55C13.07 15.79 13.5 15.93 13.84 16.04C14.39 16.21 14.89 16.19 15.28 16.13C15.72 16.06 16.63 15.57 16.82 15.04C17.01 14.51 17.01 14.05 16.95 13.96C16.89 13.86 16.74 13.8 16.51 13.69" fill={isHovered ? hoverBgColor : bgColor} />
          </svg>
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="20" height="16" x="2" y="4" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
        )}

        <span style={{
          fontSize: '0.88rem',
          fontWeight: '700',
          whiteSpace: 'nowrap',
          display: isHovered ? 'inline' : 'none',
          color: '#ffffff'
        }}>
          {tooltipText}
        </span>
      </a>
    </aside>
  );
}
