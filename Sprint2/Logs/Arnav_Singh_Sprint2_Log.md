# Arnav Singh – Sprint 2 Contribution Log

| Date       | Task(s)                                                                 | Time Spent | Notes |
|------------|--------------------------------------------------------------------------|------------|-------|
| 2025-10-06 | **Task.6.4** Ensure created events are displayed properly (US.6 Organizer Event Creation) | 6 hrs | Implemented end-to-end flow so organizer-created events render on the student listing. Touched schema, service layer, and UI. |
| 2025-10-08 | **Task.6.6** Editing Events (US.6)                                       | 5 hrs | Added edit flow for pending events: `/events/:id/edit`, `EditEvent` page, guarded actions in `EventCard`, and My Events wiring. Preserves original values. |
| 2025-10-08 | **Task.6.7** Deleting Events (US.6)                                      | 3 hrs | Added Delete (pending-only) in `EventCard` and My Events. Pending-only delete in service layer, optimistic UI; invalidated organizer & admin pending lists. |
| 2025-10-10 | **Task.5.4** Add filters for events (US.5 Student Event Discovery)       | 4 hrs | Added multi-select Categories/Organizations, date range, sort, and search with AND logic. Active filter chips + “Clear all”. Wired to `listEvents`. Migrated to React Query v5 pattern (`placeholderData: keepPreviousData`). |
| 2025-10-11 | **Task.7.2** Store saved events in local/session storage (US.7)          | 3 hrs | Implemented storage logic only: designed approach and wrote code to persist/retrieve saved event IDs using local/session storage (API + utility). Did not wire into `EventCard` or update `StarredEvents` UI; integration is planned for next sprint. |
| 2025-10-12 | <ins><strong>Friendship Feature (Additional)</strong></ins> – Send/Accept/Decline Requests              | 8 hrs | Built `friend_requests` & `friendships` tables, RLS policies, service methods, and Friends page integration. |

**Total Time Spent: ~29 hrs**
