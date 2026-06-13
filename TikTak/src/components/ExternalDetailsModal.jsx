import React, { useState, useEffect } from 'react';
import { getCommentsForTask, addComment, deleteComment, uploadFileToStorage } from '../utils/storage';
import ExcelPreviewModal from './ExcelPreviewModal';
import PdfPreviewModal from './PdfPreviewModal';

export default function ExternalDetailsModal({ task, settings, onClose, isSingleProjectView = false }) {
  const {
    statusColors: STATUS_CLASSES = {},
    suppliers: SUPPLIERS = [],
    contacts: CONTACTS = []
  } = settings || {};
  const [comments, setComments] = useState([]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState(null);
  const [activeInfoCard, setActiveInfoCard] = useState(null);

  const handleOpenSupplierCard = (supplierName) => {
    if (!supplierName) return;
    const sup = SUPPLIERS.find(s => (typeof s === 'string' ? s : s.name) === supplierName);
    const supObj = typeof sup === 'string' ? { name: sup } : (sup || { name: supplierName });
    setActiveInfoCard({
      type: 'supplier',
      title: `📇 כרטיס ספק: ${supObj.name}`,
      fields: [
        { label: 'שם הספק', value: supObj.name },
        { label: 'איש קשר אצל הספק', value: supObj.contactPerson },
        { label: 'טלפון', value: supObj.phone, isLtr: true, type: 'phone' },
        { label: 'אימייל', value: supObj.email, isLtr: true, type: 'email' },
        { label: 'כתובת', value: supObj.address },
        { label: 'WeChat / WhatsApp', value: supObj.wechat, isLtr: true, type: 'whatsapp' },
        { label: 'הערות ומידע נוסף', value: supObj.notes, isMultiline: true }
      ]
    });
  };

  const handleOpenContactCard = (contactName) => {
    if (!contactName) return;
    const contact = CONTACTS.find(c => c.name === contactName);
    const contactObj = contact || { name: contactName };
    setActiveInfoCard({
      type: 'contact',
      title: `📇 כרטיס איש קשר: ${contactObj.name}`,
      fields: [
        { label: 'שם מלא', value: contactObj.name },
        { label: 'תפקיד', value: contactObj.role },
        { label: 'טלפון', value: contactObj.phone, isLtr: true, type: 'phone' },
        { label: 'אימייל', value: contactObj.email, isLtr: true, type: 'email' },
        { label: 'כתובת', value: contactObj.address },
        { label: 'WeChat / WhatsApp', value: contactObj.wechat, isLtr: true, type: 'whatsapp' },
        { label: 'הערות ומידע נוסף', value: contactObj.notes, isMultiline: true }
      ]
    });
  };

  // Close modal or cancel actions on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (commentToDelete) {
          setCommentToDelete(null);
        } else if (!isSingleProjectView) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [commentToDelete, isSingleProjectView, onClose]);

  const handleCopyTaskLink = () => {
    if (!task) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?mode=viewer&taskId=${task.id}`;
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      })
      .catch(err => {
        console.error("Failed to copy link", err);
      });
  };

  const [authorName, setAuthorName] = useState(() => {
    return localStorage.getItem('tiktak_comment_author') || '';
  });
  const [commentText, setCommentText] = useState('');
  const [commentError, setCommentError] = useState('');

  const [attachedFile, setAttachedFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgressFile, setUploadProgressFile] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [excelPreviewFile, setExcelPreviewFile] = useState(null);
  const [pdfPreviewFile, setPdfPreviewFile] = useState(null);

  const handleCommentFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const MAX_SIZE = 3 * 1024 * 1024; // 3MB limit
    if (file.size > MAX_SIZE) {
      setUploadError('גודל הקובץ עולה על המותר (מקסימום 3MB)');
      setAttachedFile(null);
      e.target.value = '';
      return;
    }

    setUploadingFile(true);
    setUploadProgressFile(0);
    setUploadError('');
    try {
      const result = await uploadFileToStorage(file, 'comments', (progress) => {
        setUploadProgressFile(progress);
      });
      setAttachedFile(result);
      e.target.value = '';
    } catch (err) {
      console.error(err);
      setUploadError('שגיאה בהעלאת הקובץ. אנא ודא ש-Storage פעיל.');
    } finally {
      setUploadingFile(false);
    }
  };

  useEffect(() => {
    if (task) {
      const loadComments = async () => {
        const fetchedComments = await getCommentsForTask(task.id);
        setComments(fetchedComments);
      };
      loadComments();
      setCommentText('');
      setCommentError('');
    }
  }, [task]);

  if (!task) return null;

  const handleDeleteComment = (commentId) => {
    setCommentToDelete(commentId);
  };

  const confirmDeleteComment = async () => {
    if (!commentToDelete) return;
    try {
      await deleteComment(commentToDelete, task.id);
      const fetchedComments = await getCommentsForTask(task.id);
      setComments(fetchedComments);
      setCommentToDelete(null);
    } catch (err) {
      console.error("Failed to delete comment", err);
      alert('שגיאה במחיקת ההערה');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    setCommentError('');

    const finalAuthorName = authorName.trim() || 'משתמש חיצוני';
    if (!commentText.trim()) {
      setCommentError('נא לכתוב את תוכן ההערה');
      return;
    }

    await addComment(
      task.id, 
      finalAuthorName, 
      commentText, 
      attachedFile ? attachedFile.url : null, 
      attachedFile ? attachedFile.name : null
    );
    if (authorName.trim()) {
      localStorage.setItem('tiktak_comment_author', authorName.trim());
    } else {
      localStorage.removeItem('tiktak_comment_author');
    }
    setCommentText('');
    setAttachedFile(null);
    const fetchedComments = await getCommentsForTask(task.id);
    setComments(fetchedComments); // Reload comments
  };

  const formatDate = (isoString) => {
    if (!isoString) return '-';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('he-IL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div className="modal-overlay" onClick={isSingleProjectView ? null : onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">{task.title}</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '16px' }}>
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={handleCopyTaskLink}
              style={{ 
                fontSize: '0.85rem', 
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap',
                backgroundColor: '#e6f7ed', 
                color: '#1e4620', 
                borderColor: '#1e4620',
                fontWeight: '600'
              }}
              title="העתק קישור שיתוף ישיר לפרויקט זה"
            >
              {copiedLink ? '✔️ הועתק!' : '🔗 העתקת קישור לשיתוף'}
            </button>
            {!isSingleProjectView && <button className="modal-close" onClick={onClose} style={{ marginRight: 0 }}>&times;</button>}
          </div>
        </div>

        <div className="modal-body" style={{ maxHeight: 'calc(90vh - 120px)', overflowY: 'auto' }}>
          <div className="details-grid">
            
            {/* Main Content Area (Left Column) */}
            <div className="details-main">
              
              {/* AREA 1: פרטי עבודה */}
              <div className="details-section-card">
                <h4 className="detail-section-title">📁 פרטי עבודה</h4>
                
                {/* Description */}
                <div style={{ marginBottom: '16px' }}>
                  <label className="form-label" style={{ fontWeight: '700', marginBottom: '6px', display: 'block', fontSize: '0.85rem' }}>תיאור העבודה</label>
                  {task.description ? (
                    <div className="description-box" style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: '6px', minHeight: '60px', backgroundColor: '#fdfdfd' }}>
                      {task.description}
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>אין תיאור מפורט לעבודה זו.</p>
                  )}
                </div>

                {/* Drive Link */}
                <div>
                  <label className="form-label" style={{ fontWeight: '700', marginBottom: '6px', display: 'block', fontSize: '0.85rem' }}>קישור לתיקיית דרייב</label>
                  {task.driveLink ? (
                    <a href={task.driveLink} target="_blank" rel="noopener noreferrer" className="drive-link" style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                      🔗 מעבר לדרייב
                    </a>
                  ) : (
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>לא צורף קישור</span>
                  )}
                </div>
              </div>

              {/* AREA 4: הזמנת עבודה ופלנוגרמה */}
              <div className="details-section-card">
                <h4 className="detail-section-title">📋 הזמנת עבודה ופלנוגרמה</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  
                  {/* הזמנת עבודה */}
                  <div>
                    <label className="form-label" style={{ fontWeight: '700', marginBottom: '8px', display: 'block', fontSize: '0.85rem' }}>
                      הזמנת עבודה (קבצים מצורפים)
                    </label>
                    
                    {(() => {
                      const filesList = task.workOrderFiles || task.attachments || [];
                      return filesList.length > 0 ? (
                        <div className="attachments-list" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                          {filesList.map((file, idx) => {
                            const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
                            const isExcel = /\.(xlsx|xls)$/i.test(file.name);
                            const isPdf = /\.pdf$/i.test(file.name);
                            return (
                              <div key={idx} style={{ padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                                <a 
                                  href={file.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="attachment-info"
                                  style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                  title={file.name}
                                  onClick={(e) => {
                                    if (isExcel) {
                                      e.preventDefault();
                                      setExcelPreviewFile({ url: file.url, name: file.name });
                                    } else if (isPdf) {
                                      e.preventDefault();
                                      setPdfPreviewFile({ url: file.url, name: file.name });
                                    }
                                  }}
                                >
                                  <span className="attachment-icon">{isImage ? '🖼️ ' : isExcel ? '📊 ' : isPdf ? '📄 ' : '📎 '}</span>
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', direction: 'ltr', textAlign: 'right' }}>
                                    {file.name}
                                  </span>
                                </a>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                          אין קבצים מצורפים
                        </div>
                      );
                    })()}
                  </div>

                  {/* פלנוגרמה */}
                  <div>
                    <label className="form-label" style={{ fontWeight: '700', marginBottom: '8px', display: 'block', fontSize: '0.85rem' }}>
                      פלנוגרמה
                    </label>
                    
                    {task.planogramFile ? (
                      <div className="planogram-preview-container" style={{ height: '140px', margin: 0 }}>
                        <img src={task.planogramFile.url} alt="פלנוגרמה" className="planogram-preview-img" />
                        <div className="planogram-actions-overlay">
                          <span style={{ color: 'white', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                            {task.planogramFile.name}
                          </span>
                          <a href={task.planogramFile.url} target="_blank" rel="noopener noreferrer" className="planogram-action-btn">
                            👁️ צפייה
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="planogram-preview-container" 
                        style={{ height: '140px', margin: 0, borderStyle: 'dashed' }}
                      >
                        <span className="planogram-empty-text">לא הועלתה פלנוגרמה</span>
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* AREA 5: הערות ועדכוני עבודה */}
              <div className="comments-section">
                <h4 className="detail-section-title">💬 הערות ועדכוני עבודה ({comments.length})</h4>
                
                {comments.length === 0 ? (
                  <div className="empty-state" style={{ padding: '24px' }}>
                    <div className="empty-state-title">אין הערות עדיין</div>
                    <div className="empty-state-text font-size-sm">היה הראשון להוסיף הערה או לעדכן לגבי התקדמות העבודה.</div>
                  </div>
                ) : (
                  <div className="comments-list" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                    {comments.map(c => {
                      const isImage = c.attachmentName && /\.(jpg|jpeg|png|gif|webp)$/i.test(c.attachmentName);
                      const isExcel = c.attachmentName && /\.(xlsx|xls)$/i.test(c.attachmentName);
                      const isPdf = c.attachmentName && /\.pdf$/i.test(c.attachmentName);
                      return (
                        <div key={c.id} className="comment-item">
                          <div className="comment-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <span className="comment-author">{c.authorName}</span>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatDate(c.createdAt)}</span>
                            </div>
                            <button 
                              type="button"
                              onClick={() => handleDeleteComment(c.id)}
                              title="מחיקת הערה"
                              style={{ 
                                background: 'none', 
                                border: 'none', 
                                cursor: 'pointer', 
                                padding: '2px 6px',
                                fontSize: '1rem',
                                color: 'var(--priority-urgent-text)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '4px',
                                transition: 'background-color 0.2s'
                              }}
                            >
                              🗑️
                            </button>
                          </div>
                          <div className="comment-text" style={{ whiteSpace: 'pre-wrap' }}>{c.text}</div>
                          {c.attachmentUrl && (
                            <div style={{ marginTop: '8px' }}>
                              {isImage && (
                                <a href={c.attachmentUrl} target="_blank" rel="noopener noreferrer">
                                  <img 
                                    src={c.attachmentUrl} 
                                    alt={c.attachmentName} 
                                    className="comment-image-preview" 
                                  />
                                </a>
                              )}
                              <div>
                                <a 
                                  href={c.attachmentUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="comment-attachment-link"
                                  onClick={(e) => {
                                    if (isExcel) {
                                      e.preventDefault();
                                      setExcelPreviewFile({ url: c.attachmentUrl, name: c.attachmentName });
                                    } else if (isPdf) {
                                      e.preventDefault();
                                      setPdfPreviewFile({ url: c.attachmentUrl, name: c.attachmentName });
                                    }
                                  }}
                                >
                                  {isExcel ? '📊' : isPdf ? '📄' : '📎'} {c.attachmentName || 'קובץ מצורף'}
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add Comment Form */}
                <form onSubmit={handleAddComment} className="comment-form">
                  <h5 style={{ fontWeight: '600' }}>הוספת הערה / עדכון חדש</h5>
                  
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">השם שלך (אופציונלי)</label>
                    <input 
                      type="text"
                      className="form-control"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder="לדוגמה: יוסי (דפוס בארץ) / Mr. Wong (ספק סין)"
                    />
                  </div>
                  
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">תוכן ההערה *</label>
                    <textarea 
                      className="form-control"
                      rows="3"
                      value={commentText}
                      onChange={(e) => {
                        setCommentText(e.target.value);
                        if (commentError) setCommentError('');
                      }}
                      placeholder="כתבו כאן את השאלות, העדכונים או הערות לגבי העיצוב..."
                    />
                  </div>
                  
                  {/* File Attachment Input */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">
                      צירוף קובץ (Excel, תמונה וכו')
                    </label>
                    {attachedFile ? (
                      <div className="comment-attachment-preview-chip">
                        <span>📎 {attachedFile.name}</span>
                        <button type="button" onClick={() => setAttachedFile(null)} title="הסר קובץ">&times;</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                        <button 
                          type="button" 
                          className="comment-attachment-btn"
                          onClick={() => document.getElementById('comment-file-input-external').click()}
                          disabled={uploadingFile}
                        >
                          {uploadingFile ? `🔄 מעלה (${uploadProgressFile}%)` : '📎 בחירת קובץ'}
                        </button>
                        {!uploadingFile && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #718096)' }}>(עד 3MB)</span>
                        )}
                        {uploadingFile && (
                          <div style={{ 
                            flexGrow: 1, 
                            height: '6px', 
                            backgroundColor: 'var(--border-color, #e2e8f0)', 
                            borderRadius: '3px', 
                            overflow: 'hidden',
                            maxWidth: '120px'
                          }}>
                            <div style={{ 
                              width: `${uploadProgressFile}%`, 
                              height: '100%', 
                              backgroundColor: 'var(--primary)', 
                              transition: 'width 0.2s ease-in-out' 
                            }} />
                          </div>
                        )}
                        <input 
                          type="file" 
                          id="comment-file-input-external"
                          style={{ display: 'none' }}
                          onChange={handleCommentFileChange}
                        />
                        {uploadError && <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>{uploadError}</span>}
                      </div>
                    )}
                  </div>
                  
                  {commentError && <span className="form-error">{commentError}</span>}
                  
                  <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={uploadingFile}>
                    הוסף הערה 
                  </button>
                </form>
              </div>

            </div>

            {/* Sidebar View Area (Right Column) */}
            <div className="details-sidebar">

              {/* AREA 2: ספק ואיש קשר */}
              <div className="details-section-card" style={{ marginBottom: '16px' }}>
                <h4 className="detail-section-title" style={{ fontSize: '0.9rem', marginBottom: '12px' }}>🏭 ספק ואיש קשר</h4>

                {/* Supplier Contact Name */}
                <div className="sidebar-row">
                  <span className="sidebar-label">איש קשר ספק</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="sidebar-value">{(task.supplierContactName || task.contactPerson) || '-'}</span>
                    {(task.supplierContactName || task.contactPerson) && (
                      <button 
                        type="button" 
                        className="btn btn-secondary btn-icon" 
                        style={{ padding: '2px 4px', fontSize: '0.75rem', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="פרטי כרטיס איש קשר"
                        onClick={() => handleOpenContactCard(task.supplierContactName || task.contactPerson)}
                      >
                        ℹ️
                      </button>
                    )}
                  </div>
                </div>

                {/* Supplier Contact Email */}
                <div className="sidebar-row">
                  <span className="sidebar-label">מייל איש קשר ספק</span>
                  {task.supplierContactEmail ? (
                    <a href={`mailto:${task.supplierContactEmail}`} className="sidebar-value direction-ltr text-left" style={{ color: 'var(--primary, #4f46e5)', textDecoration: 'underline' }}>
                      {task.supplierContactEmail}
                    </a>
                  ) : (
                    <span className="sidebar-value">-</span>
                  )}
                </div>
              </div>

              {/* AREA 3: חומרים ואישורים */}
              <div className="details-section-card">
                <h4 className="detail-section-title" style={{ fontSize: '0.9rem', marginBottom: '12px' }}>🧪 חומרים ואישורים</h4>
                
                {/* Status */}
                <div className="sidebar-row">
                  <span className="sidebar-label">סטטוס עבודה</span>
                  <div style={{ marginTop: '4px' }}>
                    <span className={`badge ${STATUS_CLASSES[task.status] || ''}`}>
                      {task.status}
                    </span>
                  </div>
                </div>

                {/* Diecuts Status */}
                <div className="sidebar-row">
                  <span className="sidebar-label">דייקאטים</span>
                  <span className="sidebar-value">{task.diecutsStatus || 'אין'}</span>
                </div>

                {/* Images Status */}
                <div className="sidebar-row">
                  <span className="sidebar-label">תמונות</span>
                  <span className="sidebar-value">{task.imagesStatus || 'אין'}</span>
                </div>

                {/* Standards Institute Required */}
                <div className="sidebar-row">
                  <span className="sidebar-label">מכון תקנים</span>
                  <span className="sidebar-value">{task.standardsInstituteRequired || 'לא'}</span>
                </div>
              </div>

              <div className="sidebar-row" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '16px' }}>
                <span>עודכן לאחרונה: {formatDate(task.updatedAt)}</span>
              </div>
            </div>

          </div>
        </div>

        {!isSingleProjectView && (
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              סגור
            </button>
          </div>
        )}
      </div>
      {commentToDelete && (
        <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={(e) => { e.stopPropagation(); setCommentToDelete(null); }}>
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '12px' }}>מחיקת הערה</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>האם את בטוחה שברצונך למחוק הערה זו לצמיתות? לא ניתן לבטל פעולה זו.</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setCommentToDelete(null)}
                style={{ flex: 1 }}
              >
                ביטול
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                style={{ flex: 1, backgroundColor: 'var(--priority-urgent-bg)', color: 'var(--priority-urgent-text)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                onClick={confirmDeleteComment}
              >
                מחיקה
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Read-only Info Card Popup */}
      {activeInfoCard && (
        <div className="modal-overlay" style={{ zIndex: 1250 }} onClick={() => setActiveInfoCard(null)}>
          <div className="modal-content" style={{ maxWidth: '450px', textAlign: 'right', direction: 'rtl', padding: '20px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ marginBottom: '16px' }}>
              <h3 className="modal-title" style={{ fontSize: '1.25rem', fontWeight: '700' }}>{activeInfoCard.title}</h3>
              <button className="modal-close" onClick={() => setActiveInfoCard(null)}>&times;</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: 0 }}>
              {activeInfoCard.fields.some(f => f.value && f.value.trim()) ? (
                activeInfoCard.fields.map((field, idx) => {
                  if (!field.value || !field.value.trim()) return null;
                  return (
                    <div key={idx} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '500', marginBottom: '2px' }}>{field.label}</div>
                      <div 
                        className={field.isLtr ? 'direction-ltr text-left' : ''} 
                        style={{ fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: '600', whiteSpace: field.isMultiline ? 'pre-wrap' : 'normal' }}
                      >
                        {field.type === 'phone' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <a href={`tel:${field.value.replace(/\s+/g, '')}`} style={{ color: 'var(--primary, #4f46e5)', textDecoration: 'underline' }}>
                              {field.value}
                            </a>
                            {(() => {
                              const digitsOnly = field.value.replace(/\D/g, '');
                              if (digitsOnly.length >= 9) {
                                let cleanVal = digitsOnly;
                                if (cleanVal.startsWith('05') && cleanVal.length === 10) {
                                  cleanVal = '972' + cleanVal.substring(1);
                                }
                                return (
                                  <a 
                                    href={`https://wa.me/${cleanVal}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    title="פתיחת צ'אט בוואטסאפ"
                                    style={{ display: 'inline-flex', alignItems: 'center', transition: 'transform 0.2s' }}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="#10b981" viewBox="0 0 16 16">
                                      <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93a7.9 7.9 0 0 0-2.327-5.615zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
                                    </svg>
                                  </a>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        ) : field.type === 'email' ? (
                          <a href={`mailto:${field.value}`} style={{ color: 'var(--primary, #4f46e5)', textDecoration: 'underline' }}>
                            {field.value}
                          </a>
                        ) : field.type === 'whatsapp' ? (() => {
                          const digitsOnly = field.value.replace(/\D/g, '');
                          if (digitsOnly.length >= 9) {
                            let cleanVal = digitsOnly;
                            if (cleanVal.startsWith('05') && cleanVal.length === 10) {
                              cleanVal = '972' + cleanVal.substring(1);
                            }
                            return (
                              <a 
                                href={`https://wa.me/${cleanVal}`} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                style={{ color: '#10b981', fontWeight: 'bold', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'transform 0.2s' }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#10b981" viewBox="0 0 16 16" style={{ marginLeft: '4px' }}>
                                  <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.907h.004c4.368 0 7.926-3.558 7.93-7.93a7.9 7.9 0 0 0-2.327-5.615zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.69-3.146c-.202-.1-.1.202-.455-.382-.072-.121-.382-.072-.51-.17l-.613-.3a1.1 1.1 0 0 0-.737-.039a3 3 0 0 1-.948.595 5.3 5.3 0 0 1-1.1-.072a4.3 4.3 0 0 1-1.363-.927a3.6 3.6 0 0 1-.94-.99a.96.96 0 0 1 .184-1.258l.15-.16a1.2 1.2 0 0 0 .227-.38c.079-.19-.008-.39-.092-.559l-.368-.84c-.208-.474-.385-.467-.526-.474a3.5 3.5 0 0 0-.708-.007c-.233 0-.612.088-.933.437A3.27 3.27 0 0 0 3 6.9c0 1.43.94 2.813 1.07 2.997.132.182 1.844 2.815 4.467 3.946c.623.268 1.11.428 1.488.548c.624.198 1.192.17 1.64.103c.5-.075 1.543-.63 1.761-1.243c.218-.613.218-1.138.152-1.248c-.066-.111-.242-.211-.45-.311"/>
                                </svg>
                                {field.value}
                              </a>
                            );
                          }
                          return field.value;
                        })() : (
                          field.value
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  אין פרטים נוספים שמורים עבור גורם זה במערכת.
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ marginTop: '20px', padding: 0, borderTop: 'none', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setActiveInfoCard(null)} style={{ minWidth: '80px' }}>סגירה</button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Preview Modal */}
      <ExcelPreviewModal 
        isOpen={!!excelPreviewFile} 
        onClose={() => setExcelPreviewFile(null)} 
        fileUrl={excelPreviewFile?.url} 
        fileName={excelPreviewFile?.name} 
      />

      {/* PDF Preview Modal */}
      <PdfPreviewModal 
        isOpen={!!pdfPreviewFile} 
        onClose={() => setPdfPreviewFile(null)} 
        fileUrl={pdfPreviewFile?.url} 
        fileName={pdfPreviewFile?.name} 
      />
    </div>
  );
}
