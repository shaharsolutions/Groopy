import { useState, useMemo } from 'react';

export const EXTENSIVE_ICON_CATEGORIES = [
  {
    id: 'all',
    label: 'הכל',
    icons: []
  },
  {
    id: 'contacts',
    label: '👤 אנשים וקשר',
    icons: [
      '👤', '👥', '🧑‍💼', '👨‍💻', '👩‍🎨', '🤝', '👔', '💼', '🧑‍🔧', '👷',
      '👑', '🕵️', '🙋', '🗣️', '📞', '📱', '☎️', '💬', '✉️', '📧',
      '📨', '📫', '📇', '🏷️', '📛', '🎫'
    ]
  },
  {
    id: 'documents',
    label: '📋 מסמכים וקבצים',
    icons: [
      '📋', '📁', '📂', '📄', '📑', '📜', '📝', '📖', '📚', '📎',
      '🔗', '🗂️', '🗄️', '📦', '🏷️', '🔖', '✏️', '✒️', '🖊️', '🖋️',
      '🗒️', '🗓️', '🧾', '🗞️', '📰'
    ]
  },
  {
    id: 'design',
    label: '🎨 עיצוב ומדיה',
    icons: [
      '🎨', '🖼️', '📐', '📏', '🗺️', '📸', '📷', '🎬', '🎞️', '📽️',
      '🖌️', '🖍️', '✂️', '🔍', '🔎', '💡', '✨', '🧩', '🎯', '💎',
      '🌈', '🔮', '🧿', '🪄', '🎭', '🧵'
    ]
  },
  {
    id: 'management',
    label: '⏱️ ניהול וזמנים',
    icons: [
      '⏱️', '⏰', '📅', '🗓️', '⏳', '⌛', '📊', '📈', '📉', '⚡',
      '🚀', '⭐', '🌟', '🔥', '🏆', '🥇', '🚩', '🏁', '🚨', '🔔',
      '📌', '📍', '🎖️', '🏅', '🎯', '🧭'
    ]
  },
  {
    id: 'business',
    label: '🏬 עסקים ומסחר',
    icons: [
      '🏬', '🏢', '🏭', '🏗️', '🛒', '🛍️', '💰', '💳', '🧾', '💵',
      '🚚', '🚛', '📦', '🌍', '🌐', '🏛️', '⚖️', '🗝️', '🔑', '🏷️',
      '📮', '🏧', '🪙', '🛃', '🚢', '✈️'
    ]
  },
  {
    id: 'tools',
    label: '🛠️ אישורים וכלים',
    icons: [
      '✅', '✔️', '☑️', '❌', '🚫', '⚠️', '❓', '❗', 'ℹ️', '🔒',
      '🔓', '🔑', '🛡️', '⚙️', '🔧', '🔨', '🛠️', '🟢', '🟡', '🔴',
      '🔵', '🟣', '⚪', '⚫', '🧰', '🧱'
    ]
  }
];

// Unique set of all icons across all categories
export const ALL_ICONS = Array.from(
  new Set(EXTENSIVE_ICON_CATEGORIES.filter(c => c.id !== 'all').flatMap(c => c.icons))
);

// Map common search terms in Hebrew to relevant icons
const ICON_SEARCH_KEYWORDS = {
  'איש': ['👤', '👥', '🧑‍💼', '👨‍💻', '🤝', '👔'],
  'לקוח': ['👤', '🧑‍💼', '🤝', '💼', '🏢', '🏷️'],
  'ספק': ['🏭', '🏗️', '🚚', '📦', '🏢', '🏬'],
  'טלפון': ['📞', '📱', '☎️', '🗣️'],
  'מייל': ['✉️', '📧', '📨', '📫', '💬'],
  'אימייל': ['✉️', '📧', '📨', '📫'],
  'הודעה': ['💬', '✉️', '📧', '📨', '🔔'],
  'מסמך': ['📋', '📄', '📑', '📜', '📝', '📁', '📂'],
  'קובץ': ['📁', '📂', '📄', '📑', '📎', '🔗', '🗂️'],
  'חוזה': ['📑', '📜', '📄', '✍️', '🖊️', '🤝'],
  'הזמנה': ['📋', '🧾', '🛍️', '📦', '🏷️'],
  'פלנוגרמה': ['🗺️', '📐', '📏', '📊', '🖼️', '🧩'],
  'תוכנית': ['🗺️', '📐', '📋', '🧭', '📊'],
  'שרטוט': ['📐', '📏', '🗺️', '✏️', '🖌️'],
  'עיצוב': ['🎨', '🖼️', '🖌️', '🖍️', '✨', '💎'],
  'תמונה': ['🖼️', '📸', '📷', '🎬', '🎨'],
  'דייקאט': ['📐', '✂️', '📏', '🧩'],
  'זמן': ['⏱️', '⏰', '📅', '🗓️', '⏳', '⌛'],
  'יעד': ['🎯', '📅', '🏁', '🚩', '⏱️', '🚀'],
  'תאריך': ['📅', '🗓️', '⏰', '⏱️'],
  'שעות': ['⏱️', '⏰', '⏳', '⌛'],
  'עדיפות': ['⚡', '🔥', '🚨', '⭐', '🚩'],
  'דחוף': ['⚡', '🔥', '🚨', '❗', '⚠️'],
  'הערות': ['🔒', '📝', '🗒️', '💬', '💡'],
  'פנימי': ['🔒', '🛡️', '🔑', '🕵️'],
  'תקן': ['🏛️', '⚖️', '🛡️', '✅', '✔️'],
  'מכון': ['🏛️', '🏢', '⚖️'],
  'אישור': ['✅', '✔️', '☑️', '🛡️', '🏆'],
  'סניף': ['🏬', '🏢', '📍', '📌'],
  'חנות': ['🏬', '🛒', '🛍️'],
  'כסף': ['💰', '💳', '💵', '🪙', '🧾'],
  'משלוח': ['🚚', '🚛', '📦', '✈️', '🚢'],
  'פרויקט': ['🚀', '📋', '📁', '🎯', '✨']
};

