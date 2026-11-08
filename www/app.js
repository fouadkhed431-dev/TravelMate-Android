
const $ = id => document.getElementById(id);

const STORAGE = "travelmate_v4_data";

function readStored(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

let data = readStored(STORAGE, {});

let trips = Array.isArray(data.trips)
  ? data.trips
  : readStored("tm_trips", []);

let expenses = Array.isArray(data.expenses)
  ? data.expenses
  : readStored("tm_expenses", []);

let checklist = Array.isArray(data.checklist)
  ? data.checklist
  : [];


let currentTrip = null;
let map = null;
let markers = [];
let routeLayer = null;
let searchPlaces = [];

function save() {
  localStorage.setItem(STORAGE, JSON.stringify({
    version: 4,
    trips,
    expenses,
    checklist
  }));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  }[c]));
}

function money(value) {
  const currency = $("currencySelect")?.value || "EGP";
  return Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 2
  }) + " " + currency;
}

function normalize() {
  trips = trips.map((t, i) => ({
    ...t,
    id: t.id || uid(),
    name: t.name || "My trip",
    cities: Array.isArray(t.cities) ? t.cities :
      (t.destination ? [t.destination] : []),
    activities: Array.isArray(t.activities)
  ? t.activities.map(a => ({
      ...a,
      id: a.id || uid(),
      name: a.name || "Untitled activity",
      day: String(a.day || "Day 1"),
      time: String(a.time || ""),
      city: String(a.city || "")
    }))
  : [],
    travelers: Array.isArray(t.travelers) && t.travelers.length
  ? t.travelers
  : (Array.isArray(t.travelersList) && t.travelersList.length
      ? t.travelersList
      : ["Traveler 1"])
  }));

  expenses = expenses.map(e => ({
    ...e,
    id: e.id || uid(),
    amount: Number(e.amount) || 0,
    tripId: e.tripId || (
      Number.isInteger(e.trip) && trips[e.trip] ?
        trips[e.trip].id : null
    ),
    payer: e.payer || "Unspecified"
  }));

  checklist = checklist.map(item =>
    typeof item === "string" ?
      { id: uid(), title: item, done: false } : item
  );

  save();
}

function showPage(id) {
  document.querySelectorAll(".page").forEach(page =>
    page.classList.add("hidden")
  );

  const page = $(id);
  if (!page) return;

  page.classList.remove("hidden");

  document.querySelectorAll(".nav-item").forEach(button =>
    button.classList.toggle("active", button.dataset.page === id)
  );

  if (id === "maps") {
    setTimeout(initMap, 200);
  }
}

function renderAll() {
  renderTrips();
  renderExpenses();
  renderStats();
  renderTripSelect();
  renderChecklist();
}

function renderStats() {
  $("statTrips").textContent = trips.length;

  $("statPlaces").textContent = trips.reduce(
    (sum, t) => sum + t.cities.length, 0
  );

  $("statExpenses").textContent = money(
    expenses.reduce((sum, e) => sum + e.amount, 0)
  );
}

function tripCard(t, index) {
  return `
    <div class="trip-card">
      <h3>✈ ${safe(t.name)}</h3>
      <p>📍 ${safe(t.cities.join(" → ") || "No destinations yet")}</p>
      <p>📅 ${safe(t.date || "Dates not set")}</p>
      <p>${t.activities.length} planned activities</p>
      <button class="primary" onclick="openTrip(${index})">
        Open journey →
      </button>
    </div>
  `;
}

function renderTrips() {
  const html = trips.map(tripCard).join("") ||
    "<p class='muted'>No trips yet. Create your first adventure!</p>";

  $("tripList").innerHTML = html;
  $("tripPreview").innerHTML = html;
}

function addTrip() {
  const name = prompt("What is the name of your trip?");
  if (!name?.trim()) return;

  const destination = prompt("Where are you going?");
  if (!destination?.trim()) return;

  const date = prompt("Start date? (YYYY-MM-DD, optional)") || "";

  const trip = {
    id: uid(),
    name: name.trim(),
    cities: [destination.trim()],
    date,
    activities: [],
    travelers: ["Traveler 1"]
  };

  trips.push(trip);
  save();
  renderAll();
  openTrip(trips.length - 1);
}

