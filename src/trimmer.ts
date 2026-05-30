// Lines that definitively indicate ebook app attribution
const ATTRIBUTION_PATTERNS: RegExp[] = [
  /^https?:\/\//i,        // Any URL
  /\[.*ebook.*\]/i,       // [크레마 예스24 eBook] etc.
  /에서 자세히 보기/,       // 교보eBook에서 자세히 보기
  /교보ebook/i,            // 교보eBook
  /크레마/,                // 크레마 (예스24)
  /리디북스/,              // Ridibooks
  /밀리의\s*서재/,         // 밀리의서재
  /북큐브/,                // 북큐브
  /yes24\.com/i,           // yes24 domain in URL
  /kyobobook\.co\.kr/i,    // kyobo domain in URL
  /ridibooks\.com/i,       // ridi domain in URL
];

// Lines that are secondary citation info (book title / author)
// Only treated as attribution when they follow clear attribution lines
const BOOK_CITATION_PATTERNS: RegExp[] = [
  /중에서$/,              // "책 제목 중에서"
  / \| /,                // "제목 | 저자" (크레마 예스24 format)
];

export function trimEbookAttribution(text: string): string {
  const lines = text.split('\n');
  let attributionStart = -1;

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();

    if (ATTRIBUTION_PATTERNS.some(p => p.test(line))) {
      attributionStart = i;
    } else if (line === '') {
      // blank lines can appear anywhere within the attribution block
      continue;
    } else if (attributionStart !== -1 && BOOK_CITATION_PATTERNS.some(p => p.test(line))) {
      // book title / author line that precedes known attribution
      attributionStart = i;
    } else {
      break;
    }
  }

  if (attributionStart === -1) return text;

  // Also strip blank lines between content and attribution block
  let end = attributionStart;
  while (end > 0 && lines[end - 1].trim() === '') {
    end--;
  }

  return lines.slice(0, end).join('\n');
}
