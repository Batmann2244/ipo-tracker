import type { Ipo } from "@shared/schema";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY;
  
  if (!resendApiKey) {
    console.log("Email service not configured (RESEND_API_KEY missing)");
    return false;
  }
  
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "IPO Analyzer <alerts@resend.dev>",
        to: options.to,
        subject: options.subject,
        html: options.html,
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error("Resend API error:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}

export async function sendIpoEmailAlert(email: string, ipo: Ipo, alertType: string): Promise<boolean> {
  const subject = getEmailSubject(ipo, alertType);
  const html = formatIpoEmailHtml(ipo, alertType);
  
  return sendEmail({ to: email, subject, html });
}

function getEmailSubject(ipo: Ipo, alertType: string): string {
  switch (alertType) {
    case "new_ipo":
      return `[New IPO] ${ipo.companyName} - Score ${ipo.overallScore?.toFixed(1) || "N/A"}/10`;
    case "gmp_change":
      return `[GMP Update] ${ipo.companyName} - Rs.${ipo.gmp || 0}`;
    case "open_date":
      return `[Reminder] ${ipo.companyName} IPO Opens Soon`;
    case "ai_analysis":
      return `[AI Analysis] ${ipo.companyName} - Analysis Ready`;
    default:
      return `[IPO Alert] ${ipo.companyName}`;
  }
}

function formatIpoEmailHtml(ipo: Ipo, alertType: string): string {
  const scoreColor = getScoreColor(ipo.overallScore);
  const riskColor = getRiskColor(ipo.riskLevel);
  
  const redFlags: string[] = typeof ipo.redFlags === 'string'
    ? JSON.parse(ipo.redFlags)
    : (Array.isArray(ipo.redFlags) ? ipo.redFlags : []);

  let alertHeader = "";
  switch (alertType) {
    case "new_ipo":
      alertHeader = "New IPO Listed";
      break;
    case "gmp_change":
      alertHeader = "Grey Market Premium Update";
      break;
    case "open_date":
      alertHeader = "IPO Opening Soon";
      break;
    case "ai_analysis":
      alertHeader = "AI Analysis Ready";
      break;
    default:
      alertHeader = "IPO Alert";
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a2e; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #e94560; padding: 30px; border-radius: 12px 12px 0 0; }
    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px; }
    .score-box { display: inline-block; padding: 8px 16px; border-radius: 8px; font-weight: bold; margin: 4px; }
    .metric { margin: 10px 0; padding: 12px; background: white; border-radius: 8px; }
    .red-flag { background: #fee2e2; color: #991b1b; padding: 8px 12px; border-radius: 6px; margin: 4px 0; }
    .ai-summary { background: #e0e7ff; padding: 16px; border-radius: 8px; margin-top: 16px; }
    .disclaimer { font-size: 12px; color: #6b7280; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0; color: #e94560;">📊 ${alertHeader}</h2>
    </div>
    <div class="content">
      <h1 style="margin-top: 0;">${ipo.companyName}</h1>
      <p><strong>Symbol:</strong> ${ipo.symbol} | <strong>Sector:</strong> ${ipo.sector || "N/A"}</p>
      <p><strong>Price Range:</strong> ${ipo.priceRange} | <strong>Status:</strong> ${ipo.status.toUpperCase()}</p>
      
      <div style="margin: 20px 0;">
        <span class="score-box" style="background: ${scoreColor}; color: white;">
          Overall Score: ${ipo.overallScore?.toFixed(1) || "N/A"}/10
        </span>
        <span class="score-box" style="background: ${riskColor}; color: white;">
          Risk: ${ipo.riskLevel || "N/A"}
        </span>
      </div>
      
      <div class="metric">
        <strong>Fundamentals:</strong> ${ipo.fundamentalsScore?.toFixed(1) || "N/A"}/10 |
        <strong>Valuation:</strong> ${ipo.valuationScore?.toFixed(1) || "N/A"}/10 |
        <strong>Governance:</strong> ${ipo.governanceScore?.toFixed(1) || "N/A"}/10
      </div>
      
      ${ipo.gmp !== null ? `<div class="metric"><strong>Grey Market Premium:</strong> ₹${ipo.gmp}</div>` : ""}
      
      ${redFlags.length > 0 ? `
        <h3>⚠️ Red Flags</h3>
        ${redFlags.map(flag => `<div class="red-flag">${flag}</div>`).join("")}
      ` : ""}
      
      ${ipo.aiSummary ? `
        <div class="ai-summary">
          <strong>🤖 AI Analysis:</strong><br>
          ${ipo.aiSummary}
        </div>
      ` : ""}
      
      <p class="disclaimer">
        <strong>Disclaimer:</strong> This information is for screening and educational purposes only. 
        It does not constitute investment advice. Please consult with a SEBI-registered investment advisor 
        before making any investment decisions. Always review the complete DRHP/RHP documents.
      </p>
    </div>
  </div>
</body>
</html>`;
}

function getScoreColor(score: number | null): string {
  if (!score) return "#6b7280";
  if (score >= 7) return "#059669";
  if (score >= 5) return "#d97706";
  return "#dc2626";
}

function getRiskColor(risk: string | null): string {
  switch (risk) {
    case "conservative": return "#059669";
    case "moderate": return "#d97706";
    case "aggressive": return "#dc2626";
    default: return "#6b7280";
  }
}
