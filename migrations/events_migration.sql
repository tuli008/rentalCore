-- Events Migration
-- This migration creates tables for event management with crew scheduling, inventory, and costing

-- Step 1: Create events table
create table if not exists public.events (
  id uuid not null default extensions.uuid_generate_v4 (),
  tenant_id uuid not null,
  name text not null,
  description text null,
  start_date date not null,
  end_date date not null,
  location text null,
  status text not null default 'draft' check (status in ('draft', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  quote_id uuid null, -- Optional link to a quote
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint events_pkey primary key (id),
  constraint events_tenant_id_fkey foreign key (tenant_id) references tenants (id) on delete CASCADE,
  constraint events_quote_id_fkey foreign key (quote_id) references quotes (id) on delete set null,
  constraint events_date_range_check check (end_date >= start_date)
) TABLESPACE pg_default;

-- Step 2: Create event_inventory table (links events to inventory items)
create table if not exists public.event_inventory (
  id uuid not null default extensions.uuid_generate_v4 (),
  tenant_id uuid not null,
  event_id uuid not null,
  item_id uuid not null,
  quantity integer not null default 1,
  unit_price_snapshot numeric(10, 2) not null,
  notes text null,
  created_at timestamp with time zone not null default now(),
  constraint event_inventory_pkey primary key (id),
  constraint event_inventory_tenant_id_fkey foreign key (tenant_id) references tenants (id) on delete CASCADE,
  constraint event_inventory_event_id_fkey foreign key (event_id) references events (id) on delete CASCADE,
  constraint event_inventory_item_id_fkey foreign key (item_id) references inventory_items (id) on delete CASCADE,
  constraint event_inventory_quantity_check check (quantity > 0),
  constraint event_inventory_event_item_unique unique (event_id, item_id)
) TABLESPACE pg_default;

-- Step 3: Create event_crew table (links events to crew members with roles and scheduling)
create table if not exists public.event_crew (
  id uuid not null default extensions.uuid_generate_v4 (),
  tenant_id uuid not null,
  event_id uuid not null,
  crew_member_id uuid not null,
  role text not null, -- e.g., "Lead", "Assistant", "Driver", "Technician"
  call_time timestamp with time zone null, -- When crew member should arrive
  end_time timestamp with time zone null, -- When crew member can leave
  hourly_rate numeric(10, 2) null, -- Rate for this event (can differ from standard rate)
  notes text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint event_crew_pkey primary key (id),
  constraint event_crew_tenant_id_fkey foreign key (tenant_id) references tenants (id) on delete CASCADE,
  constraint event_crew_event_id_fkey foreign key (event_id) references events (id) on delete CASCADE,
  constraint event_crew_crew_member_id_fkey foreign key (crew_member_id) references crew_members (id) on delete CASCADE,
  constraint event_crew_event_crew_unique unique (event_id, crew_member_id),
  constraint event_crew_time_range_check check (end_time is null or call_time is null or end_time >= call_time)
) TABLESPACE pg_default;

-- Step 4: Create event_tasks table (operational tasks/logistics)
create table if not exists public.event_tasks (
  id uuid not null default extensions.uuid_generate_v4 (),
  tenant_id uuid not null,
  event_id uuid not null,
  title text not null,
  description text null,
  assigned_to_crew_id uuid null, -- Links to event_crew
  due_time timestamp with time zone null,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint event_tasks_pkey primary key (id),
  constraint event_tasks_tenant_id_fkey foreign key (tenant_id) references tenants (id) on delete CASCADE,
  constraint event_tasks_event_id_fkey foreign key (event_id) references events (id) on delete CASCADE,
  constraint event_tasks_assigned_to_fkey foreign key (assigned_to_crew_id) references event_crew (id) on delete set null
) TABLESPACE pg_default;

-- Step 5: Create event_timesheets table (for tracking actual hours worked)
create table if not exists public.event_timesheets (
  id uuid not null default extensions.uuid_generate_v4 (),
  tenant_id uuid not null,
  event_id uuid not null,
  crew_member_id uuid not null,
  event_crew_id uuid null, -- Links to event_crew for rate reference
  date date not null,
  start_time time not null,
  end_time time null,
  break_minutes integer not null default 0,
  total_hours numeric(5, 2) null, -- Calculated: (end_time - start_time - break) in hours
  hourly_rate numeric(10, 2) not null, -- Snapshot of rate at time of entry
  total_cost numeric(10, 2) null, -- Calculated: total_hours * hourly_rate
  notes text null,
  approved_by uuid null, -- User/crew member who approved
  approved_at timestamp with time zone null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint event_timesheets_pkey primary key (id),
  constraint event_timesheets_tenant_id_fkey foreign key (tenant_id) references tenants (id) on delete CASCADE,
  constraint event_timesheets_event_id_fkey foreign key (event_id) references events (id) on delete CASCADE,
  constraint event_timesheets_crew_member_id_fkey foreign key (crew_member_id) references crew_members (id) on delete CASCADE,
  constraint event_timesheets_event_crew_id_fkey foreign key (event_crew_id) references event_crew (id) on delete set null,
  constraint event_timesheets_break_minutes_check check (break_minutes >= 0),
  constraint event_timesheets_total_hours_check check (total_hours is null or total_hours >= 0),
  constraint event_timesheets_time_range_check check (end_time is null or end_time > start_time)
) TABLESPACE pg_default;

-- Step 6: Create indexes for better query performance
create index if not exists idx_events_tenant_id on public.events (tenant_id);
create index if not exists idx_events_status on public.events (status);
create index if not exists idx_events_start_date on public.events (start_date);
create index if not exists idx_event_inventory_event_id on public.event_inventory (event_id);
create index if not exists idx_event_inventory_item_id on public.event_inventory (item_id);
create index if not exists idx_event_crew_event_id on public.event_crew (event_id);
create index if not exists idx_event_crew_crew_member_id on public.event_crew (crew_member_id);
create index if not exists idx_event_crew_call_time on public.event_crew (call_time);
create index if not exists idx_event_tasks_event_id on public.event_tasks (event_id);
create index if not exists idx_event_tasks_assigned_to on public.event_tasks (assigned_to_crew_id);
create index if not exists idx_event_tasks_status on public.event_tasks (status);
create index if not exists idx_event_timesheets_event_id on public.event_timesheets (event_id);
create index if not exists idx_event_timesheets_crew_member_id on public.event_timesheets (crew_member_id);
create index if not exists idx_event_timesheets_date on public.event_timesheets (date);

-- Step 7: Add comments for documentation
comment on table public.events is 'Stores event information including dates, location, and status';
comment on table public.event_inventory is 'Links inventory items to events with quantities and pricing';
comment on table public.event_crew is 'Assigns crew members to events with roles, call times, and rates';
comment on table public.event_tasks is 'Operational tasks and logistics for events';
comment on table public.event_timesheets is 'Tracks actual hours worked by crew members for costing and invoicing';

