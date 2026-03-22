### Have to do this 

Google Postmaster workflow (manual but essential)

You must:

Verify domain in Postmaster Tools

Check:

Spam Rate

IP Reputation

Domain Reputation

If spam rate > 0.1%:

Pause all sends

Reduce volume by 50%

Send only engaged users

## Dynamic Email With Google AI

The project now supports dynamic email generation based on each lead's context.

### 1) Add environment variables

Add these in your `.env`:

```
GOOGLE_AI_API_KEY=your_google_ai_key
GOOGLE_AI_MODEL=gemini-2.5-flash
```

### 2) How it works

- First outreach and follow-up templates call Google AI to generate `subject` and `body`.
- If AI is unavailable or returns invalid output, the app automatically falls back to the existing static templates.
- Resume attachments for first outreach are preserved.

### 3) Preview generated emails (without sending)

Run this script to inspect generated output:

```
pnpm preview:email
```

Useful options:

```
pnpm preview:email -- --type=first --runs=3 --name="Anas" --company="Stripe" --role="Backend Intern"
pnpm preview:email -- --type=follow_up --lead='{"name":"Anas","company":"Stripe","notes":"Met at meetup"}'
```

Options supported:

- `--type=first|follow_up|both` (default: `both`)
- `--runs=<number>` (default: `1`)
- `--name`, `--company`, `--role`, `--title`, `--website`, `--source`, `--notes`
- `--lead='<json object>'` for passing full lead context in one flag

### 4) Debug why output is not changing

If all previews look the same, the app is likely using fallback templates.

Enable debug logs:

```
AI_EMAIL_DEBUG=true pnpm preview:email -- --type=first --runs=3 --company="Stripe"
```

You will see fallback reasons like:

- `missing-ai-config`
- `request-error`
- `invalid-json`
- `missing-subject-or-body`

When fallback is triggered, the app now randomizes these parts to avoid identical sends:

- Subject line (from 5 variants)
- Opening sentence (from 5 variants)
- One custom line (from 5 variants)

## Deploy With GitHub Actions Scheduler

This repo now includes ready workflows:

- `.github/workflows/schedule-send-mails.yml`
- `.github/workflows/schedule-read-replies.yml`
- `.github/workflows/manual-follow-up.yml`

### 1) Push to GitHub

Commit and push your latest code to the repository.

### 2) Add repository secrets

In GitHub:

`Settings -> Secrets and variables -> Actions -> New repository secret`

Add these secrets (same names):

- `EMAIL_USER`
- `EMAIL_PASS`
- `SMTP_HOST`
- `SMTP_PORT`
- `IMAP_HOST`
- `IMAP_PORT`
- `RESUME_PATH`
- `RESUME_FILENAME`
- `SEND_LIMIT`
- `SEND_DELAY_MS`
- `REPLY_LOOKBACK_DAYS`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `GOOGLE_AI_API_KEY`
- `GOOGLE_AI_MODEL`
- `AI_EMAIL_DEBUG`
- `LIVE`

Notes:

- `REPLY_LOOKBACK_DAYS` controls how far back reply scans run (example: `14`).
- If you do not want AI, keep `GOOGLE_AI_API_KEY` empty and fallback templates will be used.

### 3) Enable workflows

Open `Actions` tab and enable workflows if prompted.

### 4) Run first manual test

From `Actions`:

1. Open `Schedule Send Mails` -> `Run workflow`
2. Open `Schedule Read Replies` -> `Run workflow`
3. Open `Manual Follow Up` -> `Run workflow` (optional)

Check logs for each run.

### 5) Understand current schedule

- Send mails: `30 4 * * 1-4` (UTC) -> 10:00 IST, Mon-Thu
- Read replies: `*/20 * * * 1-4` (UTC) -> every 20 minutes, Mon-Thu
- Follow-up: manual only

If your timezone is different, update the `cron` values in workflow files (GitHub cron uses UTC).

### 6) Useful behavior in Actions mode

- Jobs run once and exit (`pnpm job:send`, `pnpm job:read`, `pnpm job:follow-up`).
- This avoids running the long-lived local cron process in CI.