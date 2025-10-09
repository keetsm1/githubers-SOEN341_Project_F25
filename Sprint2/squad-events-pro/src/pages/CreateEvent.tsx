import React, { useMemo, useState } from "react";

/**
 * CreateEvent.tsx  (FRONTEND-ONLY)
 *
 * Responsive, accessible event-creation form with:
 * - Event Title (required)
 * - Description (required)
 * - Date & Time (datetime-local, required)
 * - Location (required)
 * - Ticket Type (Free | Paid, required)
 * - Capacity (number, min 1, required)
 * - Submit + Cancel buttons
 *
 * No backend calls here. On submit, we run basic validation and
 * call an optional onSubmit prop or show a local preview.
 */

type TicketType = "Free" | "Paid";

type CreateEventForm = {
  title: string;
  description: string;
  datetime: string; // yyyy-MM-ddTHH:mm
  location: string;
  ticketType: TicketType;
  capacity: number | "";
};

type CreateEventProps = {
  onSubmit?: (data: Omit<CreateEventForm, "capacity"> & { capacity: number }) => void;
  onCancel?: () => void;
};

const initialForm: CreateEventForm = {
  title: "",
  description: "",
  datetime: "",
  location: "",
  ticketType: "Free",
  capacity: "",
};

const CreateEvent: React.FC<CreateEventProps> = ({ onSubmit, onCancel }) => {
  const [form, setForm] = useState<CreateEventForm>(initialForm);
  const [submittedData, setSubmittedData] =
    useState<null | Record<string, unknown>>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "Event title is required.";
    if (!form.description.trim()) e.description = "Description is required.";
    if (!form.datetime) e.datetime = "Date & time is required.";
    if (!form.location.trim()) e.location = "Location is required.";
    if (!form.ticketType) e.ticketType = "Ticket type is required.";
    if (form.capacity === "" || Number.isNaN(Number(form.capacity))) {
      e.capacity = "Capacity is required.";
    } else if (Number(form.capacity) < 1) {
      e.capacity = "Capacity must be at least 1.";
    } else if (!Number.isInteger(Number(form.capacity))) {
      e.capacity = "Capacity must be an integer.";
    }
    return e;
  }, [form]);

  const isValid = Object.keys(errors).length === 0;

  const setField =
    <K extends keyof CreateEventForm>(key: K) =>
    (value: CreateEventForm[K]) => {
      setForm((f) => ({ ...f, [key]: value }));
    };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    // mark everything touched to reveal any errors
    setTouched({
      title: true,
      description: true,
      datetime: true,
      location: true,
      ticketType: true,
      capacity: true,
    });
    if (!isValid) return;

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      datetime: form.datetime, // ISO-like string from datetime-local
      location: form.location.trim(),
      ticketType: form.ticketType,
      capacity: Number(form.capacity),
    };

    if (onSubmit) {
      onSubmit(payload);
    } else {
      // Frontend-only demo: show what would be sent
      setSubmittedData(payload);
    }

    // optional: reset form after submit
    // setForm(initialForm);
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    // Fallback behavior: reset the form if no onCancel provided
    if (!onCancel) {
      setForm(initialForm);
      setSubmittedData(null);
      setTouched({});
    }
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Create New Event</h1>

      <form onSubmit={handleSubmit} noValidate style={styles.form} aria-label="Create event form">
        {/* Title */}
        <div style={styles.field}>
          <label htmlFor="title" style={styles.label}>Event Title</label>
          <input
            id="title"
            type="text"
            value={form.title}
            onBlur={() => setTouched((t) => ({ ...t, title: true }))}
            onChange={(e) => setField("title")(e.target.value)}
            aria-invalid={!!(touched.title && errors.title)}
            aria-describedby={touched.title && errors.title ? "err-title" : undefined}
            style={inputStyle(touched.title && errors.title)}
            placeholder="e.g., AI & Pizza Night"
            required
          />
          {touched.title && errors.title && (
            <div id="err-title" style={styles.error}>{errors.title}</div>
          )}
        </div>

        {/* Description */}
        <div style={styles.field}>
          <label htmlFor="description" style={styles.label}>Description</label>
          <textarea
            id="description"
            value={form.description}
            onBlur={() => setTouched((t) => ({ ...t, description: true }))}
            onChange={(e) => setField("description")(e.target.value)}
            aria-invalid={!!(touched.description && errors.description)}
            aria-describedby={touched.description && errors.description ? "err-description" : undefined}
            style={{ ...inputStyle(touched.description && errors.description), minHeight: 96, resize: "vertical" }}
            placeholder="What is this event about?"
            required
          />
          {touched.description && errors.description && (
            <div id="err-description" style={styles.error}>{errors.description}</div>
          )}
        </div>

        {/* Date & Time */}
        <div style={styles.field}>
          <label htmlFor="datetime" style={styles.label}>Date & Time</label>
          <input
            id="datetime"
            type="datetime-local"
            value={form.datetime}
            onBlur={() => setTouched((t) => ({ ...t, datetime: true }))}
            onChange={(e) => setField("datetime")(e.target.value)}
            aria-invalid={!!(touched.datetime && errors.datetime)}
            aria-describedby={touched.datetime && errors.datetime ? "err-datetime" : undefined}
            style={inputStyle(touched.datetime && errors.datetime)}
            required
          />
          {touched.datetime && errors.datetime && (
            <div id="err-datetime" style={styles.error}>{errors.datetime}</div>
          )}
        </div>

        {/* Location */}
        <div style={styles.field}>
          <label htmlFor="location" style={styles.label}>Location</label>
          <input
            id="location"
            type="text"
            value={form.location}
            onBlur={() => setTouched((t) => ({ ...t, location: true }))}
            onChange={(e) => setField("location")(e.target.value)}
            aria-invalid={!!(touched.location && errors.location)}
            aria-describedby={touched.location && errors.location ? "err-location" : undefined}
            style={inputStyle(touched.location && errors.location)}
            placeholder="e.g., Hall Building H-110"
            required
          />
          {touched.location && errors.location && (
            <div id="err-location" style={styles.error}>{errors.location}</div>
          )}
        </div>

        {/* Ticket Type */}
        <div style={styles.field}>
          <label htmlFor="ticketType" style={styles.label}>Ticket Type</label>
          <select
            id="ticketType"
            value={form.ticketType}
            onBlur={() => setTouched((t) => ({ ...t, ticketType: true }))}
            onChange={(e) => setField("ticketType")(e.target.value as TicketType)}
            aria-invalid={!!(touched.ticketType && errors.ticketType)}
            aria-describedby={touched.ticketType && errors.ticketType ? "err-ticket" : undefined}
            style={inputStyle(touched.ticketType && errors.ticketType)}
            required
          >
            <option value="Free">Free</option>
            <option value="Paid">Paid</option>
          </select>
          {touched.ticketType && errors.ticketType && (
            <div id="err-ticket" style={styles.error}>{errors.ticketType}</div>
          )}
        </div>

        {/* Capacity */}
        <div style={styles.field}>
          <label htmlFor="capacity" style={styles.label}>Capacity</label>
          <input
            id="capacity"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={form.capacity}
            onBlur={() => setTouched((t) => ({ ...t, capacity: true }))}
            onChange={(e) => {
              const v = e.target.value;
              setField("capacity")(v === "" ? "" : Number(v));
            }}
            aria-invalid={!!(touched.capacity && errors.capacity)}
            aria-describedby={touched.capacity && errors.capacity ? "err-capacity" : undefined}
            style={inputStyle(touched.capacity && errors.capacity)}
            placeholder="e.g., 120"
            required
          />
          {touched.capacity && errors.capacity && (
            <div id="err-capacity" style={styles.error}>{errors.capacity}</div>
          )}
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          <button type="submit" style={styles.primaryBtn} disabled={!isValid}>
            Submit
          </button>
          <button type="button" style={styles.secondaryBtn} onClick={handleCancel}>
            Cancel
          </button>
        </div>
      </form>

      {/* Frontend-only preview (shows payload when no onSubmit prop is provided) */}
      {submittedData && (
        <div style={styles.preview} aria-live="polite">
          <strong>Submitted (frontend preview):</strong>
          <pre style={styles.pre}>{JSON.stringify(submittedData, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

/* ---------- styles ---------- */
const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 720,
    margin: "0 auto",
    padding: "24px",
    fontFamily: "-apple-system, system-ui, Segoe UI, Roboto, sans-serif",
    lineHeight: 1.45,
  },
  title: { margin: "0 0 16px", fontSize: "1.75rem" },
  form: {
    display: "grid",
    gap: 14,
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 12,
    padding: 16,
  },
  field: { display: "grid", gap: 6 },
  label: { fontWeight: 600 },
  error: { color: "#b00020", fontSize: ".9rem" },
  actions: { display: "flex", gap: 10, marginTop: 4 },
  primaryBtn: {
    border: "1px solid #111",
    background: "#111",
    color: "#fff",
    padding: "10px 14px",
    borderRadius: 10,
    cursor: "pointer",
  },
  secondaryBtn: {
    border: "1px solid #111",
    background: "#fff",
    color: "#111",
    padding: "10px 14px",
    borderRadius: 10,
    cursor: "pointer",
  },
  preview: {
    marginTop: 16,
    background: "#fafafa",
    border: "1px solid #eee",
    borderRadius: 12,
    padding: 12,
  },
  pre: { margin: 0, overflowX: "auto" },
};

function inputStyle(hasError?: boolean): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 10,
    border: hasError ? "1px solid #b00020" : "1px solid #ccc",
    outline: "none",
  };
}

export default CreateEvent;
