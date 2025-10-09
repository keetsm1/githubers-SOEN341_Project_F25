import React, { useMemo, useState } from "react";

/**
 * EventsList.tsx
 *
 * A responsive, accessible Event Listing page with:
 *  - Card/list display of events (title, date/time, category, organization, short description)
 *  - Search + Filters (search text, date range, categories, organizations)
 *  - Visual indicators for active filters with ability to clear them
 *  - Keyboard navigable filter controls and results
 *
 * How to use:
 *  1) Place this file at: src/pages/EventsList.tsx (or any component folder).
 *  2) Import and render <EventsList /> in a route/page.
 *  3) (Optional) Pass your events via the `events` prop to override the mock data.
 *
 * Notes:
 *  - No external UI libs. Styles are inline and in a light CSS-in-JS block for clarity.
 *  - Replace `mockEvents` with real data (from API/props) when available.
 */

type EventItem = {
  id: string;
  title: string;
  start: string; // ISO date string e.g. "2025-10-21T13:00:00Z"
  end?: string;  // ISO date string
  category: string;
  organization: string;
  description: string;
};

type EventsListProps = {
  events?: EventItem[];
  initialView?: "cards" | "list";
};

// ---- Mock Data (replace with API/props) ---- //
const mockEvents: EventItem[] = [
  {
    id: "1",
    title: "AI & Pizza Night",
    start: "2025-10-21T23:00:00Z",
    category: "Tech",
    organization: "CompSci Society",
    description: "Lightning talks on AI research, plus pizza and networking."
  },
  {
    id: "2",
    title: "Career Fair 2025",
    start: "2025-11-03T14:00:00Z",
    end: "2025-11-03T20:00:00Z",
    category: "Career",
    organization: "Career Center",
    description: "Meet recruiters from top companies. Bring your resume."
  },
  {
    id: "3",
    title: "Intramural Basketball Finals",
    start: "2025-10-30T22:30:00Z",
    category: "Sports",
    organization: "Athletics",
    description: "Championship game with halftime show and giveaways."
  },
  {
    id: "4",
    title: "Hack for Good",
    start: "2025-11-09T13:00:00Z",
    end: "2025-11-10T01:00:00Z",
    category: "Tech",
    organization: "Engineering Guild",
    description: "24-hour hackathon focused on community-impact solutions."
  },
  {
    id: "5",
    title: "Cultural Night Market",
    start: "2025-11-15T00:00:00Z",
    category: "Culture",
    organization: "International Students Assoc.",
    description: "Food stalls, performances, and art from around the world."
  },
];

