import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';

// In-memory cache for parsed Excel preview data
const excelThumbnailCache = new Map();

// Helper to generate column header letters: A, B, C...
const getColLetter = (index) => {
  let temp = index;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
};

export default function ExcelThumbnail({ url, name, fallback }) {
  const [sheetData, setSheetData] = useState(() => (url ? excelThumbnailCache.get(url) : null));
  const [loading, setLoading] = useState(() => (url ? !excelThumbnailCache.has(url) : false));
  const [error, setError] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    if (!url) {
      setSheetData(null);
      setLoading(false);
      return;
    }

    if (excelThumbnailCache.has(url)) {
      setSheetData(excelThumbnailCache.get(url));
      setLoading(false);
      setError(false);
      return;
    }

    let cancel = false;
    setLoading(true);
    setError(false);

    const loadExcel = async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        if (cancel) return;

        const data = new Uint8Array(arrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('No sheets found');
        }

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Grab top 6 rows
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }).slice(0, 6);
        
        // Normalize rows to have consistent column count (at least 4 columns, up to 5)
        let maxCols = 4;
        rawRows.forEach(r => {
          if (Array.isArray(r) && r.length > maxCols) {
            maxCols = Math.min(r.length, 5);
          }
        });

        const rows = rawRows.map(row => {
          const r = Array.isArray(row) ? [...row] : [];
          while (r.length < maxCols) r.push('');
          return r.slice(0, maxCols);
        });

        // Ensure at least 4 rows for aesthetic preview
        while (rows.length < 4) {
          rows.push(new Array(maxCols).fill(''));
        }

        const previewInfo = { rows, colCount: maxCols, sheetName: firstSheetName };
        excelThumbnailCache.set(url, previewInfo);

        if (isMountedRef.current) {
          setSheetData(previewInfo);
          setLoading(false);
        }
      } catch (err) {
        console.warn('Failed to parse Excel thumbnail:', err);
        if (isMountedRef.current) {
          setError(true);
          setLoading(false);
        }
      }
    };

    loadExcel();

    return () => {
      cancel = true;
      isMountedRef.current = false;
    };
  }, [url]);

  if (error || (!sheetData && !loading)) {
    return fallback || null;
  }

  if (loading && !sheetData) {
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
        <span>טוען גיליון...</span>
      </div>
    );
  }

  const { rows, colCount } = sheetData;

  return (
    <div 
      className="excel-thumbnail-container" 
      style={{ 
        position: 'relative', 
        width: '100%', 
        height: '100%', 
        overflow: 'hidden', 
        backgroundColor: '#ffffff',
        padding: '4px',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
        pointerEvents: 'none'
      }}
      title={name || 'תצוגה מקדימה של אקסל'}
    >
      <div 
        style={{ 
          width: '100%', 
          height: '100%', 
          border: '1px solid #cbd5e1', 
          borderRadius: '4px', 
          overflow: 'hidden',
          backgroundColor: '#fff',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header row (A, B, C...) */}
        <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1', fontSize: '0.62rem', fontWeight: '700', color: '#64748b' }}>
          <div style={{ width: '22px', borderLeft: '1px solid #cbd5e1', textAlign: 'center', padding: '1px 0', backgroundColor: '#e2e8f0' }}>#</div>
          {Array.from({ length: colCount }).map((_, colIdx) => (
            <div 
              key={colIdx} 
              style={{ 
                flex: 1, 
                borderLeft: colIdx < colCount - 1 ? '1px solid #cbd5e1' : 'none', 
                textAlign: 'center', 
                padding: '1px 2px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {getColLetter(colIdx)}
            </div>
          ))}
        </div>

        {/* Rows */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {rows.map((row, rowIdx) => (
            <div 
              key={rowIdx} 
              style={{ 
                display: 'flex', 
                flex: 1, 
                borderBottom: rowIdx < rows.length - 1 ? '1px solid #e2e8f0' : 'none',
                fontSize: '0.62rem',
                backgroundColor: rowIdx % 2 === 0 ? '#ffffff' : '#fafafa'
              }}
            >
              <div 
                style={{ 
                  width: '22px', 
                  borderLeft: '1px solid #cbd5e1', 
                  backgroundColor: '#f8fafc', 
                  textAlign: 'center', 
                  color: '#94a3b8', 
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.58rem'
                }}
              >
                {rowIdx + 1}
              </div>
              {row.map((cellVal, colIdx) => {
                const strVal = cellVal !== null && cellVal !== undefined ? String(cellVal) : '';
                const isImgCell = /^\s*=?\s*(?:IMAGE|DISPIMG)\s*\(/i.test(strVal) ||
                  /^https?:\/\/.+\.(?:png|jpe?g|gif|webp|svg|bmp)(?:\?.*)?$/i.test(strVal) ||
                  /^https?:\/\/firebasestorage\.googleapis\.com\/.*$/i.test(strVal);

                return (
                  <div 
                    key={colIdx} 
                    style={{ 
                      flex: 1, 
                      borderLeft: colIdx < colCount - 1 ? '1px solid #e2e8f0' : 'none', 
                      padding: '2px 4px', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      whiteSpace: 'nowrap', 
                      color: isImgCell ? '#2563eb' : '#1e293b', 
                      display: 'flex', 
                      alignItems: 'center', 
                      fontWeight: rowIdx === 0 ? '600' : '400',
                      fontSize: isImgCell ? '0.55rem' : undefined
                    }}
                  >
                    {isImgCell ? '🖼️ תמונה' : strVal}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Pill Badge for XLS */}
      <span 
        style={{ 
          position: 'absolute', 
          bottom: '8px', 
          right: '8px', 
          backgroundColor: '#107c41', 
          color: '#ffffff', 
          fontSize: '0.65rem', 
          fontWeight: '700', 
          padding: '2px 6px', 
          borderRadius: '4px', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.25)', 
          pointerEvents: 'none',
          zIndex: 2
        }}
      >
        XLS
      </span>
    </div>
  );
}
