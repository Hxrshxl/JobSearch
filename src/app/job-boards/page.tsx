'use client';

import { useState, useCallback, useRef } from 'react';
import { DEFAULT_COMPANIES } from '@/data/companies';
import { JobResult, ScanMessage, ActionStatus, ATSPlatform, RecencyFlag } from '@/types/job';

type CompanyState = {
  status: 'idle' | 'fetching' | 'done' | 'error';
  count?: number;
  error?: string;
};

const ATS_BADGE: Record<ATSPlatform, string> = {
  greenhouse: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  lever: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  smartrecruiters: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
  workday_manual: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  unknown_manual: 'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-gray-300',
};

const RECENCY_BADGE: Record<RecencyFlag, string> = {
  new_24h: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  review_48h: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  manual_check: 'bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-gray-400',
};

const RECENCY_LABEL: Record<RecencyFlag, string> = {
  new_24h: '< 24 h',
  review_48h: '24–48 h',
  manual_check: 'Manual',
};

const ACTION_OPTIONS: ActionStatus[] = [
  'not_applied',
  'applied',
  'referral_requested',
  'interview',
];

const ACTION_LABEL: Record<ActionStatus, string> = {
  not_applied: 'Not applied',
  applied: 'Applied',
  referral_requested: 'Referral requested',
  interview: 'Interview',
};

