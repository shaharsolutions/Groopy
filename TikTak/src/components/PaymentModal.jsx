import { useState, useEffect, useMemo } from 'react';
import { buildTranzilaPaymentUrl, recordPaymentAndReactivateOrg, TRANZILA_DEFAULT_CONFIG } from '../utils/paymentConfig';

export default function PaymentModal({
  isOpen,
  onClose,
  organization,
  user,
  amount = TRANZILA_DEFAULT_CONFIG.defaultReopenPrice,
  onPaymentSuccess
}) {
  const [iframeLoading, setIframeLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [customTxId, setCustomTxId] = useState('');

  const orgId = organization?.id || '';
  const orgName = organization?.name || organization?.id || 'ארגון';
  const userEmail = user?.email || user?.uid || '';
  const contactName = user?.displayName || userEmail;
  const paymentAmount = Number(amount) || TRANZILA_DEFAULT_CONFIG.defaultReopenPrice;

  // Build the payment URL
  const paymentUrl = useMemo(() => {
    if (!isOpen) return '';
    const successReturnUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/?payment_status=success&orgId=${encodeURIComponent(orgId)}`
      : '';
    const failReturnUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/?payment_status=fail&orgId=${encodeURIComponent(orgId)}`
      : '';

    return buildTranzilaPaymentUrl({
      sum: paymentAmount,
      orgId,
      orgName,
      userEmail,
      contactName,
      successUrl: successReturnUrl,
      failUrl: failReturnUrl
    });
  }, [isOpen, paymentAmount, orgId, orgName, userEmail, contactName]);

  // Reset state when opening modal
  useEffect(() => {
    if (isOpen) {
      setIframeLoading(true);
      setIsProcessing(false);
      setIsSuccess(false);
      setErrorMessage('');
      setCustomTxId('');
    }
  }, [isOpen]);

  // Listen for message events or URL callbacks
  useEffect(() => {
    if (!isOpen) return;

    const handleMessage = async (event) => {
      // Check if Tranzila or child window notified us of success
      if (
        event?.data?.type === 'TRANZILA_SUCCESS' ||
        (typeof event?.data === 'string' && event.data.includes('Response=000')) ||
        event?.data?.Response === '000'
      ) {
        handleCompleteReactivation(event?.data?.ConfirmationCode || event?.data?.transactionId || '');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isOpen, orgId, orgName, userEmail, paymentAmount]);

  const handleCompleteReactivation = async (confirmationCode = '') => {
    if (isProcessing) return;
    setIsProcessing(true);
    setErrorMessage('');

    try {
      const res = await recordPaymentAndReactivateOrg({
        organizationId: orgId,
        organizationName: orgName,
        userId: user?.uid || '',
        userEmail,
        amount: paymentAmount,
        confirmationCode: confirmationCode || customTxId || '',
        transactionId: confirmationCode ? `TRZ-${confirmationCode}` : undefined,
        method: 'tranzila'
      });

      if (res.success) {
        setIsSuccess(true);
        if (onPaymentSuccess) {
          onPaymentSuccess(res.paymentRecord);
        }
        setTimeout(() => {
          onClose();
        }, 2200);
      }
    } catch (err) {
      console.error('Reactivation after payment failed:', err);
      setErrorMessage(err.message || 'אירעה שגיאה בשחרור הארגון. אנא נסו שנית או פנו לתמיכה.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        backgroundColor: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        direction: 'rtl',
        fontFamily: 'Rubik, sans-serif'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          maxWidth: '560px',
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
          animation: 'fadeIn 0.2s ease-out'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f8fafc'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                backgroundColor: '#dbeafe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.3rem'
              }}
            >
              💳
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', fontWeight: '800' }}>
                תשלום לפתיחת גישה למערכת
              </h2>
              <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                עבור ארגון: <strong style={{ color: '#1e293b' }}>{orgName}</strong>
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                padding: '6px 14px',
                borderRadius: '999px',
                backgroundColor: '#dcfce7',
                color: '#15803d',
                fontWeight: '800',
                fontSize: '0.92rem',
                border: '1px solid #86efac'
              }}
            >
              ₪{paymentAmount}
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                fontSize: '1.2rem',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                lineHeight: 1
              }}
              title="סגירה"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
          {isSuccess ? (
            <div
              style={{
                textAlign: 'center',
                padding: '36px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <div
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  backgroundColor: '#dcfce7',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2.4rem',
                  marginBottom: '8px'
                }}
              >
                ✓
              </div>
              <h3 style={{ margin: 0, fontSize: '1.35rem', color: '#14532d', fontWeight: '800' }}>
                התשלום בוצע בהצלחה!
              </h3>
              <p style={{ margin: 0, color: '#15803d', fontSize: '0.96rem', lineHeight: '1.5' }}>
                הארגון <strong>{orgName}</strong> הופעל מחדש. הגישה לכלל המשתמשים נפתחה כעת.
              </p>
              <div style={{ marginTop: '16px', fontSize: '0.85rem', color: '#64748b' }}>
                מעביר אותך למערכת...
              </div>
            </div>
          ) : (
            <>
              {/* Security Banner */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  marginBottom: '12px',
                  fontSize: '0.78rem',
                  color: '#475569'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🔒</span>
                  <span>סליקה מאובטחת בתקן <strong>PCI-DSS Level 1</strong> באמצעות Tranzila</span>
                </div>
                <a
                  href={paymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: '#2563eb',
                    textDecoration: 'none',
                    fontWeight: '600',
                    fontSize: '0.76rem'
                  }}
                  title="פתיחה בלשונית נפרדת"
                >
                  <span>חלון מלא</span>
                  <span>↗</span>
                </a>
              </div>

              {errorMessage && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: '#fee2e2',
                    color: '#b91c1c',
                    border: '1px solid #fecaca',
                    fontSize: '0.86rem',
                    marginBottom: '12px',
                    fontWeight: '600'
                  }}
                >
                  ⚠️ {errorMessage}
                </div>
              )}

              {/* Tranzila Iframe Container */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '460px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  overflow: 'hidden',
                  backgroundColor: '#ffffff'
                }}
              >
                {iframeLoading && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#ffffff',
                      zIndex: 2,
                      gap: '12px',
                      color: '#64748b',
                      fontSize: '0.9rem'
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        border: '3px solid #e2e8f0',
                        borderTopColor: '#2563eb',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite'
                      }}
                    />
                    <span>טוען מסוף תשלום מאובטח...</span>
                  </div>
                )}

                <iframe
                  src={paymentUrl}
                  title="Tranzila Payment"
                  allow="payment"
                  onLoad={() => setIframeLoading(false)}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    display: 'block'
                  }}
                />
              </div>

              {/* Action helper footer */}
              <div
                style={{
                  marginTop: '14px',
                  paddingTop: '12px',
                  borderTop: '1px solid #f1f5f9',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    ביצעת את התשלום בחלון נפרד או שהסתיים בהצלחה?
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCompleteReactivation()}
                    disabled={isProcessing}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: '700',
                      fontSize: '0.86rem',
                      cursor: isProcessing ? 'not-allowed' : 'pointer',
                      opacity: isProcessing ? 0.7 : 1,
                      fontFamily: 'inherit',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}
                  >
                    <span>{isProcessing ? '⏳' : '✓'}</span>
                    <span>{isProcessing ? 'מאמת ומפעיל את הארגון...' : 'סיימתי תשלום - שחרר חסימה'}</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
