# 🔴 RESTART YOUR DEV SERVER NOW

## The Problem
Your terminal shows: `clientId exists: false`

This means **environment variables are not loaded** even though you added them to `.env.local`.

## The Fix: Restart Dev Server

### Step 1: Stop Current Server
In the terminal where `npm run dev` is running:
1. Press **Ctrl+C** (or Cmd+C on Mac)
2. Wait for it to stop completely

### Step 2: Start Server Again
Run:
```bash
npm run dev
```

### Step 3: Wait for "Ready" Message
Wait until you see:
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
✓ Ready in X.Xs
```

### Step 4: Test Environment Variables
Open this URL in your browser:
```
http://localhost:3000/api/test-env
```

**Expected output:**
```json
{
  "hasGoogleClientId": true,
  "googleClientId": "1065293506678-rel...",
  "hasGoogleClientSecret": true,
  ...
}
```

### Step 5: Test "Connect Calendar" Button
1. Go to `/crew` page
2. Click "Connect Calendar"
3. Check terminal - should now show: `clientId exists: true ✅`

---

## Why This Happens

Next.js only loads `.env.local` when the server **starts**. If you:
- Added variables while server was running
- Made changes to `.env.local` without restarting
- The variables won't be available

**Solution:** Always restart after editing `.env.local`!

---

## Quick Checklist

- ✅ Added variables to `.env.local`
- ✅ **RESTARTED dev server (Ctrl+C, then `npm run dev`)**
- ✅ Tested `/api/test-env` - shows `hasGoogleClientId: true`
- ✅ Clicked "Connect Calendar" - terminal shows `clientId exists: true`

