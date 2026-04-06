import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS =
  process.env.RESEND_FROM_EMAIL ?? "OfferPath <noreply@offerpath.app>";
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://offerpath.app";

export interface DigestJob {
  jobId: string;
  title: string;
  company: string;
  location: string | null;
  isRemote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  score: number;
  isH1bSponsor: boolean;
  explanation: string;
}

function formatSalary(min: number | null, max: number | null): string {
  if (!min && !max) return "";
  const fmt = (n: number) =>
    n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  return `up to ${fmt(max!)}`;
}

function scoreColor(score: number): string {
  if (score >= 80) return "#16a34a";
  if (score >= 60) return "#d97706";
  return "#6b7280";
}

function buildDigestHtml(
  userName: string,
  jobs: DigestJob[],
  appUrl: string
): string {
  const jobRows = jobs
    .map((j) => {
      const locationText = j.isRemote
        ? "Remote"
        : j.location ?? "Location not specified";
      const salaryText = formatSalary(j.salaryMin, j.salaryMax);

      return `
      <tr>
        <td style="padding:16px 0;border-bottom:1px solid #e5e7eb;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:top;">
                <div style="margin-bottom:3px;">
                  <span style="font-size:15px;font-weight:600;color:#111827;">${j.title}</span>
                  ${j.isH1bSponsor ? `&nbsp;<span style="font-size:11px;background:#ede9fe;color:#7c3aed;padding:2px 7px;border-radius:4px;font-weight:500;">H1B Sponsor</span>` : ""}
                </div>
                <div style="font-size:13px;color:#6b7280;margin-bottom:6px;">
                  ${j.company} &middot; ${locationText}${salaryText ? ` &middot; ${salaryText}` : ""}
                </div>
                <div style="font-size:13px;color:#374151;margin-bottom:10px;">${j.explanation}</div>
                <a href="${appUrl}/dashboard/jobs"
                   style="display:inline-block;background:#7c3aed;color:#fff;font-size:12px;font-weight:500;padding:6px 14px;border-radius:6px;text-decoration:none;">
                  View &amp; Apply
                </a>
              </td>
              <td style="text-align:right;vertical-align:top;padding-left:16px;white-space:nowrap;width:52px;">
                <span style="font-size:22px;font-weight:700;color:${scoreColor(j.score)};">${j.score}</span>
                <div style="font-size:11px;color:#9ca3af;margin-top:1px;">match</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Your Job Matches – OfferPath</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background:#7c3aed;padding:20px 28px;">
              <span style="color:#fff;font-size:19px;font-weight:700;letter-spacing:-0.3px;">OfferPath</span>
              <span style="color:#ddd6fe;font-size:13px;margin-left:10px;">Daily Job Digest</span>
            </td>
          </tr>

          <!-- Intro -->
          <tr>
            <td style="padding:24px 28px 0;">
              <p style="margin:0 0 6px;font-size:15px;color:#374151;">Hi ${userName || "there"},</p>
              <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.5;">
                Here are your top <strong>${jobs.length}</strong> job match${jobs.length === 1 ? "" : "es"} for today —
                ranked by how well they fit your resume and preferences.
              </p>

              <!-- Job list -->
              <table width="100%" cellpadding="0" cellspacing="0">
                ${jobRows}
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:20px 28px 24px;">
              <a href="${appUrl}/dashboard/jobs"
                 style="display:block;text-align:center;background:#7c3aed;color:#fff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;">
                View All Matches →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 28px 24px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;line-height:1.6;">
                You're receiving this because you have job alerts enabled on OfferPath.<br>
                <a href="${appUrl}/dashboard/preferences" style="color:#7c3aed;text-decoration:none;">Manage notification settings</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendDailyDigest({
  toEmail,
  userName,
  jobs,
}: {
  toEmail: string;
  userName: string;
  jobs: DigestJob[];
}): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    return { success: false, error: "RESEND_API_KEY not configured" };
  }
  if (jobs.length === 0) {
    return { success: false, error: "no jobs to send" };
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: toEmail,
      subject: `Your top ${jobs.length} job match${jobs.length === 1 ? "" : "es"} today`,
      html: buildDigestHtml(userName, jobs, APP_URL),
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