function openTrip(index) {
  if (!trips[index]) return;

  currentTrip = index;
  renderTrip();
  showPage("detail");
}

function renderTrip() {
  const trip = trips[currentTrip];
  if (!trip) return;

  $("detailTitle").textContent = trip.name;
  $("detailInfo").textContent =
    (trip.date || "Dates not set") + " · " +
    trip.cities.length + " destinations";

  $("cityList").innerHTML = trip.cities.map((city, i) => `
    <div class="activity-card">
      <strong>📍 ${safe(city)}</strong>
      <button onclick="removeCity(${i})">Remove</button>
    </div>
  `).join("") || "<p class='muted'>No destinations yet.</p>";

  renderActivities();
  renderTravelers();
  renderTripExpenses();
}

function addCity() {
  const city = prompt("Enter destination:");
  if (!city?.trim()) return;

  trips[currentTrip].cities.push(city.trim());
  save();
  renderTrip();
  renderAll();
}

function removeCity(index) {
  if (!confirm("Remove this destination?")) return;

  trips[currentTrip].cities.splice(index, 1);
  save();
  renderTrip();
  renderAll();
}

function addActivity() {
  const trip = trips[currentTrip];

  const name = prompt("Activity name?");
  if (!name?.trim()) return;

  const day = prompt("Which day? (e.g. Day 1)") || "Day 1";
  const time = prompt("Time? (e.g. 10:30)") || "";
  const city = prompt(
    "Location? " + trip.cities.join(", ")
  ) || "";

  trip.activities.push({
    id: uid(),
    name: name.trim(),
    day,
    time,
    city
  });

  save();
  renderTrip();
  renderAll();
}

function renderActivities() {
  const activities = trips[currentTrip].activities;

  const sorted = [...activities].sort((a, b) =>
    a.day.localeCompare(b.day) ||
    a.time.localeCompare(b.time)
  );

  $("dayList").innerHTML = sorted.map(a => {
    const index = activities.indexOf(a);

    return `
      <div class="activity-card">
        <strong>${safe(a.name)}</strong>
        <p>📅 ${safe(a.day)} · ${safe(a.time || "Time not set")}</p>
        <p>📍 ${safe(a.city || "Location not set")}</p>
        <button onclick="editActivity(${index})">Edit</button>
        <button onclick="removeActivity(${index})">Remove</button>
      </div>
    `;
  }).join("") || "<p class='muted'>No activities planned.</p>";
}

function editActivity(index) {
  const activity = trips[currentTrip].activities[index];
  if (!activity) return;

  const name = prompt("Activity name:", activity.name);
  if (!name?.trim()) return;

  activity.name = name.trim();
  activity.day = prompt("Day:", activity.day) || activity.day;
  activity.time = prompt("Time:", activity.time) ?? activity.time;
  activity.city = prompt("Location:", activity.city) ?? activity.city;

  save();
  renderTrip();
  renderAll();
}

function removeActivity(index) {
  if (!confirm("Remove this activity?")) return;

  trips[currentTrip].activities.splice(index, 1);
  save();
  renderTrip();
  renderAll();
}

function addTraveler() {
  const trip = trips[currentTrip];
  const name = prompt("Traveler name?");
  if (!name?.trim()) return;

  if (trip.travelers.some(n =>
    n.toLowerCase() === name.trim().toLowerCase()
  )) {
    alert("This traveler already exists.");
    return;
  }

  trip.travelers.push(name.trim());
  save();
  renderTrip();
}

function renderTravelers() {
  const travelers = trips[currentTrip].travelers;

  $("travelerList").innerHTML = travelers.map((name, i) => `
    <div class="activity-card">
      <strong>👤 ${safe(name)}</strong>
      ${travelers.length > 1 ?
        `<button onclick="removeTraveler(${i})">Remove</button>` : ""}
    </div>
  `).join("");
}

function removeTraveler(index) {
  const trip = trips[currentTrip];
  const name = trip.travelers[index];

  if (expenses.some(e => e.tripId === trip.id && e.payer === name)) {
    alert("This traveler has paid expenses. Keep them until those expenses are reassigned.");
    return;
  }

  if (!confirm("Remove " + name + "?")) return;

  trip.travelers.splice(index, 1);
  save();
  renderTrip();
}

