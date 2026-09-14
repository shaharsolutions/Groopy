import { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure the worker for pdfjs
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

// In-memory cache for rendered thumbnails to avoid re-rendering
const thumbnailCache = new Map();

export default function PdfThumbnail({ url, name, fallback }) {
  const [thumbnail, setThumbnail] = useState(() => (url ? thumbnailCache.get(url) : null));
  const [loading, setLoading] = useState(() => (url ? !thumbnailCache.has(url) : false));
  const [error, setError] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    if (!url) {
      setThumbnail(null);
      setLoading(false);
      return;
    }

    if (thumbnailCache.has(url)) {
      setThumbnail(thumbnailCache.get(url));
      setLoading(false);
      setError(false);
      return;
    }

    let cancel = false;
    setLoading(true);
    setError(false);

    const renderPage = async () => {
      try {
        let loadingTask;
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`HTTP error ${response.status}`);
          const data = await response.arrayBuffer();
          if (cancel) return;
          loadingTask = pdfjsLib.getDocument({ data });
        } catch {
          if (cancel) return;
          loadingTask = pdfjsLib.getDocument({ url });
        }

        const pdfDoc = await loadingTask.promise;
        if (cancel) return;

        const page = await pdfDoc.getPage(1);
        if (cancel) return;

        const unscaledViewport = page.getViewport({ scale: 1 });
        const targetWidth = 400; // crisp resolution for thumbnail
        const scale = Math.max(1, targetWidth / unscaledViewport.width);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext('2d');

        await page.render({ canvasContext: context, viewport }).promise;

        if (cancel) return;

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        thumbnailCache.set(url, dataUrl);

        if (isMountedRef.current) {
          setThumbnail(dataUrl);
          setLoading(false);
        }
      } catch (err) {
        console.warn('Failed to render PDF thumbnail, falling back to icon:', err);
        if (isMountedRef.current) {
          setError(true);
          setLoading(false);
        }
      }
    };

    renderPage();

    return () => {
      cancel = true;
      isMountedRef.current = false;
    };
  }, [url]);

  if (error || (!thumbnail && !loading)) {
    return fallback || null;
  }

  if (loading && !thumbnail) {
    return (
      <div 
        style={{ 
          width: '100%', 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: '8px', 
          backgroundColor: '#f8fafc', 
          color: 'var(--text-muted, #64748b)', 
          fontSize: '0.78rem' 
        }}
      >
        <span className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} />
        <span>טוען תצוגה מקדימה...</span>
      </div>
    );
  }

  return (
    <div 
      className="pdf-thumbnail-container" 
      style={{ 
        position: 'relative', 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        overflow: 'hidden', 
        backgroundColor: '#ffffff' 
      }}
    >
      <img 
        src={thumbnail} 
        alt={name || 'תצוגה מקדימה של פלנוגרמה'} 
        className="planogram-preview-img" 
        style={{ 
          width: '100%', 
          height: '100%', 
          objectFit: 'contain' 
        }} 
      />
      <span 
        style={{ 
          position: 'absolute', 
          bottom: '6px', 
          right: '6px', 
          backgroundColor: '#ef4444', 
          color: '#ffffff', 
          fontSize: '0.65rem', 
          fontWeight: '700', 
          padding: '2px 6px', 
          borderRadius: '4px', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.25)', 
          pointerEvents: 'none' 
        }}
      >
        PDF
      </span>
    </div>
  );
}
