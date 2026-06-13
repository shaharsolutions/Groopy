import React, { useState, useEffect } from 'react';
import { getCommentsForTask, addComment, deleteComment, uploadFileToStorage } from '../utils/storage';

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
        { label: 'טלפון', value: supObj.phone, isLtr: true },
        { label: 'אימייל', value: supObj.email, isLtr: true },
        { label: 'כתובת', value: supObj.address },
        { label: 'WeChat / WhatsApp', value: supObj.wechat, isLtr: true },
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
        { label: 'טלפון', value: contactObj.phone, isLtr: true },
        { label: 'אימייל', value: contactObj.email, isLtr: true },
        { label: 'כתובת', value: contactObj.address },
        { label: 'WeChat / WhatsApp', value: contactObj.wechat, isLtr: true },
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

  const renderDeadline = (deadlineStr) => {
    if (!deadlineStr) return 'לא נקבע';
    try {
      const deadlineDate = new Date(deadlineStr);
      const today = new Date();
      today.setHours(0,0,0,0);
      deadlineDate.setHours(0,0,0,0);
      
      const diffTime = deadlineDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Date part only (no hours)
      const formattedDate = new Date(deadlineStr).toLocaleDateString('he-IL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      
      if (diffDays < 0) {
        return (
          <span className="deadline-danger" title="הדדליין עבר!">
            ⚠️ עבר ({formattedDate})
          </span>
        );
      } else if (diffDays === 0) {
        return (
          <span className="deadline-danger" title="היום!">
            ⏰ היום! ({formattedDate})
          </span>
        );
      } else if (diffDays <= 3) {
        return (
          <span className="deadline-warning" title={`נותרו עוד ${diffDays} ימים`}>
            ⏳ עוד {diffDays} ימים ({formattedDate})
          </span>
        );
      }
      return formattedDate;
    } catch (e) {
      return deadlineStr;
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

        <div className="modal-body">
          <div className="details-grid">
            
            {/* Main Content Area */}
            <div className="details-main">
              
              {/* Description */}
              <div>
                <h4 className="detail-section-title">תיאור ופרטי העבודה</h4>
                {task.description ? (
                  <div className="description-box">{task.description}</div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>אין תיאור מפורט לעבודה זו.</p>
                )}
              </div>



              {/* Comments Section */}
              <div className="comments-section">
                <h4 className="detail-section-title">💬 הערות ועדכוני עבודה ({comments.length})</h4>
                
                {comments.length === 0 ? (
                  <div className="empty-state" style={{ padding: '24px' }}>
                    <div className="empty-state-title">אין הערות עדיין</div>
                    <div className="empty-state-text font-size-sm">היה הראשון להוסיף הערה או לעדכן לגבי התקדמות העבודה.</div>
                  </div>
                ) : (
                  <div className="comments-list">
                    {comments.map(c => {
                      const isImage = c.attachmentName && /\.(jpg|jpeg|png|gif|webp)$/i.test(c.attachmentName);
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
                                >
                                  📎 {c.attachmentName || 'קובץ מצורף'}
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
                      צירוף קובץ או תמונה (אופציונלי)
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

            {/* Sidebar with Meta */}
            <div className="details-sidebar">
              <div className="sidebar-row">
                <span className="sidebar-label">סוג עבודה</span>
                <span className="sidebar-value">{task.workType}</span>
              </div>

              <div className="sidebar-row">
                <span className="sidebar-label">סטטוס נוכחי</span>
                <div style={{ marginTop: '4px' }}>
                  <span className={`badge ${STATUS_CLASSES[task.status] || ''}`}>
                    {task.status}
                  </span>
                </div>
              </div>

              <div className="sidebar-row">
                <span className="sidebar-label">תאריך יעד</span>
                <span className="sidebar-value">
                  {renderDeadline(task.deadline)}
                </span>
              </div>

              <div className="sidebar-row">
                <span className="sidebar-label">חנות / רשת משוייכת</span>
                <span className="sidebar-value">{task.storeName || '-'}</span>
              </div>

              <div className="sidebar-row">
                <span className="sidebar-label">ספק</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="sidebar-value">{task.supplierName || '-'}</span>
                  {task.supplierName && (
                    <button 
                      type="button" 
                      className="btn btn-secondary btn-icon" 
                      style={{ padding: '2px 4px', fontSize: '0.75rem', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="פרטי כרטיס ספק"
                      onClick={() => handleOpenSupplierCard(task.supplierName)}
                    >
                      ℹ️
                    </button>
                  )}
                </div>
              </div>

              <div className="sidebar-row">
                <span className="sidebar-label">איש קשר ספק</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="sidebar-value">{task.contactPerson || '-'}</span>
                  {task.contactPerson && (
                    <button 
                      type="button" 
                      className="btn btn-secondary btn-icon" 
                      style={{ padding: '2px 4px', fontSize: '0.75rem', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="פרטי כרטיס איש קשר"
                      onClick={() => handleOpenContactCard(task.contactPerson)}
                    >
                      ℹ️
                    </button>
                  )}
                </div>
              </div>

              <div className="sidebar-row">
                <span className="sidebar-label">איש קשר</span>
                <span className="sidebar-value">{task.importManager || '-'}</span>
              </div>

              <div className="sidebar-row">
                <span className="sidebar-label">קישור לתיקיית קבצים (Drive)</span>
                {task.driveLink ? (
                  <a href={task.driveLink} target="_blank" rel="noopener noreferrer" className="drive-link">
                    🔗 מעבר לקישור
                  </a>
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>לא צורף קישור</span>
                )}
              </div>

              <div className="sidebar-row">
                <span className="sidebar-label">קבצים שהועלו</span>
                {task.attachments && task.attachments.length > 0 ? (
                  <div className="attachments-list" style={{ marginTop: '4px' }}>
                    {task.attachments.map((file, idx) => {
                      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
                      return (
                        <a 
                          key={idx} 
                          href={file.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="attachment-info"
                          style={{ fontSize: '0.8rem', padding: '4px 0' }}
                          title={file.name}
                        >
                          <span className="attachment-icon">{isImage ? '🖼️' : '📄'}</span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', direction: 'ltr', textAlign: 'right' }}>
                            {file.name}
                          </span>
                        </a>
                      );
                    })}
                  </div>
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>אין קבצים מצורפים</span>
                )}
              </div>

              <div className="sidebar-row" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
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
                        {field.value}
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
    </div>
  );
}
