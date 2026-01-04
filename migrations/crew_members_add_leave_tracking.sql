-- Add leave tracking fields to crew_members table
-- This allows marking crew members as on leave with start/end dates and reason

-- Step 1: Add leave tracking columns
alter table public.crew_members
  add column if not exists on_leave boolean not null default false,
  add column if not exists leave_start_date date null,
  add column if not exists leave_end_date date null,
  add column if not exists leave_reason text null;

-- Step 2: Add check constraint to ensure leave dates are valid
alter table public.crew_members
  add constraint crew_members_leave_dates_check
  check (
    (on_leave = false) or
    (on_leave = true and leave_start_date is not null and leave_end_date is not null and leave_end_date >= leave_start_date)
  );

-- Step 3: Add index for efficient leave queries
create index if not exists idx_crew_members_on_leave on public.crew_members (on_leave, leave_start_date, leave_end_date) where on_leave = true;

-- Step 4: Add comment for documentation
comment on column public.crew_members.on_leave is 'Whether the crew member is currently on leave';
comment on column public.crew_members.leave_start_date is 'Start date of leave period';
comment on column public.crew_members.leave_end_date is 'End date of leave period';
comment on column public.crew_members.leave_reason is 'Reason for leave (optional)';

