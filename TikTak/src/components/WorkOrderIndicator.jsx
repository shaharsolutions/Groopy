export default function WorkOrderIndicator({ compact = false }) {
  return (
    <span
      className={`work-order-indicator ${compact ? 'compact' : ''}`}
      title="הועלתה הזמנת עבודה"
      aria-label="הועלתה הזמנת עבודה"
    >
      <span aria-hidden="true">📋</span>
      {!compact && <span>הזמנת עבודה</span>}
    </span>
  );
}
