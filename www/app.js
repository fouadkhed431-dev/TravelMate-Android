
const $ = id => document.getElementById(id);

let trips = JSON.parse(localStorage.getItem("tm_trips") || "[]");
let expenses = JSON.parse(localStorage.getItem("tm_expenses") || "[]");
let currentTrip = null;
let lang = "en";

function normalizeData() {
  trips = trips.map((t, i) => ({
    ...t,
    id: t.id || "trip-" + i + "-" + Date.now(),
    cities: Array.isArray(t.cities) ? t.cities :
      (t.destination ? [t.destination] : []),
    travelersList: Array.isArray(t.travelersList) ?
      t.travelersList : ["Traveler 1"],
    activities: (Array.isArray(t.activities) ? t.activities : []).map(a => ({
      ...a,
      time: a.time || "",
      city: a.city || "",
      day: a.day || "Day 1"
    }))
  }));

  expenses = expenses.map(e => ({
    ...e,
    payer: e.payer || "Unspecified",
    tripId: e.tripId || (
      Number.isInteger(e.trip) && trips[e.trip] ? trips[e.trip].id : null
    ),
    people: Math.max(1, Number(e.people) || 1)
  }));

  save();
}

function save() {
  localStorage.setItem("tm_trips", JSON.stringify(trips));
  localStorage.setItem("tm_expenses", JSON.stringify(expenses));
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  }[c]));
}

function showTab(id) {
  document.querySelectorAll(".panel").forEach(p =>
    p.classList.add("hidden")
  );
  $(id).classList.remove("hidden");

  document.querySelectorAll("nav button[data-tab]").forEach(b =>
    b.classList.toggle("active", b.dataset.tab === id)
  );
}

function renderTrips() {
  const html = trips.map((t, i) => `
    <div class="trip-card">
      <h3>${escapeHTML(t.name)}</h3>
      <p class="muted">${escapeHTML(t.cities.join(" → ") || t.destination || "No destination")}</p>
      <p class="muted">${escapeHTML(t.date || "No date")} · ${t.activities.length} activities</p>
      <button onclick="openTrip(${i})" class="primary">Open trip →</button>
    </div>
  `).join("") || "<p class='muted'>No trips yet. Create your first journey!</p>";

  $("tripList").innerHTML = html;
  $("tripPreview").innerHTML = html;
}

function addTrip() {
  const name = prompt("Trip name?");
  if (!name?.trim()) return;

  const destination = prompt("First destination?");
  if (!destination?.trim()) return;

  const date = prompt("Start date? (optional)") || "";

  trips.push({
    id: "trip-" + Date.now(),
    name: name.trim(),
    destination: destination.trim(),
    cities: [destination.trim()],
    date,
    activities: [],
    travelersList: ["Traveler 1"]
  });

  save();
  renderTrips();
  showTab("trips");
}

function openTrip(index) {
  currentTrip = index;
  renderTrip();
  showTab("detail");
}

function renderTrip() {
  const trip = trips[currentTrip];
  if (!trip) return;

  $("detailTitle").textContent = trip.name;
  $("detailInfo").textContent = trip.date || "Travel itinerary";

  $("cityList").innerHTML = trip.cities.map((city, i) => `
    <div class="activity-card">
      ${escapeHTML(city)}
      <button onclick="removeCity(${i})">Remove</button>
    </div>
  `).join("") || "<p class='muted'>No destinations added.</p>";

  renderActivities();
  renderTripExpenses();
}

function addCity() {
  const city = prompt("Enter another destination:");
  if (!city?.trim()) return;

  trips[currentTrip].cities.push(city.trim());
  save();
  renderTrip();
  renderTrips();
}

function removeCity(index) {
  if (!confirm("Remove this destination?")) return;
  trips[currentTrip].cities.splice(index, 1);
  save();
  renderTrip();
  renderTrips();
}

function addActivity() {
  const trip = trips[currentTrip];

  const name = prompt("Activity name?");
  if (!name?.trim()) return;

  const day = prompt("Day number? (e.g. Day 1)") || "Day 1";
  const time = prompt("Time? (e.g. 10:30 AM)") || "";
  const city = prompt(
    "Destination? " + (trip.cities.join(", "))
  ) || "";

  trip.activities.push({
    name: name.trim(),
    day,
    time,
    city
  });

  save();
  renderActivities();
  renderTrips();
}

function renderActivities() {
  const activities = trips[currentTrip].activities || [];

  const sorted = [...activities].sort((a, b) =>
    a.day.localeCompare(b.day) || a.time.localeCompare(b.time)
  );

  $("dayList").innerHTML = sorted.map(a => {
    const index = activities.indexOf(a);
    return `
      <div class="activity-card">
        <strong>${escapeHTML(a.name)}</strong>
        <p class="muted">
          ${escapeHTML(a.day)} · ${escapeHTML(a.time || "Time not set")}
        </p>
        <p class="muted">${escapeHTML(a.city || "")}</p>
        <button onclick="removeActivity(${index})">Remove</button>
      </div>
    `;
  }).join("") || "<p class='muted'>No activities planned yet.</p>";
}

