import React, { useState, useEffect } from 'react';
import { getCommentsForTask, addComment, uploadFileToStorage } from '../utils/storage';

export default function ExternalDetailsModal({ task, settings, onClose }) {
  const {
    statusColors: STATUS_CLASSES = {}
  } = settings || {};
  const [comments, setComments] = useState([]);
  const [authorName, setAuthorName] = useState(() => {
    return localStorage.getItem('groopy_comment_author') || '';
  });
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

  const handleAddComment = async (e) => {
    e.preventDefault();
    setCommentError('');

    if (!authorName.trim()) {
      setCommentError('נא להזין את שמך (או שם חברה / תפקיד)');
      return;
    }
    if (!commentText.trim()) {
      setCommentError('נא לכתוב את תוכן ההערה');
      return;
    }

    await addComment(
      task.id, 
      authorName, 
      commentText, 
      attachedFile ? attachedFile.url : null, 
      attachedFile ? attachedFile.name : null
    );
    localStorage.setItem('groopy_comment_author', authorName.trim());
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

              {/* Sub-tasks Section (Read-only for External viewers) */}
              <div className="subtasks-container">
                <div className="subtasks-header">
                  <h4>📋 תתי-משימות לעבודה</h4>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>
                    {task.subtasks && task.subtasks.length > 0 
                      ? `${task.subtasks.filter(s => s.completed).length} מתוך ${task.subtasks.length} הושלמו`
                      : 'אין תתי-משימות'
                    }
                  </span>
                </div>

                {task.subtasks && task.subtasks.length > 0 && (
                  <div className="subtask-progress-bar-container">
                    <div 
                      className="subtask-progress-bar" 
                      style={{ 
                        width: `${(task.subtasks.filter(s => s.completed).length / task.subtasks.length) * 100}%` 
                      }}
                    />
                  </div>
                )}

                {task.subtasks && task.subtasks.length > 0 ? (
                  <div className="subtask-list">
                    {task.subtasks.map((sub) => (
                      <div key={sub.id} className="subtask-item" style={{ cursor: 'default' }}>
                        <div className="subtask-main">
                          <input 
                            type="checkbox" 
                            className="subtask-checkbox" 
                            checked={sub.completed}
                            disabled
                            style={{ cursor: 'default' }}
                          />
                          <span className={`subtask-text ${sub.completed ? 'completed' : ''}`} title={sub.title}>
                            {sub.title}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="subtasks-empty-state">
                    אין תתי-משימות מוגדרות לעבודה זו.
                  </div>
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

                {/* Add Comment Form */}
                <form onSubmit={handleAddComment} className="comment-form">
                  <h5 style={{ fontWeight: '600' }}>הוספת הערה / עדכון חדש</h5>
                  
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">השם שלך *</label>
                    <input 
                      type="text"
                      className="form-control"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder="לדוגמה: יוסי (דפוס בארץ) / Mr. Wong (ספק סין)"
                      required
                    />
                  </div>
                  
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">תוכן ההערה *</label>
                    <textarea 
                      className="form-control"
                      rows="3"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="כתבו כאן את השאלות, העדכונים או הערות לגבי העיצוב..."
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
                          onClick={() => document.getElementById('comment-file-input-external').click()}
                          disabled={uploadingFile}
                        >
                          {uploadingFile ? '🔄 מעלה קובץ...' : '📎 בחירת קובץ'}
                        </button>
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
                <span className="sidebar-value">{task.supplierName || '-'}</span>
              </div>

              <div className="sidebar-row">
                <span className="sidebar-label">איש קשר ספק</span>
                <span className="sidebar-value">{task.contactPerson || '-'}</span>
              </div>

              <div className="sidebar-row">
                <span className="sidebar-label">מנהל רכש / יבוא</span>
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

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
