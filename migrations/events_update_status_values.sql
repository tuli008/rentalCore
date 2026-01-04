-- Update events table status column to include new status values
-- New statuses: prepping, planned, in_transit, on_venue, closed

-- Step 1: First, drop ALL existing check constraints on the status column
-- The original constraint might be inline or have a different name
do $$
declare
  constraint_name text;
begin
  -- Find and drop any check constraint on the status column
  for constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.events'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%status%'
  loop
    execute format('alter table public.events drop constraint if exists %I', constraint_name);
  end loop;
end $$;

-- Step 2: Update ALL existing status values to new ones
-- This ensures no rows violate the new constraint
update public.events
set status = case
  when status = 'draft' then 'prepping'
  when status = 'confirmed' then 'planned'
  when status = 'in_progress' then 'on_venue'
  when status = 'completed' then 'closed'
  when status = 'cancelled' then 'closed'
  -- Handle any other unexpected statuses by defaulting to prepping
  when status not in ('prepping', 'planned', 'in_transit', 'on_venue', 'closed') then 'prepping'
  else status
end;

-- Step 3: Add new check constraint with updated status values
alter table public.events
  add constraint events_status_check
  check (
    status = any (
      array[
        'prepping'::text,
        'planned'::text,
        'in_transit'::text,
        'on_venue'::text,
        'closed'::text
      ]
    )
  );

-- Add comment for documentation
comment on column public.events.status is 'Event status: prepping (quote draft), planned (quote accepted), in_transit, on_venue, closed (all inventory returned)';

