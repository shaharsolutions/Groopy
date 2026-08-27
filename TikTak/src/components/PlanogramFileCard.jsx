import { useState, useRef } from 'react';

const isPdfFile = (file) => /\.pdf$/i.test(file?.name || '');
const isExcelFile = (file) => /\.(xlsx|xls)$/i.test(file?.name || '');

export default function PlanogramFileCard({
  file,
  onPreview = null,
  onReplace = null,
  onDelete = null,
  deleteLabel = 'מחיקה',
  downloadLabel = 'הורדת קובץ',
  isReplacing = false
}) {
  const [isDownloading, setIsDownloading] = useState(false);
  const replaceInputRef = useRef(null);

  if (!file) return null;

  const handleDownload = async (e) => {
    e.stopPropagation();
    setIsDownloading(true);
    try {
      const response = await fetch(file.url);
      if (!response.ok) throw new Error(`Download failed with status ${response.status}`);
      const blobUrl = URL.createObjectURL(await response.blob());
      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      downloadLink.download = file.name || 'file';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Failed to download file', error);
      const fallbackLink = document.createElement('a');
      fallbackLink.href = file.url;
      fallbackLink.download = file.name || 'file';
      fallbackLink.target = '_blank';
      fallbackLink.rel = 'noopener noreferrer';
      fallbackLink.click();
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePreviewClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onPreview) {
      onPreview(file);
    } else {
      window.open(file.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleReplaceClick = (e) => {
    e.stopPropagation();
    if (replaceInputRef.current) {
      replaceInputRef.current.value = '';
      replaceInputRef.current.click();
    }
  };

  const handleFileSelected = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && onReplace) {
      onReplace(selectedFile);
    }
  };

  const isPdf = isPdfFile(file);
  const isExcel = isExcelFile(file);

  return (
    <div className="planogram-file-card">
      <div 
        className="planogram-preview-container"
        onClick={handlePreviewClick}
        style={{ cursor: 'pointer' }}
        title="לחצי לצפייה בקובץ מתוך המערכת"
      >
        {isPdf ? (
          <div className="planogram-pdf-preview" aria-label="פלנוגרמה בקובץ PDF">
            <span className="planogram-pdf-icon" aria-hidden="true">PDF</span>
            <span>צפייה והורדה</span>
          </div>
        ) : isExcel ? (
          <div className="planogram-pdf-preview" aria-label="פלנוגרמה בקובץ Excel">
            <span className="planogram-pdf-icon" style={{ backgroundColor: '#107c41' }} aria-hidden="true">XLS</span>
            <span>צפייה והורדה</span>
          </div>
        ) : (
          <img src={file.url} alt={file.name || 'תצוגה מקדימה'} className="planogram-preview-img" />
        )}
      </div>

      <div className="planogram-file-details">
        <span 
          className="planogram-file-name" 
          title={file.name}
          onClick={handlePreviewClick}
          style={{ cursor: 'pointer' }}
        >
          {file.name || 'פלנוגרמה'}
        </span>
        <div className="planogram-file-actions" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button 
            type="button" 
            className="btn btn-secondary planogram-file-btn" 
            onClick={handlePreviewClick}
            title="צפייה בקובץ מתוך המערכת"
          >
            👁️ צפייה
          </button>
          <button 
            type="button" 
            className="btn btn-primary planogram-file-btn" 
            onClick={handleDownload} 
            disabled={isDownloading}
            title="הורדת הקובץ למחשב"
          >
            {isDownloading ? 'מוריד...' : `📥 ${downloadLabel}`}
          </button>
          {onReplace && (
            <>
              <button
                type="button"
                className="btn btn-secondary planogram-file-btn"
                onClick={handleReplaceClick}
                disabled={isReplacing}
                title="החלפת הקובץ בקובץ חדש"
              >
                {isReplacing ? '🔄 מעלה...' : '🔄 החלפה'}
              </button>
              <input
                ref={replaceInputRef}
                type="file"
                style={{ display: 'none' }}
                accept="image/*,.pdf,application/pdf,.xlsx,.xls"
                onChange={handleFileSelected}
              />
            </>
          )}
          {onDelete && (
            <button 
              type="button" 
              className="btn btn-danger planogram-file-btn" 
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="הסרת הקובץ"
            >
              🗑️ {deleteLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

