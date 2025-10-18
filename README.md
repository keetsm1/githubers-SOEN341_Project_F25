<h1 align="center">📚 githubers-SOEN341_Project_F25</h1>
<p align="center">
A collaborative campus events and ticketing web application built by our team for SOEN341.
</p>


## 👥 Team Information

| **Name**            | **Student ID** | **GitHub Username** |
|---------------------|----------------|---------------------|
| Gunkeet Mutiana     | 40226566       | [@keetsm1](https://github.com/keetsm1) |
| Ranjit Singh Dhunna | 40294791       | [@Ranjit-Singh-Dhunna](https://github.com/Ranjit-Singh-Dhunna) |
| Arnav Singh         | 40258921       | [@arnav-singh-ahlawat](https://github.com/arnav-singh-ahlawat) |
| Kevin Tam           | 40317186       | [@kevintam20504](https://github.com/kevintam20504) |
| Saad Asghar         | 40157825       | [@4kbooka](https://github.com/4kbooka) |
| Lorne Geniele       | 40111396       | [@hotplate5](https://github.com/hotplate5) |
| Wijdane Khamali     | 40282056       | [@WiwiKiwi20](https://github.com/WiwiKiwi20) |


---

:pushpin:**Description**
---
This project is a Campus Events & Ticketing Web Application designed to help students discover, organize, and attend events on campus. The system streamlines event management by allowing students to browse events, claim tickets, and check in with QR codes. Organizers can create and manage events while tracking attendance through dashboards, and administrators oversee organizations, moderate event listings, and access global analytics.


:pushpin:**Core Features**
---
1. Student Event Experience
   - Browse & Search for Events
   - Event Management : Save events, claim tickets, receive tickets with QR Codes.

2. Organizer Event Management
   - Event Creation: title, description, date/time, location, ticket capacity, ticket type (free or paid).
   - Event Analytics: tickets issued, attendance rates, and remaining capacity.
   - Tools: Export attendee list as CSV, integrated QR Scanner

3. Administrator Dashboard & Moderation
   - Platform oversight
   - View global stats
   - Manage Organizations

:pushpin: **Tech Stack**
---

### Frontend
- **Framework:** React 18.3.1 + TypeScript 5.8.3  
- **Build Tool:** Vite 5.4.19  
- **UI Framework:** shadcn/ui with Radix UI components  
- **Styling:** Tailwind CSS 3.4.17  
- **Forms:** React Hook Form 7.61.1 + Zod validation  
- **Charts:** Recharts 2.15.4  
- **Routing:** React Router DOM 6.30.1  
- **State Management:** React Context + TanStack Query  

### Backend
- **Platform:** Supabase (PostgreSQL + Auth)  

### Key Directories
- `src/pages/` – 15 pages (11 main + 4 admin)  
- `src/components/` – 50+ reusable UI components  
- `src/services/` – Database service layer  
- `src/contexts/` – AuthContext for authentication  
- `src/hooks/` – Custom React hooks  

### Database Tables
1. **profiles** – User profiles with roles  
2. **companies** – Company/organization records  
3. **events** – Event listings  
4. **friendships** – Friend relationships  
5. **friend_requests** – Pending friend requests  
6. **starred_events** – User-starred events  
7. **organizations** – Approved organizations

---
![Logo](https://upload.wikimedia.org/wikipedia/fr/9/97/Universit%C3%A9_Concordia_%28logo%29.svg)



