import { clientIp, enforcePublicRateLimit, hashedSubject, tooManyRequests } from "@/lib/rate-limit";
import { ServiceError } from "@/lib/services/errors";
import { NextResponse } from "next/server";
import { renderReportPdf } from "@/lib/reports/pdf";
import { liveReportService } from "@/lib/services/live-reports";
import { appMode } from "@/lib/supabase/config";
import { slugify } from "@/lib/format";

export const dynamic = "force-dynamic";

/** PDF of a shared report's snapshot. The token in the URL is the only credential. */
export async function GET(_request: Request, { params: paramsPromise }: { params: Promise<{ slug: string }> }) {
  const params = await paramsPromise;
  const headers = { "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow", "referrer-policy": "no-referrer" };
  if (appMode !== "live") return new NextResponse("Not found", { status: 404, headers });
  const shared = await liveReportService.getShared(params.slug);
  if (!shared) return new NextResponse("This link isn't valid.", { status: 404, headers });
  if (shared.status === "expired") return new NextResponse("This link has expired or was turned off.", { status: 410, headers });
  // PDF generation is CPU-heavy and public: limit per client IP and per link (counted in Postgres).
  try {
    await enforcePublicRateLimit("share_pdf_ip", hashedSubject("ip", await clientIp()));
    await enforcePublicRateLimit("share_pdf_link", hashedSubject("link", params.slug));
  } catch (error) {
    if (error instanceof ServiceError && (error.code === "rate_limited" || error.code === "unavailable")) {
      const r = tooManyRequests(error);
      return new NextResponse(r.message, { status: error.code === "rate_limited" ? 429 : 503, headers: { ...headers, ...r.headers } });
    }
    throw error;
  }
  const pdf = await renderReportPdf(shared.report);
  return new NextResponse(Buffer.from(pdf), {
    headers: { ...headers, "content-type": "application/pdf", "content-disposition": `attachment; filename="${slugify(shared.report.name)}.pdf"` },
  });
}
