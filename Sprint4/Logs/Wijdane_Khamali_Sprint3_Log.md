# Wijdane Khamali – Sprint 3 Contribution Log

| Date | Task(s) | Time Spent | Notes |
|------|----------|------------|-------|
| 2025-10-18 | Task.10.1 | 4 hrs | Implemented RSVP functionality allowing users to register for events. Added capacity validation, prevented duplicate RSVPs, and ensured data consistency in Supabase. |
| 2025-10-18 | Task.10.2 | 2 hrs | Added backend validation for overbook prevention. Synced attendee count with database in real time through trigger-based updates. |
| 2025-10-24 | Task.10.3 | 2 hrs | Integrated automatic ticket creation upon successful RSVP. Linked ticket records with student and event IDs, stored timestamps, and ensured persistence across page refreshes. |
| 2025-10-24 | Task.11.1 | 2 hrs | Used qrcode.react to generate unique QR codes for every RSVP ticket tied to a specific ticket ID. Generated QR upon RSVP completion, encoded ticket and event references, stored QR data securely in the database, and prevented duplicate or invalid QR creation. |
| 2025-10-25 | Task.11.2 | 2 hrs | Displayed each user’s QR-coded ticket on the My Tickets dashboard. Fetched ticket data from Supabase, rendered QR codes in card layout, and included event title, date, and check-in status. |
| 2025-10-30 | Task.10.4 | 3 hrs | Developed MyTickets.tsx page to display all RSVP’d events for logged-in users. Implemented ticket QR rendering, event info display, and navigation links to event details. |
| 2025-10-30 | Task.10.5 | 1 hr | Validated client-side ticket data for accuracy and uniqueness. Handled duplicate prevention and empty-state UI with clear feedback messages. |
| 2025-10-31 | Task.13.1 | 1 hrs | Enabled “Cancel RSVP” feature in MyTickets.tsx. Added confirmation modal, deletion logic for Supabase ticket record, and real-time UI updates reflecting attendee count changes. |
| 2025-10-31 | Task.13.2 | 2 hrs | Ensured synchronization across event and ticket tables post-cancellation. Verified cleanup of orphaned ticket data and tested database triggers for consistency. |



