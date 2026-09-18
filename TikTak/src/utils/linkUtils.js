/**
 * Parses a plain text string into an array of segments:
 * plain text parts and detected links (web URLs, domains, emails).
 */
export function parseLinks(text) {
  if (!text || typeof text !== 'string') {
    return [{ type: 'text', value: text || '' }];
  }

  // Regex matching:
  // 1. Full URLs with http/https
  // 2. URLs starting with www.
  // 3. Common domain names without protocol (labels start and end with alphanumeric)
  // 4. Email addresses
  const urlPattern = /(https?:\/\/[^\s<>]+)|(www\.[^\s<>]+\.[^\s<>]+)|([a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.(?:com|co\.il|org\.il|gov\.il|net\.il|ac\.il|org|net|io|co|ai|me|app|dev|biz|info|site|online|store|shop)(?:\/[^\s<>]*)?)|([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;

  const results = [];
  let lastIndex = 0;
  let match;

  while ((match = urlPattern.exec(text)) !== null) {
    let raw = match[0];
    const startIndex = match.index;

    // Check boundary before match: must not be preceded by alphanumeric, @, or /
    if (startIndex > 0) {
      const prevChar = text[startIndex - 1];
      if (/[a-zA-Z0-9@/]/.test(prevChar)) {
        continue;
      }
    }

    // Strip trailing punctuation often attached in sentence context
    while (raw.length > 0) {
      const lastChar = raw[raw.length - 1];
      if (/[.,!?:;'"”’\\״׳]/.test(lastChar)) {
        raw = raw.slice(0, -1);
      } else if (lastChar === ')' || lastChar === ']' || lastChar === '}') {
        const openChar = lastChar === ')' ? '(' : lastChar === ']' ? '[' : '{';
        const openCount = (raw.match(new RegExp('\\' + openChar, 'g')) || []).length;
        const closeCount = (raw.match(new RegExp('\\' + lastChar, 'g')) || []).length;
        if (closeCount > openCount) {
          raw = raw.slice(0, -1);
        } else {
          break;
        }
      } else {
        break;
      }
    }

    if (!raw) continue;

    // Push text before this link
    if (startIndex > lastIndex) {
      results.push({ type: 'text', value: text.slice(lastIndex, startIndex) });
    }

    // Determine normalized href
    let href = raw;
    if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(raw)) {
      href = 'mailto:' + raw;
    } else if (!/^https?:\/\//i.test(raw)) {
      href = 'https://' + raw;
    }

    results.push({ type: 'link', value: raw, href });
    lastIndex = startIndex + raw.length;

    // Synchronize regex index in case trailing punctuation was stripped
    urlPattern.lastIndex = lastIndex;
  }

  if (lastIndex < text.length) {
    results.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return results;
}

/**
 * Truncates segments while keeping link targets intact.
 */
export function truncateSegments(segments, maxLength) {
  if (!maxLength || maxLength <= 0) return segments;

  let currentLength = 0;
  const result = [];

  for (const seg of segments) {
    if (currentLength >= maxLength) break;

    const remaining = maxLength - currentLength;
    if (seg.value.length <= remaining) {
      result.push(seg);
      currentLength += seg.value.length;
    } else {
      result.push({
        ...seg,
        value: seg.value.slice(0, remaining) + '...'
      });
      break;
    }
  }

  return result;
}

/**
 * Checks if a string is written in English/Latin only (contains English/Latin letters and NO Hebrew characters).
 */
export function isEnglishOnly(text) {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  if (!trimmed) return false;
  const hasHebrew = /[\u0590-\u05FF]/.test(trimmed);
  const hasEnglish = /[a-zA-Z]/.test(trimmed);
  return !hasHebrew && hasEnglish;
}
