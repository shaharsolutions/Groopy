import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 size={18} color="#10B981" />,
    error: <AlertCircle size={18} color="#EF4444" />,
    info: <Info size={18} color="#2563EB" />
  };

  return (
    <div className={`toast-notification-banner toast-${toast.type || 'success'}`}>
      <div className="toast-icon-wrapper">
        {icons[toast.type] || icons.success}
      </div>
      <div className="toast-message-text">
        {toast.message}
      </div>
      <button className="toast-close-btn" onClick={onClose}>
        <X size={16} />
      </button>
    </div>
  );
}
