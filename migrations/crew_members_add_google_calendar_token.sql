-- Migration: Add Google Calendar OAuth token to crew_members
-- This allows crew members to sync their assignments to Google Calendar

-- Add google_calendar_refresh_token column to store OAuth refresh token
alter table if exists public.crew_members 
add column if not exists google_calendar_refresh_token text null;

-- Add index for faster lookups
create index if not exists idx_crew_members_google_calendar_token 
on public.crew_members (google_calendar_refresh_token) 
where google_calendar_refresh_token is not null;

-- Add comment for documentation
comment on column public.crew_members.google_calendar_refresh_token is 'OAuth refresh token for Google Calendar API access. Used to sync crew assignments to crew member''s personal calendar.';

