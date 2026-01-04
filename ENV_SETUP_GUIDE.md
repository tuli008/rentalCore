# Environment Variables Setup Guide

## Required for Email Notifications (Resend)

Add these to your `.env.local` file:

```env
# Resend Email Configuration
# Get your API key from https://resend.com/api-keys
RESEND_API_KEY=re_xxxxxxxxxxxxx

# From email address
# For testing: onboarding@resend.dev (no setup needed)
# For production: noreply@yourdomain.com (must verify domain first)
RESEND_FROM_EMAIL=onboarding@resend.dev
```

## Format Requirements

1. **No spaces around `=`**:
   ✅ Correct: `RESEND_API_KEY=re_abc123`
   ❌ Wrong: `RESEND_API_KEY = re_abc123`

2. **No quotes needed** (unless value has spaces):
   ✅ Correct: `RESEND_FROM_EMAIL=onboarding@resend.dev`
   ❌ Wrong: `RESEND_FROM_EMAIL="onboarding@resend.dev"`

3. **One variable per line**:
   ✅ Correct:
   ```
   RESEND_API_KEY=re_abc123
   RESEND_FROM_EMAIL=onboarding@resend.dev
   ```
   ❌ Wrong:
   ```
   RESEND_API_KEY=re_abc123 RESEND_FROM_EMAIL=onboarding@resend.dev
   ```

4. **No trailing spaces**:
   ✅ Correct: `RESEND_API_KEY=re_abc123`
   ❌ Wrong: `RESEND_API_KEY=re_abc123 ` (has trailing space)

## How to Get Resend API Key

1. Go to https://resend.com
2. Sign up or log in
3. Go to **API Keys** section
4. Click **Create API Key**
5. Copy the key (starts with `re_`)
6. Paste it in `.env.local` as `RESEND_API_KEY=re_xxxxx`

## Testing

After adding the variables:

1. **Restart your dev server** (important!):
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

2. **Test the notification**:
   - Go to an event
   - Click Crew tab
   - Click "Notify" button
   - Check server console for logs

3. **Check logs**:
   - ✅ `Email sent successfully` = Working!
   - ❌ `Resend not configured` = Check .env.local
   - ❌ `Resend error` = Check API key validity

## Troubleshooting

### "Resend not configured"
- Check `.env.local` has `RESEND_API_KEY=...`
- Make sure no spaces around `=`
- Restart dev server after adding

### "Invalid API key"
- Verify key starts with `re_`
- Check for typos
- Make sure key is active in Resend dashboard

### "Domain not verified"
- For production, verify your domain in Resend
- For testing, use `onboarding@resend.dev`

### Still not working?
1. Check server console logs
2. Verify `.env.local` file location (should be in project root)
3. Make sure you restarted the server
4. Check for syntax errors in `.env.local`

