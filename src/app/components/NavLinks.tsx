'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [{ href: '/job-boards', label: 'Job Boards' }];

export function NavLinks() {
  const path = usePathname();
  return (
    <>
      {NAV_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`text-sm transition-colors ${
            path.startsWith(link.href)
              ? 'text-gray-900 dark:text-white font-medium'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          {link.label}
        </Link>
      ))}
    </>
  );
}
