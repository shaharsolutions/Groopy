import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  getTasks, 
  getAllCommentsForUser, 
  getSuppliers, 
  getContacts
} from '../utils/storage';

const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export default function SearchModal({ isOpen, onClose, userId, userRole, isSystemAdmin, onNavigate }) {
  const [query, setQuery] = useState('');
  const [tasks, setTasks] = useState([]);
  const [comments, setComments] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const isAdmin = userRole === 'admin';

  // Fetch all database records for the current user once the modal opens
  useEffect(() => {
    if (!isOpen || !userId) return;

    const loadSearchData = async () => {
      setLoading(true);
      try {
        const promises = [
          getTasks(userId),
          getAllCommentsForUser(userId)
        ];

        if (isAdmin) {
          promises.push(getSuppliers(userId));
          promises.push(getContacts(userId));
        }

        const results = await Promise.all(promises);
        setTasks(results[0] || []);
        setComments(results[1] || []);

        if (isAdmin) {
          setSuppliers(results[2] || []);
          setContacts(results[3] || []);
        }
      } catch (err) {
        console.error("Failed to load search index data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadSearchData();
  }, [isOpen, userId, isAdmin]);

  // Focus the input field when the modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current.focus();
      }, 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Highlight search terms helper
  const highlight = (text, term) => {
    if (!text) return '';
    const cleanText = String(text);
    if (!term.trim()) return cleanText;
    
    try {
      const cleanTerm = term.trim();
      const escaped = escapeRegExp(cleanTerm);
      const regex = new RegExp(`(${escaped})`, 'gi');
      const parts = cleanText.split(regex);
      return (
        <>
          {parts.map((part, i) => 
            regex.test(part) ? (
              <mark key={i} className="search-highlight">{part}</mark>
            ) : (
              part
            )
          )}
        </>
      );
    } catch {
      return cleanText;
    }
  };

  // Perform client-side search across collections
  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return { tasks: [], comments: [], suppliers: [], contacts: [] };

    // 1. Filter Tasks
    const matchedTasks = tasks.filter(t => 
      (t.title && t.title.toLowerCase().includes(term)) ||
      (t.jobNumber && t.jobNumber.toLowerCase().includes(term)) ||
      (t.contactPerson && t.contactPerson.toLowerCase().includes(term)) ||
      (t.supplierName && t.supplierName.toLowerCase().includes(term)) ||
      (t.description && t.description.toLowerCase().includes(term)) ||
      (t.workType && t.workType.toLowerCase().includes(term)) ||
      (t.status && t.status.toLowerCase().includes(term))
    );

    // Create a task map to lookup parent project names for comments
    const taskMap = new Map(tasks.map(t => [t.id, t.title || t.jobNumber]));

    // 2. Filter Comments
    const matchedComments = comments.filter(c => 
      (c.text && c.text.toLowerCase().includes(term)) ||
      (c.authorName && c.authorName.toLowerCase().includes(term))
    ).map(c => ({
      ...c,
      projectTitle: taskMap.get(c.jobId) || 'פרויקט ללא שם'
    }));

    if (!isAdmin) {
      return {
        tasks: matchedTasks,
        comments: matchedComments,
        suppliers: [],
        contacts: []
      };
    }

    // 3. Filter Suppliers
    const matchedSuppliers = suppliers.filter(s => 
      (s.name && s.name.toLowerCase().includes(term)) ||
      (s.contactPerson && s.contactPerson.toLowerCase().includes(term)) ||
      (s.phone && s.phone.toLowerCase().includes(term)) ||
      (s.email && s.email.toLowerCase().includes(term)) ||
      (s.address && s.address.toLowerCase().includes(term)) ||
      (s.notes && s.notes.toLowerCase().includes(term))
    );

    // 4. Filter Contacts
    const matchedContacts = contacts.filter(c => 
      (c.name && c.name.toLowerCase().includes(term)) ||
      (c.role && c.role.toLowerCase().includes(term)) ||
      (c.phone && c.phone.toLowerCase().includes(term)) ||
      (c.email && c.email.toLowerCase().includes(term)) ||
      (c.notes && c.notes.toLowerCase().includes(term))
    );

    return {
      tasks: matchedTasks,
      comments: matchedComments,
      suppliers: matchedSuppliers,
      contacts: matchedContacts
    };
  }, [query, tasks, comments, suppliers, contacts, isAdmin]);

  const hasAnyResults = 
    results.tasks.length > 0 || 
    results.comments.length > 0 || 
    results.suppliers.length > 0 || 
    results.contacts.length > 0;

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div 
        className="modal-content search-modal-content" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header Input */}
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="חיפוש משימות, הערות, ספקים, אנשי קשר..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button 
            className="modal-close" 
            onClick={onClose} 
            style={{ position: 'absolute', left: '4px', top: '-6px' }}
          >
            ×
          </button>
        </div>

        {/* Results Body */}
        <div className="modal-body" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              טוען נתוני מערכת לחיפוש...
            </div>
          ) : !query.trim() ? (
            <div className="search-empty-state">
              <span style={{ fontSize: '3rem' }}>🔍</span>
              <h3>חיפוש גלובלי מהיר</h3>
              <p>הקלידו מילת חיפוש כלשהי כדי לאתר פרויקטים, תגובות, אנשי קשר וספקים בדאטהבייס.</p>
            </div>
          ) : !hasAnyResults ? (
            <div className="search-empty-state">
              <span style={{ fontSize: '3rem' }}>💨</span>
              <h3>לא נמצאו תוצאות</h3>
              <p>לא נמצאו רשומות המתאימות לחיפוש: <strong>"{query}"</strong></p>
            </div>
          ) : (
            <div className="search-results-container">
              {/* Category: Tasks */}
              {results.tasks.length > 0 && (
                <div className="search-category-section">
                  <h4 className="search-category-title">
                    📋 משימות ועבודות ({results.tasks.length})
                  </h4>
                  {results.tasks.map(task => (
                    <div 
                      key={task.id} 
                      className="search-result-item"
                      onClick={() => onNavigate('dashboard', { autoOpenTaskId: task.id })}
                    >
                      <div className="search-result-header">
                        <span className="search-result-title">
                          {highlight(task.title, query)}
                          {task.jobNumber && (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              ({highlight(task.jobNumber, query)})
                            </span>
                          )}
                        </span>
                        {task.status && (
                          <span className="search-result-badge badge-new" style={{ opacity: 0.95 }}>
                            {task.status}
                          </span>
                        )}
                      </div>
                      <div className="search-result-subtitle">
                        {task.workType && <span>סוג: {highlight(task.workType, query)} | </span>}
                        {task.supplierName && <span>ספק: {highlight(task.supplierName, query)} | </span>}
                        {task.contactPerson && <span>איש קשר: {highlight(task.contactPerson, query)}</span>}
                        {task.description && (
                          <div style={{ marginTop: '4px', fontSize: '0.78rem', opacity: 0.8 }}>
                            תיאור: {highlight(task.description, query)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Category: Comments */}
              {results.comments.length > 0 && (
                <div className="search-category-section">
                  <h4 className="search-category-title">
                    💬 הערות ותגובות ({results.comments.length})
                  </h4>
                  {results.comments.map(comment => (
                    <div 
                      key={comment.id} 
                      className="search-result-item"
                      onClick={() => onNavigate('dashboard', { autoOpenTaskId: comment.jobId })}
                    >
                      <div className="search-result-header">
                        <span className="search-result-title" style={{ color: 'var(--primary)' }}>
                          בתוך: {comment.projectTitle}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {highlight(comment.authorName, query)}
                        </span>
                      </div>
                      <div className="search-result-subtitle" style={{ fontStyle: 'italic' }}>
                        "{highlight(comment.text, query)}"
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Category: Suppliers */}
              {results.suppliers.length > 0 && (
                <div className="search-category-section">
                  <h4 className="search-category-title">
                    🏢 ספקים ({results.suppliers.length})
                  </h4>
                  {results.suppliers.map(sup => (
                    <div 
                      key={sup.id} 
                      className="search-result-item"
                      onClick={() => onNavigate('suppliers_contacts', { autoOpenSupplierId: sup.id })}
                    >
                      <div className="search-result-header">
                        <span className="search-result-title">
                          {highlight(sup.name, query)}
                        </span>
                        {sup.contactPerson && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            מול: {highlight(sup.contactPerson, query)}
                          </span>
                        )}
                      </div>
                      <div className="search-result-subtitle">
                        {sup.phone && <span>טלפון: {highlight(sup.phone, query)} | </span>}
                        {sup.email && <span>אימייל: {highlight(sup.email, query)} | </span>}
                        {sup.address && <span>כתובת: {highlight(sup.address, query)}</span>}
                        {sup.notes && (
                          <div style={{ marginTop: '4px', fontSize: '0.78rem', opacity: 0.8 }}>
                            הערות: {highlight(sup.notes, query)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Category: Contacts */}
              {results.contacts.length > 0 && (
                <div className="search-category-section">
                  <h4 className="search-category-title">
                    👤 אנשי קשר ({results.contacts.length})
                  </h4>
                  {results.contacts.map(c => (
                    <div 
                      key={c.id} 
                      className="search-result-item"
                      onClick={() => onNavigate('suppliers_contacts', { autoOpenContactId: c.id })}
                    >
                      <div className="search-result-header">
                        <span className="search-result-title">
                          {highlight(c.name, query)}
                        </span>
                        {c.role && (
                          <span className="search-result-badge" style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>
                            {highlight(c.role, query)}
                          </span>
                        )}
                      </div>
                      <div className="search-result-subtitle">
                        {c.phone && <span>טלפון: {highlight(c.phone, query)} | </span>}
                        {c.email && <span>אימייל: {highlight(c.email, query)}</span>}
                        {c.notes && (
                          <div style={{ marginTop: '4px', fontSize: '0.78rem', opacity: 0.8 }}>
                            הערות: {highlight(c.notes, query)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}
        </div>

        {/* Search Footer info */}
        <div 
          className="modal-footer" 
          style={{ 
            paddingTop: '16px', 
            borderTop: '1px solid var(--border)', 
            fontSize: '0.75rem', 
            color: 'var(--text-muted)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span>לחצו על תוצאה כלשהי כדי לעבור אליה ישירות</span>
          <span>
            ניתן לפתוח עם <span className="search-shortcut-badge">Ctrl+K</span> או <span className="search-shortcut-badge">Cmd+K</span> בכל עת
          </span>
        </div>
      </div>
    </div>
  );
}
