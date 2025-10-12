# Arnav Singh – Sprint 2 Contribution Log

| Date       | Task(s)                                                                 | Time Spent | Notes |
|------------|--------------------------------------------------------------------------|------------|-------|
| 2025-10-05 | **Task.6.4** Ensure created events are displayed properly (US.6 Organizer Event Creation) | 6 hrs | Implemented end-to-end flow so organizer-created events render on the student listing. Touched schema, service layer, and UI. |
| 2025-10-06 | **Task.5.4** Add filters for events (US.5 Student Event Discovery)       | 4 hrs | Added multi-select Categories/Organizations, date range, sort, and search with AND logic. Active filter chips + “Clear all”. Wired to `listEvents`. Migrated to React Query v5 pattern (`placeholderData: keepPreviousData`). |
| 2025-10-07 | *Friendship Feature (New)* – Send/Accept/Decline Requests              | 8 hrs | Built `friend_requests` & `friendships` tables, RLS policies, service methods, and Friends page integration. |
| 2025-10-08 | Debugging Foreign Key + Profiles Issues                                  | 3 hrs | Fixed `profiles.email`/FK issues, updated policies, validated end-to-end. |
| 2025-10-09 | Final Testing & Integration                                              | 2 hrs | Verified event creation & friendship flows; UI polish and regression checks. |
| 2025-10-10 | **Task.6.6** Editing Events (US.6)                                       | 5 hrs | Added edit flow for pending events: `/events/:id/edit`, `EditEvent` page, guarded actions in `EventCard`, and My Events wiring. Preserves original values. |
| 2025-10-11 | **Task.6.7** Deleting Events (US.6)                                      | 3 hrs | Added Delete (pending-only) in `EventCard` and My Events. Pending-only delete in service layer, optimistic UI; invalidated organizer & admin pending lists. |
| 2025-10-11 | Admin – Approve Events fixes                                             | 2 hrs | Corrected pending query (`status = 'pending'`), added Supabase realtime subscription to auto-refresh on approve/reject/delete. |
| 2025-10-12 | **Task.7.2** Store saved events in local/session storage (US.7)          | 3 hrs | Implemented storage logic only: designed approach and wrote code to persist/retrieve saved event IDs using local/session storage (API + utility). Did not wire into `EventCard` or update `StarredEvents` UI; integration is planned for next sprint. |
| 2025-10-12 | React Query v5 migration fix                                             | 1 hr | Replaced deprecated `keepPreviousData` with `placeholderData: keepPreviousData` in `SearchEvents.tsx`. |

**Total Time Spent: ~34 hrs**

---

## Highlights
- Robust filters (Task 5.4) with clear UX and smooth refetching.
- Full organizer event lifecycle (create → edit pending → delete pending) with admin sync.
- Saved events logic complete (local/session storage); UI wiring pending.
- Supabase schema/RLS fixes and React Query v5 cleanup.

