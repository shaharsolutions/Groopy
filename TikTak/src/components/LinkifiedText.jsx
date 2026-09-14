import React from 'react';
import { parseLinks, truncateSegments } from '../utils/linkUtils';

export { parseLinks, truncateSegments };

/**
 * Component that turns any URL / link in text into a clickable link.
 * 
 * Props:
 * - text: string to render
 * - truncate: maximum character count for displayed text (preserves full href!)
 * - inline: collapses newlines into spaces (ideal for compact table cells)
 * - className: custom css class
 * - style: custom style
 * - onClickLink: callback when link is clicked
 */
export default function LinkifiedText({
  text,
  truncate,
  inline = false,
  className = '',
  style = {},
  onClickLink
}) {
  if (text === null || text === undefined || text === '') {
    return null;
  }

  let processedText = String(text);
  if (inline) {
    processedText = processedText.replace(/\r?\n+/g, ' ');
  }

  const segments = parseLinks(processedText);
  const renderedSegments = truncateSegments(segments, truncate);

  return (
    <span
      className={`linkified-text ${inline ? 'inline' : ''} ${className}`.trim()}
      style={style}
    >
      {renderedSegments.map((seg, idx) => {
        if (seg.type === 'link') {
          return (
            <a
              key={idx}
              href={seg.href}
              target="_blank"
              rel="noopener noreferrer"
              className="auto-link"
              title={seg.href}
              onClick={(e) => {
                e.stopPropagation();
                if (onClickLink) onClickLink(e, seg.href);
              }}
            >
              {seg.value}
            </a>
          );
        }
        return <React.Fragment key={idx}>{seg.value}</React.Fragment>;
      })}
    </span>
  );
}
