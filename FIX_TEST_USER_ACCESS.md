# Fix: "Access Denied" - Add Test User

## Error Message
```
Error 403: access_denied
The app is currently being tested, and can only be accessed by developer-approved testers.
```

## Problem
Your Google OAuth app is in **"Testing"** mode, which means only approved test users can access it. Your email needs to be added as a test user.

---

## Solution: Add Yourself as a Test User

### Step 1: Go to OAuth Consent Screen

1. Open: https://console.cloud.google.com/
2. Make sure you're in the correct project
3. Navigate to: **APIs & Services** → **OAuth consent screen**

### Step 2: Add Test Users

1. Scroll down to the **"Test users"** section
2. Click **"+ ADD USERS"** button
3. Enter your email: `snigdha.hitk@gmail.com`
4. Click **"ADD"**

### Step 3: Save Changes

- The test user should now appear in the list
- Changes take effect immediately (no need to publish)

### Step 4: Test Again

1. Go to `/crew` page in your app
2. Click "Connect Calendar"
3. **Expected:** Google OAuth page should now work without "access_denied" error
4. Sign in with `snigdha.hitk@gmail.com`

---

## For Production (Later)

When you're ready to make the app available to everyone:

1. Go back to **OAuth consent screen**
2. Click **"PUBLISH APP"** button
3. This makes it available to all Google users (no test user limit)

⚠️ **Note:** Publishing requires verification if you're using sensitive scopes. For `calendar.events` scope, verification is usually required for production.

---

## Quick Checklist

- ✅ Opened OAuth consent screen
- ✅ Clicked "+ ADD USERS"
- ✅ Added `snigdha.hitk@gmail.com`
- ✅ Clicked "ADD"
- ✅ Tested "Connect Calendar" button again


