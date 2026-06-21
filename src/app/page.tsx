import Link from "next/link";

export default function Home() {
  return (
    <div className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-lg">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Job Search Hub</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-10">
          Harshal&rsquo;s centralised job-hunt dashboard — SDE-1 / Backend / Full Stack roles in India
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/job-boards"
            className="group block p-5 bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 hover:border-blue-400 dark:hover:border-blue-600 transition-colors"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-2">
              Module 1
            </p>
            <h2 className="font-semibold text-gray-900 dark:text-white mb-1">Job Boards</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Scan Greenhouse, Lever &amp; SmartRecruiters for matching postings in the last 48 h.
            </p>
          </Link>

          <div className="block p-5 bg-white dark:bg-zinc-900 rounded-xl border border-dashed border-gray-200 dark:border-zinc-800 opacity-50 cursor-not-allowed">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Module 2
            </p>
            <h2 className="font-semibold text-gray-900 dark:text-white mb-1">X-Ray Search</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Google X-ray search across LinkedIn, GitHub, and niche boards. Coming soon.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