export default function IconPickerModal({
  isOpen,
  onClose,
  currentIcon = '📋',
  onSelectIcon,
  title = 'בחירת אייקון',
  defaultIcon = null
}) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const displayedIcons = useMemo(() => {
    let list = ALL_ICONS;

    if (selectedCategory !== 'all') {
      const cat = EXTENSIVE_ICON_CATEGORIES.find(c => c.id === selectedCategory);
      if (cat) list = cat.icons;
    }

    const query = searchQuery.trim().toLowerCase();
    if (!query) return list;

    // Check keyword map matches
    const matchedFromKeywords = new Set();
    for (const [kw, icons] of Object.entries(ICON_SEARCH_KEYWORDS)) {
      if (kw.includes(query) || query.includes(kw)) {
        icons.forEach(ic => matchedFromKeywords.add(ic));
      }
    }

    return ALL_ICONS.filter(icon => {
      if (matchedFromKeywords.has(icon)) return true;
      if (icon === query) return true;
      return false;
    });
  }, [selectedCategory, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        direction: 'rtl',
        fontFamily: 'Rubik, sans-serif'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>{currentIcon}</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#1e293b' }}>
                {title}
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                בחרו אייקון מתוך המאגר המורחב
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.2rem',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '6px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Search & Categories */}
        <div style={{ padding: '14px 20px 8px', backgroundColor: '#ffffff' }}>
          <div style={{ marginBottom: '10px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 חיפוש אייקון (למשל: לקוח, טלפון, מייל, מסמך, יעד, קבצים)..."
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.88rem',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
              autoFocus
            />
          </div>

          {/* Category Chips */}
          <div style={{
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            paddingBottom: '6px',
            scrollbarWidth: 'thin'
          }}>
            {EXTENSIVE_ICON_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setSearchQuery('');
                }}
                style={{
                  padding: '5px 12px',
                  borderRadius: '999px',
                  border: selectedCategory === cat.id ? '1px solid #2563eb' : '1px solid #e2e8f0',
                  backgroundColor: selectedCategory === cat.id ? '#eff6ff' : '#f8fafc',
                  color: selectedCategory === cat.id ? '#1e40af' : '#475569',
                  fontWeight: selectedCategory === cat.id ? '700' : '500',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Icon Grid */}
        <div style={{
          padding: '12px 20px',
          overflowY: 'auto',
          flex: 1,
          maxHeight: '340px'
        }}>
          {displayedIcons.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 0', color: '#94a3b8' }}>
              <span style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }}>🔍</span>
              לא נמצאו אייקונים התואמים לחיפוש. נסו מילת מפתח אחרת.
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))',
              gap: '8px'
            }}>
              {displayedIcons.map(icon => {
                const isSelected = icon === currentIcon;
                return (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => {
                      onSelectIcon(icon);
                      onClose();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                      height: '44px',
                      borderRadius: '8px',
                      border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      backgroundColor: isSelected ? '#dbeafe' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.1s ease',
                      outline: 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = '#f1f5f9';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = '#ffffff';
                    }}
                    title={icon}
                  >
                    {icon}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#f8fafc'
        }}>
          {defaultIcon && currentIcon !== defaultIcon ? (
            <button
              type="button"
              onClick={() => {
                onSelectIcon(defaultIcon);
                onClose();
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563eb',
                cursor: 'pointer',
                fontSize: '0.82rem',
                textDecoration: 'underline',
                fontFamily: 'inherit'
              }}
            >
              איפוס לברירת מחדל ({defaultIcon})
            </button>
          ) : <div />}
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 16px',
              backgroundColor: '#e2e8f0',
              color: '#334155',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              fontSize: '0.85rem',
              cursor: 'pointer',
              fontFamily: 'inherit'
            }}
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
