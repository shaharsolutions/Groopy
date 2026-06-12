import { useState, useEffect } from 'react';

const MONTHS_HE = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

const WEEKDAYS_HE = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

// Modern SVG Icons
const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const ChevronLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
);

const ChevronRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

export default function CustomDatePicker({ value, onChange, placeholder = 'dd/mm/yyyy', style = {}, inputStyle = {} }) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());

  // Sync internal viewDate with external value when value changes or when opened
  useEffect(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        if (!isNaN(d.getTime())) {
          setViewDate(d);
        }
      }
    } else {
      setViewDate(new Date());
    }
  }, [value, isOpen]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0-indexed

  // Format the value for the input box: DD/MM/YYYY
  const getFormattedValue = () => {
    if (!value) return '';
    const parts = value.split('-');
    if (parts.length !== 3) return value;
    return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
  };

  // Move to previous month
  const prevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  // Move to next month
  const nextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleDaySelect = (dayNum, type) => {
    let targetMonth = month;
    let targetYear = year;

    if (type === 'prev') {
      targetMonth = month - 1;
      if (targetMonth < 0) {
        targetMonth = 11;
        targetYear -= 1;
      }
    } else if (type === 'next') {
      targetMonth = month + 1;
      if (targetMonth > 11) {
        targetMonth = 0;
        targetYear += 1;
      }
    }

    const yyyy = targetYear;
    const mm = String(targetMonth + 1).padStart(2, '0');
    const dd = String(dayNum).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    onChange(dateStr);
    setIsOpen(false);
  };

  const handleTodaySelect = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  // Generate calendar days
  const generateDays = () => {
    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];

    // Previous month padding days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({
        num: daysInPrevMonth - i,
        type: 'prev'
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        num: i,
        type: 'current'
      });
    }

    // Next month padding days to fill grid (42 elements for 6 rows)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        num: i,
        type: 'next'
      });
    }

    return days;
  };

  // Helper to check if a day is today
  const isToday = (dayNum, type) => {
    if (type !== 'current') return false;
    const today = new Date();
    return today.getDate() === dayNum && today.getMonth() === month && today.getFullYear() === year;
  };

  // Helper to check if a day is currently selected
  const isSelected = (dayNum, type) => {
    if (!value) return false;
    const parts = value.split('-');
    if (parts.length !== 3) return false;

    let targetMonth = month;
    let targetYear = year;

    if (type === 'prev') {
      targetMonth = month - 1;
      if (targetMonth < 0) { targetMonth = 11; targetYear -= 1; }
    } else if (type === 'next') {
      targetMonth = month + 1;
      if (targetMonth > 11) { targetMonth = 0; targetYear += 1; }
    }

    return parseInt(parts[2], 10) === dayNum &&
           parseInt(parts[1], 10) === (targetMonth + 1) &&
           parseInt(parts[0], 10) === targetYear;
  };

  const calendarDays = generateDays();

  // Close calendar popup on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="custom-datepicker-container" style={style}>
      <div className="custom-datepicker-input-wrapper">
        <input
          type="text"
          className="form-control custom-datepicker-input"
          style={{ ...inputStyle, cursor: 'pointer' }}
          value={getFormattedValue()}
          placeholder={placeholder}
          onClick={() => setIsOpen(!isOpen)}
          readOnly
        />
        <span className="custom-datepicker-icon" onClick={() => setIsOpen(!isOpen)} style={{ cursor: 'pointer' }}>
          <CalendarIcon />
        </span>
      </div>

      {isOpen && (
        <>
          {/* Overlay to catch clicks outside the datepicker popup */}
          <div
            className="custom-datepicker-overlay"
            onClick={() => setIsOpen(false)}
          />
          <div className="custom-datepicker-popup">
            <div className="custom-datepicker-header">
              {/* Year navigation - in RTL, right Chevron moves to prev month, left Chevron to next month */}
              <button type="button" className="custom-datepicker-nav-btn" onClick={prevMonth} title="חודש קודם">
                <ChevronRightIcon />
              </button>
              
              <div className="custom-datepicker-month-year">
                <span>{MONTHS_HE[month]}</span>
                <span>{year}</span>
              </div>

              <button type="button" className="custom-datepicker-nav-btn" onClick={nextMonth} title="חודש הבא">
                <ChevronLeftIcon />
              </button>
            </div>

            <div className="custom-datepicker-weekdays">
              {WEEKDAYS_HE.map((day, idx) => (
                <div key={idx}>{day}</div>
              ))}
            </div>

            <div className="custom-datepicker-days">
              {calendarDays.map((day, idx) => {
                const dayClass = `custom-datepicker-day ${day.type} ${isSelected(day.num, day.type) ? 'selected' : ''} ${isToday(day.num, day.type) ? 'today' : ''}`;
                return (
                  <button
                    key={idx}
                    type="button"
                    className={dayClass}
                    onClick={() => handleDaySelect(day.num, day.type)}
                  >
                    {day.num}
                  </button>
                );
              })}
            </div>

            <div className="custom-datepicker-footer">
              <button type="button" className="custom-datepicker-footer-btn" onClick={handleTodaySelect}>
                היום
              </button>
              <button type="button" className="custom-datepicker-footer-btn secondary" onClick={handleClear}>
                ללא תאריך
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
