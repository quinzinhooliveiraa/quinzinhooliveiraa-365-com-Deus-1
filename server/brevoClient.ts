const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

interface BrevoEmailParams {
  to: string;
  toName?: string;
  subject: string;
  html: string;
}

export async function sendBrevoEmail(params: BrevoEmailParams): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error("BREVO_API_KEY not configured");
  }

  const body = {
    sender: { name: "Casa dos 20", email: "quinzinhooliveiraa@gmail.com" },
    to: [{ email: params.to, name: params.toName || params.to }],
    subject: params.subject,
    htmlContent: params.html,
  };

  const response = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Brevo API error (${response.status}): ${err}`);
  }
}
