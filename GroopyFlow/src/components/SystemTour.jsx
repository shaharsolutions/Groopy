import React, { useState, useEffect } from 'react';

/**
 * SystemTour Component - Guided walkthrough for Groopy Flow
 * 
 * Provides interactive step-by-step guidance using dynamic spotlight focus.
 */
export default function SystemTour({ userRole, currentView, setView }) {
  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const [isTourActive, setIsTourActive] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [spotlightStyle, setSpotlightStyle] = useState(null);
  const [tooltipStyle, setTooltipStyle] = useState(null);

  // Steps configuration for Administrator Role
  const adminSteps = [
    {
      title: 'ברוכים הבאים לסיור המערכת! 🚀',
      body: 'נעים להכיר! זהו סיור מודרך קצר במערכת "תיקתק" לניהול ומעקב עבודות גרפיקה ועיצוב. נלווה אתכם צעד-אחר-צעד להכרת האזורים המרכזיים.',
      selector: null // Welcoming step, display in center
    },
    {
      title: 'סרגל הניווט הראשי 🧭',
      body: 'הסרגל העליון מאפשר לכם ניווט מהיר. הוא מציג את שם המערכת, קישור ישיר למדריך המשתמש המלא בפורמט HTML, וחיווי על תפקידכם הנוכחי.',
      selector: '.app-header'
    },
    {
      title: 'ניהול, הגדרות ושיתוף ⚙️',
      body: 'באזור זה תוכלו לבצע פעולות ניהול: להעתיק קישור שיתוף מיוחד לצופים חיצוניים (הצגת עבודות בלבד), לעבור להגדרות המערכת (שם עורכים סטטוסים, ספקים, מנהלים וחנויות), או לעבור זמנית למצב צפייה חיצוני.',
      selector: '.header-actions'
    },
    {
      title: 'יצירת עבודת עיצוב חדשה ➕',
      body: 'לחיצה על כפתור זה תפתח חלון יצירת משימה. תוכלו לקבוע כותרת, לשייך לחנות ולספק, להגדיר עדיפות ותאריך יעד, להעלות קבצי מקור/השראה ולפרט את דרישות העיצוב.',
      selector: '.tour-step-create-btn'
    },
    {
      title: 'סטטוסים וסינון מהיר 📊',
      body: 'שורת הסטטוסים מציגה את שלבי העבודה. המספר בכל כרטיסייה מייצג את כמות המשימות שנמצאות בשלב זה כרגע. לחיצה על כרטיסייה תסנן את הטבלה מתחת באופן מיידי.',
      selector: '.status-chips-container'
    },
    {
      title: 'חיפוש וסינונים מתקדמים 🔍',
      body: 'כאן תוכלו לבצע חיפוש חופשי של משימות לפי שם העבודה, החנות או הספק, או לסנן את העבודות במהירות לפי רמת העדיפות שלהן (רגילה, גבוהה, דחופה).',
      selector: '.filter-panel'
    },
    {
      title: 'טבלת העבודות המרכזית 📋',
      body: 'זהו לב המערכת. מוצגות כאן כל עבודות הגרפיקה עם תאריכי יעד (הצבועים לפי דחיפות וקרבה). מנהלים יכולים לעדכן סטטוס ועדיפות ישירות מהטבלה. לחיצה על שורה תפתח את כרטיס המשימה לתגובות והעלאת קבצים.',
      selector: '.table-container'
    }
  ];

  // Steps configuration for External Viewer Role
  const externalSteps = [
    {
      title: 'ברוכים הבאים לסיור (מצב צפייה) 👁️',
      body: 'נעים להכיר! זהו סיור בממשק המותאם עבור ספקים, מנהלי חנויות ושותפים של מערכת "תיקתק". במצב זה הממשק מונע שינויים רגישים ומאפשר שיתוף פעולה ממוקד.',
      selector: null
    },
    {
      title: 'סרגל עליון מותאם 🧭',
      body: 'הסרגל העליון מציין שאתם מחוברים ב"מצב צפייה ושיתוף". תוכלו לגשת למדריך המערכת או להתנתק בבטחה בכל עת.',
      selector: '.app-header'
    },
    {
      title: 'סטטוסים וסינון משימות 📊',
      body: 'תוכלו לראות כמה משימות נמצאות בכל סטטוס (כגון "ממתין לספק בסין" או "מאושר"). לחיצה על כל סטטוס תסנן את רשימת המשימות בהתאם.',
      selector: '.status-chips-container'
    },
    {
      title: 'איתור משימות מהיר 🔍',
      body: 'חפשו משימות עיצוב ספציפיות על ידי הקלדת שם המשימה, החנות המבקשת או שם הספק.',
      selector: '.filter-panel'
    },
    {
      title: 'צפייה, הורדת קבצים והערות 💬',
      body: 'כאן מוצגות כל המשימות. לחצו על "צפייה והערות" בשורה של כל עבודה כדי לפתוח את כרטיס העבודה המלא, להוריד את קבצי העיצוב הסופיים, או להוסיף הערות וקבצי תיקון ישירות עבור המעצבת!',
      selector: '.table-container'
    }
  ];

  const currentSteps = userRole === 'admin' ? adminSteps : externalSteps;

  const updateSpotlightPosition = () => {
    if (!isTourActive) return;
    const step = currentSteps[activeStep];
    
    if (!step || !step.selector) {
      setSpotlightStyle(null);
      setTooltipStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      });
      return;
    }

    const element = document.querySelector(step.selector);
    if (element) {
      const rect = element.getBoundingClientRect();
      
      // Spotlight settings (adds padding around targeted element)
      setSpotlightStyle({
        position: 'fixed',
        top: rect.top - 8,
        left: rect.left - 8,
        width: rect.width + 16,
        height: rect.height + 16,
        zIndex: 1005,
        boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.75)',
        borderRadius: '12px',
        pointerEvents: 'none',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      });

      // Tooltip position algorithm
      const tooltipWidth = 350;
      const tooltipHeight = 220; // Estimated max height
      const margin = 16;
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      let top, left;

      // Check if there is enough space below the element
      if (rect.bottom + tooltipHeight + margin < viewportHeight) {
        top = rect.bottom + margin;
        left = rect.left + (rect.width - tooltipWidth) / 2;
      } 
      // Check if there is enough space above the element
      else if (rect.top - tooltipHeight - margin > 0) {
        top = rect.top - tooltipHeight - margin;
        left = rect.left + (rect.width - tooltipWidth) / 2;
      } 
      // Default to center if it does not fit anywhere
      else {
        top = (viewportHeight - tooltipHeight) / 2;
        left = (viewportWidth - tooltipWidth) / 2;
      }

      // Constrain within viewport bounds
      if (left < 16) left = 16;
      if (left + tooltipWidth > viewportWidth - 16) {
        left = viewportWidth - tooltipWidth - 16;
      }

      setTooltipStyle({
        position: 'fixed',
        top: top,
        left: left,
        transform: 'none'
      });
    } else {
      // Target element missing (fallback to center dialog)
      setSpotlightStyle(null);
      setTooltipStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      });
    }
  };

  // Run scroll and position update when step changes
  useEffect(() => {
    if (isTourActive) {
      const step = currentSteps[activeStep];
      if (step && step.selector) {
        const element = document.querySelector(step.selector);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }

      // Brief delay to allow scroll to settle before measuring coordinates
      const timer = setTimeout(() => {
        updateSpotlightPosition();
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [activeStep, isTourActive, userRole]);

  // Handle window resizing and scroll recalculation
  useEffect(() => {
    if (isTourActive) {
      const handleResizeOrScroll = () => {
        updateSpotlightPosition();
      };

      window.addEventListener('resize', handleResizeOrScroll);
      window.addEventListener('scroll', handleResizeOrScroll, { passive: true });

      return () => {
        window.removeEventListener('resize', handleResizeOrScroll);
        window.removeEventListener('scroll', handleResizeOrScroll);
      };
    }
  }, [isTourActive, activeStep, userRole]);

  // Terminate tour automatically if user navigates to settings view
  useEffect(() => {
    if (currentView === 'settings' && isTourActive) {
      handleEndTour();
    }
  }, [currentView]);

  const handleStartTour = () => {
    if (currentView !== 'dashboard') {
      setView('dashboard');
    }
    setShowStartConfirm(false);
    setIsTourActive(true);
    setActiveStep(0);
  };

  const handleEndTour = () => {
    setIsTourActive(false);
    setSpotlightStyle(null);
    setTooltipStyle(null);
  };

  const handleNext = () => {
    if (activeStep < currentSteps.length - 1) {
      setActiveStep(prev => prev + 1);
    } else {
      handleEndTour();
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(prev => prev - 1);
    }
  };

  // Calculate percentage of progress for the bar
  const progressPercentage = ((activeStep + 1) / currentSteps.length) * 100;

  return (
    <>
      {/* Floating "?" Button Trigger */}
      <button 
        type="button" 
        className="tour-floating-btn" 
        onClick={() => setShowStartConfirm(true)}
        title="סיור מודרך במערכת"
      >
        ❓
      </button>

      {/* Confirmation Modal to Start Tour */}
      {showStartConfirm && (
        <div className="tour-overlay-modal" onClick={() => setShowStartConfirm(false)}>
          <div className="tour-modal-card" onClick={(e) => e.stopPropagation()}>
            <span className="tour-modal-icon">🗺️</span>
            <h3 className="tour-modal-title">סיור מודרך במערכת</h3>
            <p className="tour-modal-text">
              {currentView === 'settings' 
                ? 'שימו לב: הסיור המודרך יחזיר אתכם ללוח המשימות הראשי כדי להציג את פונקציות המערכת. האם ברצונכם להתחיל בסיור?'
                : 'האם ברצונך להתחיל בסיור מודרך קצר במערכת "תיקתק" כדי להכיר את כל אזורי העבודה ותפקודיהם?'}
            </p>
            <div className="tour-modal-footer">
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handleStartTour}
                style={{ padding: '10px 24px' }}
              >
                כן, בואו נתחיל! 🚀
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setShowStartConfirm(false)}
                style={{ padding: '10px 24px' }}
              >
                לא כרגע
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spotlight Overlay & Tooltip Step Cards */}
      {isTourActive && (
        <>
          {/* Backdrop/Spotlight Cover */}
          {spotlightStyle && (
            <div style={spotlightStyle} />
          )}

          {/* Interactive Step Tooltip */}
          <div className="tour-tooltip-card" style={tooltipStyle}>
            <div className="tour-tooltip-header">
              <h4 className="tour-tooltip-title">{currentSteps[activeStep].title}</h4>
              <span className="tour-tooltip-step-count">
                {activeStep + 1} מתוך {currentSteps.length}
              </span>
            </div>

            <p className="tour-tooltip-body">{currentSteps[activeStep].body}</p>

            {/* Visual Progress Bar */}
            <div className="tour-progress-container">
              <div 
                className="tour-progress-bar" 
                style={{ width: `${progressPercentage}%` }} 
              />
            </div>

            <div className="tour-tooltip-footer">
              <button 
                type="button" 
                className="tour-btn-text" 
                onClick={handleEndTour}
              >
                דילוג וסיום
              </button>
              
              <div className="tour-btn-group">
                {activeStep > 0 && (
                  <button 
                    type="button" 
                    className="tour-btn tour-btn-secondary" 
                    onClick={handleBack}
                  >
                    הקודם
                  </button>
                )}
                <button 
                  type="button" 
                  className="tour-btn tour-btn-primary" 
                  onClick={handleNext}
                >
                  {activeStep === currentSteps.length - 1 ? 'סיום סיור 🎉' : 'הבא ➔'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