function addExpense() {
  const title = prompt("Expense description?");
  if (!title?.trim()) return;

  const amount = Number(prompt("Amount?"));
  if (!Number.isFinite(amount) || amount <= 0) {
    alert("Enter a valid amount.");
    return;
  }

  let trip = currentTrip !== null ? trips[currentTrip] : null;

  if (!trip && trips.length) {
    const choice = prompt(
      "Enter trip number, or 0 for general expense:\n" +
      trips.map((t, i) => `${i + 1}. ${t.name}`).join("\n")
    );

    if (choice === null) return;

    const index = Number(choice) - 1;
    if (choice !== "0" && trips[index]) trip = trips[index];
  }

  const travelers = trip?.travelers || ["Traveler 1"];

  const payer = prompt(
    "Who paid?\n" + travelers.join(", ")
  ) || travelers[0];

  if (!travelers.includes(payer)) {
    alert("Choose a traveler from the trip.");
    return;
  }

  expenses.push({
    id: uid(),
    title: title.trim(),
    amount,
    payer,
    tripId: trip?.id || null,
    date: new Date().toISOString().slice(0, 10)
  });

  save();
  renderAll();

  if (currentTrip !== null) renderTrip();
}

function renderExpenses() {
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  $("totalExpenses").textContent = money(total);
  $("expenseCount").textContent = expenses.length + " expenses";

  $("expenseList").innerHTML = expenses.map((e, i) => `
    <div class="expense-card">
      <strong>💳 ${safe(e.title)}</strong>
      <h3>${money(e.amount)}</h3>
      <p>Paid by ${safe(e.payer)} · ${safe(e.date || "")}</p>
      <button onclick="deleteExpense(${i})">Remove</button>
    </div>
  `).join("") || "<p class='muted'>No expenses recorded.</p>";
}

function deleteExpense(index) {
  if (!confirm("Delete this expense?")) return;

  expenses.splice(index, 1);
  save();
  renderAll();

  if (currentTrip !== null) renderTrip();
}

function renderTripExpenses() {
  const trip = trips[currentTrip];
  const list = expenses.filter(e => e.tripId === trip.id);
  const travelers = trip.travelers;

  const total = list.reduce((sum, e) => sum + e.amount, 0);
  const share = total / Math.max(1, travelers.length);

  const balances = Object.fromEntries(
    travelers.map(name => [name, 0])
  );

  list.forEach(e => {
    if (balances[e.payer] !== undefined) {
      balances[e.payer] += e.amount;
    }
  });

  travelers.forEach(name => {
  balances[name] = Number(
    (balances[name] - share).toFixed(2)
  );
});

  const balanceHTML = travelers.map(name => `
    <div class="activity-card">
      <strong>${safe(name)}</strong>
      <p>
        ${balances[name] >= 0 ?
          "Should receive: " + money(balances[name]) :
          "Owes: " + money(Math.abs(balances[name]))}
      </p>
    </div>
  `).join("");

  $("tripExpenses").innerHTML = `
    <div class="budget-card">
      <small>Total trip expenses</small>
      <strong>${money(total)}</strong>
      <span>Equal share: ${money(share)} per traveler</span>
    </div>
    <h3>Settlement balances</h3>
    <p class="muted">Each expense is split equally among all current travelers.</p>
    ${balanceHTML}
    <h3>Recorded expenses</h3>
    ${list.map(e => `
      <div class="expense-card">
        <strong>${safe(e.title)}</strong>
        <p>${money(e.amount)} · Paid by ${safe(e.payer)}</p>
      </div>
    `).join("") || "<p class='muted'>No expenses yet.</p>"}
  `;
}

function renderTripSelect() {
  $("organizeTripSelect").innerHTML =
    '<option value="">Choose a trip</option>' +
    trips.map(t =>
      `<option value="${safe(t.id)}">${safe(t.name)}</option>`
    ).join("");
}

