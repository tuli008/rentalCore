# Google Calendar Integration - Complete Setup Guide

## Overview

This integration allows crew members to connect their personal Google Calendar and automatically sync event assignments. Each crew member controls their own calendar connection via OAuth.

---

## ✅ Complete Setup Checklist

### STEP 1: Google Cloud Console Setup

#### 1.1 Create/Select Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Note: One project per environment (or shared for dev + prod initially)

#### 1.2 Enable Google Calendar API
1. Navigate to **APIs & Services → Library**
2. Search for "Google Calendar API"
3. Click **Enable**
   - ⚠️ **CRITICAL**: Without this, OAuth will succeed but event creation will fail

#### 1.3 Configure OAuth Consent Screen
1. Navigate to **APIs & Services → OAuth consent screen**

2. **App Information:**
   - **User Type**: Select `External` (even for internal company tools)
   - **App name**: Your product name
   - **Support email**: Required
   - **Developer contact email**: Required

3. **Scopes:**
   - Click **Add or Remove Scopes**
   - Add: `https://www.googleapis.com/auth/calendar.events`
   - ⚠️ Use `calendar.events` scope (NOT full calendar access) for better security
   - Save and Continue

4. **Test Users:**
   - While app is in "Testing" mode, add your email(s)
   - ⚠️ **Only test users can connect until app is verified**

5. **Summary:**
   - Review and save

#### 1.4 Create OAuth 2.0 Credentials
1. Navigate to **APIs & Services → Credentials**
2. Click **Create Credentials → OAuth Client ID**
3. **Application type**: `Web application`
4. **Name**: e.g., "Rental Core - Google Calendar Integration"

5. **Authorized redirect URIs:**
   ```
   http://localhost:3000/api/google-calendar/callback
   https://yourdomain.com/api/google-calendar/callback
   ```
   ⚠️ These **must exactly match** your callback route

6. Click **Create**
7. Copy the **Client ID** and **Client Secret**

---

### STEP 2: Environment Variables

Add to `.env.local` (server-side only, NOT in frontend):

