import { useEffect } from 'react';

export default function GuideModal({ isOpen, onClose }) {
  useEffect(() => {
    if (!isOpen) return;

    const handleMessage = (event) => {
      if (event.data && event.data.type === 'CLOSE_GUIDE') {
        onClose();
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Close on Escape key press
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 3000 }}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '95vw',
          maxWidth: '1350px',
          height: '90vh',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid rgba(255, 255, 255, 0.8)'
        }}
      >
        {/* Header */}
        <div className="modal-header" style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
          <h3 className="modal-title" style={{ fontSize: '1.3rem', fontWeight: '700', color: 'var(--text)' }}>
            📖 מדריך לשימוש במערכת
          </h3>
          <button 
            className="modal-close" 
            onClick={onClose}
            type="button"
            aria-label="סגור מדריך"
            style={{ marginRight: 'auto', marginLeft: 0 }}
          >
            &times;
          </button>
        </div>

        {/* Body (Iframe) */}
        <div className="modal-body" style={{ padding: 0, flex: 1, position: 'relative', overflow: 'hidden' }}>
          <iframe 
            src="/guide.html" 
            title="מדריך למשתמש"
            style={{ 
              width: '100%', 
              height: '100%', 
              border: 'none',
              display: 'block'
            }}
          />
        </div>
      </div>
    </div>
  );
}
