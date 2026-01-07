# Fix: invalid_client Error

## Error Message
```
Token exchange failed: {
  "error": "invalid_client",
  "error_description": "Unauthorized"
}
```

## Problem
The **Client Secret doesn't match the Client ID**. This happens when:
- You created a new OAuth client (new Client ID)
- But the Client Secret in `.env.local` is from an old/different client

---

## Solution: Get the Correct Client Secret

### Step 1: Go to Google Cloud Console

1. Open: https://console.cloud.google.com/
2. Make sure you're in the correct project ("rental")
3. Navigate to: **APIs & Services** → **Credentials**

### Step 2: Find Your OAuth Client

1. Look for the client with this **Client ID**:
   ```
   1065293506678-4fm5ifqr046pdvc5tr71vbrhbur22dnv.apps.googleusercontent.com
   ```

2. Click on the **client name** to open it

### Step 3: Get the Client Secret

1. In the client details page, find **"Client secret"** section
2. If you see `****` (hidden), click **"Show"** or **eye icon**
3. **Copy the full Client Secret** (starts with `GOCSPX-`)

### Step 4: Update `.env.local`

1. Open your `.env.local` file
2. Find the line: `GOOGLE_CLIENT_SECRET=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`
3. Replace it with the **new Client Secret** you just copied

```env
GOOGLE_CLIENT_SECRET=new-secret-here-from-google-console
```

### Step 5: Restart Dev Server

1. Stop server (Ctrl+C)
2. Start again: `npm run dev`

### Step 6: Test Again

1. Go to `/crew` page
2. Click "Connect Calendar"
3. Complete OAuth flow
4. Should now work without "invalid_client" error

---

## Important Notes

- ✅ **Client ID and Client Secret must be from the same OAuth client**
- ✅ If you created a new client, you need its new secret (not the old one)
- ✅ Client secrets are shown only once when created - if you lost it, create a new secret or new client

---

## If You Can't Find the Secret

If the secret is hidden and you can't see it:

1. **Option A:** Create a new Client Secret for this client
   - In the client details page, click **"+ ADD SECRET"** or **"Create Secret"**
   - Copy the new secret (it's shown only once!)
   - Update `.env.local`

2. **Option B:** Create a completely new OAuth client
   - Create new Web application client
   - Copy both new Client ID and Client Secret
   - Update both in `.env.local`