// ---- Utility Functions ---- //
function formatDateTimeRange(startISO: string, endISO?: string) {
  try {
    const start = new Date(startISO);
    const end = endISO ? new Date(endISO) : undefined;
    const opts: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    const datePart = new Intl.DateTimeFormat(undefined, opts).format(start);
    if (!end) return datePart;
    const sameDay =
      start.getFullYear() === end.getFullYear() &&
      start.getMonth() === end.getMonth() &&
      start.getDate() === end.getDate();
    const endOpts: Intl.DateTimeFormatOptions = sameDay
      ? { hour: "2-digit", minute: "2-digit" }
      : opts;
    const endPart = new Intl.DateTimeFormat(undefined, endOpts).format(end);
    return `${datePart} → ${endPart}`;
  } catch {
    return startISO;
  }
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

// ---- Component ---- //
export const EventsList: React.FC<EventsListProps> = ({ events, initialView = "cards" }) => {
  const data = events && events.length ? events : mockEvents;

  // Derive options from data
  const allCategories = useMemo(
    () => uniqueSorted(data.map((e) => e.category)),
    [data]
  );
  const allOrganizations = useMemo(
    () => uniqueSorted(data.map((e) => e.organization)),
    [data]
  );

  // Filters state
  const [q, setQ] = useState("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>([]);
  const [view, setView] = useState<"cards" | "list">(initialView);

  // Filtering logic
  const filtered = useMemo(() => {
    return data.filter((e) => {
      const text = (e.title + " " + e.organization + " " + e.description).toLowerCase();
      const okText = q.trim() ? text.includes(q.trim().toLowerCase()) : true;
      const start = new Date(e.start);
      const okStart = startDate ? start >= new Date(startDate) : true;
      const okEnd = endDate ? start <= new Date(endDate + "T23:59:59") : true;
      const okCat =
        selectedCategories.length > 0 ? selectedCategories.includes(e.category) : true;
      const okOrg =
        selectedOrgs.length > 0 ? selectedOrgs.includes(e.organization) : true;
      return okText && okStart && okEnd && okCat && okOrg;
    });
  }, [data, q, startDate, endDate, selectedCategories, selectedOrgs]);

  // Active filters display
  const activeFilters: { label: string; onClear: () => void }[] = [];
  if (q.trim()) activeFilters.push({ label: `Search: "${q.trim()}"`, onClear: () => setQ("") });
  if (startDate) activeFilters.push({ label: `From: ${startDate}`, onClear: () => setStartDate("") });
  if (endDate) activeFilters.push({ label: `To: ${endDate}`, onClear: () => setEndDate("") });
  if (selectedCategories.length)
    activeFilters.push({
      label: `Categories: ${selectedCategories.join(", ")}`,
      onClear: () => setSelectedCategories([]),
    });
  if (selectedOrgs.length)
    activeFilters.push({
      label: `Orgs: ${selectedOrgs.join(", ")}`,
      onClear: () => setSelectedOrgs([]),
    });

  const toggleSelection = (value: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const clearAll = () => {
    setQ("");
    setStartDate("");
    setEndDate("");
    setSelectedCategories([]);
    setSelectedOrgs([]);
  };

  return (
    <div style={styles.page}>
      <style>{css}</style>

      <header style={styles.header}>
        <h1 style={styles.title}>Events</h1>
        <div role="tablist" aria-label="Display view" style={styles.viewSwitch}>
          <button
            role="tab"
            aria-selected={view === "cards"}
            onClick={() => setView("cards")}
            style={{ ...styles.tabBtn, ...(view === "cards" ? styles.tabBtnActive : {}) }}
          >
            Cards
          </button>
          <button
            role="tab"
            aria-selected={view === "list"}
            onClick={() => setView("list")}
            style={{ ...styles.tabBtn, ...(view === "list" ? styles.tabBtnActive : {}) }}
          >
            List
          </button>
        </div>
      </header>

      {/* Filters */}
      <section aria-label="Search and Filters" style={styles.filters}>
        <div style={styles.field}>
          <label htmlFor="search" style={styles.label}>Search</label>
          <input
            id="search"
            type="search"
            placeholder="Search events, orgs…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label htmlFor="from" style={styles.label}>From</label>
          <input
            id="from"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label htmlFor="to" style={styles.label}>To</label>
          <input
            id="to"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={styles.input}
          />
        </div>

        <details style={styles.multi}>
          <summary style={styles.summary}>Categories</summary>
          <div style={styles.checkGroup}>
            {allCategories.map((c) => (
              <label key={c} style={styles.checkLabel}>
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(c)}
                  onChange={() => toggleSelection(c, selectedCategories, setSelectedCategories)}
                />
                <span>{c}</span>
              </label>
            ))}
          </div>
        </details>

        <details style={styles.multi}>
          <summary style={styles.summary}>Organizations</summary>
          <div style={styles.checkGroup}>
            {allOrganizations.map((o) => (
              <label key={o} style={styles.checkLabel}>
                <input
                  type="checkbox"
                  checked={selectedOrgs.includes(o)}
                  onChange={() => toggleSelection(o, selectedOrgs, setSelectedOrgs)}
                />
                <span>{o}</span>
              </label>
            ))}
          </div>
        </details>

        <button onClick={clearAll} style={styles.clearBtn}>
          Clear All
        </button>
      </section>

      {/* Active filter chips */}
      <div style={styles.activeFilters}>
        {activeFilters.map((f, i) => (
          <button key={i} onClick={f.onClear} style={styles.chip}>
            {f.label} ✕
          </button>
        ))}
      </div>

      {/* Results */}
      <section style={styles.results}>
        {filtered.length === 0 ? (
          <div style={styles.empty}>
            <p>No events match your filters.</p>
            <button onClick={clearAll} style={styles.clearBtn}>Reset filters</button>
          </div>
        ) : view === "cards" ? (
          <ul style={styles.cardGrid}>
            {filtered.map((e) => (
              <li key={e.id} style={styles.card}>
                <h3 style={styles.cardTitle}>{e.title}</h3>
                <p style={styles.cardMeta}>
                  <span>{formatDateTimeRange(e.start, e.end)}</span> •{" "}
                  <strong>{e.category}</strong> • <em>{e.organization}</em>
                </p>
                <p style={styles.cardDesc}>{e.description}</p>
                <div style={styles.cardActions}>
                  <button style={styles.primaryBtn}>View Details</button>
                  <button style={styles.secondaryBtn}>Save</button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Title</th>
                <th style={styles.th}>Date & Time</th>
                <th style={styles.th}>Category</th>
                <th style={styles.th}>Organization</th>
                <th style={styles.th}>Description</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id}>
                  <td style={styles.td}>{e.title}</td>
                  <td style={styles.td}>{formatDateTimeRange(e.start, e.end)}</td>
                  <td style={styles.td}>{e.category}</td>
                  <td style={styles.td}>{e.organization}</td>
                  <td style={styles.td}>{e.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};

// ---- Styles ---- //
const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: "24px",
    maxWidth: 1200,
    margin: "0 auto",
    fontFamily: "-apple-system, system-ui, Segoe UI, Roboto, sans-serif",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    flexWrap: "wrap",
  },
  title: { fontSize: "1.75rem", margin: 0 },
  viewSwitch: { display: "flex", gap: 8 },
  tabBtn: {
    border: "1px solid #ccc",
    background: "#fff",
    padding: "8px 12px",
    borderRadius: 8,
    cursor: "pointer",
  },
  tabBtnActive: { outline: "2px solid #000", fontWeight: 600 },
  filters: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
    alignItems: "end",
    marginBottom: 8,
  },
  field: { display: "grid", gap: 6 },
  label: { fontWeight: 600 },
  input: { padding: "10px 12px", borderRadius: 8, border: "1px solid #ccc" },
  multi: { border: "1px solid #ccc", borderRadius: 8, padding: 8 },
  summary: { cursor: "pointer", fontWeight: 600 },
  checkGroup: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 6,
    marginTop: 8,
  },
  checkLabel: { display: "flex", gap: 8, alignItems: "center" },
  clearBtn: {
    border: "1px dashed #999",
    padding: "10px 12px",
    background: "#fff",
    borderRadius: 8,
    cursor: "pointer",
  },
  activeFilters: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: {
    border: "1px solid #333",
    background: "#f2f2f2",
    borderRadius: 999,
    padding: "6px 10px",
    cursor: "pointer",
  },
  empty: {
    border: "1px solid #eee",
    borderRadius: 8,
    padding: 24,
    textAlign: "center",
    background: "#fafafa",
  },
  cardGrid: {
    listStyle: "none",
    padding: 0,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 12,
  },
  card: {
    border: "1px solid #ddd",
    borderRadius: 12,
    padding: 16,
    background: "#fff",
  },
  cardTitle: { margin: "0 0 6px" },
  cardMeta: { margin: "0 0 10px", color: "#444", fontSize: ".95rem" },
  cardDesc: { margin: "0 0 12px" },
  cardActions: { display: "flex", gap: 8 },
  primaryBtn: {
    border: "1px solid #111",
    background: "#111",
    color: "#fff",
    padding: "8px 12px",
    borderRadius: 8,
    cursor: "pointer",
  },
  secondaryBtn: {
    border: "1px solid #111",
    background: "#fff",
    color: "#111",
    padding: "8px 12px",
    borderRadius: 8,
    cursor: "pointer",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    border: "1px solid #eee",
    borderRadius: 8,
  },
  th: {
    textAlign: "left",
    padding: "10px 12px",
    borderBottom: "1px solid #eee",
    background: "#fafafa",
  },
  td: { padding: "10px 12px", borderBottom: "1px solid #f2f2f2" },
};

const css = `
details > summary::-webkit-details-marker { display: none; }
details > summary::after { content: "▾"; padding-left: .5rem; }
details[open] > summary::after { content: "▴"; }
`;

export default EventsList;