function removeActivity(index) {
  trips[currentTrip].activities.splice(index, 1);
  save();
  renderActivities();
  renderTrips();
}

function addTraveler() {
  const name = prompt("Traveler name?");
  if (!name?.trim()) return;

  const list = trips[currentTrip].travelersList;

  if (list.some(n => n.toLowerCase() === name.trim().toLowerCase())) {
    alert("This traveler already exists.");
    return;
  }

  list.push(name.trim());
  save();
  alert("Traveler added!");
}

function addExpense() {
  const title = prompt("Expense description?");
  if (!title?.trim()) return;

  const amount = Number(prompt("Amount?"));
  if (!Number.isFinite(amount) || amount <= 0) {
    alert("Please enter a valid amount.");
    return;
  }

  let trip = currentTrip !== null ? trips[currentTrip] : null;

  if (!trip && trips.length) {
    const answer = prompt("Trip number? Enter 0 for general expense.");
    if (answer === null) return;
    const index = Number(answer);
    if (index > 0 && trips[index - 1]) trip = trips[index - 1];
  }

  const travelers = trip?.travelersList || ["Traveler 1"];
  const payer = prompt(
    "Who paid? " + travelers.join(", ")
  ) || "Unspecified";

  const people = trip
    ? travelers.length
    : Math.max(1, Number(prompt("Number of travelers?") || 1));

  expenses.push({
    title: title.trim(),
    amount,
    people,
    payer,
    tripId: trip?.id || null
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
      <p>${e.amount.toFixed(2)} · Paid by ${escapeHTML(e.payer)}</p>
      <p class="muted">Each share: ${(e.amount / e.people).toFixed(2)}</p>
    </div>
  `).join("") || "<p class='muted'>No expenses recorded.</p>";
}

function renderTripExpenses() {
  const trip = trips[currentTrip];
  const list = expenses.filter(e => e.tripId === trip.id);

  const total = list.reduce((sum, e) => sum + e.amount, 0);
  const travelers = trip.travelersList || ["Traveler 1"];
  const share = total / Math.max(1, travelers.length);

  $("tripExpenses").innerHTML = `
    <div class="stat">
      <span>Total trip expenses</span>
      <strong>${total.toFixed(2)}</strong>
    </div>
    <div class="stat">
      <span>Travelers</span>
      <strong>${travelers.length}</strong>
    </div>
    <div class="stat">
      <span>Equal share per traveler</span>
      <strong>${share.toFixed(2)}</strong>
    </div>
    <p class="muted">Travelers: ${travelers.map(escapeHTML).join(", ")}</p>
    <button onclick="addTraveler()">＋ Add traveler</button>
    ${list.map(e => `
      <div class="expense-card">
        <strong>${escapeHTML(e.title)}</strong>
        <p>${e.amount.toFixed(2)} · Paid by ${escapeHTML(e.payer)}</p>
      </div>
    `).join("")}
  `;

  if (!list.length) {
    $("tripExpenses").innerHTML +=
      "<p class='muted'>No trip expenses yet.</p>";
  }
}

function backup() {
  const data = JSON.stringify({
    version: 2,
    trips,
    expenses
  }, null, 2);

  const blob = new Blob([data], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = "travelmate-backup.json";
  a.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function restore(file) {
  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);

      if (!Array.isArray(data.trips) ||
          !Array.isArray(data.expenses)) {
        throw new Error("Invalid backup");
      }

      if (!confirm("Replace current trips and expenses with this backup?")) {
        return;
      }

      trips = data.trips;
      expenses = data.expenses;
      normalizeData();
      currentTrip = null;

      renderTrips();
      renderExpenses();
      showTab("home");

      alert("Backup restored successfully!");
    } catch {
      alert("Invalid backup file.");
    }
  };

  reader.readAsText(file);
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

$("newTripBtn").onclick = addTrip;
$("addTripBtn").onclick = addTrip;
$("addCityBtn").onclick = addCity;
$("addDayBtn").onclick = addActivity;
$("addExpenseBtn").onclick = addExpense;
$("tripExpenseBtn").onclick = addExpense;

$("themeBtn").onclick = () =>
  document.body.classList.toggle("dark");

$("langBtn").onclick = toggleLanguage;
$("backBtn").onclick = () => showTab("trips");

$("backupBtn").onclick = backup;

$("restoreBtn").onclick = () => $("restoreFile").click();

$("restoreFile").onchange = event => {
  restore(event.target.files[0]);
  event.target.value = "";
};

document.querySelectorAll("nav button[data-tab]").forEach(button => {
  button.onclick = () => showTab(button.dataset.tab);
});

normalizeData();
renderTrips();
renderExpenses();
showTab("home");
