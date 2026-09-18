/**
 * Footer Component
 * 
 * Displays attribution and link to Shahar Digital Solutions.
 */
export default function Footer({ className = '', style = {}, transparent = false }) {
  return (
    <footer 
      className={`app-footer ${transparent ? 'app-footer--transparent' : ''} ${className}`.trim()}
      style={style}
    >
      <span>מערכת מבית </span>
      <a 
        href="https://www.shaharsolutions.com/" 
        target="_blank" 
        rel="noopener noreferrer"
      >
        שחר פתרונות דיגיטליים
      </a>
    </footer>
  );
}
