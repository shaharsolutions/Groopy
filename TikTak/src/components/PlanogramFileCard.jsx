import { useState } from 'react';

const isPdfFile = (file) => /\.pdf$/i.test(file?.name || '');

export default function PlanogramFileCard({ file, onDelete = null, deleteLabel = 'מחיקה' }) {
  const [isDownloading, setIsDownloading] = useState(false);

  if (!file) return null;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(file.url);
      if (!response.ok) throw new Error(`Download failed with status ${response.status}`);
      const blobUrl = URL.createObjectURL(await response.blob());
      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      downloadLink.download = file.name || 'planogram';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Failed to download planogram', error);
      const fallbackLink = document.createElement('a');
      fallbackLink.href = file.url;
      fallbackLink.download = file.name || 'planogram';
      fallbackLink.target = '_blank';
      fallbackLink.rel = 'noopener noreferrer';
      fallbackLink.click();
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="planogram-file-card">
      <div className="planogram-preview-container">
        {isPdfFile(file) ? (
          <div className="planogram-pdf-preview" aria-label="פלנוגרמה בקובץ PDF">
            <span className="planogram-pdf-icon" aria-hidden="true">PDF</span>
            <span>פלנוגרמה לצפייה והורדה</span>
          </div>
        ) : (
          <img src={file.url} alt="תצוגה מקדימה של הפלנוגרמה" className="planogram-preview-img" />
        )}
      </div>

      <div className="planogram-file-details">
        <span className="planogram-file-name" title={file.name}>{file.name || 'פלנוגרמה'}</span>
        <div className="planogram-file-actions">
          <a href={file.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary planogram-file-btn">
            צפייה
          </a>
          <button type="button" className="btn btn-primary planogram-file-btn" onClick={handleDownload} disabled={isDownloading}>
            {isDownloading ? 'מוריד...' : 'הורדת פלנוגרמה'}
          </button>
          {onDelete && (
            <button type="button" className="btn btn-danger planogram-file-btn" onClick={onDelete}>
              {deleteLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
