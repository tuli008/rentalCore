# Console Debug Messages Guide

## What You Should See When Clicking "Connect Calendar"

---

## 📱 Browser Console (F12 → Console Tab)

### ✅ **When Button is Clicked Successfully:**

```
[CrewMembersPage] Connect Calendar clicked for: Sibtanu abc123-def456-...
```

**Meaning:** The button click was detected and the crew member info is logged.

### ✅ **If Redirect Happens:**

You'll see the page navigate/redirect, but **no console message** for the redirect itself (it's a server-side redirect).

---

## 💻 Terminal/Server Console (where `npm run dev` is running)

### ✅ **Successful Flow:**

```
[google-calendar/auth] Route hit
[google-calendar/auth] crew_member_id: abc123-def456-...
[google-calendar/auth] clientId exists: true
[google-calendar/auth] redirectUri: http://localhost:3000/api/google-calendar/callback
[google-calendar/auth] Redirecting to Google OAuth: https://accounts.google.com/o/oauth2/v2/auth?client_id=...
```

**Meaning:** 
- Route was called correctly
- Crew member ID received
- Google Client ID is configured
- Redirecting to Google OAuth page

---

## ⚠️ **Error Scenarios:**

### Error 1: Missing Environment Variables

**Browser Console:**
```
(nothing special - just redirects back to /crew page)
```

**Terminal Console:**
```
[google-calendar/auth] Route hit
[google-calendar/auth] crew_member_id: abc123-def456-...
[google-calendar/auth] clientId exists: false
[google-calendar/auth] redirectUri: http://localhost:3000/api/google-calendar/callback
[google-calendar/auth] GOOGLE_CLIENT_ID not configured
```

**What Happens:** You're redirected back to `/crew` page with an error message displayed on the page.

---

### Error 2: Missing Crew Member ID

**Browser Console:**
```
(nothing)
```

**Terminal Console:**
```
[google-calendar/auth] Route hit
[google-calendar/auth] crew_member_id: null
[google-calendar/auth] No crew_member_id provided
```

**What Happens:** API returns JSON error: `{"error":"crew_member_id is required"}`

---

### Error 3: Unexpected Server Error

**Browser Console:**
```
(nothing special)
```

**Terminal Console:**
```
[google-calendar/auth] Route hit
[google-calendar/auth] crew_member_id: abc123-def456-...
[google-calendar/auth] Error: [error details]
```

**What Happens:** API returns JSON error: `{"error":"Failed to initiate OAuth flow"}`

---

## 🔍 How to Check:

### Step 1: Open Browser Console
1. Press **F12** (or right-click → Inspect)
2. Click **Console** tab
3. Clear the console (trash icon)

### Step 2: Open Terminal
1. Find the terminal where you ran `npm run dev`
2. Make sure you can see the logs

### Step 3: Click "Connect Calendar"
1. Click the button on `/crew` page
2. **Immediately check both consoles**

### Step 4: What to Look For

**✅ Good Signs:**
- Browser console shows: `[CrewMembersPage] Connect Calendar clicked for: ...`
- Terminal shows: `[google-calendar/auth] Route hit`
- Terminal shows: `[google-calendar/auth] clientId exists: true`
- **Page redirects to Google OAuth** (accounts.google.com)

**❌ Bad Signs:**
- Browser console shows: `[CrewMembersPage] Connect Calendar clicked for: ...` but nothing else
- Terminal shows: `[google-calendar/auth] clientId exists: false`
- Terminal shows errors in red
- **No redirect happens** - stays on same page

---

## 📸 Expected Console Output (Success)

### Browser Console:
```
[CrewMembersPage] Connect Calendar clicked for: Sibtanu abc123-def456-789
```

### Terminal Console:
```
[google-calendar/auth] Route hit
[google-calendar/auth] crew_member_id: abc123-def456-789
[google-calendar/auth] clientId exists: true
[google-calendar/auth] redirectUri: http://localhost:3000/api/google-calendar/callback
[google-calendar/auth] Redirecting to Google OAuth: https://accounts.google.com/o/oauth2/v2/auth?client_id=123456.apps.googleusercontent.com&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fgoogle-calendar%2Fcallback&response_type=code&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.events&access_type=offline&prompt=consent&state=abc123-def456-789...
```

---

## 🐛 Troubleshooting Based on Console Output

| Console Message | Meaning | Fix |
|----------------|---------|-----|
| `[CrewMembersPage] Connect Calendar clicked for: ...` appears | ✅ Button works | - |
| `[google-calendar/auth] Route hit` appears | ✅ Route is being called | - |
| `clientId exists: false` | ❌ Missing `GOOGLE_CLIENT_ID` | Add to `.env.local` |
| `No crew_member_id provided` | ❌ URL parameter missing | Check button link |
| `Error: ...` | ❌ Server error | Check full error message |
| Nothing in browser console | ❌ Button not clickable | Check if button is disabled/hidden |
| Nothing in terminal | ❌ Route not being hit | Check Network tab in browser |

---

## 🌐 Network Tab (Alternative Debug Method)

If console messages don't help, check **Network tab**:

1. Open browser DevTools (F12)
2. Click **Network** tab
3. Click "Connect Calendar" button
4. Look for request to: `/api/google-calendar/auth?crew_member_id=...`

**Expected:**
- **Status:** `307 Temporary Redirect` or `302 Found`
- **Response Headers:** `Location: https://accounts.google.com/...`

**If Error:**
- **Status:** `400` or `500`
- **Response:** JSON error message


