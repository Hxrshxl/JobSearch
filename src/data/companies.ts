import type { Company } from '@/types/job';
import rawData from './india_job_hunt_company_database (1).json';

interface RawEntry {
  company_name: string;
  ats_platform: string;
  ats_job_board_url: string;
  official_career_url: string;
}

function leverToken(url: string, name: string): string {
  const m = url.match(/jobs\.lever\.co\/([^/?#\s]+)/);
  return m ? m[1] : slug(name);
}

function greenhouseToken(url: string, name: string): string {
  const m = url.match(/boards\.greenhouse\.io\/([^/?#\s]+)/);
  return m ? m[1] : slug(name);
}

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(
      /\s+(india|global|technologies?|technology|systems?|solutions?|pvt\.?|ltd\.?|inc\.?|group|corp\.?|llc)\b.*/,
      ''
    )
    .replace(/[^a-z0-9]/g, '');
}

export const DEFAULT_COMPANIES: Company[] = (rawData as RawEntry[]).map((e) => {
  const jobUrl = e.ats_job_board_url ?? '';
  const careerUrl = e.official_career_url ?? '';

  switch (e.ats_platform) {
    case 'Lever':
      return {
        name: e.company_name,
        ats_platform: 'lever',
        ats_token: leverToken(jobUrl, e.company_name),
        careers_url: careerUrl,
      };

    case 'Greenhouse':
      return {
        name: e.company_name,
        ats_platform: 'greenhouse',
        ats_token: greenhouseToken(jobUrl, e.company_name),
        careers_url: careerUrl,
      };

    case 'Workday':
    case 'SuccessFactors':
    case 'Taleo':
    case 'Kenexa':
      return {
        name: e.company_name,
        ats_platform: 'workday_manual',
        ats_token: '',
        careers_url: careerUrl,
      };

    default:
      // Custom, Ashby, SmartRecruiters, empty string — flag for manual check
      return {
        name: e.company_name,
        ats_platform: 'unknown_manual',
        ats_token: '',
        careers_url: careerUrl,
      };
  }
});
