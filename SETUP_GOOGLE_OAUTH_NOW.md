# Add Google OAuth Credentials NOW

## Problem Identified ✅
Your logs show: `GOOGLE_CLIENT_ID not configured`

## Solution: Add These Lines to `.env.local`

Open `.env.local` and add these lines:

```env
# Google OAuth Credentials
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google-calendar/callback

# Generate this key (run the command below)
GOOGLE_CALENDAR_ENCRYPTION_KEY=paste-generated-key-here

# Base URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Step 1: Get Google OAuth Credentials

### A. Go to Google Cloud Console
https://console.cloud.google.com/

### B. Create/Select Project
- Click project dropdown at top
- Click "New Project" or select existing
- Name it (e.g., "Rental Core")

### C. Enable Google Calendar API
1. Go to: **APIs & Services** → **Library**
2. Search: "Google Calendar API"
3. Click on it
4. Click **"Enable"** button

### D. Create OAuth 2.0 Credentials
1. Go to: **APIs & Services** → **Credentials**
2. Click **"+ CREATE CREDENTIALS"** → **"OAuth 2.0 Client ID"**
3. If asked to configure consent screen first:
   - **User Type:** External
   - **App name:** Rental Core
   - **Support email:** your email
   - **Developer contact:** your email
   - Click **"Save and Continue"**
   - **Scopes:** Click "+ ADD OR REMOVE SCOPES"
     - Search for: `calendar.events`
     - Check: `https://www.googleapis.com/auth/calendar.events`
     - Click **"UPDATE"** → **"Save and Continue"**
   - **Test users:** Add your Google account email
   - Click **"Save and Continue"** → **"Back to Dashboard"**
4. Now create OAuth Client ID:
   - **Application type:** Web application
   - **Name:** Rental Core OAuth
   - **Authorized redirect URIs:**
     - Click **"+ ADD URI"**
     - Enter: `http://localhost:3000/api/google-calendar/callback`
     - Click **"Create"**
5. **Copy the credentials:**
   - **Client ID:** `xxxxx.apps.googleusercontent.com` ← Copy this
   - **Client Secret:** `xxxxx` ← Copy this

---

## Step 2: Generate Encryption Key

Run this command in terminal:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output (long string of random characters) - this is your encryption key.

---

## Step 3: Update `.env.local`

Add/replace these lines in `.env.local`:

```env
GOOGLE_CLIENT_ID=paste-your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=paste-your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google-calendar/callback
GOOGLE_CALENDAR_ENCRYPTION_KEY=paste-generated-encryption-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Replace:**
- `paste-your-client-id-here` with your actual Client ID
- `paste-your-client-secret-here` with your actual Client Secret  
- `paste-generated-encryption-key-here` with the key from Step 2

---

## Step 4: Restart Dev Server

**IMPORTANT:** Environment variables are only loaded when the server starts.

1. **Stop your dev server:** Press `Ctrl+C` in the terminal
2. **Start it again:** `npm run dev`

---

## Step 5: Test

1. Go to `/crew` page
2. Click "Connect Calendar"
3. **Expected:** Redirects to Google OAuth page
4. **Check terminal:** Should now show `clientId exists: true`

---

## Verify It's Working

After restarting, check terminal logs. When you click "Connect Calendar", you should see:

```
[google-calendar/auth] Route hit
[google-calendar/auth] crew_member_id: ...
[google-calendar/auth] clientId exists: true  ← Should be TRUE now
[google-calendar/auth] redirectUri: http://localhost:3000/api/google-calendar/callback
[google-calendar/auth] Redirecting to Google OAuth: https://accounts.google.com/...
```

✅ If `clientId exists: true` → It's working!
❌ If `clientId exists: false` → Variables not loaded (restart server)

