-- Migration: Remove duplicate events and add unique constraint
-- This prevents duplicate events with the same name, dates, and tenant

-- Step 1: Find duplicates and identify which ones to keep vs delete
-- Strategy: Keep the event with the earliest created_at (oldest one)
-- If there are ties, keep the one with more related data (crew, inventory)
WITH duplicates AS (
  SELECT 
    e.id,
    e.name,
    e.start_date,
    e.end_date,
    e.tenant_id,
    e.created_at,
    COALESCE(ec.count, 0) as crew_count,
    COALESCE(ei.count, 0) as inventory_count,
    ROW_NUMBER() OVER (
      PARTITION BY e.tenant_id, e.name, e.start_date, e.end_date 
      ORDER BY e.created_at ASC, (COALESCE(ec.count, 0) + COALESCE(ei.count, 0)) DESC
    ) as rn
  FROM public.events e
  LEFT JOIN (
    SELECT event_id, COUNT(*) as count 
    FROM public.event_crew 
    GROUP BY event_id
  ) ec ON e.id = ec.event_id
  LEFT JOIN (
    SELECT event_id, COUNT(*) as count 
    FROM public.event_inventory 
    GROUP BY event_id
  ) ei ON e.id = ei.event_id
)
-- Delete duplicate events (foreign key CASCADE will handle related records)
DELETE FROM public.events
WHERE id IN (
  SELECT id 
  FROM duplicates 
  WHERE rn > 1
);

-- Step 2: Add a unique constraint to prevent future duplicates
-- This ensures that within a tenant, you cannot have multiple events with the same name and dates
DO $$
BEGIN
  -- Check if constraint already exists
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'events_tenant_name_dates_unique'
  ) THEN
    ALTER TABLE public.events
    ADD CONSTRAINT events_tenant_name_dates_unique 
    UNIQUE (tenant_id, name, start_date, end_date);
  END IF;
END $$;

-- Add comment
COMMENT ON CONSTRAINT events_tenant_name_dates_unique ON public.events IS 
'Prevents duplicate events with the same name, start_date, and end_date within a tenant';

