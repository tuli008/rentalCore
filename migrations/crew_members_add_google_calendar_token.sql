-- Migration: Add Google Calendar OAuth integration to crew_members
-- This allows crew members to sync their assignments to Google Calendar

-- Add google_calendar_refresh_token column to store OAuth refresh token (encrypted at application level)
alter table if exists public.crew_members 
add column if not exists google_calendar_refresh_token text null;

-- Add google_calendar_token_expiry to track when access token expires
alter table if exists public.crew_members 
add column if not exists google_calendar_token_expiry timestamp with time zone null;

-- Add google_calendar_connected to track connection status
alter table if exists public.crew_members 
add column if not exists google_calendar_connected boolean not null default false;

-- Add indexes for faster lookups
create index if not exists idx_crew_members_google_calendar_token 
on public.crew_members (google_calendar_refresh_token) 
where google_calendar_refresh_token is not null;

create index if not exists idx_crew_members_google_calendar_connected 
on public.crew_members (google_calendar_connected) 
where google_calendar_connected = true;

-- Add comments for documentation
comment on column public.crew_members.google_calendar_refresh_token is 'OAuth refresh token for Google Calendar API access (should be encrypted at application level). Used to sync crew assignments to crew member''s personal calendar.';
comment on column public.crew_members.google_calendar_token_expiry is 'Timestamp when the current access token expires. Used to determine if token refresh is needed.';
comment on column public.crew_members.google_calendar_connected is 'Boolean flag indicating if Google Calendar is connected and active for this crew member.';

