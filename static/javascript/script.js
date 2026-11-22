// Campus Connect - loads data from the Flask API into the Flask-served pages.
// Same origin as the API, so relative URLs work locally and on Render.
const API_BASE = "/api";

const PAGE_ENDPOINTS = {
  "/students": "students",
  "/courses": "courses",
  "/enrollment": "enrollments",
  "/announcements": "announcements",
};

// Header text (normalized) -> API field name, for headers that differ from the field.
const ALIASES = {
  student: "student_name",
  course: "course_name",
  code: "course_code",
  date: "enrollment_date",
  posted: "date_posted",
};

const ID_FIELD = {
  students: "student_id",
  courses: "course_id",
  enrollments: "enrollment_id",
  announcements: "announcement_id",
};

function normalize(text) {
  return text.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

async function loadStats() {
  const targets = document.querySelectorAll("[data-stat]");
  if (!targets.length) return;
  try {
    const res = await fetch(`${API_BASE}/stats`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const stats = await res.json();
    targets.forEach((el) => {
      const v = stats[el.dataset.stat];
      el.textContent = v !== undefined ? v : "-";
    });
  } catch (err) {
    console.error("Could not load stats:", err);
    targets.forEach((el) => (el.textContent = "!"));
  }
}

function cellValue(row, header, resource) {
  const key = normalize(header);
  if (!key || key === "actions" || key === "action") return "";

  if (key === "id") return row[ID_FIELD[resource]] ?? "";
  if (key === "name" && row.first_name !== undefined) {
    return `${row.first_name} ${row.last_name || ""}`.trim();
  }
  if (row[key] !== undefined && row[key] !== null) return row[key];

  const alias = ALIASES[key];
  if (alias && row[alias] !== undefined && row[alias] !== null) return row[alias];
  return "";
}

async function loadTable() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  const resource = PAGE_ENDPOINTS[path];
  if (!resource) return;

  const table = document.querySelector("table");
  if (!table) return;
  const tbody = table.tBodies[0] || table.createTBody();
  const headers = Array.from(table.querySelectorAll("thead th")).map((th) => th.textContent);
  const colCount = headers.length || 1;

  const message = (text) => {
    tbody.innerHTML = "";
    const tr = tbody.insertRow();
    const td = tr.insertCell();
    td.colSpan = colCount;
    td.textContent = text;
  };

  try {
    const res = await fetch(`${API_BASE}/${resource}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = await res.json();

    if (!rows.length) {
      message("No records yet.");
      return;
    }

    tbody.innerHTML = "";
    rows.forEach((row) => {
      const tr = tbody.insertRow();
      headers.forEach((h) => {
        tr.insertCell().textContent = cellValue(row, h, resource);
      });
    });
  } catch (err) {
    console.error(`Could not load ${resource}:`, err);
    message("Could not load data. Try again in a moment.");
  }
}

function markActiveNav() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  document.querySelectorAll("nav a").forEach((a) => {
    const href = a.getAttribute("href").replace(/\/+$/, "") || "/";
    a.classList.toggle("active", href === path);
  });
}

// ---------- Dashboard: recent activity, announcements, dialogs ----------
async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

async function loadRecent() {
  const body = document.getElementById("recent-body");
  if (!body) return;
  try {
    const rows = (await api("/enrollments")).slice(-5).reverse();
    body.innerHTML = "";
    if (!rows.length) {
      const td = body.insertRow().insertCell();
      td.colSpan = 4;
      td.className = "empty";
      td.innerHTML = "<strong>No enrollment records yet</strong>Enroll a student in a course and the record will appear here.";
      return;
    }
    rows.forEach((r) => {
      const tr = body.insertRow();
      tr.insertCell().textContent = r.student_name || "";
      tr.insertCell().textContent = r.course_code || r.course_name || "";
      tr.insertCell().textContent = r.enrollment_date || "";
      const badge = document.createElement("span");
      badge.className = `badge ${(r.status || "").toLowerCase()}`;
      badge.textContent = r.status || "";
      tr.insertCell().appendChild(badge);
    });
  } catch (err) {
    console.error(err);
    body.innerHTML = '<tr><td colspan="4">Could not load enrollments.</td></tr>';
  }
}

async function loadAnnouncements() {
  const box = document.getElementById("announcement-list");
  if (!box) return;
  try {
    const rows = (await api("/announcements")).slice(0, 3);
    box.innerHTML = "";
    if (!rows.length) {
      box.innerHTML = '<p class="empty"><strong>No announcements yet</strong>Posted announcements appear here.</p>';
      return;
    }
    rows.forEach((a) => {
      const item = document.createElement("div");
      item.className = "ann-item";
      const title = document.createElement("strong");
      title.textContent = a.title;
      const text = document.createElement("p");
      text.textContent = a.content.length > 110 ? a.content.slice(0, 110) + "..." : a.content;
      const meta = document.createElement("small");
      meta.textContent = `${a.author} · ${a.date_posted}`;
      item.append(title, text, meta);
      box.appendChild(item);
    });
  } catch (err) {
    console.error(err);
    box.innerHTML = '<p class="empty">Could not load announcements.</p>';
  }
}

async function fillEnrollSelects() {
  const studentSel = document.getElementById("enroll-student");
  const courseSel = document.getElementById("enroll-course");
  if (!studentSel || !courseSel) return;
  const [students, courses] = await Promise.all([api("/students"), api("/courses")]);
  const fill = (sel, items, label) => {
    sel.innerHTML = "";
    items.forEach(([value, text]) => sel.add(new Option(text, value)));
    if (!items.length) sel.add(new Option(label, ""));
  };
  fill(studentSel, students.map((s) => [s.student_id, `${s.first_name} ${s.last_name}`]), "No students yet");
  fill(courseSel, courses.map((c) => [c.course_id, `${c.course_code} - ${c.course_name}`]), "No courses yet");
}

function refreshDashboard() {
  loadStats();
  loadRecent();
  loadAnnouncements();
}

function setupDashboard() {
  if (document.body.dataset.page !== "dashboard") return;

  const liveUrl = document.getElementById("live-url");
  if (liveUrl) liveUrl.textContent = `${window.location.origin}/api`;

  const refresh = document.getElementById("refresh-btn");
  if (refresh) refresh.addEventListener("click", refreshDashboard);

  document.querySelectorAll("[data-open]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const dialog = document.getElementById(btn.dataset.open);
      if (btn.dataset.open === "enroll-dialog") {
        try { await fillEnrollSelects(); } catch (err) { console.error(err); }
      }
      dialog.showModal();
    });
  });

  document.querySelectorAll("dialog").forEach((dialog) => {
    dialog.querySelectorAll("[data-close]").forEach((b) =>
      b.addEventListener("click", () => dialog.close())
    );
  });

  const routes = {
    "student-form": "/students",
    "enroll-form": "/enrollments",
    "announcement-form": "/announcements",
  };

  Object.entries(routes).forEach(([formId, path]) => {
    const form = document.getElementById(formId);
    if (!form) return;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const errorBox = form.querySelector(".form-error");
      errorBox.textContent = "";
      const payload = Object.fromEntries(new FormData(form).entries());
      try {
        await api(path, { method: "POST", body: JSON.stringify(payload) });
        form.reset();
        form.closest("dialog").close();
        refreshDashboard();
      } catch (err) {
        errorBox.textContent = err.message;
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  markActiveNav();
  loadStats();
  loadTable();
  loadRecent();
  loadAnnouncements();
  setupDashboard();
});
