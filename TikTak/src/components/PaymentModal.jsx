import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseDb';
import {
  buildTranzilaPaymentFields,
  buildTranzilaPaymentUrl,
  fetchTranzilaHandshakeToken,
  recordPaymentAndReactivateOrg,
  TRANZILA_DEFAULT_CONFIG
} from '../utils/paymentConfig';

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
  const [handshakeToken, setHandshakeToken] = useState('');
  const [isHandshakeLoading, setIsHandshakeLoading] = useState(true);

  const [successPaymentData, setSuccessPaymentData] = useState(null);
  const [enterButtonHovered, setEnterButtonHovered] = useState(false);

  const formRef = useRef(null);
  const iframeRef = useRef(null);

  const orgId = organization?.id || '';
  const orgName = organization?.name || 'הארגון שלך';
  const userEmail = user?.email || '';
  const contactName = user?.displayName || userEmail;
  const paymentAmount = Number(amount) || TRANZILA_DEFAULT_CONFIG.defaultReopenPrice;

  const refreshHandshakeToken = useCallback(async () => {
    setIsHandshakeLoading(true);
    setIframeLoading(true);
    setErrorMessage('');
    try {
      const token = await fetchTranzilaHandshakeToken({
        sum: paymentAmount,
        supplier: TRANZILA_DEFAULT_CONFIG.mainTerminal,
        orgId
      });
      if (token) {
        setHandshakeToken(token);
      } else {
        setErrorMessage('לא ניתן להשיג מפתח הצפנה מאובטח מחברת הסליקה (Handshake failed). אנא נסו לרענן או פנו לתמיכה.');
      }
    } catch (err) {
      console.warn('Could not fetch Handshake token:', err);
      setErrorMessage('שגיאה בחיבור למערכת הסליקה. אנא נסו שוב.');
    } finally {
      setIsHandshakeLoading(false);
    }
  }, [paymentAmount, orgId]);

  // Fetch Handshake token on open
  useEffect(() => {
    if (isOpen) {
      setIframeLoading(true);
      setIsProcessing(false);
      setIsSuccess(false);
      setSuccessPaymentData(null);
      setErrorMessage('');
      setCustomTxId('');
      refreshHandshakeToken();
    } else {
      setHandshakeToken('');
      setSuccessPaymentData(null);
      setIsHandshakeLoading(true);
    }
  }, [isOpen, refreshHandshakeToken]);

  // Build the payment fields for secure HTTP POST submission
  const paymentData = useMemo(() => {
    if (!isOpen || !handshakeToken) return null;
    return buildTranzilaPaymentFields({
      sum: paymentAmount,
      orgId,
      orgName,
      userEmail,
      contactName,
      thtk: handshakeToken
    });
  }, [isOpen, handshakeToken, paymentAmount, orgId, orgName, userEmail, contactName]);

  // Automatically submit the form to the iframe once paymentData is prepared
  useEffect(() => {
    if (isOpen && paymentData && formRef.current) {
      setIframeLoading(true);
      const timer = setTimeout(() => {
        if (formRef.current) {
          formRef.current.submit();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, paymentData]);

  // Real-time Firestore listener: when the organization is reactivated upon verified payment
  useEffect(() => {
    if (!isOpen || !orgId) return;
    const orgDocRef = doc(db, 'organizations', orgId);
    const unsubscribe = onSnapshot(orgDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.active === true && !isSuccess) {
          const paymentInfo = data.lastPayment || {
            organizationName: orgName,
            organizationId: orgId,
            amount: paymentAmount,
            confirmationCode: data.lastConfirmationCode || ''
          };
          setSuccessPaymentData(paymentInfo);
          setIsSuccess(true);
          setIsProcessing(false);
        }
      }
    });
    return () => unsubscribe();
  }, [isOpen, orgId, isSuccess, orgName, paymentAmount]);

  // Listen for message events from Tranzila iframe redirect
  useEffect(() => {
    if (!isOpen) return;

    const handleMessage = async (event) => {
      const data = event?.data;
      if (data?.source === 'pawza-tranzila' || data?.source === 'tiktak-tranzila') {
        if (data.status === 'processing' || data.status === 'success') {
          setIsProcessing(true);
        } else if (data.status === 'failed') {
          setIsProcessing(false);
          setErrorMessage('התשלום לא הושלם. אנא ודאו את פרטי הכרטיס או נסו שוב.');
        }
        return;
      }
      if (data?.type === 'TRANZILA_RETRY') {
        refreshHandshakeToken();
        return;
      }
      if (data?.type === 'TRANZILA_FAIL') {
        setIsProcessing(false);
        setErrorMessage(data.message || 'התשלום לא הושלם. אנא ודאו את פרטי הכרטיס או נסו שוב.');
        return;
      }
      // Strictly require TRANZILA_SUCCESS with Response === '000' and a non-empty ConfirmationCode
      if (
        data &&
        (data.type === 'TRANZILA_SUCCESS' || data.Response === '000') &&
        data.ConfirmationCode &&
        String(data.ConfirmationCode).trim()
      ) {
        handleCompleteReactivation(String(data.ConfirmationCode).trim());
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isOpen, refreshHandshakeToken, orgId, orgName, userEmail, paymentAmount]);

  const handleCompleteReactivation = async (confirmationCode = '') => {
    if (isProcessing) return;
    const cleanCode = (confirmationCode || '').trim();
    if (!cleanCode) {
      console.warn('Blocked reactivation attempt: missing confirmation code');
      setErrorMessage('לא התקבל אישור על ביצוע התשלום. אנא ודאו את פרטי הכרטיס או נסו שוב.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      const res = await recordPaymentAndReactivateOrg({
        organizationId: orgId,
        organizationName: orgName,
        userId: user?.uid || '',
        userEmail,
        amount: paymentAmount,
        confirmationCode: cleanCode,
        transactionId: `TRZ-${cleanCode}`,
        method: 'tranzila_recurring'
      });

      if (res.success) {
        const paymentInfo = res.paymentRecord || {
          organizationName: orgName,
          organizationId: orgId,
          amount: paymentAmount,
          confirmationCode: cleanCode,
          transactionId: `TRZ-${cleanCode}`
        };
        setSuccessPaymentData(paymentInfo);
        setIsSuccess(true);
      }
    } catch (err) {
      console.error('Reactivation after payment failed:', err);
      setErrorMessage(err.message || 'אירעה שגיאה בשחרור הארגון. אנא נסו שנית או פנו לתמיכה.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEnterTikTak = () => {
    const finalData = successPaymentData || {
      organizationName: orgName,
      organizationId: orgId,
      amount: paymentAmount
    };
    if (onPaymentSuccess) {
      onPaymentSuccess(finalData);
    }
    onClose();
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
          if (isSuccess) {
            handleEnterTikTak();
          } else {
            onClose();
          }
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
          position: 'relative',
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
            backgroundColor: isSuccess ? '#f0fdf4' : '#f8fafc'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                backgroundColor: isSuccess ? '#dcfce7' : '#dbeafe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.3rem'
              }}
            >
              {isSuccess ? '✓' : '💳'}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', color: isSuccess ? '#166534' : '#0f172a', fontWeight: '800' }}>
                {isSuccess ? 'המנוי החודשי הופעל בהצלחה' : 'הפעלת מנוי חודשי ופתיחת גישה'}
              </h2>
              <span style={{ fontSize: '0.82rem', color: isSuccess ? '#15803d' : '#64748b' }}>
                עבור ארגון: <strong style={{ color: isSuccess ? '#14532d' : '#1e293b' }}>{orgName}</strong>
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
              ₪{paymentAmount} / חודש
            </div>

            <button
              type="button"
              onClick={isSuccess ? handleEnterTikTak : onClose}
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
              title={isSuccess ? 'כניסה למערכת' : 'סגירה'}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, position: 'relative' }}>
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
              <span>הוראת קבע חודשית מאובטחת בתקן <strong>PCI-DSS Level 1</strong> באמצעות Tranzila</span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (formRef.current) {
                  const prevTarget = formRef.current.target;
                  formRef.current.target = '_blank';
                  formRef.current.submit();
                  formRef.current.target = prevTarget;
                }
              }}
              disabled={!paymentData || isHandshakeLoading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                color: '#2563eb',
                background: 'transparent',
                border: 'none',
                cursor: (!paymentData || isHandshakeLoading) ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '0.76rem',
                padding: 0
              }}
              title="פתיחה בלשונית נפרדת"
            >
              <span>חלון מלא</span>
              <span>↗</span>
            </button>
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

          {/* Billing Breakdown Card */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '12px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: '#dcfce7',
                  color: '#15803d',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                  flexShrink: 0
                }}
              >
                🔄
              </div>
              <div>
                <div style={{ fontWeight: '700', color: '#166534', fontSize: '0.92rem' }}>
                  הוראת קבע חודשית מתחדשת
                </div>
                <div style={{ color: '#15803d', fontSize: '0.8rem', marginTop: '2px' }}>
                  חיוב ראשון: ₪{paymentAmount} (מיידי) • חיוב חודשי: ₪{paymentAmount}
                </div>
              </div>
            </div>

            <div
              style={{
                textAlign: 'left',
                flexShrink: 0
              }}
            >
              <div style={{ fontWeight: '800', color: '#15803d', fontSize: '1.05rem' }}>
                ₪{paymentAmount}
                <span style={{ fontSize: '0.78rem', fontWeight: '500', color: '#166534' }}> / חודש</span>
              </div>
            </div>
          </div>

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
            {isProcessing && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  zIndex: 10,
                  gap: '14px',
                  color: '#0f172a',
                  fontSize: '0.95rem',
                  fontWeight: '600'
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    border: '4px solid #e2e8f0',
                    borderTopColor: '#16a34a',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }}
                />
                <span>מאמת את התשלום ומפעיל את המנוי...</span>
                <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: '400' }}>
                  אנא המתינו מספר שניות
                </span>
              </div>
            )}

            {(iframeLoading || isHandshakeLoading) && (
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
                <span>טוען טופס תשלום מאובטח...</span>
              </div>
            )}

            {paymentData && (
              <form
                ref={formRef}
                method="POST"
                action={paymentData.actionUrl}
                target="tiktakTranzilaFrame"
                style={{ display: 'none' }}
              >
                {Object.entries(paymentData.fields).map(([name, value]) => (
                  <input key={name} type="hidden" name={name} value={String(value ?? '')} />
                ))}
              </form>
            )}

            <iframe
              ref={iframeRef}
              id="tiktakTranzilaFrame"
              name="tiktakTranzilaFrame"
              title="TikTak Tranzila Payment"
              allow="payment"
              onLoad={() => {
                if (handshakeToken) {
                  setIframeLoading(false);
                }
              }}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                display: 'block'
              }}
            />
          </div>

          {/* Secure status footer */}
          <div
            style={{
              marginTop: '14px',
              paddingTop: '12px',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              color: '#475569',
              fontSize: '0.84rem',
              textAlign: 'center'
            }}
          >
            <span style={{ color: '#16a34a' }}>✨</span>
            <span>הגישה למערכת תיפתח באופן מיידי ואוטומטי עם סיום התשלום</span>
          </div>

          {/* Thank You Modal Overlay - Opens directly over the iFrame upon payment success */}
          {isSuccess && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 100,
                backgroundColor: 'rgba(15, 23, 42, 0.65)',
                backdropFilter: 'blur(6px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
                animation: 'fadeIn 0.25s ease-out'
              }}
            >
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '20px',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(226, 232, 240, 0.8)',
                  maxWidth: '480px',
                  width: '100%',
                  padding: '28px 22px',
                  textAlign: 'center',
                  boxSizing: 'border-box',
                  animation: 'zoomIn 0.25s ease-out',
                  position: 'relative'
                }}
              >
                {/* Celebration Badge */}
                <div
                  style={{
                    width: '76px',
                    height: '76px',
                    margin: '0 auto 14px',
                    borderRadius: '50%',
                    backgroundColor: '#dcfce7',
                    color: '#16a34a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2.6rem',
                    boxShadow: '0 10px 25px -5px rgba(22, 163, 74, 0.35)',
                    position: 'relative'
                  }}
                >
                  <span>✓</span>
                  <div
                    style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      fontSize: '1.3rem'
                    }}
                  >
                    🎉
                  </div>
                </div>

                <h3
                  style={{
                    margin: '0 0 6px 0',
                    fontSize: '1.45rem',
                    fontWeight: '900',
                    color: '#0f172a',
                    letterSpacing: '-0.01em'
                  }}
                >
                  תודה על הצטרפותך ל־TikTak!
                </h3>

                <p
                  style={{
                    margin: '0 0 18px 0',
                    color: '#15803d',
                    fontSize: '0.92rem',
                    fontWeight: '600',
                    lineHeight: '1.45'
                  }}
                >
                  המנוי החודשי הופעל בהצלחה. כל היכולות ולוחות העבודה של ארגון{' '}
                  <strong style={{ color: '#14532d' }}>{orgName}</strong> פתוחים כעת לעבודה מלאה.
                </p>

                {/* Details card */}
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '14px 18px',
                    marginBottom: '20px',
                    textAlign: 'right'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '10px',
                      paddingBottom: '8px',
                      borderBottom: '1px solid #e2e8f0'
                    }}
                  >
                    <span style={{ fontSize: '0.82rem', color: '#64748b' }}>סטטוס:</span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '3px 10px',
                        borderRadius: '999px',
                        backgroundColor: '#dcfce7',
                        color: '#15803d',
                        fontSize: '0.8rem',
                        fontWeight: '800'
                      }}
                    >
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#16a34a' }} />
                      מנוי פעיל 🟢
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '8px',
                      fontSize: '0.84rem'
                    }}
                  >
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.76rem', display: 'block' }}>שם הארגון:</span>
                      <strong style={{ color: '#0f172a' }}>{orgName}</strong>
                    </div>

                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.76rem', display: 'block' }}>חיוב חודשי:</span>
                      <strong style={{ color: '#15803d' }}>₪{paymentAmount} / חודש</strong>
                    </div>

                    {successPaymentData?.confirmationCode && (
                      <div>
                        <span style={{ color: '#64748b', fontSize: '0.76rem', display: 'block' }}>מספר אישור:</span>
                        <span style={{ color: '#334155', fontFamily: 'monospace', fontWeight: '700' }}>
                          {successPaymentData.confirmationCode}
                        </span>
                      </div>
                    )}

                    {userEmail && (
                      <div style={{ gridColumn: successPaymentData?.confirmationCode ? 'auto' : '1 / -1' }}>
                        <span style={{ color: '#64748b', fontSize: '0.76rem', display: 'block' }}>אישור נשלח למייל:</span>
                        <span style={{ color: '#334155', direction: 'ltr', display: 'inline-block', fontSize: '0.8rem' }}>
                          {userEmail}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Primary CTA Button to enter TikTak */}
                <button
                  type="button"
                  onClick={handleEnterTikTak}
                  onMouseEnter={() => setEnterButtonHovered(true)}
                  onMouseLeave={() => setEnterButtonHovered(false)}
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    backgroundColor: enterButtonHovered ? '#1d4ed8' : '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: '800',
                    fontSize: '1.05rem',
                    cursor: 'pointer',
                    boxShadow: enterButtonHovered
                      ? '0 8px 20px rgba(37, 99, 235, 0.45)'
                      : '0 4px 14px rgba(37, 99, 235, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    transform: enterButtonHovered ? 'translateY(-2px)' : 'translateY(0)',
                    transition: 'all 0.2s ease',
                    fontFamily: 'inherit'
                  }}
                >
                  <span>כניסה למערכת TikTak</span>
                  <span style={{ fontSize: '1.2rem' }}>🚀</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
