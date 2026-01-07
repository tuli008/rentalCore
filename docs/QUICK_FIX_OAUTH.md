# Quick Fix: "Nothing Happening" When Clicking "Connect Calendar"

## The Problem
The "Connect Calendar" button doesn't work because **Google OAuth credentials are missing** from your environment variables.

## The Solution

### Step 1: Add Google OAuth Credentials to `.env.local`

Open your `.env.local` file and add these lines:

```env
# Google OAuth Credentials (REQUIRED)
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google-calendar/callback

# Encryption Key (REQUIRED - Generate a random 32+ character string)
GOOGLE_CALENDAR_ENCRYPTION_KEY=generate-a-random-32-char-string-here

# Base URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 2: Get Your Google OAuth Credentials

If you haven't set up Google OAuth yet, follow these steps:

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create/Select a Project**
3. **Enable Google Calendar API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

4. **Create OAuth 2.0 Credentials**:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - Application type: **Web application**
   - Authorized redirect URIs: `http://localhost:3000/api/google-calendar/callback`
   - Click "Create"
   - Copy the **Client ID** and **Client Secret**

5. **Configure OAuth Consent Screen**:
   - Go to "APIs & Services" → "OAuth consent screen"
   - User type: **External** (for testing)
   - App name: "Rental Core" (or your app name)
   - Support email: your email
   - Scopes: Add `https://www.googleapis.com/auth/calendar.events`
   - Test users: Add your Google account email
   - Save

### Step 3: Generate Encryption Key

Run this command to generate a secure encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and use it as `GOOGLE_CALENDAR_ENCRYPTION_KEY`.

### Step 4: Restart Your Dev Server

After updating `.env.local`:

```bash
# Stop your current server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 5: Test

1. Go to `/crew` page
2. Click "Connect Calendar" on any crew member
3. **Expected**: You should be redirected to Google's OAuth page
4. Sign in and click "Allow"
5. **Expected**: You're redirected back and see "Google Calendar connected successfully!"

---

## Still Not Working?

### Check 1: Verify Environment Variables Are Loaded

Add this temporary route to test: `/api/test-google-config`

```typescript
// app/api/test-google-config/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    hasClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    hasRedirectUri: !!process.env.GOOGLE_REDIRECT_URI,
    hasEncryptionKey: !!process.env.GOOGLE_CALENDAR_ENCRYPTION_KEY,
  });
}
```

Visit `http://localhost:3000/api/test-google-config` - all should be `true`.

### Check 2: Browser Console

Open browser console (F12) and click "Connect Calendar". You should see:
- `[CrewMembersPage] Connect Calendar clicked for: ...`

### Check 3: Server Logs

In your terminal where `npm run dev` is running, you should see:
- `[google-calendar/auth] Route hit`
- `[google-calendar/auth] clientId exists: true`

---

## Full Setup Guide

For complete step-by-step instructions, see: `docs/GOOGLE_CALENDAR_SETUP.md`


