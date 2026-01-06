-- Labor Items and Role Requirements Migration
-- This migration adds support for Google Calendar sync (future feature)
-- Note: This migration assumes you've already run the migration that adds labor support to quote_items
-- (item_type, labor_technician_type, labor_days, labor_rate_per_day fields)

-- Add google_event_id to event_crew for calendar sync (future)
alter table if exists public.event_crew 
  add column if not exists google_event_id text null;

-- Add comment for documentation
comment on column public.event_crew.google_event_id is 'Google Calendar event ID for syncing crew assignments';
