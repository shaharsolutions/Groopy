import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { extractAllImagesFromExcel, isImageUrl } from '../utils/excelImageExtractor';
import ImagePreviewModal from './ImagePreviewModal';

export default function ExcelPreviewModal({ isOpen, onClose, fileUrl, fileName }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [activeSheet, setActiveSheet] = useState('');
  const [sheetsData, setSheetsData] = useState({}); // sheetName -> 2D array of rows
  const [sheetsImages, setSheetsImages] = useState({}); // sheetName -> { 'r_c': [ { url, name } ] }
  const [unanchoredImages, setUnanchoredImages] = useState([]); // [ { url, name } ]
  const [previewImage, setPreviewImage] = useState({ isOpen: false, url: '', name: '' });
  const viewerContainerRef = useRef(null);

  // Ensure table starts scrolled all the way to Column A on left
  useEffect(() => {
    if (isOpen && !loading && viewerContainerRef.current) {
      viewerContainerRef.current.scrollLeft = 0;
      viewerContainerRef.current.scrollTop = 0;
      const timer = setTimeout(() => {
        if (viewerContainerRef.current) {
          viewerContainerRef.current.scrollLeft = 0;
          viewerContainerRef.current.scrollTop = 0;
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, activeSheet, sheetsData, loading]);

  useEffect(() => {
    if (!isOpen || !fileUrl) return;

    const loadExcelFile = async () => {
      setLoading(true);
      setError(null);
      setSheetsImages({});
      setUnanchoredImages([]);
      try {
        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error('שגיאה בטעינת הקובץ מהשרת');
        }
        const arrayBuffer = await response.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('קובץ האקסל ריק או אינו תקין');
        }

        const dataMap = {};
        workbook.SheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          // Convert sheet to 2D array (header: 1)
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
          dataMap[sheetName] = rows;
        });

        // Extract embedded and linked images from the Excel archive
        let imagesResult = { sheets: {}, unanchored: [] };
        try {
          imagesResult = await extractAllImagesFromExcel(arrayBuffer, workbook);
        } catch (imgErr) {
          console.warn('Failed to extract images from Excel:', imgErr);
        }

        setSheetNames(workbook.SheetNames);
        setActiveSheet(workbook.SheetNames[0]);
        setSheetsData(dataMap);
        setSheetsImages(imagesResult.sheets || {});
        setUnanchoredImages(imagesResult.unanchored || []);
      } catch (err) {
        console.error('Excel Parsing Error:', err);
        setError('לא ניתן להציג את קובץ האקסל. ייתכן שהקובץ פגום או שיש שגיאת תקשורת.');
      } finally {
        setLoading(false);
      }
    };

    loadExcelFile();
  }, [isOpen, fileUrl]);

  if (!isOpen) return null;

  // Function to generate Excel-like column headers (A, B, C ... Z, AA, AB ...)
  const getColHeader = (index) => {
    let temp = index;
    let letter = '';
    while (temp >= 0) {
      letter = String.fromCharCode((temp % 26) + 65) + letter;
      temp = Math.floor(temp / 26) - 1;
    }
    return letter;
  };

  const currentSheetRows = sheetsData[activeSheet] || [];
  const currentImagesMap = sheetsImages[activeSheet] || {};

  // Find the maximum columns and rows in the current sheet, taking images into account
  let maxCols = currentSheetRows.length > 0 
    ? Math.max(...currentSheetRows.map(row => (Array.isArray(row) ? row.length : 0)), 0) 
    : 0;
  let maxRows = currentSheetRows.length;

  Object.keys(currentImagesMap).forEach((key) => {
    const [rStr, cStr] = key.split('_');
    const r = parseInt(rStr, 10);
    const c = parseInt(cStr, 10);
    if (!isNaN(r) && r + 1 > maxRows) maxRows = r + 1;
    if (!isNaN(c) && c + 1 > maxCols) maxCols = c + 1;
  });

  // Calculate total images count in active sheet
  const activeSheetImagesCount = Object.values(currentImagesMap).reduce(
    (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0),
    0
  );

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div 
        className="modal-content" 
        style={{ 
          maxWidth: '92%', 
          width: '1250px', 
          height: '88vh', 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden' 
        }}
      >
        {/* Modal Header */}
        <div className="modal-header" style={{ padding: '16px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.5rem' }}>📊</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 className="modal-title" style={{ margin: 0, fontSize: '1.15rem' }}>
                  תצוגה מקדימה של Excel
                </h3>
                {activeSheetImagesCount > 0 && (
                  <span 
                    style={{ 
                      backgroundColor: '#eff6ff', 
                      color: '#1d4ed8', 
                      border: '1px solid #bfdbfe',
                      padding: '2px 8px', 
                      borderRadius: '12px', 
                      fontSize: '0.75rem', 
                      fontWeight: '600',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    🖼️ {activeSheetImagesCount} תמונות
                  </span>
                )}
              </div>
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
              download={fileName}
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
              title="הורדת קובץ"
            >
              📥 הורדה
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
            padding: '20px', 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            overflow: 'hidden',
            backgroundColor: '#f8fafc'
          }}
        >
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '4px solid #e2e8f0',
                borderTop: '4px solid var(--primary)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <style>{`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}</style>
              <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>
                טוען ומנתח את קובץ האקסל והתמונות...
              </span>
            </div>
          )}

          {error && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '16px', textAlign: 'center', padding: '20px' }}>
              <span style={{ fontSize: '3rem' }}>⚠️</span>
              <div style={{ color: '#ef4444', fontWeight: '600', fontSize: '1rem' }}>{error}</div>
              <a 
                href={fileUrl} 
                download={fileName}
                className="btn btn-primary"
                style={{ textDecoration: 'none' }}
              >
                הורד את הקובץ למחשב
              </a>
            </div>
          )}

          {!loading && !error && (
            <>
              {/* Unanchored / Attached Media Strip (if any) */}
              {unanchoredImages.length > 0 && (
                <div 
                  style={{ 
                    marginBottom: '12px', 
                    padding: '8px 14px', 
                    backgroundColor: '#f0fdf4', 
                    border: '1px solid #bbf7d0', 
                    borderRadius: '8px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px', 
                    overflowX: 'auto' 
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', fontSize: '0.82rem', fontWeight: '600', color: '#166534' }}>
                    <span>📎</span>
                    <span>תמונות מצורפות בקובץ ({unanchoredImages.length}):</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {unanchoredImages.map((img, i) => (
                      <img
                        key={i}
                        src={img.url}
                        alt={img.name || `תמונה ${i + 1}`}
                        title={`${img.name || 'תמונה'} (לחץ להגדלה)`}
                        onClick={() => setPreviewImage({ isOpen: true, url: img.url, name: img.name || `תמונה ${i + 1}` })}
                        style={{
                          height: '38px',
                          maxWidth: '65px',
                          objectFit: 'contain',
                          borderRadius: '4px',
                          border: '1px solid #86efac',
                          cursor: 'zoom-in',
                          backgroundColor: '#ffffff'
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Sheet Tabs */}
              {sheetNames.length > 1 && (
                <div className="excel-sheets-tabs">
                  {sheetNames.map((name) => {
                    const sheetImgs = sheetsImages[name] || {};
                    const imgCount = Object.values(sheetImgs).reduce((s, a) => s + (Array.isArray(a) ? a.length : 0), 0);
                    return (
                      <button
                        key={name}
                        className={`excel-sheet-tab ${activeSheet === name ? 'active' : ''}`}
                        onClick={() => setActiveSheet(name)}
                      >
                        {name} {imgCount > 0 && `(${imgCount} 🖼️)`}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Excel Table Viewport */}
              <div 
                ref={viewerContainerRef}
                className="excel-viewer-container" 
                dir="ltr"
                style={{ 
                  flex: 1,
                  direction: 'ltr',
                  textAlign: 'left'
                }}
              >
                {maxRows === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                    גיליון זה ריק מנתונים
                  </div>
                ) : (
                  <table className="excel-table">
                    <thead>
                      <tr>
                        <th className="excel-corner-header" style={{ minWidth: '42px', width: '42px', textAlign: 'center' }}></th>
                        {Array.from({ length: maxCols }).map((_, i) => (
                          <th 
                            key={i} 
                            style={{ 
                              minWidth: i === 0 ? '140px' : '100px',
                              textAlign: 'center' 
                            }}
                          >
                            {getColHeader(i)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: maxRows }).map((_, rIdx) => {
                        const existingRow = currentSheetRows[rIdx] || [];
                        const paddedRow = Array.from({ length: maxCols }).map((__, cIdx) => 
                          existingRow[cIdx] !== undefined ? existingRow[cIdx] : ''
                        );

                        return (
                          <tr key={rIdx}>
                            <td className="excel-row-num">{rIdx + 1}</td>
                            {paddedRow.map((cell, cIdx) => {
                              const cellKey = `${rIdx}_${cIdx}`;
                              const cellImgs = currentImagesMap[cellKey] || [];
                              const rawCellVal = cell !== null && cell !== undefined ? cell.toString() : '';

                              // Check if cell has inline image URL that wasn't already in cellImgs
                              const isRawUrl = isImageUrl(rawCellVal);
                              const hasImages = cellImgs.length > 0 || isRawUrl;

                              // Check if raw value is a formula or internal ID (hide raw formula text if image is shown)
                              const isFormulaOrId = /^\s*=?\s*IMAGE\s*\(/i.test(rawCellVal) || 
                                /^\s*=?\s*DISPIMG\s*\(/i.test(rawCellVal) ||
                                /^ID_[A-F0-9_]+/i.test(rawCellVal) ||
                                isRawUrl;

                              const displayText = hasImages && isFormulaOrId ? '' : rawCellVal;

                              return (
                                <td 
                                  key={cIdx} 
                                  className="excel-cell" 
                                  style={{
                                    verticalAlign: hasImages ? 'middle' : 'top',
                                    padding: hasImages ? '6px 8px' : undefined
                                  }}
                                  title={rawCellVal}
                                >
                                  {hasImages ? (
                                    <div 
                                      style={{ 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        alignItems: 'center', 
                                        justifyContent: 'center',
                                        gap: '6px' 
                                      }}
                                    >
                                      {/* Render images from map */}
                                      {cellImgs.map((img, i) => (
                                        <div
                                          key={i}
                                          style={{
                                            position: 'relative',
                                            cursor: 'zoom-in',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                          }}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setPreviewImage({
                                              isOpen: true,
                                              url: img.url,
                                              name: img.name || `תמונה (שורה ${rIdx + 1}, עמודה ${getColHeader(cIdx)})`
                                            });
                                          }}
                                          title={`${img.name || 'תמונה'} (לחץ להגדלה)`}
                                        >
                                          <img
                                            src={img.url}
                                            alt={img.name || 'תמונה'}
                                            style={{
                                              maxHeight: '70px',
                                              maxWidth: '120px',
                                              objectFit: 'contain',
                                              borderRadius: '4px',
                                              border: '1px solid #cbd5e1',
                                              boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                                              backgroundColor: '#ffffff',
                                              display: 'block',
                                              transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                                            }}
                                            onMouseEnter={(e) => {
                                              e.currentTarget.style.transform = 'scale(1.05)';
                                              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                                            }}
                                            onMouseLeave={(e) => {
                                              e.currentTarget.style.transform = 'scale(1)';
                                              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12)';
                                            }}
                                          />
                                          <span
                                            style={{
                                              position: 'absolute',
                                              bottom: '2px',
                                              right: '2px',
                                              backgroundColor: 'rgba(0,0,0,0.65)',
                                              color: '#ffffff',
                                              fontSize: '0.62rem',
                                              padding: '1px 3px',
                                              borderRadius: '3px',
                                              lineHeight: 1,
                                              pointerEvents: 'none'
                                            }}
                                          >
                                            🔍
                                          </span>
                                        </div>
                                      ))}

                                      {/* If cell is direct image URL not caught in cellImgs */}
                                      {cellImgs.length === 0 && isRawUrl && (
                                        <div
                                          style={{
                                            position: 'relative',
                                            cursor: 'zoom-in',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                          }}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setPreviewImage({
                                              isOpen: true,
                                              url: rawCellVal,
                                              name: `תמונה (שורה ${rIdx + 1}, עמודה ${getColHeader(cIdx)})`
                                            });
                                          }}
                                          title="תמונה מקושרת (לחץ להגדלה)"
                                        >
                                          <img
                                            src={rawCellVal}
                                            alt="תמונה"
                                            style={{
                                              maxHeight: '70px',
                                              maxWidth: '120px',
                                              objectFit: 'contain',
                                              borderRadius: '4px',
                                              border: '1px solid #cbd5e1',
                                              boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                                              backgroundColor: '#ffffff',
                                              display: 'block'
                                            }}
                                            onError={(e) => {
                                              e.currentTarget.style.display = 'none';
                                            }}
                                          />
                                        </div>
                                      )}

                                      {/* Associated Text (if any) */}
                                      {displayText && (
                                        <span style={{ fontSize: '0.8rem', color: '#1e293b', textAlign: 'center' }}>
                                          {displayText}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    rawCellVal
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Status footer with rows count & images count */}
              <div 
                style={{ 
                  marginTop: '8px', 
                  fontSize: '0.8rem', 
                  color: 'var(--text-muted)', 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span>סה"כ שורות: {maxRows} | סה"כ עמודות: {maxCols}</span>
                  {activeSheetImagesCount > 0 && (
                    <span style={{ color: '#2563eb', fontWeight: '500' }}>
                      🖼️ {activeSheetImagesCount} תמונות מוצגות בתאי הגיליון
                    </span>
                  )}
                </div>
                {sheetNames.length > 1 && (
                  <span>גיליון פעיל: {activeSheet} ({sheetNames.indexOf(activeSheet) + 1} מתוך {sheetNames.length})</span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Full-size Image Preview Modal on click */}
      {previewImage.isOpen && (
        <ImagePreviewModal
          isOpen={previewImage.isOpen}
          onClose={() => setPreviewImage({ isOpen: false, url: '', name: '' })}
          fileUrl={previewImage.url}
          fileName={previewImage.name}
        />
      )}
    </div>
  );
}
