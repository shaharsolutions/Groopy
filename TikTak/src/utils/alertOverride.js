/**
 * Custom global window.alert override for Groopy/TikTak
 * Turns standard alert() calls into beautiful HTML modals that support innerHTML.
 */
if (typeof window !== 'undefined') {
  window.alert = function (message) {
    // 1. Remove any existing custom alerts to prevent stacking
    const existingAlert = document.getElementById('custom-global-alert');
    if (existingAlert) {
      existingAlert.remove();
    }

    // 2. Create the overlay container
    const overlay = document.createElement('div');
    overlay.id = 'custom-global-alert';
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '99999';

    // 3. Create the dialog card
    const content = document.createElement('div');
    content.className = 'modal-content';
    content.style.maxWidth = '420px';
    content.style.width = '90%';
    content.style.maxHeight = '90vh';
    content.style.borderRadius = 'var(--radius-lg)';
    content.style.overflow = 'hidden';
    content.style.boxShadow = 'var(--shadow-lg)';
    content.style.animation = 'modal-slide-up 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)';
    
    // Prevent click inside the dialog from closing it
    content.addEventListener('click', (e) => e.stopPropagation());

    // 4. Modal Header
    const header = document.createElement('div');
    header.className = 'modal-header';
    header.style.padding = '16px 20px';
    header.style.borderBottom = '1px solid var(--border)';
    header.style.background = 'var(--surface)';

    const title = document.createElement('h3');
    title.className = 'modal-title';
    title.style.fontSize = '1.15rem';
    title.style.fontWeight = '700';
    title.style.margin = '0';
    title.textContent = 'הודעת מערכת';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'modal-close';
    closeBtn.style.width = '32px';
    closeBtn.style.height = '32px';
    closeBtn.style.fontSize = '1.25rem';
    closeBtn.style.display = 'flex';
    closeBtn.style.alignItems = 'center';
    closeBtn.style.justifyContent = 'center';
    closeBtn.innerHTML = '&times;';

    header.appendChild(title);
    header.appendChild(closeBtn);

    // 5. Modal Body
    const body = document.createElement('div');
    body.className = 'modal-body';
    body.style.padding = '20px 24px';
    body.style.fontSize = '0.975rem';
    body.style.lineHeight = '1.6';
    body.style.color = 'var(--text)';
    
    // Render the alert message as HTML (innerHTML)
    body.innerHTML = message;

    // 6. Modal Footer
    const footer = document.createElement('div');
    footer.className = 'modal-footer';
    footer.style.padding = '12px 20px';
    footer.style.borderTop = '1px solid var(--border)';
    footer.style.background = '#f8fafc';
    footer.style.justifyContent = 'center';

    const okBtn = document.createElement('button');
    okBtn.className = 'btn btn-primary';
    okBtn.style.minWidth = '120px';
    okBtn.style.padding = '8px 16px';
    okBtn.textContent = 'אישור';

    footer.appendChild(okBtn);

    content.appendChild(header);
    content.appendChild(body);
    content.appendChild(footer);
    overlay.appendChild(content);

    // 7. Cleanup and closing handlers
    const closeAlert = () => {
      document.removeEventListener('keydown', handleKeyDown);
      overlay.remove();
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        closeAlert();
      }
    };

    okBtn.addEventListener('click', closeAlert);
    closeBtn.addEventListener('click', closeAlert);
    overlay.addEventListener('click', closeAlert);

    document.addEventListener('keydown', handleKeyDown);

    // 8. Append to DOM
    document.body.appendChild(overlay);

    // Auto-focus OK button for easy keyboard access
    setTimeout(() => {
      okBtn.focus();
    }, 50);
  };
}
