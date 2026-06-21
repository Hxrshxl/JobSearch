import { NextRequest } from 'next/server';
import { scanCompany } from '@/lib/scraper';
import { Company, ScanMessage } from '@/types/job';

export const runtime = 'nodejs';
export const maxDuration = 120;

function encode(msg: ScanMessage): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(msg) + '\n');
}

export async function POST(req: NextRequest) {
  const { companies }: { companies: Company[] } = await req.json();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const company of companies) {
        if (['workday_manual', 'unknown_manual'].includes(company.ats_platform)) {
          continue;
        }

        controller.enqueue(encode({ type: 'progress', company: company.name, status: 'fetching' }));

        try {
          const jobs = await scanCompany(company);

          if (jobs.length > 0) {
            controller.enqueue(encode({ type: 'result', jobs }));
          }

          controller.enqueue(
            encode({ type: 'progress', company: company.name, status: 'done', count: jobs.length })
          );
        } catch (err) {
          controller.enqueue(
            encode({
              type: 'progress',
              company: company.name,
              status: 'error',
              error: err instanceof Error ? err.message : 'Unknown error',
            })
          );
        }

        await new Promise((r) => setTimeout(r, 250));
      }

      controller.enqueue(encode({ type: 'complete' }));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
    },
  });
}
