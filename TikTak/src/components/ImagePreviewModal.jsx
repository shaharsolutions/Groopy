import { useState } from 'react';

export default function ImagePreviewModal({ isOpen, onClose, fileUrl, fileName }) {
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen || !fileUrl) return null;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error(`Download failed with status ${response.status}`);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      downloadLink.download = fileName || 'image';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Failed to download image', error);
      const fallbackLink = document.createElement('a');
      fallbackLink.href = fileUrl;
      fallbackLink.download = fileName || 'image';
      fallbackLink.target = '_blank';
      fallbackLink.rel = 'noopener noreferrer';
      fallbackLink.click();
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ 
          maxWidth: '90%', 
          width: '900px', 
          maxHeight: '90vh', 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          borderRadius: '12px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <span style={{ fontSize: '1.4rem' }}>🖼️</span>
            <div style={{ minWidth: 0 }}>
              <h3 className="modal-title" style={{ margin: 0, fontSize: '1.1rem' }}>
                תצוגה מקדימה של תמונה
              </h3>
              {fileName && (
                <p 
                  style={{ 
                    margin: '2px 0 0 0', 
                    fontSize: '0.8rem', 
                    color: 'var(--text-muted)', 
                    direction: 'ltr',
                    textAlign: 'right',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                  title={fileName}
                >
                  {fileName}
                </p>
              )}
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              type="button"
              className="btn btn-secondary"
              onClick={handleDownload}
              disabled={isDownloading}
              style={{ 
                padding: '6px 12px', 
                fontSize: '0.8rem', 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '6px',
                height: '34px'
              }}
              title="הורדת התמונה למחשב"
            >
              {isDownloading ? 'מוריד...' : '📥 הורדה'}
            </button>
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
              title="פתיחה בלשונית חדשה"
            >
              ↗️ פתיחה בחלון חדש
            </a>
            <button className="modal-close" onClick={onClose} style={{ width: '34px', height: '34px' }} title="סגירה">
              &times;
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div 
          className="modal-body" 
          style={{ 
            padding: '16px', 
            flex: 1, 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'auto',
            backgroundColor: '#0f172a',
            minHeight: '300px'
          }}
        >
          <img
            src={fileUrl}
            alt={fileName || 'תצוגה מקדימה'}
            style={{
              maxWidth: '100%',
              maxHeight: 'calc(80vh - 100px)',
              objectFit: 'contain',
              borderRadius: '6px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
            }}
          />
        </div>
      </div>
    </div>
  );
}
