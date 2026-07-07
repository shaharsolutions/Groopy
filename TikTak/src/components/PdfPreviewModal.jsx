export default function PdfPreviewModal({ isOpen, onClose, fileUrl, fileName }) {
  if (!isOpen || !fileUrl) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div 
        className="modal-content" 
        style={{ 
          maxWidth: '90%', 
          width: '1000px', 
          height: '85vh', 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden' 
        }}
      >
        {/* Modal Header */}
        <div className="modal-header" style={{ padding: '16px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.5rem' }}>📄</span>
            <div>
              <h3 className="modal-title" style={{ margin: 0, fontSize: '1.15rem' }}>
                תצוגה מקדימה של PDF
              </h3>
              <p 
                style={{ 
                  margin: '2px 0 0 0', 
                  fontSize: '0.8rem', 
                  color: 'var(--text-muted)', 
                  direction: 'ltr',
                  textAlign: 'right'
                }}
              >
                {fileName}
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <a 
              href={fileUrl} 
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
              style={{ 
                padding: '6px 12px', 
                fontSize: '0.8rem', 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '6px',
                textDecoration: 'none',
                height: '34px'
              }}
              title="פתיחה בחלון חדש / הורדה"
            >
              📥 פתיחה בחלון חדש
            </a>
            <button className="modal-close" onClick={onClose} style={{ width: '34px', height: '34px' }}>
              &times;
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div 
          className="modal-body" 
          style={{ 
            padding: 0, 
            flex: 1, 
            overflow: 'hidden',
            backgroundColor: '#f8fafc'
          }}
        >
          <iframe
            src={`${fileUrl}#toolbar=1`}
            title={fileName}
            width="100%"
            height="100%"
            style={{ border: 'none' }}
          />
        </div>
      </div>
    </div>
  );
}
