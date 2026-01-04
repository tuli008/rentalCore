# Resend Email Setup Guide

## What is the "From" Email Address?

The "from" email address is the sender email that appears in the recipient's inbox. With Resend, you have two options:

### Option 1: Use Resend's Test Domain (Quick Start)

For testing, you can use Resend's default domain:
- **From Email**: `onboarding@resend.dev`
- **Limitation**: Only works for testing, emails might go to spam

### Option 2: Use Your Own Domain (Production)

For production, you need to:
1. **Verify your domain** in Resend dashboard
2. **Use your domain** in the from address:
   - Example: `noreply@yourdomain.com`
   - Example: `notifications@yourdomain.com`
   - Example: `events@yourdomain.com`

## Setup Steps

### Step 1: Install Resend

```bash
npm install resend
```

### Step 2: Get Resend API Key

1. Sign up at https://resend.com
2. Go to API Keys section
3. Create a new API key
4. Copy the key (starts with `re_`)

### Step 3: Add to `.env.local`

```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com  # Or use onboarding@resend.dev for testing
```

### Step 4: Verify Your Domain (For Production)

1. In Resend dashboard, go to "Domains"
2. Click "Add Domain"
3. Enter your domain (e.g., `yourdomain.com`)
4. Add the DNS records Resend provides to your domain
5. Wait for verification (usually a few minutes)

### Step 5: Update the Route

Uncomment and configure the Resend code in `/app/api/notifications/send/route.ts`:

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
  to: email,
  subject: emailSubject,
  html: emailBody.replace(/\n/g, '<br>'),
});
```

## From Email Address Options

### For Testing:
- `onboarding@resend.dev` (default, no setup needed)

### For Production:
- `noreply@yourdomain.com` (recommended)
- `notifications@yourdomain.com`
- `events@yourdomain.com`
- `crew@yourdomain.com`

**Important**: The domain part (after `@`) must be verified in Resend for production use.

## Example Configuration

```env
# .env.local
RESEND_API_KEY=re_abc123xyz789
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

## Testing

1. Use `onboarding@resend.dev` for quick testing
2. Check Resend dashboard → Logs to see sent emails
3. Verify emails arrive in inbox (check spam folder too)
4. Once domain is verified, switch to your custom domain

## Common Issues

**Issue**: "Domain not verified"
- **Solution**: Verify your domain in Resend dashboard first

**Issue**: Emails going to spam
- **Solution**: Use a verified domain, not `onboarding@resend.dev`

**Issue**: "Invalid from address"
- **Solution**: Make sure the domain is verified in Resend

