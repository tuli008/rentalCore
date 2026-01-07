# Google Calendar OAuth Flow - What Happens Step-by-Step

## Complete Visual Guide to the OAuth Process

---

## Step 1: Click "Connect Google Calendar" Button

**What you see:**
- On the `/crew` page
- Click the **"Connect Calendar"** button next to a crew member

**What happens:**
- You're redirected to: `/api/google-calendar/auth?crew_member_id=xxx`
- This route prepares the OAuth request

---

## Step 2: Google OAuth Consent Screen Opens

**What you see:**
- A **new page opens** or your browser redirects to Google
- URL will be: `accounts.google.com/o/oauth2/v2/auth?...`

**Google OAuth Page shows:**
```
┌─────────────────────────────────────────┐
│  Sign in with Google                    │
│                                         │
│  [Google Logo]                          │
│                                         │
│  Rental Core wants to:                  │
│  • See, edit, share, and permanently    │
│    delete all the calendar events you   │
│    can access using Google Calendar     │
│                                         │
│  [Select account dropdown]              │
│                                         │
│  [✓] Use Rental Core on all your devices│
│                                         │
│  [Cancel]  [Allow]                     │
└─────────────────────────────────────────┘
```

**What you need to do:**
1. **Sign in** with your Google account (if not already signed in)
2. **Review the permissions** Google is asking for
3. **Click "Allow"** to grant access

---

## Step 3: Google Redirects Back

**What you see:**
- After clicking "Allow", Google redirects you back
- You'll be redirected to: `/api/google-calendar/callback?code=XXXXX`

**Behind the scenes:**
- The system exchanges the `code` for tokens
- Stores the refresh token (encrypted) in the database
- Sets connection status to `true`

---

## Step 4: Success! Back to Crew Page

**What you see:**
- You're automatically redirected to: `/crew`
- **Green success message** appears: "Google Calendar connected successfully!"
- The **"Connect Calendar"** button changes to **green "✓ Calendar"** button

---

## Visual Flow Diagram

```
[Crew Page]
    ↓
[Click "Connect Calendar"]
    ↓
[Google OAuth Page Opens] ← NEW PAGE/BROWSER TAB
    ↓
[Sign in with Google]
    ↓
[Review Permissions]
    ↓
[Click "Allow"]
    ↓
[Redirected Back to Crew Page]
    ↓
[Success! Green Button Appears]
```

---

## Important Notes

### What Opens:
- **A new page/tab** or **same tab redirect** to Google's OAuth page
- This is Google's official login/consent screen
- You must sign in with the Google account you want to connect

### Security:
- You're only granting access to **create calendar events** (not read all your calendars)
- The scope is limited to: `calendar.events` only
- You can revoke access anytime from Google Account settings

### What if you click "Cancel"?
- You'll be redirected back to `/crew` page
- You'll see an error: "Google Calendar connection was cancelled"
- No data is saved
- You can try again anytime

### What if you're already signed in to Google?
- Google will skip the sign-in step
- You'll go directly to the permissions screen
- Just click "Allow"

---

## Example Screenshots Flow

### 1. Crew Page (Before)
```
┌─────────────────────────────────────┐
│ Crew Members                        │
├─────────────────────────────────────┤
│ Sibtanu                             │
│ [Connect Calendar] ← Click this     │
└─────────────────────────────────────┘
```

### 2. Google OAuth Page (Opens)
```
┌─────────────────────────────────────┐
│  Sign in with Google                │
│                                     │
│  [Google Logo]                      │
│                                     │
│  Rental Core wants to:              │
│  • Manage your calendar events      │
│                                     │
│  [Select Account]                   │
│                                     │
│  [Cancel]  [Allow] ← Click Allow   │
└─────────────────────────────────────┘
```

### 3. Crew Page (After Success)
```
┌─────────────────────────────────────┐
│ Crew Members                        │
│                                     │
│ ✅ Google Calendar connected        │
│    successfully!                    │
├─────────────────────────────────────┤
│ Sibtanu                             │
│ [✓ Calendar] ← Green button        │
└─────────────────────────────────────┘
```

---

## Troubleshooting

### "OAuth page doesn't open"
- Check if popups are blocked
- Check browser console for errors
- Verify `GOOGLE_CLIENT_ID` is set

### "Page shows error after clicking Allow"
- Check server logs
- Verify redirect URI matches exactly in Google Console
- Check if Google Calendar API is enabled

### "Redirects back but no success message"
- Check browser console
- Verify database was updated
- Try refreshing the page manually


