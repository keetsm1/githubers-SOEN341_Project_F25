# Wijdane Khamali -  Contribution Log

| Date | Task(s) | Story Points | Priority | Notes |
|------|----------|--------------|-----------|-------|
| 2025-09-24 | Task 01.02, Task 01.04 | 4 pts | High | Rewrote, polished, and added details to Meeting Minutes #1–#3. |
| 2025-09-27 | Task 11.1 | 3 pts | Medium | Wrote meeting minutes and summarized team discussions & outcomes. |
| 2025-10-09 | Task 5.6 | 2 pts | Medium | Added event-starring functionality to let users mark favorite events. |
| 2025-10-10 | Task 11.2 | 3 pts | Medium | Updated GitHub Wiki pages with finalized Sprint 1 documentation and structure. |
| 2025-09-27 | Task 11.1 | 3 pts | Medium | Updated Meeting Minutes #2 for Sprint 2 with detailed decisions and assigned tasks. |
| 2025-10-09 | Task 5.6 | 2 pts | Medium | Added “star” functionality so users can track interesting events. Each card includes a star button that adds the event to the user’s starred list. |
| 2025-10-10 | Task 11.2 | 3 pts | Medium | Updated the GitHub Wiki with Sprint 2 documentation, structure, and meeting summaries. |
| 2025-10-18 | Task 10.1 | 5 pts | High | Implemented RSVP feature allowing users to register for events. Added capacity validation, prevented duplicates, and ensured data consistency in Supabase. |
| 2025-10-18 | Task 10.2 | 3 pts | High | Added backend validation to prevent overbooking. Synced attendee count with Supabase triggers for real-time updates. |
| 2025-10-24 | Task 10.3 | 2 pts | Medium | Integrated automatic ticket creation upon RSVP. Linked tickets with student & event IDs and ensured persistence across refreshes. |
| 2025-10-24 | Task 11.1 | 3 pts | High | Used qrcode.react to generate unique QR codes for each RSVP ticket ID. Generated QR on RSVP completion, encoded ticket & event references, stored QR data securely in Supabase, and prevented duplicates. |
| 2025-10-25 | Task 11.2 | 2 pts | Medium | Displayed each user’s QR-coded ticket on the My Tickets dashboard. Fetched ticket data from Supabase, rendered QRs in card layout, and included event title, date, and check-in status. |
| 2025-10-30 | Task 10.4 | 3 pts | Medium | Developed MyTickets.tsx page to list RSVP’d events with QR rendering, event info display, and navigation links. |
| 2025-10-30 | Task 10.5 | 2 pts | Medium | Validated client-side ticket data for accuracy and uniqueness. Handled duplicate prevention and empty-state UI with clear feedback messages. |
| 2025-10-31 | Task 13.1 | 3 pts | Medium | Added Cancel RSVP feature in MyTickets.tsx. Included confirmation modal, Supabase deletion logic, and real-time UI updates reflecting attendee count. |
| 2025-10-31 | Task 13.2 | 2 pts | Medium | Ensured synchronization between event and ticket tables after cancellation. Verified cleanup of orphaned data and tested database triggers for consistency. |
