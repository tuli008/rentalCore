-- Fix crew_members role constraint to use 'Own Crew' instead of 'Owner'
-- This migration updates the existing check constraint

-- Step 1: Drop the old constraint
alter table public.crew_members 
  drop constraint if exists crew_members_role_check;

-- Step 2: Add the new constraint with 'Own Crew'
alter table public.crew_members 
  add constraint crew_members_role_check 
  check (role in ('Own Crew', 'Freelancer'));

-- Step 3: Update any existing 'Owner' records to 'Own Crew' (if any exist)
update public.crew_members 
  set role = 'Own Crew' 
  where role = 'Owner';

-- Step 4: Update the comment
comment on column public.crew_members.role is 'Role type: Own Crew or Freelancer';
