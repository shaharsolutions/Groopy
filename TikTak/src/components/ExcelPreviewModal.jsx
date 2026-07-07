import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

export default function ExcelPreviewModal({ isOpen, onClose, fileUrl, fileName }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [activeSheet, setActiveSheet] = useState('');
  const [sheetsData, setSheetsData] = useState({}); // sheetName -> 2D array of rows

  useEffect(() => {
    if (!isOpen || !fileUrl) return;

    const loadExcelFile = async () => {
      setLoading(true);
      setError(null);
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

        setSheetNames(workbook.SheetNames);
        setActiveSheet(workbook.SheetNames[0]);
        setSheetsData(dataMap);
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
  
  // Find the maximum columns in the current sheet to align rows
  const maxCols = currentSheetRows.length > 0 
    ? Math.max(...currentSheetRows.map(row => row.length), 0) 
    : 0;

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div 
        className="modal-content" 
        style={{ 
          maxWidth: '90%', 
          width: '1200px', 
          height: '85vh', 
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
              <h3 className="modal-title" style={{ margin: 0, fontSize: '1.15rem' }}>
                תצוגה מקדימה של Excel
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
              <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>טוען ומנתח את קובץ האקסל...</span>
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
              {/* Sheet Tabs */}
              {sheetNames.length > 1 && (
                <div className="excel-sheets-tabs">
                  {sheetNames.map((name) => (
                    <button
                      key={name}
                      className={`excel-sheet-tab ${activeSheet === name ? 'active' : ''}`}
                      onClick={() => setActiveSheet(name)}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}

              {/* Excel Table Viewport */}
              <div className="excel-viewer-container" style={{ flex: 1 }}>
                {currentSheetRows.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                    גיליון זה ריק מנתונים
                  </div>
                ) : (
                  <table className="excel-table">
                    <thead>
                      <tr>
                        <th className="excel-corner-header" style={{ minWidth: '40px' }}></th>
                        {Array.from({ length: maxCols }).map((_, i) => (
                          <th key={i} style={{ minWidth: '100px' }}>{getColHeader(i)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {currentSheetRows.map((row, rIdx) => {
                        // Pad row items to match maxCols
                        const paddedRow = Array.from({ length: maxCols }).map((_, i) => 
                          row[i] !== undefined ? row[i] : ''
                        );
                        return (
                          <tr key={rIdx}>
                            <td className="excel-row-num">{rIdx + 1}</td>
                            {paddedRow.map((cell, cIdx) => (
                              <td 
                                key={cIdx} 
                                className="excel-cell" 
                                title={cell !== null && cell !== undefined ? cell.toString() : ''}
                              >
                                {cell !== null && cell !== undefined ? cell.toString() : ''}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Status footer with rows count */}
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
                <span>סה"כ שורות: {currentSheetRows.length} | סה"כ עמודות: {maxCols}</span>
                {sheetNames.length > 1 && <span>גיליון פעיל: {activeSheet} ({sheetNames.indexOf(activeSheet) + 1} מתוך {sheetNames.length})</span>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
