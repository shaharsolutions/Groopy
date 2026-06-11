import React, { useState, useEffect } from 'react';
import { getCommentsForTask, addComment, updateTask, getPrivateNotes, uploadFileToStorage } from '../utils/storage';

export default function AdminDetailsModal({ task, settings, onClose, onEdit, onDelete, onRefresh }) {
  const {
    statuses: STATUSES = [],
    priorities: PRIORITIES = [],
    statusColors: STATUS_CLASSES = {},
    priorityColors: PRIORITY_CLASSES = {}
  } = settings || {};
  const [comments, setComments] = useState([]);
  const [authorName, setAuthorName] = useState('מעצבת Groopy');
  const [commentText, setCommentText] = useState('');
  const [commentError, setCommentError] = useState('');
  
  const [attachedFile, setAttachedFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handleCommentFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadingFile(true);
    setUploadError('');
    try {
      const result = await uploadFileToStorage(file, 'comments');
      setAttachedFile(result);
    } catch (err) {
      console.error(err);
      setUploadError('שגיאה בהעלאת הקובץ. אנא ודא ש-Storage פעיל.');
    } finally {
      setUploadingFile(false);
    }
  };
  
  const [internalNotes, setInternalNotes] = useState('');
  
  // Quick status / priority update
  const [status, setStatus] = useState(task?.status || '');
  const [priority, setPriority] = useState(task?.priority || '');

  useEffect(() => {
    if (task) {
      const loadComments = async () => {
        const fetchedComments = await getCommentsForTask(task.id);
        setComments(fetchedComments);
      };
      const loadPrivateNotes = async () => {
        const notes = await getPrivateNotes(task.id);
        setInternalNotes(notes);
      };
      loadComments();
      loadPrivateNotes();
      setStatus(task.status);
      setPriority(task.priority);
    }
  }, [task]);

  if (!task) return null;

  const handleStatusChange = async (newStatus) => {
    setStatus(newStatus);
    await updateTask(task.id, { status: newStatus });
    onRefresh(); // Refresh parent dashboard tasks list
  };

  const handlePriorityChange = async (newPriority) => {
    setPriority(newPriority);
    await updateTask(task.id, { priority: newPriority });
    onRefresh(); // Refresh parent dashboard tasks list
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    setCommentError('');

    if (!authorName.trim()) {
      setCommentError('נא להזין שם כותב');
      return;
    }
    if (!commentText.trim()) {
      setCommentError('נא להזין תוכן תגובה');
      return;
    }

    await addComment(
      task.id, 
      authorName, 
      commentText, 
      attachedFile ? attachedFile.url : null, 
      attachedFile ? attachedFile.name : null
    );
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="task-card-number">{task.jobNumber}</span>
            <h3 className="modal-title">{task.title}</h3>
          </div>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          <div className="details-grid">
            
            {/* Main Area */}
            <div className="details-main">
              
              {/* Description */}
              <div>
                <h4 className="detail-section-title">תיאור העבודה</h4>
                {task.description ? (
                  <div className="description-box">{task.description}</div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>אין תיאור מפורט לעבודה זו.</p>
                )}
              </div>

              {/* Internal Notes */}
              <div>
                <h4 className="detail-section-title" style={{ color: 'var(--secondary)', borderColor: 'var(--secondary)' }}>
                  🔒 הערות פנימיות (מנהלת בלבד)
                </h4>
                {internalNotes ? (
                  <div className="description-box" style={{ backgroundColor: 'var(--secondary-light)', borderColor: 'var(--border)' }}>
                    {internalNotes}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>אין הערות פנימיות.</p>
                )}
              </div>

              {/* Comments Section */}
              <div className="comments-section">
                <h4 className="detail-section-title">💬 הערות ועדכונים חיצוניים ({comments.length})</h4>
                
                {comments.length === 0 ? (
                  <div className="empty-state" style={{ padding: '24px' }}>
                    <div className="empty-state-title">אין הערות עדיין</div>
                    <div className="empty-state-text">ספקים ומנהלים יכולים להוסיף הערות בדף הצפייה החיצוני.</div>
                  </div>
                ) : (
                  <div className="comments-list">
                    {comments.map(c => {
                      const isImage = c.attachmentName && /\.(jpg|jpeg|png|gif|webp)$/i.test(c.attachmentName);
                      return (
                        <div key={c.id} className="comment-item">
                          <div className="comment-header">
                            <span className="comment-author">{c.authorName}</span>
                            <span>{formatDate(c.createdAt)}</span>
                          </div>
                          <div className="comment-text">{c.text}</div>
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

                {/* Add Comment */}
                <form onSubmit={handleAddComment} className="comment-form">
                  <h5 style={{ fontWeight: '600' }}>הוספת הערה במערכת</h5>
                  <div className="form-row">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">שם כותב ההערה</label>
                      <input 
                        type="text"
                        className="form-control"
                        value={authorName}
                        onChange={(e) => setAuthorName(e.target.value)}
                        placeholder="שם המעצבת או תפקיד"
                        required
                      />
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">תוכן ההערה</label>
                    <textarea 
                      className="form-control"
                      rows="2"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="הוסף עדכון..."
                      required
                    />
                  </div>
                  
                  {/* File Attachment Input */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">צירוף קובץ או תמונה (אופציונלי)</label>
                    {attachedFile ? (
                      <div className="comment-attachment-preview-chip">
                        <span>📎 {attachedFile.name}</span>
                        <button type="button" onClick={() => setAttachedFile(null)} title="הסר קובץ">&times;</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button 
                          type="button" 
                          className="comment-attachment-btn"
                          onClick={() => document.getElementById('comment-file-input-admin').click()}
                          disabled={uploadingFile}
                        >
                          {uploadingFile ? '🔄 מעלה קובץ...' : '📎 בחירת קובץ'}
                        </button>
                        <input 
                          type="file" 
                          id="comment-file-input-admin"
                          style={{ display: 'none' }}
                          onChange={handleCommentFileChange}
                        />
                        {uploadError && <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>{uploadError}</span>}
                      </div>
                    )}
                  </div>

                  {commentError && <span className="form-error">{commentError}</span>}
                  <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={uploadingFile}>
                    שליחת הערה
                  </button>
                </form>
              </div>

            </div>

            {/* Sidebar */}
            <div className="details-sidebar">
              <div className="sidebar-row">
                <span className="sidebar-label">סוג עבודה</span>
                <span className="sidebar-value">{task.workType}</span>
              </div>

              <div className="sidebar-row">
                <span className="sidebar-label">סטטוס משימה</span>
                <div 
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    marginTop: '6px'
                  }}
                >
                  {(STATUSES.includes(status) ? STATUSES : [...STATUSES, status]).map(st => {
                    const colorClass = STATUS_CLASSES[st] || 'badge-frozen';
                    const isActive = st === status;
                    return (
                      <button
                        key={st}
                        type="button"
                        className={`badge ${colorClass}`}
                        style={{
                          padding: '6px 8px',
                          fontSize: '0.75rem',
                          textAlign: 'center',
                          cursor: 'pointer',
                          width: '100%',
                          border: isActive ? '2px solid var(--primary)' : '1px solid transparent',
                          opacity: isActive ? 1 : 0.45,
                          transform: isActive ? 'scale(1.03)' : 'none',
                          boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                          fontWeight: isActive ? '700' : '500',
                          transition: 'all 0.15s ease'
                        }}
                        onClick={() => handleStatusChange(st)}
                      >
                        {st}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="sidebar-row">
                <span className="sidebar-label">עדיפות</span>
                <div className="segmented-control" style={{ marginTop: '4px' }}>
                  {PRIORITIES.map(pr => {
                    let priorityClass = '';
                    if (pr === 'רגילה') priorityClass = 'priority-normal';
                    if (pr === 'גבוהה') priorityClass = 'priority-high';
                    if (pr === 'דחופה') priorityClass = 'priority-urgent';
                    return (
                      <button
                        key={pr}
                        type="button"
                        className={`segmented-control-btn ${priority === pr ? `active ${priorityClass}` : ''}`}
                        onClick={() => handlePriorityChange(pr)}
                        style={{ padding: '6px 8px', fontSize: '0.8rem' }}
                      >
                        {pr}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="sidebar-row">
                <span className="sidebar-label">תאריך יעד</span>
                <span className="sidebar-value">{renderDeadline(task.deadline)}</span>
              </div>

              <div className="sidebar-row">
                <span className="sidebar-label">חנות / רשת</span>
                <span className="sidebar-value">{task.storeName || '-'}</span>
              </div>

              <div className="sidebar-row">
                <span className="sidebar-label">ספק</span>
                <span className="sidebar-value">{task.supplierName || '-'}</span>
              </div>

              <div className="sidebar-row">
                <span className="sidebar-label">איש קשר</span>
                <span className="sidebar-value">{task.contactPerson || '-'}</span>
              </div>

              <div className="sidebar-row">
                <span className="sidebar-label">מנהל יבוא</span>
                <span className="sidebar-value">{task.importManager || '-'}</span>
              </div>

              <div className="sidebar-row">
                <span className="sidebar-label">תיקיית דרייב</span>
                {task.driveLink ? (
                  <a href={task.driveLink} target="_blank" rel="noopener noreferrer" className="drive-link">
                    🔗 מעבר לדרייב
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
                <span>נוצר: {formatDate(task.createdAt)}</span>
                <span>עודכן: {formatDate(task.updatedAt)}</span>
              </div>
            </div>

          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <button 
            type="button" 
            className="btn btn-danger" 
            onClick={() => onDelete(task.id)}
          >
            🗑️ מחיקת עבודה
          </button>
          
          <div className="gap-8">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              סגור
            </button>
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={() => onEdit(task)}
            >
              ✏️ עריכת פרטים
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
