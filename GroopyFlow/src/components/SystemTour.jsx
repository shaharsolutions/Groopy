import React, { useState, useEffect, useRef } from 'react';

/**
 * SystemTour Component - Guided walkthrough for Groopy Flow
 * 
 * Provides interactive step-by-step guidance using dynamic spotlight focus.
 * The tour card appears centered initially, is draggable, and does not move automatically.
 */
export default function SystemTour({ userRole, currentView, setView }) {
  const [isTourActive, setIsTourActive] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [spotlightStyle, setSpotlightStyle] = useState(null);
  
  // Draggable card position state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const highlightedElementRef = useRef(null);

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

  // Steps configuration for Details Modal (Both Admin and External)
  const modalSteps = [
    {
      title: 'סיור בחלון פרטי העבודה 🔎',
      body: 'ברוכים הבאים לכרטיס המשימה המורחב! כאן מרוכזים כל המידע הטכני, הקבצים המצורפים והשיח סביב עבודת העיצוב.',
      selector: null
    },
    {
      title: 'מידע מרכזי וקבצי עיצוב 📁',
      body: 'בחלק המרכזי תוכלו לקרוא את תיאור המשימה המלא, לגשת לקישור תיקיית הדרייב/קבצים של העבודה, ולצפות בקבצים שהועלו (כולל הורדת קבצי עיצוב וצפייה בתמונות).',
      selector: '.details-main'
    },
    {
      title: 'פרטי סיווג ומטא-דאטה 📋',
      body: 'בסרגל הצדי מופיעים כל פרטי הסיווג של המשימה: הסטטוס שלה, רמת העדיפות, סוג העבודה (למשל "אריזה" או "לוגו"), החנות המזמינה, שם הספק ואיש הקשר לתיאום.',
      selector: '.details-sidebar'
    },
    {
      title: 'שיח, הערות ותיקונים 💬',
      body: 'זהו אזור התקשורת! כאן המעצבת, מנהל היבוא והספק יכולים לנהל שיח ישיר. תוכלו לכתוב תגובה, להעלות קובץ תיקון או צילום מסך, ולשמור על כולם מעודכנים בזמן אמת.',
      selector: '.comments-section'
    }
  ];

  const currentSteps = isModalOpen ? modalSteps : (userRole === 'admin' ? adminSteps : externalSteps);

  const removeHighlight = () => {
    if (highlightedElementRef.current) {
      highlightedElementRef.current.classList.remove('tour-highlight-element');
      highlightedElementRef.current = null;
    }
  };

  const applyHighlight = (selector) => {
    removeHighlight();
    if (selector) {
      const el = document.querySelector(selector);
      if (el) {
        el.classList.add('tour-highlight-element');
        highlightedElementRef.current = el;
      }
    }
  };

  const updateSpotlightPosition = () => {
    if (!isTourActive) return;
    const step = currentSteps[activeStep];
    
    if (isModalOpen) {
      setSpotlightStyle(null);
      return;
    }

    if (!step || !step.selector) {
      // Fullscreen dark backdrop for steps without selector (like welcome step)
      setSpotlightStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        width: 0,
        height: 0,
        zIndex: 1005,
        boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.75)',
        borderRadius: '50%',
        pointerEvents: 'none',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      });
      return;
    }

    const element = document.querySelector(step.selector);
    if (element) {
      const rect = element.getBoundingClientRect();
      
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
    } else {
      // Fallback fullscreen dark backdrop if target not found
      setSpotlightStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        width: 0,
        height: 0,
        zIndex: 1005,
        boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.75)',
        borderRadius: '50%',
        pointerEvents: 'none',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
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
        applyHighlight(step.selector);
      } else {
        removeHighlight();
      }

      // Brief delay to allow scroll to settle before measuring coordinates
      const timer = setTimeout(() => {
        updateSpotlightPosition();
      }, 300);

      return () => clearTimeout(timer);
    } else {
      removeHighlight();
    }
  }, [activeStep, isTourActive, isModalOpen, userRole]);

  // Handle window resizing and scroll recalculation
  useEffect(() => {
    if (isTourActive) {
      const handleResizeOrScroll = () => {
        updateSpotlightPosition();
        
        // Keep the tooltip inside screen bounds on resize
        setPosition(prev => {
          const cardWidth = 350;
          const cardHeight = 240;
          let newX = prev.x;
          let newY = prev.y;
          if (newX + cardWidth > window.innerWidth - 16) {
            newX = window.innerWidth - cardWidth - 16;
          }
          if (newX < 16) newX = 16;
          if (newY + cardHeight > window.innerHeight - 16) {
            newY = window.innerHeight - cardHeight - 16;
          }
          if (newY < 16) newY = 16;
          return { x: newX, y: newY };
        });
      };

      window.addEventListener('resize', handleResizeOrScroll);
      window.addEventListener('scroll', handleResizeOrScroll, { passive: true });

      return () => {
        window.removeEventListener('resize', handleResizeOrScroll);
        window.removeEventListener('scroll', handleResizeOrScroll);
      };
    }
  }, [isTourActive, activeStep, isModalOpen, userRole]);

  // Monitor modal state during the tour to prevent hanging states
  useEffect(() => {
    if (isTourActive) {
      const checkModalState = setInterval(() => {
        const modalExists = !!document.querySelector('.details-grid');
        if (isModalOpen && !modalExists) {
          // Modal tour was running but user closed the modal -> end tour
          handleEndTour();
        } else if (!isModalOpen && modalExists) {
          // Dashboard tour was running but user opened a modal -> end tour to avoid overlay conflicts
          handleEndTour();
        }
      }, 500);

      return () => clearInterval(checkModalState);
    }
  }, [isTourActive, isModalOpen]);

  // Terminate tour automatically if user navigates to settings view
  useEffect(() => {
    if (currentView === 'settings' && isTourActive) {
      handleEndTour();
    }
  }, [currentView]);

  const handleStartTour = () => {
    const modalExists = !!document.querySelector('.details-grid');
    let targetModalOpen = false;
    
    if (modalExists) {
      targetModalOpen = true;
      setIsModalOpen(true);
    } else {
      setIsModalOpen(false);
      targetModalOpen = false;
      if (currentView !== 'dashboard') {
        setView('dashboard');
      }
    }

    // Set initial position centered on the screen
    const cardWidth = 350;
    const cardHeight = 240;
    const x = (window.innerWidth - cardWidth) / 2;
    const y = (window.innerHeight - cardHeight) / 2;
    setPosition({ x, y });

    setIsTourActive(true);
    setActiveStep(0);
  };

  const handleEndTour = () => {
    setIsTourActive(false);
    setSpotlightStyle(null);
    removeHighlight();
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

  // Dragging event handlers for mouse
  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Only drag on left click
    if (e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.closest('a')) {
      return; // Do not drag if clicking interactive elements
    }
    
    draggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!draggingRef.current) return;
    
    let newX = e.clientX - dragStartRef.current.x;
    let newY = e.clientY - dragStartRef.current.y;
    
    const cardWidth = 350;
    const cardHeight = 240;
    
    // Contain within screen boundaries
    if (newX < 16) newX = 16;
    if (newX + cardWidth > window.innerWidth - 16) {
      newX = window.innerWidth - cardWidth - 16;
    }
    if (newY < 16) newY = 16;
    if (newY + cardHeight > window.innerHeight - 16) {
      newY = window.innerHeight - cardHeight - 16;
    }
    
    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    draggingRef.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // Dragging event handlers for touch devices
  const handleTouchStart = (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.closest('a')) {
      return;
    }
    
    const touch = e.touches[0];
    draggingRef.current = true;
    dragStartRef.current = {
      x: touch.clientX - position.x,
      y: touch.clientY - position.y
    };
    
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
  };

  const handleTouchMove = (e) => {
    if (!draggingRef.current) return;
    const touch = e.touches[0];
    
    let newX = touch.clientX - dragStartRef.current.x;
    let newY = touch.clientY - dragStartRef.current.y;
    
    const cardWidth = 350;
    const cardHeight = 240;
    
    if (newX < 16) newX = 16;
    if (newX + cardWidth > window.innerWidth - 16) {
      newX = window.innerWidth - cardWidth - 16;
    }
    if (newY < 16) newY = 16;
    if (newY + cardHeight > window.innerHeight - 16) {
      newY = window.innerHeight - cardHeight - 16;
    }
    
    setPosition({ x: newX, y: newY });
    e.preventDefault(); // Prevent scrolling page while dragging the tour card
  };

  const handleTouchEnd = () => {
    draggingRef.current = false;
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
  };

  // Calculate percentage of progress for the bar
  const progressPercentage = ((activeStep + 1) / currentSteps.length) * 100;

  return (
    <>
      {/* Floating "?" Button Trigger */}
      <button 
        type="button" 
        className="tour-floating-btn" 
        onClick={handleStartTour}
        title="סיור מודרך במערכת"
      >
        ❓
      </button>

      {/* Spotlight Overlay & Tooltip Step Cards */}
      {isTourActive && (
        <>
          {/* Backdrop/Spotlight Cover */}
          {spotlightStyle && (
            <div style={spotlightStyle} />
          )}

          {/* Interactive Step Tooltip */}
          <div 
            className="tour-tooltip-card" 
            style={{
              position: 'fixed',
              top: `${position.y}px`,
              left: `${position.x}px`,
              transform: 'none',
              zIndex: 1070,
              cursor: 'grab'
            }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          >
            <div className="tour-tooltip-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h4 className="tour-tooltip-title">{currentSteps[activeStep].title}</h4>
                <span className="tour-tooltip-step-count">
                  {activeStep + 1} מתוך {currentSteps.length}
                </span>
              </div>
              <button 
                type="button" 
                onClick={handleEndTour}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.6rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: '0 4px',
                  lineHeight: '1',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.2s',
                  marginRight: 'auto',
                  marginLeft: '0'
                }}
                title="סגירת הסיור"
              >
                &times;
              </button>
            </div>

            <p className="tour-tooltip-body" style={{ userSelect: 'none' }}>{currentSteps[activeStep].body}</p>

            {/* Visual Progress Bar */}
            <div className="tour-progress-container" style={{ userSelect: 'none' }}>
              <div 
                className="tour-progress-bar" 
                style={{ width: `${progressPercentage}%` }} 
              />
            </div>

            <div className="tour-tooltip-footer" style={{ userSelect: 'none' }}>
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
                  {activeStep === currentSteps.length - 1 ? 'סיום סיור 🎉' : 'הבא ⟵'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
