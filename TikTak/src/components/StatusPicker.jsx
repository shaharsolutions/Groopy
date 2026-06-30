import { useState, useEffect } from 'react';

/**
 * StatusPicker - Custom Popover Status Selector
 * 
 * Replaces native HTML dropdowns with a premium, colored popover menu.
 */
export default function StatusPicker({ currentStatus, statuses, statusColors, onChange, disabled }) {
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

  const handleSelect = (status) => {
    onChange(status);
    setIsOpen(false);
  };

  const currentColorClass = statusColors[currentStatus] || 'badge-frozen';
  const allAvailableStatuses = statuses.includes(currentStatus) ? statuses : [...statuses, currentStatus];

  return (
    <div className="status-picker" style={{ position: 'relative', display: 'inline-block', zIndex: isOpen ? 1010 : 'auto' }}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`badge ${currentColorClass}`}
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
          boxShadow: 'var(--shadow-sm)'
        }}
        disabled={disabled}
      >
        <span>{currentStatus}</span>
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
          <div className="status-picker-popover">
            {allAvailableStatuses.map(st => {
              const colorClass = statusColors[st] || 'badge-frozen';
              const isSelected = st === currentStatus;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => handleSelect(st)}
                  className={`badge ${colorClass}`}
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
                    boxShadow: isSelected ? 'var(--shadow-sm)' : 'none'
                  }}
                >
                  {st}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
