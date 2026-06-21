import { RecencyFlag } from '@/types/job';

const TARGET_TITLE_PATTERNS = [
  /\bsoftware\s+engineer\b/i,
  /\bsoftware\s+developer\b/i,
  /\bsde[-\s]?1\b/i,
  /\bsde[-\s]?i\b(?!i)/i,
  /\bbackend\s+developer\b/i,
  /\bfull[-\s]?stack\s+developer\b/i,
  /\bnode\.?js\s+developer\b/i,
  /\bjunior\s+(?:software\s+)?(?:engineer|developer)\b/i,
  /\bassociate\s+(?:software\s+)?(?:engineer|developer)\b/i,
  /\bengineer\s+i\b/i,
];

const SENIORITY_TITLE_EXCLUDES = [
  /\bsenior\b/i,
  /\bsr\.\s/i,
  /\bsr\s/i,
  /\bstaff\b/i,
  /\blead\b/i,
  /\bprincipal\b/i,
  /\bmanager\b/i,
  /\bdirector\b/i,
  /\bsde[-\s]?2\b/i,
  /\bsde[-\s]?3\b/i,
  /\bsde[-\s]?ii\b/i,
  /\bsde[-\s]?iii\b/i,
  /\bsde2\b/i,
  /\bsde3\b/i,
];

// These allowlist patterns override the excludes below (e.g. "0-3 years" is fine)
const YEARS_ALLOWLIST = [
  /\b0[-–]\s*3\s*years?\b/i,
  /\b0[-–]\s*2\s*years?\b/i,
  /\b1[-–]\s*3\s*years?\b/i,
  /\b1[-–]\s*2\s*years?\b/i,
  /\b0[-–]\s*1\s*years?\b/i,
];

const YEARS_EXCLUDES = [
  /\b5\+\s*years?\b/i,
  /\b3\+\s*years?\b/i,
  /\bminimum\s+(?:of\s+)?3\s+years?\b/i,
  /\bat\s+least\s+3\s+years?\b/i,
];

const INDIA_LOCATION_PATTERNS = [
  /\bindia\b/i,
  /\bpune\b/i,
  /\bbengaluru\b/i,
  /\bbangalore\b/i,
  /\bhyderabad\b/i,
  /\bmumbai\b/i,
  /\bbombay\b/i,
  /\bremote\b/i,
  /\bwork\s*from\s*home\b/i,
  /\bwfh\b/i,
  /\bhybrid\b/i,
  /\bpan[-\s]?india\b/i,
  /\bchenai\b/i,
  /\bnoida\b/i,
  /\bgurgaon\b/i,
];

const STACK_KEYWORDS: Array<{ pattern: RegExp; weight: number }> = [
  { pattern: /node\.?js/i, weight: 2 },
  { pattern: /typescript/i, weight: 2 },
  { pattern: /nestjs/i, weight: 2 },
  { pattern: /postgresql|postgres/i, weight: 1 },
  { pattern: /mongodb/i, weight: 1 },
  { pattern: /express\.?js/i, weight: 1 },
  { pattern: /rest\s*api/i, weight: 1 },
  { pattern: /javascript/i, weight: 1 },
  { pattern: /backend|back[-\s]end/i, weight: 1 },
  { pattern: /full[-\s]?stack/i, weight: 1 },
  { pattern: /react\.?js/i, weight: 1 },
  { pattern: /next\.?js/i, weight: 1 },
  { pattern: /prisma/i, weight: 1 },
  { pattern: /typeorm/i, weight: 1 },
  { pattern: /jwt/i, weight: 1 },
  { pattern: /graphql/i, weight: 1 },
];

export function getRecencyFlag(timestamp: string | undefined): RecencyFlag | null {
  if (!timestamp) return null;
  const posted = new Date(timestamp).getTime();
  if (isNaN(posted)) return null;
  const diffHours = (Date.now() - posted) / (1000 * 60 * 60);
  if (diffHours < 0 || diffHours > 48) return null;
  return diffHours <= 24 ? 'new_24h' : 'review_48h';
}

export function matchesTargetTitle(title: string): boolean {
  return TARGET_TITLE_PATTERNS.some((p) => p.test(title));
}

export function isSeniorityExcluded(title: string, descFirst200Words: string): boolean {
  if (SENIORITY_TITLE_EXCLUDES.some((p) => p.test(title))) return true;
  const hasAllowlist = YEARS_ALLOWLIST.some((p) => p.test(descFirst200Words));
  if (!hasAllowlist && YEARS_EXCLUDES.some((p) => p.test(descFirst200Words))) return true;
  return false;
}

export function matchesLocationFilter(location: string): boolean {
  if (!location?.trim()) return true;
  return INDIA_LOCATION_PATTERNS.some((p) => p.test(location));
}

export function computeStackScore(text: string): number {
  let score = 0;
  for (const { pattern, weight } of STACK_KEYWORDS) {
    if (pattern.test(text)) score += weight;
  }
  return Math.min(10, score);
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#?\w+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getFirst200Words(text: string): string {
  return text.split(/\s+/).slice(0, 200).join(' ');
}

export function detectExperienceLevel(text: string): string {
  const rangeMatch = text.match(/(\d+)\s*[-–to]+\s*(\d+)\s*(?:years?|yrs?)/i);
  if (rangeMatch) return `${rangeMatch[1]}-${rangeMatch[2]} years`;
  const plusMatch = text.match(/(\d+)\+\s*(?:years?|yrs?)/i);
  if (plusMatch) return `${plusMatch[1]}+ years`;
  if (/fresher|entry.?level|zero.?experience|no.?experience/i.test(text)) return 'entry level';
  return 'not specified';
}

export function extractSnippet(text: string): string {
  const reqMatch = text.match(
    /(?:requirements?|qualifications?|what you.?(?:ll)?\s*need|must.?have|skills?\s*(?:required|needed))[:\s]*(.{50,})/i
  );
  const raw = reqMatch ? reqMatch[1] : text;
  return raw.slice(0, 200).trim();
}
