# Debug: "Connect Calendar" Button Not Working

## Quick Checks

### 1. Open Browser Console (F12)
When you click "Connect Calendar", check the console for:
- `[CrewMembersPage] Connect Calendar clicked for: [name] [id]` - Confirms button click
- Any red error messages

### 2. Check Network Tab
After clicking, in Network tab:
- Look for request to `/api/google-calendar/auth?crew_member_id=...`
- Check if it returns a redirect (302) or error

### 3. Verify Environment Variables
Make sure these are set in your `.env.local`:
```bash
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxx
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google-calendar/callback
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Test the Route Directly
Open this URL in your browser (replace `CREW_MEMBER_ID`):
```
http://localhost:3000/api/google-calendar/auth?crew_member_id=CREW_MEMBER_ID
```

**Expected:** Redirects to Google OAuth page
**If error:** Check server logs in terminal

---

## Common Issues

### Issue 1: Button Not Clickable
**Symptoms:** No console log, nothing happens
**Fix:** 
- Check if button is hidden behind another element
- Try right-click → "Open in new tab"

### Issue 2: Route Returns JSON Error
**Symptoms:** See `{"error":"..."}` in browser
**Fix:**
- Check server terminal for logs starting with `[google-calendar/auth]`
- Verify `GOOGLE_CLIENT_ID` is set

### Issue 3: Redirect Doesn't Happen
**Symptoms:** Route works but doesn't redirect to Google
**Fix:**
- Check if `GOOGLE_CLIENT_ID` is valid
- Verify redirect URI matches Google Console

### Issue 4: CORS/Network Error
**Symptoms:** Network request fails
**Fix:**
- Check if dev server is running
- Try restarting: `npm run dev`

---

## Test Steps

1. **Open browser console** (F12)
2. **Go to `/crew` page**
3. **Click "Connect Calendar"**
4. **Check console** - should see: `[CrewMembersPage] Connect Calendar clicked for: ...`
5. **Check Network tab** - should see request to `/api/google-calendar/auth`
6. **Check server terminal** - should see: `[google-calendar/auth] Route hit`

If any step fails, that's where the problem is.


