export default function PlanogramIndicator({ compact = false }) {
  return (
    <span
      className={`planogram-indicator ${compact ? 'compact' : ''}`}
      title="הועלתה פלנוגרמה לפרויקט"
      aria-label="הועלתה פלנוגרמה לפרויקט"
    >
      <span aria-hidden="true">▣</span>
      {!compact && <span>פלנוגרמה</span>}
    </span>
  );
}
