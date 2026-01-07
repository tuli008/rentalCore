-- Migration: Add google_event_id to event_crew table
-- This allows storing the Google Calendar event ID when assignments are synced to Google Calendar

-- Add google_event_id column to store Google Calendar event ID
alter table if exists public.event_crew 
add column if not exists google_event_id text null;

-- Add index for faster lookups
create index if not exists idx_event_crew_google_event_id 
on public.event_crew (google_event_id) 
where google_event_id is not null;

-- Add comment for documentation
comment on column public.event_crew.google_event_id is 'Google Calendar event ID for syncing crew assignments. When a crew assignment is synced to Google Calendar, this stores the event ID from Google Calendar API to enable updates and deletions.';

