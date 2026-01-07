# Fix: OAuth Client Was Deleted

## Error Message
```
Error 401: deleted_client
The OAuth client was deleted.
```

## Solution: Create a New OAuth Client

### Step 1: Go to Google Cloud Console

1. Open: https://console.cloud.google.com/
2. Make sure you're in the correct project (or create a new one)
3. Navigate to: **APIs & Services** → **Credentials**

### Step 2: Create New Web Application Client

1. Click **"+ CREATE CREDENTIALS"** at the top
2. Select **"OAuth 2.0 Client ID"**

3. **If asked to configure consent screen first:**
   - **User Type:** External (for testing)
   - **App name:** Rental Core
   - **Support email:** your email (snigdha.hitk@gmail.com)
   - **Developer contact:** your email
   - Click **"Save and Continue"**
   
   - **Scopes:** Click "+ ADD OR REMOVE SCOPES"
     - Search for: `calendar.events`
     - Check the box: `https://www.googleapis.com/auth/calendar.events`
     - Click **"UPDATE"**
     - Click **"Save and Continue"**
   
   - **Test users:** 
     - Click "+ ADD USERS"
     - Add: `snigdha.hitk@gmail.com`
     - Click **"Save and Continue"**
   
   - Review and click **"Back to Dashboard"**

4. **Create the OAuth Client:**
   - **Application type:** Select **"Web application"** (IMPORTANT: Not Desktop!)
   - **Name:** Rental Core Web Client
   
   - **Authorized redirect URIs:**
     - Click **"+ ADD URI"**
     - Enter: `http://localhost:3000/api/google-calendar/callback`
     - Click **"Create"**

### Step 3: Copy the New Credentials

After creating, you'll see:
- **Client ID:** `xxxxx.apps.googleusercontent.com` ← Copy this
- **Client Secret:** `GOCSPX-xxxxx` ← Copy this (click "Show" if hidden)

### Step 4: Update `.env.local`

Replace the old credentials in `.env.local`:

```env
GOOGLE_CLIENT_ID=new-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=new-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google-calendar/callback
GOOGLE_CALENDAR_ENCRYPTION_KEY=a8F3kP9QmR2Zx7YcLwD6VJtE5HnB4Uq
```

### Step 5: Restart Dev Server

1. Stop server (Ctrl+C)
2. Start again: `npm run dev`

### Step 6: Test

1. Go to `/crew` page
2. Click "Connect Calendar"
3. Should redirect to Google OAuth (no more "deleted_client" error)

---

## Important Notes

- ✅ Use **Web application** type (not Desktop)
- ✅ Add redirect URI: `http://localhost:3000/api/google-calendar/callback`
- ✅ Add scope: `calendar.events`
- ✅ Add your email as a test user
- ✅ Restart server after updating `.env.local`

