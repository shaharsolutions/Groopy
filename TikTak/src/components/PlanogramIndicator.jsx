export default function PlanogramIndicator({ compact = false }) {
  return (
    <span
      className={`planogram-indicator ${compact ? 'compact' : ''}`}
      title="הועלתה פלנוגרמה"
      aria-label="הועלתה פלנוגרמה"
    >
      <span aria-hidden="true">▣</span>
      {!compact && <span>פלנוגרמה</span>}
    </span>
  );
}
