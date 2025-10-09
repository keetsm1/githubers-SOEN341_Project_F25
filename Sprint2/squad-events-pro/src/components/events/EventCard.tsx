import React from "react";
import SaveToCalendarButton from "./SaveToCalendarButton"; // ✅ import the new component

type Event = {
  id: string;
  title: string;
  date: string;
  time?: string;
  category: string;
  organization: string;
  description: string;
};

/**
 * EventCard.tsx
 * Displays one event with key info + "Save to Calendar" button.
 */
const EventCard: React.FC<{ event: Event }> = ({ event }) => {
  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <h3 style={styles.title}>{event.title}</h3>
        <SaveToCalendarButton eventId={event.id} /> {/* ⭐ toggle save */}
      </div>

      <p style={styles.meta}>
        <strong>Date:</strong> {event.date}{" "}
        {event.time && <span>at {event.time}</span>}
      </p>
      <p style={styles.meta}>
        <strong>Category:</strong> {event.category} |{" "}
        <strong>Organization:</strong> {event.organization}
      </p>

      <p style={styles.desc}>{event.description}</p>
    </div>
  );
};

/* ---------- simple inline styles ---------- */
const styles: Record<string, React.CSSProperties> = {
  card: {
    background: "#fff",
    border: "1px solid #e0e0e0",
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
    transition: "0.2s ease-in-out",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  title: {
    margin: 0,
    fontSize: "1.2rem",
    fontWeight: 600,
  },
  meta: {
    fontSize: "0.95rem",
    color: "#444",
    margin: "2px 0",
  },
  desc: {
    marginTop: 8,
    fontSize: "0.9rem",
    color: "#333",
  },
};

export default EventCard;