const ACTION_COLOR: Record<ActionStatus, string> = {
  not_applied: 'border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300',
  applied: 'border-blue-400 text-blue-700 dark:text-blue-300',
  referral_requested: 'border-violet-400 text-violet-700 dark:text-violet-300',
  interview: 'border-green-400 text-green-700 dark:text-green-300',
};

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 7
      ? 'bg-green-500'
      : score >= 4
      ? 'bg-amber-400'
      : 'bg-gray-300 dark:bg-zinc-600';
  return (
    <div className="flex items-center gap-1.5 min-w-[72px]">
      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${(score / 10) * 100}%` }} />
      </div>
      <span className="text-xs tabular-nums text-gray-500 dark:text-gray-400">{score}</span>
    </div>
  );
}

const SCRAPEABLE = DEFAULT_COMPANIES.filter(
  (c) => c.ats_platform !== 'workday_manual' && c.ats_platform !== 'unknown_manual'
);
const MANUAL = DEFAULT_COMPANIES.filter(
  (c) => c.ats_platform === 'workday_manual' || c.ats_platform === 'unknown_manual'
);

export default function JobBoardsPage() {
  const [jobs, setJobs] = useState<JobResult[]>([]);
  const [companyState, setCompanyState] = useState<Record<string, CompanyState>>({});
  const [scanning, setScanning] = useState(false);
  const [scanDone, setScanDone] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, ActionStatus>>({});
  const [minScore, setMinScore] = useState(0);
  const [recencyFilter, setRecencyFilter] = useState<string>('all');
  const abortRef = useRef<AbortController | null>(null);

  const startScan = useCallback(async () => {
    if (scanning) {
      abortRef.current?.abort();
      setScanning(false);
      return;
    }

    setJobs([]);
    setCompanyState({});
    setScanDone(false);
    setScanning(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch('/api/jobs/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companies: DEFAULT_COMPANIES }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) throw new Error('Scan request failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.trim()) continue;
          const msg: ScanMessage = JSON.parse(line);

          if (msg.type === 'progress') {
            setCompanyState((prev) => ({
              ...prev,
              [msg.company]: { status: msg.status, count: msg.count, error: msg.error },
            }));
          } else if (msg.type === 'result') {
            setJobs((prev) => [...prev, ...msg.jobs]);
          } else if (msg.type === 'complete') {
            setScanDone(true);
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') console.error(err);
    } finally {
      setScanning(false);
    }
  }, [scanning]);

  const setStatus = useCallback((url: string, s: ActionStatus) => {
    setStatuses((prev) => ({ ...prev, [url]: s }));
  }, []);

  const filtered = jobs
    .filter((j) => j.stack_match_score >= minScore)
    .filter((j) => recencyFilter === 'all' || j.recency_flag === recencyFilter)
    .sort((a, b) => {
      const order: Record<RecencyFlag, number> = { new_24h: 0, review_48h: 1, manual_check: 2 };
      const d = order[a.recency_flag] - order[b.recency_flag];
      return d !== 0 ? d : b.stack_match_score - a.stack_match_score;
    });

  const doneCount = Object.values(companyState).filter((s) => s.status === 'done' || s.status === 'error').length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Job Boards</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {SCRAPEABLE.length} companies via API · {MANUAL.length} manual · Greenhouse / Lever / SmartRecruiters
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {scanDone && (
              <span className="text-sm text-gray-400 dark:text-gray-500">
                {jobs.length} job{jobs.length !== 1 ? 's' : ''} found
              </span>
            )}
            <button
              onClick={startScan}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                scanning
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {scanning ? 'Stop' : 'Start scan'}
            </button>
          </div>
        </div>

        {/* Scan progress */}
        {(scanning || scanDone) && (
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Progress
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                {doneCount} / {SCRAPEABLE.length}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-y-2 gap-x-4">
              {SCRAPEABLE.map((c) => {
                const cs = companyState[c.name];
                return (
                  <div key={c.name} className="flex items-center gap-2 text-sm min-w-0">
                    {!cs && (
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-gray-200 dark:border-zinc-700 shrink-0" />
                    )}
                    {cs?.status === 'fetching' && (
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin shrink-0" />
                    )}
                    {cs?.status === 'done' && (
                      <svg className="w-3.5 h-3.5 text-green-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    {cs?.status === 'error' && (
                      <svg className="w-3.5 h-3.5 text-red-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                    <span className="truncate text-gray-700 dark:text-gray-300">{c.name}</span>
                    {cs?.status === 'done' && (cs.count ?? 0) > 0 && (
                      <span className="ml-auto text-xs font-medium text-green-600 dark:text-green-400 shrink-0">
                        +{cs.count}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filters */}
        {jobs.length > 0 && (
          <div className="flex flex-wrap items-center gap-4">
            <select
              value={recencyFilter}
              onChange={(e) => setRecencyFilter(e.target.value)}
              className="text-sm border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 bg-white dark:bg-zinc-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All recency</option>
              <option value="new_24h">New (&lt; 24 h)</option>
              <option value="review_48h">Review (24–48 h)</option>
            </select>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Min match:</span>
              <input
                type="range"
                min={0}
                max={10}
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="w-24 accent-blue-600"
              />
              <span className="text-sm tabular-nums text-gray-700 dark:text-gray-300 w-4">{minScore}</span>
            </div>
            <span className="text-sm text-gray-400 dark:text-gray-500 ml-auto">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Results table */}
        {filtered.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-zinc-800 bg-gray-50/80 dark:bg-zinc-950/60">
                    {['Company', 'Title', 'Location', 'ATS', 'Posted', 'Match', 'Requirements', 'Status', ''].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-zinc-800/60">
                  {filtered.map((job) => {
                    const currentStatus = statuses[job.job_url] ?? job.action_status;
                    return (
                      <tr
                        key={job.job_url + job.job_title}
                        className="hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                          {job.company}
                        </td>
                        <td className="px-4 py-3 max-w-[200px]">
                          <p className="text-gray-900 dark:text-white line-clamp-2 leading-snug" title={job.job_title}>
                            {job.job_title}
                          </p>
                          {job.experience_level_detected !== 'not specified' && (
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              {job.experience_level_detected}
                            </span>
                          )}
                        </td>
                        <td
                          className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-[130px] truncate whitespace-nowrap"
                          title={job.location}
                        >
                          {job.location}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${ATS_BADGE[job.ats_platform]}`}
                          >
                            {job.ats_platform.replace('_manual', '')}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${RECENCY_BADGE[job.recency_flag]}`}
                          >
                            {RECENCY_LABEL[job.recency_flag]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <ScoreBar score={job.stack_match_score} />
                        </td>
                        <td className="px-4 py-3 max-w-[260px]">
                          <p
                            className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed"
                            title={job.key_requirements_snippet}
                          >
                            {job.key_requirements_snippet}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={currentStatus}
                            onChange={(e) => setStatus(job.job_url, e.target.value as ActionStatus)}
                            className={`text-xs border rounded px-2 py-1 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-1 focus:ring-blue-500 ${ACTION_COLOR[currentStatus]}`}
                          >
                            {ACTION_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {ACTION_LABEL[opt]}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <a
                            href={job.job_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline text-xs font-medium whitespace-nowrap"
                          >
                            View →
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!scanning && jobs.length === 0 && !scanDone && (
          <div className="text-center py-24 text-gray-300 dark:text-zinc-700">
            <p className="text-5xl mb-4 select-none">○</p>
            <p className="text-base font-medium text-gray-400 dark:text-gray-600">No results yet</p>
            <p className="text-sm text-gray-300 dark:text-zinc-700 mt-1">
              Click &ldquo;Start scan&rdquo; to check for postings in the last 48 h
            </p>
          </div>
        )}

        {scanDone && jobs.length === 0 && (
          <div className="text-center py-16 text-gray-400 dark:text-gray-600">
            <p className="text-base font-medium">No matching postings found in the last 48 h</p>
            <p className="text-sm mt-1">Try again tomorrow or widen the filter.</p>
          </div>
        )}

        {/* Manual-check companies */}
        {MANUAL.length > 0 && (
          <div className="border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 rounded-xl p-4">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">
              Manual check required — {MANUAL.length} companies
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">
              Workday / custom career pages cannot be scraped via API. Open each directly:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {MANUAL.map((c) => (
                <a
                  key={c.name}
                  href={c.careers_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-amber-700 dark:text-amber-300 hover:underline"
                >
                  {c.name} →
                </a>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