function organizeDays() {
  const id = $("organizeTripSelect").value;
  const trip = trips.find(t => t.id === id);

  if (!trip) {
    alert("Choose a trip first.");
    return;
  }

  trip.activities.sort((a, b) =>
    a.day.localeCompare(b.day) ||
    a.time.localeCompare(b.time)
  );

  save();
  renderTrip();
  renderAll();

  $("organizerResults").innerHTML =
    "<p class='muted'>Activities sorted by day and time. This is a schedule organizer, not a road-distance optimizer.</p>" +
    trip.activities.map(a => `
      <div class="activity-card">
        <strong>${safe(a.day)} · ${safe(a.time || "No time")}</strong>
        <p>${safe(a.name)} — ${safe(a.city)}</p>
      </div>
    `).join("");
}

function renderChecklist() {
  $("checklist").innerHTML = checklist.map((item, i) => `
    <div class="activity-card">
      <label>
        <input type="checkbox" ${item.done ? "checked" : ""}
          onchange="toggleChecklist(${i}, this.checked)"
          style="width:auto;display:inline">
        ${safe(item.title)}
      </label>
      <button onclick="removeChecklist(${i})">Remove</button>
    </div>
  `).join("") || "<p class='muted'>Your checklist is empty.</p>";
}

function addChecklist() {
  const title = prompt("Checklist item?");
  if (!title?.trim()) return;

  checklist.push({ id: uid(), title: title.trim(), done: false });
  save();
  renderChecklist();
}

function toggleChecklist(index, checked) {
  checklist[index].done = checked;
  save();
}

function removeChecklist(index) {
  checklist.splice(index, 1);
  save();
  renderChecklist();
}

function backup() {
  const blob = new Blob([JSON.stringify({
    version: 4,
    trips,
    expenses,
    checklist
  }, null, 2)], { type: "application/json" });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "TravelMate-V4-backup.json";
  a.click();
  URL.revokeObjectURL(url);
}

function restore(file) {
  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    try {
      const backupData = JSON.parse(reader.result);

      if (!Array.isArray(backupData.trips) ||
          !Array.isArray(backupData.expenses)) {
        throw new Error("Invalid backup");
      }

      if (!confirm("Replace all current TravelMate data?")) return;

      trips = backupData.trips;
      expenses = backupData.expenses;
      checklist = Array.isArray(backupData.checklist) ?
        backupData.checklist : [];

      normalize();
      currentTrip = null;
      renderAll();
      showPage("home");
      alert("Backup restored successfully!");
    } catch {
      alert("Invalid backup file.");
    }
  };

  reader.readAsText(file);
}

