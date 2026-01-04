# Crew Assignment Notification Setup

## Overview

When a crew member is assigned to an event, the system automatically sends notifications via email and/or SMS with event details.

## Current Implementation

The notification system is integrated into the crew assignment flow. When you assign a crew member to an event:

1. **Automatic Notification**: The system automatically sends a notification if the crew member has an email or phone number
2. **Notification Content Includes**:
   - Event name
   - Role assigned
   - Event dates (formatted)
   - Event location
   - Call time
   - End time
   - Hourly rate

## Setup Instructions

### Option 1: Email via Resend (Recommended)

1. **Sign up for Resend**: https://resend.com
2. **Get API Key**: From Resend dashboard
3. **Add to `.env.local`**:
   ```env
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   NEXT_PUBLIC_APP_URL=http://localhost:3000  # or your production URL
   ```

4. **Update `/app/api/notifications/send/route.ts`**:
   - Uncomment the Resend code
   - Update the `from` email address
   - Install Resend: `npm install resend`

### Option 2: Email via SendGrid

1. **Sign up for SendGrid**: https://sendgrid.com
2. **Get API Key**: From SendGrid dashboard
3. **Add to `.env.local`**:
   ```env
   SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
   ```

4. **Update the API route** to use SendGrid SDK

### Option 3: SMS via Twilio

1. **Sign up for Twilio**: https://www.twilio.com
2. **Get Account SID and Auth Token**
3. **Add to `.env.local`**:
   ```env
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=xxxxxxxxxxxxx
   TWILIO_PHONE_NUMBER=+1234567890
   ```

4. **Update `/app/api/notifications/send/route.ts`**:
   - Uncomment the Twilio code
   - Install Twilio: `npm install twilio`

## Notification Format

### Email Template

```
Hello [Crew Member Name],

You have been assigned to the following event:

Event: [Event Name]
Role: [Role]
Dates: [Start Date] - [End Date]
Location: [Location]
Call Time: [Call Time]
End Time: [End Time]
Rate: [Rate]

Please confirm your availability and contact us if you have any questions.

Thank you!
```

### SMS Template

```
Event Assignment: [Event Name]
Role: [Role]
Dates: [Start Date] - [End Date]
Location: [Location]
Call: [Call Time]
```

## How It Works

1. **Crew Assignment**: When you assign a crew member via the Crew tab
2. **Automatic Trigger**: The `addEventCrew` function automatically calls the notification system
3. **Notification Sent**: If crew member has email/phone, notification is sent
4. **Non-Blocking**: If notification fails, assignment still succeeds (logged to console)

## Testing

1. Assign a crew member to an event
2. Check server logs for notification attempts
3. Check email/SMS inbox (if service is configured)
4. Check browser console for any errors

## Current Status

- ✅ Notification system integrated
- ✅ Email template ready
- ✅ SMS template ready
- ⚠️ Email/SMS service needs to be configured (currently logs only)

## Next Steps

1. Choose an email service (Resend recommended)
2. Choose an SMS service (Twilio recommended)
3. Add API keys to `.env.local`
4. Uncomment and configure the service code in `/app/api/notifications/send/route.ts`
5. Test by assigning a crew member to an event

