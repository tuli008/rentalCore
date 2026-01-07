# Rate Types Implementation - Hourly/Daily/Weekly/Monthly

## Overview

The system now supports assigning crew members with rates based on different time periods:
- **Hourly**: Rate per hour (e.g., $50/hour)
- **Daily**: Rate per day (e.g., $400/day)
- **Weekly**: Rate per week (e.g., $2000/week)
- **Monthly**: Rate per month (e.g., $8000/month)

## Database Changes

### 1. Crew Members Table (`crew_members`)

**Migration:** `migrations/crew_members_add_rate_fields.sql`

Adds:
- `rate_type`: text (hourly, daily, weekly, monthly) - nullable
- `base_rate`: numeric(10, 2) - nullable

**Constraint:** Both `rate_type` and `base_rate` must be present together or both null.

### 2. Event Crew Table (`event_crew`)

**Migration:** `migrations/event_crew_update_rate_fields.sql`

Changes:
- Renames `hourly_rate` → `rate` (more generic)
- Adds `rate_type`: text (hourly, daily, weekly, monthly) - nullable

**Important:** 
- Existing rows with `hourly_rate` will automatically get `rate_type = 'hourly'`
- Can override crew member's base rate for specific events
- If `rate_type` is null, uses crew member's base `rate_type`

### 3. Google Calendar Event ID

**Migration:** `migrations/event_crew_add_google_event_id.sql`

Adds `google_event_id` for Google Calendar sync (separate feature).

## Code Changes

### 1. Rate Calculation Utilities (`lib/rate-calculations.ts`)

New utility functions:
- `convertRate()`: Convert between rate types
- `calculateCost()`: Calculate total cost based on rate type and duration
- `formatRate()`: Format rate for display (e.g., "$50/hr", "$400/day")
- `getRateTypeLabel()`: Get human-readable label

### 2. Server Actions

**Updated:**
- `app/actions/crew.ts`: Create/update crew members with rate fields
- `app/actions/events.ts`: Add/update event crew with rate fields
- `app/actions/notifications.ts`: Show rate with type in notifications

**Key Changes:**
- `CrewMember` interface: Added `rate_type` and `base_rate`
- `EventCrew` interface: Changed `hourly_rate` → `rate`, added `rate_type`
- When assigning crew to event: Uses crew member's base rate/type if not specified

### 3. UI Components

**Updated:**
- `app/components/crew/CrewMembersPage.tsx`: 
  - Rate type dropdown in add/edit form
  - Base rate input field
  - Rate display in crew members table

- `app/components/events/EventCrewTab.tsx`:
  - Rate type selector and rate input in edit form
  - Rate display with type (e.g., "$50/hr", "$400/day")

- `app/components/events/CrewSidebar.tsx`:
  - Passes crew member's base rate and rate type when adding to event

## Usage

### Setting Up Crew Member Rates

1. Go to `/crew` page
2. Add or edit a crew member
3. Select rate type (Hourly, Daily, Weekly, Monthly)
4. Enter base rate amount
5. Save

### Assigning Crew to Events

1. Go to Event → Crew tab
2. Click "Add Crew"
3. Select crew member
4. System automatically uses crew member's base rate and rate type
5. Optionally edit rate/rate type for this specific event assignment

### Editing Event-Specific Rates

1. In Event → Crew tab, click "Edit" on a crew assignment
2. Modify rate type and/or rate amount
3. Save - this overrides the crew member's base rate for this event only

## Migration Steps

**IMPORTANT:** Run migrations in order:

1. **First:** `migrations/crew_members_add_rate_fields.sql`
   - Adds rate fields to crew_members table

2. **Second:** `migrations/event_crew_update_rate_fields.sql`
   - Updates event_crew table
   - Handles existing data (sets rate_type='hourly' for existing rows)

3. **Third:** `migrations/event_crew_add_google_event_id.sql` (if not already run)
   - Adds google_event_id for calendar sync

## Rate Display Examples

- **Hourly:** `$50/hr`
- **Daily:** `$400/day`
- **Weekly:** `$2000/wk`
- **Monthly:** `$8000/mo`

## Calculations

The system uses these conversion factors (can be adjusted in `lib/rate-calculations.ts`):
- 8 hours/day
- 5 days/week
- 4 weeks/month

When calculating costs:
- **Hourly:** Rate × hours worked
- **Daily:** Rate × days worked (minimum 1 day)
- **Weekly:** Rate × weeks worked (minimum 1 week)
- **Monthly:** Rate × months worked (minimum 1 month)

## Future Enhancements

Potential improvements:
- Rate history tracking (rate changes over time)
- Overtime rates
- Different rates for different roles
- Rate templates
- Bulk rate updates


