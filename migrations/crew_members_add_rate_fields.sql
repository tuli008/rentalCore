-- Migration: Add rate fields to crew_members table
-- This allows crew members to have rates based on hourly, daily, weekly, or monthly basis

-- Step 1: Add rate_type column (hourly, daily, weekly, monthly)
alter table if exists public.crew_members 
add column if not exists rate_type text null 
check (rate_type is null or rate_type in ('hourly', 'daily', 'weekly', 'monthly'));

-- Step 2: Add base_rate column to store the rate amount
alter table if exists public.crew_members 
add column if not exists base_rate numeric(10, 2) null;

-- Step 3: Add check constraint to ensure rate and rate_type are both present or both null
alter table if exists public.crew_members
add constraint crew_members_rate_check
check (
  (rate_type is null and base_rate is null) or
  (rate_type is not null and base_rate is not null and base_rate > 0)
);

-- Step 4: Add index for faster lookups
create index if not exists idx_crew_members_rate_type 
on public.crew_members (rate_type) 
where rate_type is not null;

-- Step 5: Add comments for documentation
comment on column public.crew_members.rate_type is 'Rate calculation basis: hourly, daily, weekly, or monthly';
comment on column public.crew_members.base_rate is 'Base rate amount. Meaning depends on rate_type (e.g., $50/hour, $400/day, $2000/week, $8000/month)';


