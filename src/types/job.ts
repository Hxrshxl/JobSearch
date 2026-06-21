export type ATSPlatform =
  | 'greenhouse'
  | 'lever'
  | 'smartrecruiters'
  | 'workday_manual'
  | 'unknown_manual';

export type RecencyFlag = 'new_24h' | 'review_48h' | 'manual_check';

export type ActionStatus =
  | 'not_applied'
  | 'applied'
  | 'referral_requested'
  | 'interview';

export interface JobResult {
  company: string;
  ats_platform: ATSPlatform;
  job_title: string;
  location: string;
  posted_timestamp: string;
  recency_flag: RecencyFlag;
  job_url: string;
  experience_level_detected: string;
  stack_match_score: number;
  key_requirements_snippet: string;
  action_status: ActionStatus;
}

export interface Company {
  name: string;
  ats_platform: ATSPlatform;
  ats_token: string;
  careers_url?: string;
}

export type ScanMessage =
  | { type: 'progress'; company: string; status: 'fetching' | 'done' | 'error'; count?: number; error?: string }
  | { type: 'result'; jobs: JobResult[] }
  | { type: 'complete' };
