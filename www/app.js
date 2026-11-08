const $ = id => document.getElementById(id);

let trips = JSON.parse(localStorage.getItem("tm_trips") || "[]");
let expenses = JSON.parse(localStorage.getItem("tm_expenses") || "[]");
let currentTrip = null;
let lang = "en";

const save = () => {
  localStorage.setItem("tm_trips", JSON.stringify(trips));
  localStorage.setItem("tm_expenses", JSON.stringify(expenses));
};

function showTab(id) {
  document.querySelectorAll(".panel").forEach(p => p.classList.add("hidden"));
  $(id).classList.remove("hidden");
  document.querySelectorAll("nav button[data-tab]").forEach(b =>
    b.classList.toggle("active", b.dataset.tab === id)
  );
}

function renderTrips() {
  const html = trips.map((t, i) => `
    <div class="trip-card">
      <h3>${escapeHTML(t.name)}</h3>
      <p class="muted">${escapeHTML(t.destination)} · ${escapeHTML(t.date || "No date")}</p>
      <button onclick="openTrip(${i})" class="primary">Open trip →</button>
    </div>
  `).join("") || "<p class='muted'>No trips yet. Create your first journey!</p>";

  $("tripList").innerHTML = html;
  $("tripPreview").innerHTML = html;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;",
    '"':"&quot;", "'":"&#39;"
  }[c]));
}

function addTrip() {
  const name = prompt("Trip name?");
  if (!name || !name.trim()) return;

  const destination = prompt("Destination?");
  if (!destination || !destination.trim()) return;

  const date = prompt("Start date? (optional)") || "";

  trips.push({
    name: name.trim(),
    destination: destination.trim(),
    date,
    activities: [],
    travelers: 1
  });

  save();
  renderTrips();
  showTab("trips");
}

function openTrip(index) {
  currentTrip = index;
  const trip = trips[index];

  $("detailTitle").textContent = trip.name;
  $("detailInfo").textContent = trip.destination + " · " + (trip.date || "");
  renderActivities();
  renderTripExpenses();
  showTab("detail");
}

function renderActivities() {
  const activities = trips[currentTrip].activities || [];

  $("dayList").innerHTML = activities.map((a, i) => `
    <div class="activity-card">
      <strong>${escapeHTML(a.name)}</strong>
      <p class="muted">${escapeHTML(a.day)} · ${escapeHTML(a.place || "")}</p>
      <button onclick="removeActivity(${i})">Remove</button>
    </div>
  `).join("") || "<p class='muted'>No activities planned yet.</p>";
}

function addActivity() {
  const name = prompt("Activity name?");
  if (!name || !name.trim()) return;

  const day = prompt("Day number? (e.g. Day 1)") || "Day 1";
  const place = prompt("Place? (optional)") || "";

  trips[currentTrip].activities.push({
    name: name.trim(),
    day,
    place
  });

  save();
  renderActivities();
}

function removeActivity(index) {
  trips[currentTrip].activities.splice(index, 1);
  save();
  renderActivities();
}

function addExpense() {
  const title = prompt("Expense description?");
  if (!title || !title.trim()) return;

  const amount = Number(prompt("Amount?"));
  if (!Number.isFinite(amount) || amount <= 0) {
    alert("Please enter a valid amount.");
    return;
  }

  const people = Math.max(1, Number(prompt("Number of travelers?") || 1));

  expenses.push({
    title: title.trim(),
    amount,
    people,
    trip: currentTrip
  });

  save();
  renderExpenses();
  if (currentTrip !== null) renderTripExpenses();
}

function renderExpenses() {
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  $("totalExpenses").textContent = total.toFixed(2);

  $("expenseList").innerHTML = expenses.map(e => `
    <div class="expense-card">
      <strong>${escapeHTML(e.title)}</strong>
      <p>${e.amount.toFixed(2)} · ${e.people} travelers</p>
      <p class="muted">Each pays ${(e.amount / e.people).toFixed(2)}</p>
    </div>
  `).join("") || "<p class='muted'>No expenses recorded.</p>";
}

function renderTripExpenses() {
  const list = expenses.filter(e => e.trip === currentTrip);
  $("tripExpenses").innerHTML = list.map(e => `
    <div class="expense-card">
      ${escapeHTML(e.title)} — ${e.amount.toFixed(2)}
      <p class="muted">Each pays ${(e.amount / e.people).toFixed(2)}</p>
    </div>
  `).join("") || "<p class='muted'>No trip expenses yet.</p>";
}

function toggleLanguage() {
  lang = lang === "en" ? "ar" : "en";
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  $("langBtn").textContent = lang === "en" ? "عربي" : "English";
  $("welcome").textContent = lang === "en"
    ? "Every trip has a story."
    : "كل رحلة لها حكاية.";
}

function backup() {
  const data = JSON.stringify({trips, expenses}, null, 2);
  const blob = new Blob([data], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "travelmate-backup.json";
  a.click();
  URL.revokeObjectURL(url);
}

function restore(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data.trips) || !Array.isArray(data.expenses)) {
        throw new Error("Invalid backup");
      }
      trips = data.trips;
      expenses = data.expenses;
      save();
      renderTrips();
      renderExpenses();
      alert("Backup restored!");
    } catch {
      alert("Invalid backup file.");
    }
  };
  reader.readAsText(file);
}

$("newTripBtn").onclick = addTrip;
$("addTripBtn").onclick = addTrip;
$("addDayBtn").onclick = addActivity;
$("addExpenseBtn").onclick = addExpense;
$("themeBtn").onclick = () => document.body.classList.toggle("dark");
$("langBtn").onclick = toggleLanguage;
$("backBtn").onclick = () => showTab("trips");

document.querySelectorAll("nav button[data-tab]").forEach(button => {
  button.onclick = () => showTab(button.dataset.tab);
});

renderTrips();
renderExpenses();
showTab("home");