function exportPDF() {
  const trip = trips[currentTrip];
  if (!trip) return;

  const activities = [...trip.activities].sort((a, b) =>
    a.day.localeCompare(b.day) ||
    a.time.localeCompare(b.time)
  );

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${safe(trip.name)} - TravelMate</title>
      <style>
        body { font-family: Arial; padding: 30px; color: #18263d; }
        h1 { color: #3978e8; }
        .item { padding: 12px; border-bottom: 1px solid #ddd; }
        @media print { button { display:none; } }
      </style>
    </head>
    <body>
      <h1>${safe(trip.name)}</h1>
      <p>${safe(trip.date || "")}</p>
      <h2>Destinations</h2>
      <p>${trip.cities.map(safe).join(" → ")}</p>
      <h2>Itinerary</h2>
      ${activities.map(a => `
        <div class="item">
          <strong>${safe(a.day)} · ${safe(a.time)}</strong>
          <p>${safe(a.name)}</p>
          <p>${safe(a.city)}</p>
        </div>
      `).join("")}
      <button onclick="window.print()">Print / Save as PDF</button>
    </body>
    </html>
  `;

  const win = window.open("", "_blank");

  if (!win) {
    alert("Allow pop-ups to export the itinerary.");
    return;
  }

  win.document.write(html);
  win.document.close();
}

async function geocode(query) {
  const response = await fetch(
    "https://nominatim.openstreetmap.org/search?format=json&limit=5&q=" +
    encodeURIComponent(query)
  );

  if (!response.ok) throw new Error("Place search failed.");

  return response.json();
}

function initMap() {
  if (typeof L === "undefined") {
    $("map").textContent =
      "Map library unavailable. Check your internet connection.";
    return;
  }

  if (map) {
    map.invalidateSize();
    return;
  }

  map = L.map("map").setView([26.8206, 30.8025], 5);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);
}

function clearMarkers() {
  markers.forEach(marker => map.removeLayer(marker));
  markers = [];
}

async function searchPlace() {
  const query = $("placeSearch").value.trim();
  if (!query) return;

  $("searchResults").innerHTML =
    "<p class='muted'>Searching for places...</p>";

  try {
    const results = await geocode(query);
    searchPlaces = results;

    $("searchResults").innerHTML = results.map((p, i) => `
      <div class="activity-card">
        <strong>${safe(p.display_name)}</strong>
        <button onclick="selectPlace(${i})">Show on map</button>
        <button onclick="addSearchPlace(${i})">Add to trip</button>
      </div>
    `).join("") || "<p>No places found.</p>";

  } catch (error) {
    $("searchResults").textContent = error.message;
  }
}

function selectPlace(index) {
  const p = searchPlaces[index];
  if (!p) return;

  initMap();

  const lat = Number(p.lat);
  const lon = Number(p.lon);

  map.setView([lat, lon], 14);
  const marker = L.marker([lat, lon])
    .addTo(map)
    .bindPopup(safe(p.display_name))
    .openPopup();

  markers.push(marker);
}

function addSearchPlace(index) {
  const p = searchPlaces[index];
  if (!p) return;

  if (!trips.length) {
    alert("Create a trip first.");
    return;
  }

  let tripIndex = currentTrip;

  if (tripIndex === null) {
    const answer = prompt(
      "Enter trip number:\n" +
      trips.map((t, i) => `${i + 1}. ${t.name}`).join("\n")
    );

    if (answer === null) return;
    tripIndex = Number(answer) - 1;
  }

  if (!trips[tripIndex]) return;

  const place = p.name || p.display_name.split(",")[0];

  if (!trips[tripIndex].cities.includes(place)) {
    trips[tripIndex].cities.push(place);
  }

  save();
  renderAll();

  alert("Destination added!");
}

async function calculateRoute() {
  const start = $("routeStart").value.trim();
  const end = $("routeEnd").value.trim();

  if (!start || !end) {
    alert("Enter both starting point and destination.");
    return;
  }

  $("routeInfo").textContent = "Finding route...";

  try {
    const [a, b] = await Promise.all([
      geocode(start),
      geocode(end)
    ]);

    if (!a.length || !b.length) {
      throw new Error("Could not find one of the locations.");
    }

    const mode = $("routeMode").value;
    const profile = mode === "walking" ? "foot" :
      mode === "cycling" ? "bike" : "driving";

    const coordinates =
      `${a[0].lon},${a[0].lat};${b[0].lon},${b[0].lat}`;

    const url =
      `https://router.project-osrm.org/route/v1/${profile}/${coordinates}?overview=full&geometries=geojson`;

    const response = await fetch(url);
    const result = await response.json();

    if (!result.routes?.length) {
      throw new Error("No route found for this travel mode.");
    }

    initMap();

    if (routeLayer) map.removeLayer(routeLayer);

    clearMarkers();

    const route = result.routes[0];

    routeLayer = L.geoJSON(route.geometry).addTo(map);
    map.fitBounds(routeLayer.getBounds(), { padding: [25, 25] });

    const distance = (route.distance / 1000).toFixed(2);
    const duration = Math.round(route.duration / 60);

    $("routeInfo").innerHTML = `
      <div class="activity-card">
        <strong>Route calculated</strong>
        <p>Distance: ${distance} km</p>
        <p>Estimated time: ${duration} minutes</p>
        <p>Mode: ${safe(mode)}</p>
        <p class="muted">Estimates from OSRM. Actual travel conditions may differ.</p>
      </div>
    `;

  } catch (error) {
    $("routeInfo").textContent = error.message;
  }
}

function toggleTheme() {
  document.body.classList.toggle("dark");

  const dark = document.body.classList.contains("dark");
  localStorage.setItem("tm_theme", dark ? "dark" : "light");

  $("themeBtn").textContent = dark ? "☾" : "☀";
}

function changeLanguage(value) {
  document.documentElement.lang = value;
  document.documentElement.dir = value === "ar" ? "rtl" : "ltr";

  $("welcome").textContent = value === "ar" ?
    "رحلتك، منظمة بكل سهولة." :
    "Your journey, beautifully organi => showTab(button.dataset.tab);
});

normalizeData();
renderTrips();
renderExpenses();
showTab("home");