```env
# Google OAuth Credentials
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxx
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google-calendar/callback

# Encryption Key for Refresh Tokens (REQUIRED for production)
# Generate a secure random string (32+ characters)
GOOGLE_CALENDAR_ENCRYPTION_KEY=your-secure-encryption-key-here-min-32-chars

# Optional: Custom salt for encryption
GOOGLE_CALENDAR_ENCRYPTION_SALT=your-salt-here

# Base URL (used for redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

⚠️ **Security Notes:**
- Store encryption key in a secrets manager in production
- Never commit these values to git
- Use different keys for dev/staging/production

---

### STEP 3: Database Migration

Run the migration:

```sql
-- File: migrations/crew_members_add_google_calendar_token.sql
```

This adds:
- `google_calendar_refresh_token` (encrypted)
- `google_calendar_token_expiry` (access token expiry)
- `google_calendar_connected` (connection status flag)

---

### STEP 4: Verify OAuth Flow

#### Test Flow:

1. Go to `/crew` page
2. Click **"Connect Google Calendar"** for a crew member
3. You should be redirected to Google OAuth
4. Sign in with a test user email
5. Grant permissions
6. You should be redirected back with success message

#### Common Issues:

- **"OAuth error"**: Check redirect URI matches exactly
- **"No refresh token"**: Ensure `prompt=consent` in auth URL
- **"Token exchange failed"**: Verify Client ID/Secret are correct
- **"Not configured"**: Check environment variables

---

## 🔄 How It Works

### OAuth Flow:

1. **User clicks "Connect Google Calendar"**
   - Redirects to: `/api/google-calendar/auth?crew_member_id=xxx`
   - Stores `crew_member_id` in secure cookie
   - Redirects to Google OAuth with:
     - Scope: `calendar.events`
     - `access_type=offline` (for refresh token)
     - `prompt=consent` (to get refresh token)

2. **Google redirects back**
   - To: `/api/google-calendar/callback?code=xxx`
   - Exchanges code for tokens
   - Encrypts refresh token
   - Stores in database with expiry

3. **Automatic Sync**
   - When crew member is assigned → Event created in their calendar
   - When assignment changes → Event updated
   - When assignment removed → Event deleted

### Token Management:

- **Access tokens**: Short-lived (1 hour), auto-refreshed
- **Refresh tokens**: Long-lived, encrypted in database
- **Expiry tracking**: Stored in `google_calendar_token_expiry`
- **Auto-refresh**: Happens automatically when needed

---

## 🔐 Security Features

### ✅ Implemented:

1. **Token Encryption**
   - Refresh tokens encrypted at rest using AES-256-GCM
   - Encryption key stored in environment variable
   - Tokens decrypted only when needed

2. **Scope Restriction**
   - Uses `calendar.events` scope (not full calendar access)
   - More secure, follows principle of least privilege

3. **Token Expiry Handling**
   - Tracks access token expiry
   - Automatically refreshes when needed
   - Handles revoked tokens gracefully

4. **Connection Status**
   - `google_calendar_connected` flag tracks active connections
   - UI shows connection status
   - Manual reconnect available

---

## 📋 API Routes

### `/api/google-calendar/auth`
- **Method**: GET
- **Query**: `crew_member_id=xxx`
- **Purpose**: Initiates OAuth flow
- **Redirects**: To Google OAuth

### `/api/google-calendar/callback`
- **Method**: GET
- **Query**: `code=xxx&state=xxx`
- **Purpose**: Handles OAuth callback
- **Actions**:
  - Exchanges code for tokens
  - Encrypts refresh token
  - Stores in database
  - Redirects to `/crew` with success/error

---

## 🎯 Server Actions

### `syncCrewAssignmentToGoogleCalendar(eventCrewId)`
- Creates/updates calendar event when crew is assigned
- Called automatically from `sendCrewNotification`
- Handles token refresh automatically

### `removeCrewAssignmentFromGoogleCalendar(eventCrewId)`
- Deletes calendar event when assignment is removed
- Called automatically from `deleteEventCrew`

### `disconnectGoogleCalendar(crewMemberId)`
- Removes refresh token from database
- Sets `google_calendar_connected = false`
- Available from Crew page UI

---

## 🚨 Error Handling

### Token Expiry:
- Access tokens expire after 1 hour
- System automatically refreshes using refresh token
- If refresh token is invalid → Connection marked as disconnected

### Connection Issues:
- Invalid/revoked tokens → User sees "Reconnect" option
- API errors → Logged, doesn't break assignment flow
- Sync failures → Non-blocking, user can retry

---

## ✅ Production Checklist

Before deploying:

- [ ] Google Calendar API enabled
- [ ] OAuth consent screen configured
- [ ] Test users added (or app verified)
- [ ] Environment variables set
- [ ] Migration run
- [ ] Encryption key generated and stored securely
- [ ] Redirect URIs added for production domain
- [ ] Test OAuth flow end-to-end
- [ ] Test calendar event creation
- [ ] Test event update/delete
- [ ] Monitor error logs

---

## 🎨 UI Features

### Crew Page (`/crew`):

- **"Connect Google Calendar"** button (if not connected)
  - Opens OAuth flow
  - Redirects to Google

- **"Calendar"** button with checkmark (if connected)
  - Shows connection status
  - Click to disconnect

- **Success/Error messages**
  - Shows after OAuth callback
  - Auto-clears after 3 seconds

---

## 📝 Future Enhancements (v2)

Not yet implemented, but planned:

- Two-way sync (read availability from Google)
- Webhooks for real-time updates
- Batch sync for existing assignments
- Calendar event templates
- Sync conflict resolution

---

## 🐛 Troubleshooting

### "OAuth error: redirect_uri_mismatch"
- **Fix**: Verify redirect URI in Google Console matches exactly
- Include protocol (`http://` or `https://`)
- No trailing slashes

### "No refresh token received"
- **Fix**: Ensure `prompt=consent` in auth URL
- User must grant permissions
- Check OAuth consent screen configuration

### "Token exchange failed"
- **Fix**: Verify Client ID and Secret
- Check environment variables are set
- Ensure redirect URI matches

### "Failed to create calendar event"
- **Fix**: Verify Google Calendar API is enabled
- Check scope includes `calendar.events`
- Ensure access token is valid

### "Encryption failed"
- **Fix**: Set `GOOGLE_CALENDAR_ENCRYPTION_KEY` in environment
- Key must be at least 32 characters
- Restart server after setting

---

## 📚 References

- [Google Calendar API Docs](https://developers.google.com/calendar/api/v3/reference)
- [Google OAuth 2.0 Guide](https://developers.google.com/identity/protocols/oauth2)
- [OAuth Consent Screen](https://support.google.com/cloud/answer/10311615)

---

## Support

For issues or questions:
1. Check error logs in console
2. Verify all setup steps completed
3. Test OAuth flow manually
4. Check Google Cloud Console for API errors


