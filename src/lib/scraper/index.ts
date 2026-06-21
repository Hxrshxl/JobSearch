import { Company, JobResult } from '@/types/job';
import { scanGreenhouse } from './greenhouse';
import { scanLever } from './lever';
import { scanSmartRecruiters } from './smartrecruiters';

export async function scanCompany(company: Company): Promise<JobResult[]> {
  switch (company.ats_platform) {
    case 'greenhouse':
      return scanGreenhouse(company);
    case 'lever':
      return scanLever(company);
    case 'smartrecruiters':
      return scanSmartRecruiters(company);
    case 'workday_manual':
    case 'unknown_manual':
      return [
        {
          company: company.name,
          ats_platform: company.ats_platform,
          job_title: 'Manual check required',
          location: '—',
          posted_timestamp: new Date().toISOString(),
          recency_flag: 'manual_check',
          job_url: company.careers_url ?? '',
          experience_level_detected: 'not specified',
          stack_match_score: 0,
          key_requirements_snippet: `Visit ${company.careers_url ?? 'careers page'} — no public API available.`,
          action_status: 'not_applied',
        },
      ];
    default:
      return [];
  }
}
