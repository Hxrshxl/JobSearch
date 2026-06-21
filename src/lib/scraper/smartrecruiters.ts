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

interface SRPosting {
  id: string;
  name: string;
  releasedDate: string;
  location: {
    city?: string;
    country?: string;
    region?: string;
    remote?: boolean;
  };
  ref: string;
  experienceLevel?: { id: string; label: string };
  department?: { label: string };
}

interface SRDetail {
  jobAd?: {
    sections?: {
      jobDescription?: { text: string };
      qualifications?: { text: string };
    };
  };
}

interface SRResponse {
  content: SRPosting[];
}

async function fetchDetail(companyToken: string, jobId: string): Promise<string> {
  try {
    const res = await fetch(
      `https://api.smartrecruiters.com/v1/companies/${companyToken}/postings/${jobId}`,
      { cache: 'no-store', headers: { 'User-Agent': 'JobSearchApp/1.0' } }
    );
    if (!res.ok) return '';
    const detail: SRDetail = await res.json();
    return [
      detail.jobAd?.sections?.jobDescription?.text ?? '',
      detail.jobAd?.sections?.qualifications?.text ?? '',
    ]
      .map(stripHtml)
      .join(' ');
  } catch {
    return '';
  }
}

export async function scanSmartRecruiters(company: Company): Promise<JobResult[]> {
  const url = `https://api.smartrecruiters.com/v1/companies/${company.ats_token}/postings`;

  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 12000);

  let data: SRResponse;
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

  for (const posting of data.content ?? []) {
    const recencyFlag = getRecencyFlag(posting.releasedDate);
    if (!recencyFlag) continue;

    if (!matchesTargetTitle(posting.name)) continue;

    const expLabel = posting.experienceLevel?.label ?? '';
    if (/senior|mid.?senior|director|manager/i.test(expLabel)) continue;

    const locationStr = [
      posting.location?.city,
      posting.location?.region,
      posting.location?.country,
      posting.location?.remote ? 'Remote' : '',
    ]
      .filter(Boolean)
      .join(', ');

    if (!matchesLocationFilter(locationStr)) continue;

    const descText = await fetchDetail(company.ats_token, posting.id);
    const first200 = getFirst200Words(descText);

    if (isSeniorityExcluded(posting.name, first200)) continue;

    const expDetected = /entry.?level/i.test(expLabel)
      ? 'entry level'
      : detectExperienceLevel(first200);

    results.push({
      company: company.name,
      ats_platform: 'smartrecruiters',
      job_title: posting.name,
      location: locationStr || 'Not specified',
      posted_timestamp: posting.releasedDate,
      recency_flag: recencyFlag,
      job_url: posting.ref,
      experience_level_detected: expDetected,
      stack_match_score: computeStackScore(descText),
      key_requirements_snippet:
        extractSnippet(descText) || `${posting.department?.label ?? ''} role at ${company.name}`.trim(),
      action_status: 'not_applied',
    });
  }

  return results;
}
