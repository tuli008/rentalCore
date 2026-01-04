# Production Deployment Checklist

## 🔐 1. Environment Variables

### Required Variables
Add these to your production environment (Vercel, Railway, etc.):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# App URL (for API calls)
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Resend Email (Production)
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Optional: SMS (Twilio)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

### Important Notes:
- ✅ **Never commit `.env.local` to git**
- ✅ Use production environment variables in your hosting platform
- ✅ `NEXT_PUBLIC_APP_URL` must be your actual domain (not localhost)
- ✅ `RESEND_FROM_EMAIL` must use a verified domain (not `onboarding@resend.dev`)

---

## 📧 2. Email Configuration (Resend)

### Step 1: Verify Your Domain
1. Go to [Resend Dashboard](https://resend.com/domains)
2. Click **Add Domain**
3. Enter your domain (e.g., `yourdomain.com`)
4. Add the DNS records Resend provides:
   - **SPF record** (TXT)
   - **DKIM records** (CNAME)
   - **DMARC record** (TXT) - Optional but recommended
5. Wait for verification (usually 5-15 minutes)

### Step 2: Update Environment Variables
```env
RESEND_FROM_EMAIL=noreply@yourdomain.com
# Or use:
RESEND_FROM_EMAIL=notifications@yourdomain.com
RESEND_FROM_EMAIL=events@yourdomain.com
```

### Step 3: Test Email Sending
- Test with a real email address
- Check spam folder if email doesn't arrive
- Monitor Resend dashboard for delivery status

---

## 🔒 3. Security & Authentication

### Supabase RLS (Row Level Security)
Ensure RLS policies are enabled for all tables:

```sql
-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Key tables that need RLS:
-- ✅ users
-- ✅ tenants
-- ✅ inventory_groups
-- ✅ inventory_items
-- ✅ inventory_stock
-- ✅ crew_members
-- ✅ events
-- ✅ quotes
```

### Authentication
- ✅ Supabase Auth is configured
- ✅ JWT tokens are being used
- ✅ Session management is working
- ✅ Password requirements are enforced (min 6 characters)

### Admin Access
- ✅ First admin user is created in `public.users` table
- ✅ Role-based access control is working
- ✅ Admin routes are protected

---

## 🗄️ 4. Database Setup

### Required Migrations
Run all migrations in order:

```bash
# 1. Core tables
migrations/users_table.sql
migrations/crew_members_migration.sql
migrations/events_migration.sql

# 2. Status updates
migrations/events_update_status_values.sql

# 3. Leave tracking
migrations/crew_members_add_leave_tracking.sql
```

### Database Indexes
Verify indexes exist for performance:

```sql
-- Check indexes
SELECT 
    tablename, 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

### Backup Strategy
- ✅ Enable automatic backups in Supabase
- ✅ Set backup retention period (recommended: 30 days)
- ✅ Test restore process

---

## 🚀 5. Deployment Platform Setup

### Vercel (Recommended)
1. **Connect Repository**
   - Link your GitHub/GitLab repo
   - Enable automatic deployments

2. **Environment Variables**
   - Add all required env vars
   - Set for Production, Preview, and Development

3. **Build Settings**
   ```json
   {
     "buildCommand": "npm run build",
     "outputDirectory": ".next",
     "installCommand": "npm install"
   }
   ```

4. **Domain Configuration**
   - Add custom domain
   - Enable SSL (automatic with Vercel)
   - Configure DNS records

### Other Platforms
- **Railway**: Similar setup, add env vars in dashboard
- **Render**: Add env vars, configure build settings
- **AWS/GCP**: More complex, requires infrastructure setup

---

## 📊 6. Monitoring & Logging

### Error Tracking
Consider adding:
- **Sentry** for error tracking
- **LogRocket** for session replay
- **Vercel Analytics** for performance

### Logging
- ✅ Server logs are accessible
- ✅ API route errors are logged
- ✅ Database errors are caught and logged

### Health Checks
Create a health check endpoint:

```typescript
// app/api/health/route.ts
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    timestamp: new Date().toISOString()
  });
}
```

---

## ⚡ 7. Performance Optimizations

### Next.js Configuration
```typescript
// next.config.ts
const nextConfig = {
  // Enable production optimizations
  compress: true,
  poweredByHeader: false,
  
  // Image optimization
  images: {
    domains: ['your-supabase-project.supabase.co'],
  },
};
```

### Database Queries
- ✅ Use indexes for frequently queried columns
- ✅ Limit result sets (pagination)
- ✅ Use `select()` to only fetch needed fields
- ✅ Avoid N+1 queries

### Caching
- ✅ Use Next.js `revalidatePath()` appropriately
- ✅ Cache static data when possible
- ✅ Use Supabase connection pooling

---

## 🧪 8. Testing Before Production

### Functional Tests
- [ ] User signup/login works
- [ ] Admin can access admin pages
- [ ] Inventory CRUD operations work
- [ ] Quote creation and approval works
- [ ] Event creation from quotes works
- [ ] Crew assignment works
- [ ] Email notifications are sent
- [ ] Calendar view displays events correctly

### Security Tests
- [ ] Non-admin users cannot access admin routes
- [ ] Users cannot access other tenants' data
- [ ] API routes require authentication
- [ ] SQL injection protection (Supabase handles this)
- [ ] XSS protection (React handles this)

### Performance Tests
- [ ] Page load times < 3 seconds
- [ ] API response times < 500ms
- [ ] Database queries are optimized
- [ ] No memory leaks

---

## 📱 9. Mobile/Responsive

- [ ] Test on mobile devices
- [ ] Navigation works on small screens
- [ ] Forms are usable on mobile
- [ ] Calendar view is responsive
- [ ] Tables scroll horizontally on mobile

---

## 🔄 10. Backup & Recovery

### Database Backups
- ✅ Automatic daily backups enabled
- ✅ Manual backup before major changes
- ✅ Test restore process

### Code Backups
- ✅ Git repository is backed up
- ✅ Tag releases for easy rollback
- ✅ Keep deployment history

---

## 🚨 11. Error Handling

### User-Facing Errors
- ✅ Friendly error messages
- ✅ No technical details exposed to users
- ✅ Error boundaries for React components

### Server Errors
- ✅ All errors are logged
- ✅ Critical errors trigger alerts
- ✅ Error details in development, generic in production

---

## 📝 12. Documentation

- [ ] API documentation (if exposing APIs)
- [ ] User guide for admins
- [ ] Troubleshooting guide
- [ ] Deployment runbook

---

## ✅ 13. Pre-Launch Checklist

### Final Checks
- [ ] All environment variables are set
- [ ] Domain is verified in Resend
- [ ] SSL certificate is active
- [ ] Database migrations are applied
- [ ] Admin user is created
- [ ] Test email sending works
- [ ] All features are tested
- [ ] Error tracking is configured
- [ ] Monitoring is set up
- [ ] Backup strategy is in place

### Launch Day
1. **Deploy to production**
2. **Verify deployment** (check health endpoint)
3. **Test critical paths** (login, create event, send notification)
4. **Monitor logs** for first hour
5. **Check error tracking** for issues

---

## 🔧 14. Post-Launch

### First Week
- Monitor error rates
- Check email delivery rates
- Review user feedback
- Monitor performance metrics
- Fix critical bugs immediately

### Ongoing
- Regular security updates
- Database maintenance
- Performance monitoring
- User feedback collection
- Feature improvements

---

## 🆘 15. Troubleshooting

### Common Issues

**Emails not sending:**
- Check Resend API key is correct
- Verify domain is verified in Resend
- Check spam folder
- Review Resend dashboard logs

**Authentication issues:**
- Verify Supabase URL and keys
- Check JWT token expiration
- Verify RLS policies are correct

**Database errors:**
- Check connection limits
- Verify migrations are applied
- Check RLS policies
- Review query performance

**Performance issues:**
- Check database indexes
- Review slow queries
- Optimize API routes
- Enable caching where appropriate

---

## 📞 Support

For issues:
1. Check server logs
2. Review error tracking (Sentry, etc.)
3. Check Supabase dashboard
4. Review Resend dashboard
5. Check Vercel deployment logs

---

## 🎯 Quick Production Setup Commands

```bash
# 1. Set environment variables in hosting platform
# (Use their dashboard, not command line)

# 2. Deploy
git push origin main  # If using Vercel auto-deploy
# Or use: vercel --prod

# 3. Verify deployment
curl https://yourdomain.com/api/health

# 4. Test critical paths
# - Login
# - Create event
# - Send notification
```

---

**Last Updated:** $(date)
**Version:** 1.0.0

