import { NextResponse } from 'next/server';

const allowedHousemates = new Set(['Sarah', 'Amir', 'Mei', 'Jake']);
// The mock currently treats Sarah as the signed-in user. Replace this with
// the authenticated user's name when Pact has user accounts.
const senderName = 'Sarah';

export async function POST(request) {
  let name;
  try {
    ({ name } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (typeof name !== 'string' || !allowedHousemates.has(name)) {
    return NextResponse.json({ error: 'Choose a valid housemate.' }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.EMAIL_FROM;
  const to = parseRecipients(process.env.HOUSEMATE_EMAILS)?.[name];

  if (!apiKey || !fromAddress || !to) {
    return NextResponse.json(
      { error: 'Email is not configured. Set RESEND_API_KEY, EMAIL_FROM, and HOUSEMATE_EMAILS on the server.' },
      { status: 503 },
    );
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${senderName} from Pact <${fromAddress}>`,
        to: [to],
        subject: `${senderName} sent you a Knudge on Pact`,
        text: `Hi ${name},\n\n${senderName} from Pact sent you a Knudge. When you have a moment, please check in on any shared bills or chores that need your attention.\n\nThanks!`,
        html: `<p>Hi ${escapeHtml(name)},</p><p>${escapeHtml(senderName)} from Pact sent you a Knudge. When you have a moment, please check in on any shared bills or chores that need your attention.</p><p>Thanks!</p>`,
      }),
      signal: AbortSignal.timeout(15000),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { error: result.message || 'The email provider could not send the reminder. Check the sender domain and API key.' },
        { status: 502 },
      );
    }

    return NextResponse.json({ sent: true, name, id: result.id });
  } catch {
    return NextResponse.json({ error: 'Could not reach the email provider. Please try again.' }, { status: 502 });
  }
}

function parseRecipients(value) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return Object.fromEntries(
      Object.entries(parsed).filter(([name, email]) =>
        allowedHousemates.has(name) && typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
      ),
    );
  } catch {
    return null;
  }
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}
