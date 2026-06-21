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

interface GreenhouseJob {
  id: number;
  title: string;
  location: { name: string };
  absolute_url: string;
  updated_at: string;
  content?: string;
}

interface GreenhouseResponse {
  jobs: GreenhouseJob[];
}

export async function scanGreenhouse(company: Company): Promise<JobResult[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${company.ats_token}/jobs?content=true`;

  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 12000);

  let data: GreenhouseResponse;
  try {
    const res = await fetch(url, {
      signal: abort.signal,
      headers: { 'User-Agent': 'JobSearchApp/1.0' },
      cache: 'no-store',
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }

  const results: JobResult[] = [];

  for (const job of data.jobs ?? []) {
    const recencyFlag = getRecencyFlag(job.updated_at);
    if (!recencyFlag) continue;

    if (!matchesTargetTitle(job.title)) continue;

    const plain = job.content ? stripHtml(job.content) : '';
    const first200 = getFirst200Words(plain);

    if (isSeniorityExcluded(job.title, first200)) continue;
    if (!matchesLocationFilter(job.location?.name ?? '')) continue;

    results.push({
      company: company.name,
      ats_platform: 'greenhouse',
      job_title: job.title,
      location: job.location?.name ?? 'Not specified',
      posted_timestamp: job.updated_at,
      recency_flag: recencyFlag,
      job_url: job.absolute_url,
      experience_level_detected: detectExperienceLevel(first200),
      stack_match_score: computeStackScore(plain),
      key_requirements_snippet: extractSnippet(plain),
      action_status: 'not_applied',
    });
  }

  return results;
}
