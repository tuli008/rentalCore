-- Migration: Update event_crew table to support different rate types
-- This allows event-specific rates with different calculation bases (hourly, daily, weekly, monthly)

-- Step 1: Add rate_type column for event-specific rate types (before renaming)
alter table if exists public.event_crew 
add column if not exists rate_type text null;

-- Step 2: Rename hourly_rate to rate (more generic)
-- Do this after adding rate_type so we can update existing rows
alter table if exists public.event_crew 
rename column hourly_rate to rate;

-- Step 3: Set default rate_type to 'hourly' for existing rows that have rate but no rate_type
-- This handles existing data gracefully
update public.event_crew 
set rate_type = 'hourly' 
where rate is not null and rate > 0 and rate_type is null;

-- Step 4: Add check constraint for rate_type values
alter table if exists public.event_crew
drop constraint if exists event_crew_rate_type_check;

alter table if exists public.event_crew
add constraint event_crew_rate_type_check
check (rate_type is null or rate_type in ('hourly', 'daily', 'weekly', 'monthly'));

-- Step 5: Add check constraint to ensure rate and rate_type are both present or both null
alter table if exists public.event_crew
drop constraint if exists event_crew_rate_check;

alter table if exists public.event_crew
add constraint event_crew_rate_check
check (
  (rate_type is null and rate is null) or
  (rate_type is not null and rate is not null and rate > 0)
);

-- Step 4: Add comments for documentation
comment on column public.event_crew.rate is 'Rate amount for this event assignment. Meaning depends on rate_type (e.g., $50/hour, $400/day). Can override crew member base rate.';
comment on column public.event_crew.rate_type is 'Rate calculation basis for this event: hourly, daily, weekly, or monthly. If null, uses crew member base rate_type.';

