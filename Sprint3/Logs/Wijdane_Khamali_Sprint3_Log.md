| Date       | Task(s)  | Time Spent | Notes |
|------------|-----------|------------|-------|
| 2025-10-07 | `Task.10.1` | 4 hrs | Implemented RSVP functionality allowing users to register for events. Added capacity validation, prevented duplicate RSVPs, and ensured data consistency in Supabase. |
| 2025-10-08 | `Task.10.2` | 2 hrs | Added backend validation for overbook prevention. Synced attendee count with database in real time through trigger-based updates. |
| 2025-10-09 | `Task.10.3` | 2 hrs | Integrated automatic ticket creation upon successful RSVP. Linked ticket records with student and event IDs, stored timestamps, and ensured persistence across page refreshes. |
| 2025-10-10 | `Task.10.4` | 3 hrs | Developed `MyTickets.tsx` page to display all RSVP’d events for logged-in users. Implemented ticket QR rendering, event info display, and navigation links to event details. |
| 2025-10-11 | `Task.10.5` | 1 hrs | Validated client-side ticket data for accuracy and uniqueness. Handled duplicate prevention and empty-state UI with clear feedback messages. |
| 2025-10-13 | `Task.13.1` | 2 hrs | Enabled “Cancel RSVP” feature in `MyTickets.tsx`. Added confirmation modal, deletion logic for Supabase ticket record, and real-time UI updates reflecting attendee count changes. |
| 2025-10-14 | `Task.13.2` | 2 hrs | Ensured synchronization across event and ticket tables post-cancellation. Verified cleanup of orphaned ticket data and tested database triggers for consistency. |
