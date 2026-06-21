import { Company, JobResult } from '@/types/job';
import {
  getRecencyFlag,
  matchesTargetTitle,
  isSeniorityExcluded,
  matchesLocationFilter,
  computeStackScore,
  stripHtml,
  getFirst200Words,
  detectExperienceLevel,
  extractSnippet,
} from './filter';

interface LeverPosting {
  id: string;
  text: string;
  categories: {
    location?: string;
    team?: string;
  };
  hostedUrl: string;
  createdAt: number;
  description?: string;
  descriptionPlain?: string;
  lists?: Array<{ text: string; content: string }>;
}

export async function scanLever(company: Company): Promise<JobResult[]> {
  const url = `https://api.lever.co/v0/postings/${company.ats_token}?mode=json`;

  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 12000);

  let postings: LeverPosting[];
  try {
    const res = await fetch(url, {
      signal: abort.signal,
      headers: { 'User-Agent': 'JobSearchApp/1.0' },
      cache: 'no-store',
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    postings = await res.json();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }

  const results: JobResult[] = [];

  for (const posting of postings ?? []) {
    const postedAt = new Date(posting.createdAt).toISOString();
    const recencyFlag = getRecencyFlag(postedAt);
    if (!recencyFlag) continue;

    if (!matchesTargetTitle(posting.text)) continue;

    const plain = [
      posting.descriptionPlain ?? (posting.description ? stripHtml(posting.description) : ''),
      ...(posting.lists ?? []).map((l) => `${l.text}: ${stripHtml(l.content)}`),
    ].join(' ');

    const first200 = getFirst200Words(plain);

    if (isSeniorityExcluded(posting.text, first200)) continue;
    if (!matchesLocationFilter(posting.categories?.location ?? '')) continue;

    results.push({
      company: company.name,
      ats_platform: 'lever',
      job_title: posting.text,
      location: posting.categories?.location ?? 'Not specified',
      posted_timestamp: postedAt,
      recency_flag: recencyFlag,
      job_url: posting.hostedUrl,
      experience_level_detected: detectExperienceLevel(first200),
      stack_match_score: computeStackScore(plain),
      key_requirements_snippet: extractSnippet(plain),
      action_status: 'not_applied',
    });
  }

  return results;
}
