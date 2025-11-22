# Arnav Singh – Contribution Log

| Date       | Task(s)             | Story Points | Priority | Notes |
|------------|---------------------|--------------|----------|-------|
| 2025-09-24 | Task.4.1 | 2 | High | Created the Project Wiki. |
| 2025-09-24 | Task.4.4 | 2 | Medium | Established Communication Channel on Discord. |
| 2025-10-06 | Task.6.4            | 2            | Medium   | Implemented end-to-end flow so organizer-created events render on the student listing. Touched schema, service layer, and UI. |
| 2025-10-08 | Task.6.6            | 1            | Low      | Added edit flow for `/events/:id/edit`, `EditEvent` page, guarded actions in `EventCard`, and My Events wiring. |
| 2025-10-08 | Task.6.7            | 1            | Low      | Added Delete (pending-only) in `EventCard` and My Events. Pending-only delete in service layer. |
| 2025-10-10 | Task.5.4            | 2            | Medium   | Added multi-select Categories/Organizations, date range, sort, and search with AND logic. Active filter chips + “Clear all”. |
| 2025-10-21 | Task.9.1            | 2            | High     | Designed a responsive **Friends Page** mockup featuring a search bar for adding friends, and tabs for “Friends” and “Requests.” Ensured consistent styling with existing UI and full accessibility on both desktop and mobile. |
| 2025-10-24 | Task.9.2            | 3            | Medium   | Implemented **Send Friend Request** functionality. Added email validation, duplicate-request and existing-friendship checks, and clear error/success toasts. Requests stored with *pending* status in the database. |
| 2025-10-27 | Task.9.3            | 3            | Medium   | Built **Receive Friend Requests** flow. Displayed pending requests with sender details (name, email, profile image). Implemented Accept/Decline actions updating both the UI and database in real time. |
| 2025-10-30 | Task.9.4            | 3            | Medium   | Developed **Friends’ Events** tab displaying events attended by friends with event title/date/location and attending friend(s). Linked to event details page and added auto-refresh for updated attendance data. |
| 2025-11-15 | Task.28.1           | 3            | High     | Set up **Jest + React Testing Library** for the frontend. Configured `jest.config`, test environment, module aliasing, Supabase mocks, router mocks, and global setup utilities. Added NPM scripts for running unit & integration tests. Ensured all base components import correctly without test failures. |
| 2025-11-17 | Task.28.2           | 3            | Medium   | Wrote unit tests for **LoginForm, SignUp, OrgSignUp, Navigation, EventCard, EventFiltersBar, DeleteEventDialog, EditEventDialog**. Covered component rendering, user interactions, and edge cases (e.g., missing input fields, expired events). Achieved **≥80% coverage in** `/components`, meeting sprint requirements. |
| 2025-11-19 | Task.28.4           | 2            | Medium   | Implemented automated **testing reports** using Jest coverage tools. Configured output formats (`text`, `text-summary`, `lcov`, `json`) and stored artifacts in `/reports/testing/`. Verified reports auto-generate on each test run and produce readable coverage and summary data for Scrum Master review. |
