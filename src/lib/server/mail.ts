import { OutboundEmail } from "@/lib/email-content";

export type MailResult = {
  delivered: boolean;
  provider: "resend" | "demo";
  to: string;
  subject: string;
  error?: string;
};

export function getEmailFrom() {
  return process.env.EMAIL_FROM?.trim() ?? "";
}

export function isResendConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && getEmailFrom());
}

export async function sendEmail(message: OutboundEmail): Promise<MailResult> {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = getEmailFrom();

  if (!key || !from) {
    console.info("[email:demo]", {
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
    return {
      delivered: false,
      provider: "demo",
      to: message.to,
      subject: message.subject,
    };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("[email:resend]", res.status, body);
      return {
        delivered: false,
        provider: "resend",
        to: message.to,
        subject: message.subject,
        error: body.slice(0, 400),
      };
    }
    return {
      delivered: true,
      provider: "resend",
      to: message.to,
      subject: message.subject,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Send failed.";
    console.error("[email:resend]", error);
    return {
      delivered: false,
      provider: "resend",
      to: message.to,
      subject: message.subject,
      error,
    };
  }
}
