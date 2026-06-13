import { useState, useEffect } from 'react';

/**
 * PriorityPicker - Custom Popover Priority Selector
 * 
 * Replaces native HTML dropdowns with a premium, colored popover menu.
 */
export default function PriorityPicker({ currentPriority, priorities, priorityColors, onChange, disabled }) {
  const [isOpen, setIsOpen] = useState(false);

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

  const handleSelect = (priority) => {
    onChange(priority);
    setIsOpen(false);
  };

  const currentColorClass = priorityColors[currentPriority] || 'priority-normal';
  const allAvailablePriorities = priorities.includes(currentPriority) ? priorities : [...priorities, currentPriority];

  return (
    <div style={{ position: 'relative', display: 'inline-block', zIndex: isOpen ? 1010 : 'auto' }}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`priority-badge ${currentColorClass}`}
        style={{
          cursor: disabled ? 'not-allowed' : 'pointer',
          padding: '6px 12px',
          fontSize: '0.8rem',
          fontWeight: '600',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'all 0.2s ease',
          outline: 'none',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--border)',
          appearance: 'none',
          WebkitAppearance: 'none'
        }}
        disabled={disabled}
      >
        <span>{currentPriority}</span>
        {!disabled && <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>▼</span>}
      </button>

      {isOpen && (
        <>
          {/* Transparent full-screen overlay to close the popup when clicking outside */}
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
              backgroundColor: 'transparent'
            }}
            onClick={() => setIsOpen(false)}
          />
          
          {/* Custom Popover Options Grid */}
          <div className="priority-picker-popover">
            {allAvailablePriorities.map(pr => {
              const colorClass = priorityColors[pr] || 'priority-normal';
              const isSelected = pr === currentPriority;
              return (
                <button
                  key={pr}
                  type="button"
                  onClick={() => handleSelect(pr)}
                  className={`priority-badge ${colorClass}`}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: '0.75rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    border: isSelected ? '2px solid var(--primary)' : '1px solid transparent',
                    opacity: 1,
                    transform: isSelected ? 'scale(1.02)' : 'none',
                    fontWeight: isSelected ? '700' : '600',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
                    justifyContent: 'center'
                  }}
                >
                  {pr}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
