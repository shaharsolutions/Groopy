import React, { useEffect } from 'react';

/**
 * UserGuideModal - Friendly private system guide modal for mom.
 */
export default function UserGuideModal({ onClose }) {
  // Close modal on Escape key press
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%', maxHeight: '85vh' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="header-logo" style={{ width: '38px', height: '38px', fontSize: '1.2rem', borderRadius: '8px' }}>G</div>
            <div>
              <h3 className="modal-title" style={{ fontSize: '1.2rem' }}>מדריך למשתמשת - Groopy Work Manager</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>הסברים פשוטים, תשובות לשאלות וטיפים לניהול המשימות בקלות ✨</p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body" style={{ padding: '24px', overflowY: 'auto' }}>
          
          {/* Welcome Section */}
          <div className="guide-section">
            <h4 className="guide-section-title">👋 ברוכה הבאה לגרופי!</h4>
            <p style={{ fontSize: '0.95rem', marginBottom: '12px' }}>
              היי אמא! יצרנו את המערכת הזו במיוחד כדי לעשות לך סדר בעבודה היומיומית עם העבודות הגרפיות והחנויות השונות.
            </p>
            <p style={{ fontSize: '0.95rem', marginBottom: '12px' }}>
              במקום לחפש קבצים מפוזרים במיילים, לעקוב אחרי הערות בוואטסאפ או לשכוח מה כבר נשלח לייצור ומה מחכה לאישור - המערכת מרכזת הכל בלוח אחד נקי ומאורגן, המיועד לשימושך האישי והפרטי בלבד.
            </p>
            <div className="guide-alert-box info">
              <span className="guide-alert-icon">💡</span>
              <div>
                <strong>איך המערכת עוזרת לך?</strong> כל משימת עיצוב מקבלת "כרטיס" משלה. בכרטיס הזה כתובים כל הפרטים, שם נמצאים הקבצים הגרפיים, ושם את יכולה לנהל את פרטי העבודה, להוסיף הערות ולשמור קבצים.
              </div>
            </div>
          </div>

          {/* Roles Section */}
          <div className="guide-section" style={{ marginTop: '24px' }}>
            <h4 className="guide-section-title">👥 מצבי עבודה במערכת</h4>
            <p style={{ fontSize: '0.95rem', marginBottom: '12px' }}>המערכת מציעה שני מצבי תצוגה שתוכלי לעבור ביניהם:</p>
            <div className="guide-role-showcase">
              <div className="guide-role-card admin-theme">
                <span className="guide-role-badge">מצב מנהלת (התצוגה הראשית)</span>
                <p style={{ fontSize: '0.9rem', fontWeight: '500', marginBottom: '8px' }}>זהו המצב שבו את נמצאת כברירת מחדל ובו את מנהלת את העבודה:</p>
                <ul className="guide-styled-list">
                  <li>ליצור משימות עיצוב חדשות ולמחוק משימות מהלוח.</li>
                  <li>לשנות ולערוך את כל פרטי המשימה.</li>
                  <li>להיכנס למסך ההגדרות (⚙️) כדי להוסיף ספקים, חנויות ואנשי קשר.</li>
                </ul>
              </div>
              <div className="guide-role-card viewer-theme">
                <span className="guide-role-badge">מצב צפייה נקי (ללא עריכה)</span>
                <p style={{ fontSize: '0.9rem', fontWeight: '500', marginBottom: '8px' }}>מצב תצוגה מפושט המתאים לעבודה מהירה או לצפייה מהטלפון ללא חשש משינויים מקריים:</p>
                <ul className="guide-styled-list">
                  <li>את יכולה לראות את רשימת המשימות ולסנן לפי סטטוס.</li>
                  <li>לחיצה על משימה תציג את הפרטים, הקבצים והערות.</li>
                  <li>ניתן לכתוב תגובות או להעלות קבצים נוספים.</li>
                  <li><strong>במצב זה לא ניתן</strong> למחוק משימות, ליצור חדשות או לערוך הגדרות.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Daily Use Section */}
          <div className="guide-section" style={{ marginTop: '24px' }}>
            <h4 className="guide-section-title">🛠️ איך משתמשים בלוח המשימות היומיומי?</h4>
            
            <div className="guide-step-block">
              <div className="guide-step-number">1</div>
              <div className="guide-step-content">
                <h5>יצירת עבודה חדשה במערכת</h5>
                <p>לחצי על הכפתור הכחול <strong>"➕ עבודה חדשה"</strong> בראש המסך. ייפתח טופס שבו תמלאי את פרטי המשימה: שם העבודה, מספר העבודה (למשל GP-101), חנות יעד, ספק/מעצב, תאריך יעד ועדיפות.</p>
              </div>
            </div>

            <div className="guide-step-block" style={{ marginTop: '12px' }}>
              <div className="guide-step-number">2</div>
              <div className="guide-step-content">
                <h5>עדכון סטטוס ועדיפות מהיר</h5>
                <p>בטבלה הראשית, ליד כל משימה מופיעים הסטטוס והעדיפות שלה. את יכולה ללחוץ ישירות עליהם בתוך השורה בטבלה ולשנות אותם במהירות, ללא צורך לפתוח את כרטיס המשימה המלא.</p>
              </div>
            </div>

            <div className="guide-step-block" style={{ marginTop: '12px' }}>
              <div className="guide-step-number">3</div>
              <div className="guide-step-content">
                <h5>חיפוש וסינון משימות</h5>
                <p>הקלידי בשורת החיפוש חלק משם המשימה, מספר המשימה, או שם החנות/הספק. בנוסף, לחיצה על כפתורי הסטטוסים הצבעוניים בראש הלוח תציג לך רק את המשימות שנמצאות בסטטוס שבחרת.</p>
              </div>
            </div>
          </div>

          {/* Comments & Files Section */}
          <div className="guide-section" style={{ marginTop: '24px' }}>
            <h4 className="guide-section-title">💬 שיחה, החלפת קבצים והערות</h4>
            <p style={{ fontSize: '0.95rem', marginBottom: '8px' }}>כשאת לוחצת על שורה של משימה כלשהי בטבלה (או על סמל העין 👁️), נפתח חלון מפורט שבו תמצאי:</p>
            <ul className="guide-styled-list">
              <li><strong>תיאור מפורט:</strong> כל הדגשים והבקשות שלך לעבודה.</li>
              <li><strong>קישורים שימושיים:</strong> מקום להדביק קישור לתיקיית גוגל דרייב, Canva, וכו'.</li>
              <li><strong>קבצים מצורפים:</strong> תמונות של העיצובים או קובצי PDF להורדה.</li>
              <li><strong>אזור שיחה (תגובות):</strong> למטה תראי היסטוריית תגובות שבה תוכלי לכתוב הערות ולצרף קבצים חדשים או גרסאות מתוקנות.</li>
            </ul>
          </div>

          {/* FAQ Section */}
          <div className="guide-section" style={{ marginTop: '24px' }}>
            <h4 className="guide-section-title">❓ שאלות ותשובות נפוצות (אמא, זה בשבילך!)</h4>
            <div className="guide-faq-container">
              <details className="guide-faq-item">
                <summary className="guide-faq-summary">איך אני יודעת מה המשימות הכי דחופות כרגע?</summary>
                <div className="guide-faq-content">
                  <p>משימות בעדיפות <strong>"דחופה"</strong> יופיעו עם תג אדום מהבהב קלות. בנוסף, תאריכי יעד שעברו יסומנו ב-⚠️ "עבר", תאריכי יעד להיום יסומנו ב-⏰ "היום!", ותאריכים קרובים (3 ימים או פחות) יסומנו ב-⏳.</p>
                </div>
              </details>

              <details className="guide-faq-item" style={{ marginTop: '8px' }}>
                <summary className="guide-faq-summary">איך אני מוסיפה ספק/מעצב חדש או משנה שמות של חנויות?</summary>
                <div className="guide-faq-content">
                  <p>בפינה השמאלית העליונה של המסך (ליד השם שלך) יש כפתור עם גלגל שיניים <strong>"⚙️ הגדרות"</strong>. לחיצה עליו תפתח לך מסך ניהול שבו תוכלי לערוך ולהוסיף מעצבים, ספקים, חנויות, אנשי קשר ועוד. אל תשכחי ללחוץ על <strong>"שמירת הגדרות"</strong> בתחתית המסך כשתסיימי!</p>
                </div>
              </details>

              <details className="guide-faq-item" style={{ marginTop: '8px' }}>
                <summary className="guide-faq-summary">המערכת לא מתעדכנת או נראית איטית, מה לעשות?</summary>
                <div className="guide-faq-content">
                  <p>המערכת מתעדכנת אוטומטית, אך אם יש בעיית אינטרנט זמנית, פשוט תרענני את הדף בדפדפן (לחיצה על סמל החץ המעוגל 🔄 או Ctrl + R / Cmd + R). לחיצה על הלוגו <strong>G</strong> בצד ימין למעלה תמיד תחזיר אותך ללוח הראשי ותטען מחדש.</p>
                </div>
              </details>
            </div>
          </div>

          {/* Tips Section */}
          <div className="guide-section" style={{ marginTop: '24px' }}>
            <h4 className="guide-section-title">💡 טיפים קטנים לעבודה קלה</h4>
            <ul className="guide-styled-list">
              <li><strong>שמרי במועדפים:</strong> תוסיפי את המערכת לסימניות בדפדפן (לחיצה על הכוכב ⭐ בשורת הכתובת למעלה), כך תוכלי להיכנס אליה בלחיצה אחת בכל בוקר.</li>
              <li><strong>השתמשי במספרי עבודה עקביים:</strong> תני לכל משימה מספר סידורי רץ (למשל: GP-101, GP-102) כדי שיהיה קל לחפש אותה מייד בשורת החיפוש.</li>
              <li><strong>נקי מסננים:</strong> אם את לא מוצאת משימה, שימי לב אם לחוץ לך צ'יפס סטטוס מסוים למעלה או שיש טקסט שנשאר בשורת החיפוש. לחיצה על "נקה מסננים" תציג את הכל מחדש.</li>
            </ul>
          </div>

        </div>

        <div className="modal-footer" style={{ justifyContent: 'center', flexDirection: 'column', alignItems: 'center', padding: '16px 24px', gap: '8px', backgroundColor: '#f8fafc' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            נבנה ועוצב במיוחד עבורך, אמא, כדי להפוך את ניהול העבודות לחוויה פשוטה ומהנה!
          </p>
          <p style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            מיוצר באהבה על ידי שחר <span style={{ color: '#ef4444', display: 'inline-block', animation: 'heartbeat 1.5s infinite' }}>❤️</span>
          </p>
          <button className="btn btn-secondary" onClick={onClose} style={{ marginTop: '4px', minWidth: '120px', fontWeight: '600' }}>סגור מדריך</button>
        </div>
      </div>
    </div>
  );
}
