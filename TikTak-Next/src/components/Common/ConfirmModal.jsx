import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export function ConfirmModal({
  isOpen = true,
  title = "אישור פעולה",
  message = "האם אתה בטוח שברצונך לבצע פעולה זו?",
  confirmText = "אשר מחיקה",
  cancelText = "ביטול",
  isDanger = true,
  onConfirm,
  onCancel
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
        <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: '0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 800, fontSize: '1.15rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: isDanger ? '#FEE2E2' : '#DBEAFE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertTriangle size={20} color={isDanger ? '#DC2626' : '#2563EB'} />
            </div>
            <span>{title}</span>
          </div>
          <button className="icon-btn-sm" onClick={onCancel}><X size={18} /></button>
        </div>

        <div className="modal-body" style={{ paddingTop: '12px' }}>
          <p style={{ fontSize: '0.92rem', color: 'var(--text-main)', lineHeight: '1.6' }}>
            {message}
          </p>
        </div>

        <div className="modal-footer" style={{ borderTop: '1px solid var(--border-light)' }}>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn ${isDanger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
