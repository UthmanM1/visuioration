import { enforceUserRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { ServiceError } from "@/lib/services/errors";
import { NextResponse } from "next/server";
import { renderReportPdf } from "@/lib/reports/pdf";
import { liveReportService } from "@/lib/services/live-reports";
import { getOptionalSession } from "@/lib/services/session";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** PDF of a report with live chart results, for signed-in members of the workspace. */
export async function GET(request: Request, { params: paramsPromise }: { params: Promise<{ slug: string }> }) {
  const params = await paramsPromise;
  const session = await getOptionalSession();
  if (!session || session.mode !== "live") return NextResponse.redirect(new URL("/login", request.url));
  const report = await liveReportService.get(session.workspace.id, { slug: params.slug });
  if (!report) return new NextResponse("Report not found", { status: 404 });
  try {
    await enforceUserRateLimit("report_pdf");
  } catch (error) {
    if (error instanceof ServiceError && (error.code === "rate_limited" || error.code === "unavailable")) {
      const r = tooManyRequests(error);
      return new NextResponse(r.message, { status: error.code === "rate_limited" ? 429 : 503, headers: r.headers });
    }
    throw error;
  }
  const rendered = await liveReportService.render(session.workspace.id, report, { workspaceName: session.workspace.name, preparedBy: session.user.name });
  const pdf = await renderReportPdf(rendered);
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${report.slug}.pdf"`,
      "cache-control": "private, no-store",
    },
  });
}
