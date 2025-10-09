# Arnav Singh - Sprint 2 Contribution Log

| Date       | Task(s)                        | Time Spent | Notes |
|------------|--------------------------------|------------|-------|
| 2025-10-05 | Task.6.4 Ensure created events are displayed properly (US.6 Organizer Event Creation) | 6 hrs | Implemented full flow for student/organizer event creation. Handled **database schema**, **backend service integration**, and **frontend UI updates** to ensure created events render correctly in the app. |
| 2025-10-06 | Task.5.4 Add filters for events (US.5 Student Event Discovery) | 4 hrs | Added event filtering logic. Worked on **backend Supabase queries** and **frontend filtering controls** so students can search/discover events effectively. |
| 2025-10-07 | Friendship Feature (New) – Send/Accept/Decline Requests | 8 hrs | Designed and integrated **friendship system**. Created `friend_requests` and `friendships` tables in Supabase, added **RLS policies**, and built **backend service layer functions** (`sendFriendRequest`, `getIncomingFriendRequests`, `acceptFriendRequest`). Connected this to the **frontend Friends page**. |
| 2025-10-08 | Debugging Foreign Key + Profiles Issues | 3 hrs | Fixed Supabase schema issues causing errors (`profiles.email`, missing foreign key on `friend_requests`). Updated policies and ensured **backend and frontend requests** work end-to-end. |
| 2025-10-09 | Final Testing & Integration | 2 hrs | Verified full flow across **database**, **backend**, and **frontend** for events and friends. Ensured student-created events display, friend requests can be sent/accepted, and UI updates properly. |

**Total Time Spent: ~23 hrs**

---

### Summary
In Sprint 2, I contributed to **Organizer Event Creation (US.6)**, **Student Event Discovery (US.5)**, and additionally took ownership of implementing the **Friendship feature** end-to-end. My work spanned the **database layer (Supabase schema & RLS policies)**, the **backend service layer (TypeScript API integration)**, and the **frontend (Friends and Events pages)**. This ensured seamless functionality across all layers of the system.
