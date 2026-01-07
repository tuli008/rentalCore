# Fix: Wrong OAuth Client Type

## Problem Identified ❌

Your Google OAuth client is set up as **"Desktop"** type, but we need **"Web application"** type.

**Why:** Desktop clients have different redirect URI handling and won't work with our web-based callback URL.

---

## Solution: Create a Web Application Client

### Step 1: Create New OAuth Client (Web Application Type)

1. **Go to Google Cloud Console:**
   - https://console.cloud.google.com/
   - Navigate to: **APIs & Services** → **Credentials**

2. **Create New Client:**
   - Click **"+ CREATE CREDENTIALS"** → **"OAuth 2.0 Client ID"**
   - **Application type:** Select **"Web application"** (NOT Desktop!)
   - **Name:** "Rental Core Web Client" (or any name)

3. **Set Authorized Redirect URIs:**
   - Under **"Authorized redirect URIs"**, click **"+ ADD URI"**
   - Enter: `http://localhost:3000/api/google-calendar/callback`
   - Click **"Create"**

4. **Copy the New Credentials:**
   - **Client ID:** Copy this (looks like: `xxxxx.apps.googleusercontent.com`)
   - **Client Secret:** Click "Show" or copy it

---

### Step 2: Update `.env.local`

Replace lines 7-8 in your `.env.local` with the **new Web application** credentials:

```env
GOOGLE_CLIENT_ID=new-web-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=new-web-client-secret-here
```

**Keep these lines as they are:**
- `GOOGLE_REDIRECT_URI=http://localhost:3000/api/google-calendar/callback`
- `GOOGLE_CALENDAR_ENCRYPTION_KEY=a8F3kP9QmR2Zx7YcLwD6VJtE5HnB4Uq`

---

### Step 3: Restart Dev Server

**IMPORTANT:** After updating `.env.local`:

1. Stop your dev server (Ctrl+C)
2. Start it again: `npm run dev`

---

### Step 4: Test

1. Go to `/crew` page
2. Click "Connect Calendar"
3. **Expected:** Redirects to Google OAuth page
4. Check terminal - should show: `clientId exists: true`

---

## Quick Checklist

- ✅ Created **Web application** OAuth client (not Desktop)
- ✅ Added redirect URI: `http://localhost:3000/api/google-calendar/callback`
- ✅ Updated `GOOGLE_CLIENT_ID` in `.env.local` with Web client ID
- ✅ Updated `GOOGLE_CLIENT_SECRET` in `.env.local` with Web client secret
- ✅ Restarted dev server (`npm run dev`)

---

## Why Desktop Client Doesn't Work

- Desktop clients are for installed applications (not web apps)
- They don't support web-based redirect URIs
- The OAuth flow is different for desktop vs web applications
- Our callback route (`/api/google-calendar/callback`) requires a Web application client

