import { useState } from 'react';

/**
 * ThankYouPage
 *
 * Rendered immediately after a successful payment / subscription activation.
 * Welcomes the user, displays the active subscription details, and provides
 * a prominent button to enter the TikTak system.
 */
export default function ThankYouPage({
  organizationName = 'הארגון שלך',
  organizationId = '',
  amount = 0,
  confirmationCode = '',
  transactionId = '',
  userEmail = '',
  onEnterSystem
}) {
  const [isHovered, setIsHovered] = useState(false);

  const displayDate = new Intl.DateTimeFormat('he-IL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date());

  const handleAction = () => {
    if (onEnterSystem) {
      onEnterSystem();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f0fdf4 0%, #eff6ff 50%, #f8fafc 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        fontFamily: 'Rubik, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        direction: 'rtl',
        color: '#0f172a'
      }}
    >
      <main
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.15), 0 0 0 1px rgba(226, 232, 240, 0.8)',
          maxWidth: '580px',
          width: '100%',
          padding: '40px 32px',
          textAlign: 'center',
          animation: 'fadeIn 0.3s ease-out',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Decorative Top Accent Bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '6px',
            background: 'linear-gradient(90deg, #10b981, #2563eb, #6366f1)'
          }}
        />

        {/* Celebration Icon */}
        <div
          style={{
            width: '88px',
            height: '88px',
            margin: '0 auto 20px',
            borderRadius: '50%',
            backgroundColor: '#dcfce7',
            color: '#16a34a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '3rem',
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
              fontSize: '1.4rem'
            }}
          >
            🎉
          </div>
        </div>

        {/* Main Heading */}
        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: '900',
            color: '#0f172a',
            margin: '0 0 10px 0',
            letterSpacing: '-0.02em',
            lineHeight: 1.2
          }}
        >
          תודה על הצטרפותך ל־TikTak!
        </h1>

        <p
          style={{
            fontSize: '1.02rem',
            color: '#475569',
            margin: '0 0 28px 0',
            lineHeight: 1.55
          }}
        >
          המנוי החודשי הופעל בהצלחה. כל היכולות, לוחות העבודה והנתונים של הארגון פתוחים כעת לעבודה שוטפת.
        </p>

        {/* Subscription Summary Card */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '20px 24px',
            marginBottom: '28px',
            textAlign: 'right'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '14px',
              paddingBottom: '12px',
              borderBottom: '1px solid #e2e8f0'
            }}
          >
            <span style={{ fontSize: '0.86rem', color: '#64748b', fontWeight: '500' }}>סטטוס מנוי:</span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '999px',
                backgroundColor: '#dcfce7',
                color: '#15803d',
                fontSize: '0.84rem',
                fontWeight: '800'
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#16a34a' }} />
              מנוי פעיל
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              fontSize: '0.88rem'
            }}
          >
            <div>
              <span style={{ color: '#64748b', fontSize: '0.78rem', display: 'block' }}>ארגון:</span>
              <strong style={{ color: '#1e293b' }}>{organizationName}</strong>
            </div>

            {amount > 0 && (
              <div>
                <span style={{ color: '#64748b', fontSize: '0.78rem', display: 'block' }}>חיוב חודשי:</span>
                <strong style={{ color: '#15803d' }}>₪{amount} / חודש</strong>
              </div>
            )}

            <div>
              <span style={{ color: '#64748b', fontSize: '0.78rem', display: 'block' }}>תאריך הפעלה:</span>
              <span style={{ color: '#334155' }}>{displayDate}</span>
            </div>

            {confirmationCode && (
              <div>
                <span style={{ color: '#64748b', fontSize: '0.78rem', display: 'block' }}>מספר אישור:</span>
                <span style={{ color: '#334155', fontFamily: 'monospace', fontWeight: '600' }}>
                  {confirmationCode}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '10px',
            marginBottom: '28px',
            textAlign: 'right'
          }}
        >
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '12px',
              backgroundColor: '#f1f5f9',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>📋</span>
            <span style={{ fontSize: '0.84rem', fontWeight: '600', color: '#1e293b' }}>
              ניהול משימות ולוחות מתקדם
            </span>
          </div>

          <div
            style={{
              padding: '10px 14px',
              borderRadius: '12px',
              backgroundColor: '#f1f5f9',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>👥</span>
            <span style={{ fontSize: '0.84rem', fontWeight: '600', color: '#1e293b' }}>
              ספר אנשי קשר וספקים
            </span>
          </div>

          <div
            style={{
              padding: '10px 14px',
              borderRadius: '12px',
              backgroundColor: '#f1f5f9',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>⚡</span>
            <span style={{ fontSize: '0.84rem', fontWeight: '600', color: '#1e293b' }}>
              עדכונים ושיתוף פעולה מיידי
            </span>
          </div>

          <div
            style={{
              padding: '10px 14px',
              borderRadius: '12px',
              backgroundColor: '#f1f5f9',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>📊</span>
            <span style={{ fontSize: '0.84rem', fontWeight: '600', color: '#1e293b' }}>
              דוחות מעקב וייצוא נתונים
            </span>
          </div>
        </div>

        {/* Primary CTA Button: Enter TikTak System */}
        <button
          type="button"
          onClick={handleAction}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            width: '100%',
            padding: '16px 24px',
            backgroundColor: isHovered ? '#1d4ed8' : '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: '14px',
            fontSize: '1.12rem',
            fontWeight: '800',
            fontFamily: 'inherit',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            boxShadow: isHovered
              ? '0 16px 32px -8px rgba(37, 99, 235, 0.45)'
              : '0 10px 25px -5px rgba(37, 99, 235, 0.35)',
            transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            outline: 'none'
          }}
        >
          <span>כניסה למערכת TikTak</span>
          <span style={{ fontSize: '1.25rem' }}>🚀</span>
        </button>

        {/* Security & Support Footer Note */}
        <div
          style={{
            marginTop: '20px',
            fontSize: '0.8rem',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <span>🔒</span>
          <span>הסליקה מבוצעת ומאובטחת על ידי Tranzila בתקן PCI-DSS Level 1</span>
        </div>
      </main>
    </div>
  );
}
