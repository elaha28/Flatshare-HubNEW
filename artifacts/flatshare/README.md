# Pact Flatshare

## Configure Knudge emails locally

Knudges are sent through Resend by the Next.js API route. You can test them locally; the app does not need to be hosted.

1. From the repository root, copy the example environment file:

   ```powershell
   Copy-Item artifacts/flatshare/.env.example artifacts/flatshare/.env
   ```

   If `artifacts/flatshare/.env` already exists, edit it instead of overwriting it.

2. In `artifacts/flatshare/.env`, set:

   - `RESEND_API_KEY` to a Resend API key with sending permission for the verified domain.
   - `EMAIL_FROM` to an address on that domain. The example uses `knudges@send.pact.casa` because `send.pact.casa` is the domain verified in Resend.
   - `HOUSEMATE_EMAILS` to a JSON object mapping each mock housemate (`Sarah`, `Amir`, `Mei`, `Jake`) to an email address. For a safe first test, map them all to an inbox you control.

   Example:

   ```env
   RESEND_API_KEY=re_your_real_key
   EMAIL_FROM=knudges@send.pact.casa
   HOUSEMATE_EMAILS={"Sarah":"you@example.com","Amir":"you@example.com","Mei":"you@example.com","Jake":"you@example.com"}
   ```

3. From the repository root, start the app:

   ```powershell
   pnpm --filter @workspace/flatshare dev
   ```

4. Open the local URL shown in the terminal and click the bell beside a housemate. This sends a real email to the address mapped to that mock name. Check Resend's **Emails** page if it does not arrive.

Restart the dev server after changing `.env`. Keep `.env` private and never commit or paste your Resend API key; `.env.example` is the safe template to share.
