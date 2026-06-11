import React, { useState, useEffect } from 'react';
import { getCommentsForTask, addComment } from '../utils/storage';

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

    await addComment(task.id, authorName, commentText);
    localStorage.setItem('groopy_comment_author', authorName.trim());
    setCommentText('');
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
                    {comments.map(c => (
                      <div key={c.id} className="comment-item">
                        <div className="comment-header">
                          <span className="comment-author">{c.authorName}</span>
                          <span>{formatDate(c.createdAt)}</span>
                        </div>
                        <div className="comment-text">{c.text}</div>
                      </div>
                    ))}
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
                  
                  {commentError && <span className="form-error">{commentError}</span>}
                  
                  <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
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
