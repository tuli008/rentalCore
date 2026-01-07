-- Add technician_type field to crew_members table
-- This allows tracking which crew members can fill which technician roles

-- Step 1: Add technician_type column
alter table public.crew_members
  add column if not exists technician_type text null;

-- Step 2: Add index for better query performance
create index if not exists idx_crew_members_technician_type on public.crew_members (technician_type) where technician_type is not null;

-- Step 3: Add comment for documentation
comment on column public.crew_members.technician_type is 'Primary technician type/specialty of the crew member (e.g., Lighting Technician, Sound Technician). Used for availability checking and role assignment.';


