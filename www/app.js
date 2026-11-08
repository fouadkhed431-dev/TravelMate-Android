
/* ==========================================
   TRAVELMATE V4 — COMPLETE APP ENGINE
   ========================================== */

const $ = id => document.getElementById(id);

const STORAGE = "travelmate_v4_data";
const SETTINGS = "travelmate_v4_settings";

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

let settings = readStored(SETTINGS, {
  currency: localStorage.getItem("tm_currency") || "EGP",
  language: "en",
  theme: localStorage.getItem("tm_theme") || "light"
});

let currentTrip = null;
let map = null;
let markers = [];
let routeLayer = null;
let searchPlaces = [];

const translations = {
  en: {
    welcome: "Your journey, beautifully organized.",
    overview: "Overview",
    totalTrips: "Total trips",
    destinations: "Destinations",
    totalExpenses: "Total expenses",
    journeys: "My journeys",
    seeAll: "See all →",
    quickAccess: "Quick access",
    createTrip: "＋ Create a trip",
    exploreMap: "Explore map",
    expenses: "Expenses",
    assistant: "Travel assistant",
    settings: "Settings",
    adventures: "YOUR ADVENTURES",
    myTrips: "My Trips",
    newTrip: "＋ New",
    journey: "YOUR JOURNEY",
    dailyItinerary: "Daily itinerary",
    travelers: "Travelers",
    tripExpenses: "Trip expenses",
    add: "＋ Add",
    back: "← Back to trips",
    exportPDF: "Export itinerary PDF",
    budget: "YOUR TRAVEL BUDGET",
    expenseManager: "Expense Manager",
    allExpenses: "All expenses",
    discover: "DISCOVER THE WORLD",
    explore: "Explore Map",
    search: "Search",
    routePlanner: "Route planner",
    calculateRoute: "Calculate route",
    smartCompanion: "YOUR SMART TRAVEL COMPANION",
    travelAssistant: "Travel Assistant ✨",
    organizer: "Smart day organizer",
    organize: "Organize my days",
    checklist: "Travel checklist",
    addChecklist: "＋ Add checklist item",
    makeYours: "MAKE IT YOURS",
    appSettings: "Settings",
    appLanguage: "App language",
    currency: "Currency",
    dataProtection: "Data protection",
    backupDescription: "Keep a backup of your trips and expenses.",
    exportBackup: "↓ Export backup",
    restoreBackup: "↑ Restore backup",
    about: "About TravelMate",
    home: "Home",
    trips: "Trips",
    maps: "Maps",
    more: "More",
    noTrips: "No trips yet. Create your first adventure!",
    noActivities: "No activities planned.",
    noExpenses: "No expenses recorded.",
    noChecklist: "Your checklist is empty.",
    remove: "Remove",
    edit: "Edit",
    openJourney: "Open journey →",
    paidBy: "Paid by",
    shouldReceive: "Should receive",
    owes: "Owes",
    pay: "pays",
    to: "to",
    settlement: "Settlement instructions",
    noPayments: "Everyone is settled up!",
    equalShare: "Equal share",
    totalSpending: "Total spending",
    expensesCount: "expenses",
    noDestinations: "No destinations yet",
    datesNotSet: "Dates not set",
    untitled: "Untitled activity",
    locationNotSet: "Location not set",
    chooseTrip: "Choose a trip",
    driving: "Driving",
    walking: "Walking",
    cycling: "Cycling",
    modeUnavailable: "The public route service currently supports driving routes reliably. Walking and cycling routes are not available here.",
    invalidBackup: "Invalid backup file.",
    restored: "Backup restored successfully!",
    replaceData: "Replace all current TravelMate data?",
    searching: "Searching for places...",
    noPlaces: "No places found.",
    showMap: "Show on map",
    addToTrip: "Add to trip",
    routeFound: "Route calculated",
    distance: "Distance",
    estimatedTime: "Estimated time",
    routeDisclaimer: "Estimates only. Actual travel conditions may differ.",
    chooseFirst: "Choose a trip first.",
    tripName: "What is the name of your trip?",
    destination: "Where are you going?",
    startDate: "Start date? (YYYY-MM-DD, optional)",
    activityName: "Activity name?",
    whichDay: "Which day? (e.g. Day 1)",
    time: "Time? (e.g. 10:30)",
    location: "Location?",
    travelerName: "Traveler name?",
    expenseDescription: "Expense description?",
    amount: "Amount?",
    validAmount: "Enter a valid amount.",
    checklistItem: "Checklist item?",
    enterStart: "Enter starting point",
    enterEnd: "Enter destination",
    noRoute: "No route found.",
    printPDF: "Print / Save as PDF"
  },

  ar: {
    welcome: "رحلتك، منظمة بكل سهولة.",
    overview: "نظرة عامة",
    totalTrips: "إجمالي الرحلات",
    destinations: "الوجهات",
    totalExpenses: "إجمالي المصروفات",
    journeys: "رحلاتي",
    seeAll: "عرض الكل ←",
    quickAccess: "الوصول السريع",
    createTrip: "＋ إنشاء رحلة",
    exploreMap: "استكشف الخريطة",
    expenses: "المصروفات",
    assistant: "مساعد السفر",
    settings: "الإعدادات",
    adventures: "مغامراتك",
    myTrips: "رحلاتي",
    newTrip: "＋ جديد",
    journey: "رحلتك",
    dailyItinerary: "جدول الرحلة اليومي",
    travelers: "المسافرون",
    tripExpenses: "مصروفات الرحلة",
    add: "＋ إضافة",
    back: "العودة إلى الرحلات ←",
    exportPDF: "تصدير جدول الرحلة PDF",
    budget: "ميزانية السفر",
    expenseManager: "إدارة المصروفات",
    allExpenses: "كل المصروفات",
    discover: "اكتشف العالم",
    explore: "استكشف الخريطة",
    search: "بحث",
    routePlanner: "مخطط المسار",
    calculateRoute: "احسب المسار",
    smartCompanion: "مساعد السفر الذكي",
    travelAssistant: "مساعد السفر ✨",
    organizer: "تنظيم الأيام الذكي",
    organize: "نظّم أيامي",
    checklist: "قائمة تجهيز السفر",
    addChecklist: "＋ إضافة عنصر",
    makeYours: "خصص التطبيق",
    appSettings: "الإعدادات",
    appLanguage: "لغة التطبيق",
    currency: "العملة",
    dataProtection: "حماية البيانات",
    backupDescription: "احتفظ بنسخة احتياطية من رحلاتك ومصروفاتك.",
    exportBackup: "↓ تصدير نسخة احتياطية",
    restoreBackup: "↑ استعادة نسخة احتياطية",
    about: "حول TravelMate",
    home: "الرئيسية",
    trips: "الرحلات",
    maps: "الخرائط",
    more: "المزيد",
    noTrips: "لا توجد رحلات بعد. أنشئ رحلتك الأولى!",
    noActivities: "لا توجد أنشطة مخططة.",
    noExpenses: "لا توجد مصروفات مسجلة.",
    noChecklist: "قائمة التجهيز فارغة.",
    remove: "حذف",
    edit: "تعديل",
    openJourney: "افتح الرحلة ←",
    paidBy: "دفع بواسطة",
    shouldReceive: "يستحق",
    owes: "عليه",
    pay: "يدفع",
    to: "إلى",
    settlement: "تسوية الحسابات",
    noPayments: "الحسابات متساوية!",
    equalShare: "نصيب الفرد",
    totalSpending: "إجمالي الإنفاق",
    expensesCount: "مصروفات",
    noDestinations: "لا توجد وجهات بعد",
    datesNotSet: "لم يتم تحديد التاريخ",
    untitled: "نشاط بدون اسم",
    locationNotSet: "لم يتم تحديد المكان",
    chooseTrip: "اختر رحلة",
    driving: "سيارة",
    walking: "سيراً على الأقدام",
    cycling: "دراجة",
    modeUnavailable: "خدمة المسارات العامة تدعم مسارات السيارات بشكل موثوق حالياً. مسارات المشي والدراجات غير متاحة هنا.",
    invalidBackup: "ملف النسخة الاحتياطية غير صالح.",
    restored: "تمت استعادة النسخة الاحتياطية بنجاح!",
    replaceData: "هل تريد استبدال جميع بيانات TravelMate الحالية؟",
    searching: "جارٍ البحث عن الأماكن...",
    noPlaces: "لم يتم العثور على أماكن.",
    showMap: "عرض على الخريطة",
    addToTrip: "إضافة إلى الرحلة",
    routeFound: "تم حساب المسار",
    distance: "المسافة",
    estimatedTime: "الوقت التقديري",
    routeDisclaimer: "تقديرات فقط. قد تختلف ظروف السفر الفعلية.",
    chooseFirst: "اختر رحلة أولاً.",
    tripName: "ما اسم الرحلة؟",
    destination: "إلى أين ستذهب؟",
    startDate: "تاريخ البداية؟ (اختياري: YYYY-MM-DD)",
    activityName: "اسم النشاط؟",
    whichDay: "أي يوم؟ (مثلاً اليوم الأول)",
    time: "الوقت؟ (مثلاً 10:30)",
    location: "المكان؟",
    travelerName: "اسم المسافر؟",
    expenseDescription: "وصف المصروف؟",
    amount: "المبلغ؟",
    validAmount: "أدخل مبلغاً صحيحاً.",
    checklistItem: "عنصر قائمة التجهيز؟",
    enterStart: "أدخل نقطة البداية",
    enterEnd: "أدخل الوجهة",
    noRoute: "لم يتم العثور على مسار.",
    printPDF: "طباعة / حفظ PDF"
  }
};

function tr(key) {
  const lang = settings.language || "en";
  return translations[lang]?.[key] || translations.en[key] || key;
}

function uid() {
  return Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8);
}

function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

function money(value) {
  const currency = settings.currency || "EGP";

  return Number(value || 0).toLocaleString(
    settings.language === "ar" ? "ar-EG" : "en-US",
    { maximumFractionDigits: 2 }
  ) + " " + currency;
}

function save() {
  localStorage.setItem(STORAGE, JSON.stringify({
    version: 4,
    trips,
    expenses,
    checklist
  }));

  localStorage.setItem(SETTINGS, JSON.stringify(settings));
  localStorage.setItem("tm_currency", settings.currency);
  localStorage.setItem("tm_theme", settings.theme);
}

function normalize() {
  trips = trips.map(t => ({
    ...t,
    id: t.id || uid(),
    name: t.name || "My trip",

    cities: Array.isArray(t.cities)
      ? t.cities
      : (t.destination ? [t.destination] : []),

    activities: Array.isArray(t.activities)
      ? t.activities.map(a => ({
          ...a,
          id: a.id || uid(),
          name: a.name || tr("untitled"),
          day: String(a.day || "Day 1"),
          time: String(a.time || ""),
          city: String(a.city || "")
        }))
      : [],

    travelers:
      Array.isArray(t.travelers) && t.travelers.length
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
      Number.isInteger(e.trip) && trips[e.trip]
        ? trips[e.trip].id
        : null
    ),
    payer: e.payer || "Unspecified"
  }));

  checklist = checklist.map(item =>
    typeof item === "string"
      ? { id: uid(), title: item, done: false }
      : {
          id: item.id || uid(),
          title: item.title || "",
          done: Boolean(item.done)
        }
  );

  save();
}

function applyLanguage() {
  const ar = settings.language === "ar";

  document.documentElement.lang = ar ? "ar" : "en";
  document.documentElement.dir = ar ? "rtl" : "ltr";

  $("welcome").textContent = tr("welcome");

  const textMap = {
    statTrips: "totalTrips",
    statPlaces: "destinations",
    statExpenses: "totalExpenses",
    totalExpenses: "totalSpending"
  };

  Object.entries(textMap).forEach(([id, key]) => {
    const element = $(id);
    if (element) element.setAttribute("aria-label", tr(key));
  });

  $("newTripBtn").textContent = tr("createTrip");
  $("addTripBtn").textContent = tr("newTrip");
  $("backBtn").textContent = tr("back");
  $("addCityBtn").textContent = tr("add");
  $("addDayBtn").textContent = "＋ " + tr("dailyItinerary");
  $("addTravelerBtn").textContent = tr("add");
  $("tripExpenseBtn").textContent = tr("add");
  $("addExpenseBtn").textContent = tr("add");
  $("exportTripBtn").textContent = tr("exportPDF");
  $("searchPlaceBtn").textContent = tr("search");
  $("routeBtn").textContent = tr("calculateRoute");
  $("organizeBtn").textContent = tr("organize");
  $("addChecklistBtn").textContent = tr("addChecklist");
  $("backupBtn").textContent = tr("exportBackup");
  $("restoreBtn").textContent = tr("restoreBackup");

  $("placeSearch").placeholder =
    ar ? "ابحث عن مدينة أو مكان..." : "Search a city or place...";

  $("routeStart").placeholder = tr("enterStart");
  $("routeEnd").placeholder = tr("enterEnd");

  document.querySelectorAll(".nav-item").forEach(button => {
    const key = button.dataset.page === "home" ? "home" :
      button.dataset.page === "trips" ? "trips" :
      button.dataset.page === "maps" ? "maps" :
      button.dataset.page === "expenses" ? "expenses" : "more";

    const small = button.querySelector("small");
    if (small) small.textContent = tr(key);
  });

  $("themeBtn").textContent =
    settings.theme === "dark" ? "☾" : "☀";
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
    setTimeout(initMap, 300);
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
      <p>📍 ${safe(t.cities.join(" → ") || tr("noDestinations"))}</p>
      <p>📅 ${safe(t.date || tr("datesNotSet"))}</p>
      <p>${t.activities.length} ${tr("dailyItinerary")}</p>
      <button class="primary" onclick="openTrip(${index})">
        ${tr("openJourney")}
      </button>
    </div>
  `;
}

function renderTrips() {
  const html = trips.map(tripCard).join("") ||
    `<p>${tr("noTrips")}</p>`;

  $("tripList").innerHTML = html;
  $("tripPreview").innerHTML = html;
}

function addTrip() {
  const name = prompt(tr("tripName"));
  if (!name?.trim()) return;

  const destination = prompt(tr("destination"));
  if (!destination?.trim()) return;

  const date = prompt(tr("startDate")) || "";

  trips.push({
    id: uid(),
    name: name.trim(),
    cities: [destination.trim()],
    date,
    activities: [],
    travelers: ["Traveler 1"]
  });

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
    (trip.date || tr("datesNotSet")) + " · " +
    trip.cities.length + " " + tr("destinations");

  $("cityList").innerHTML = trip.cities.map((city, i) => `
    <div class="activity-card">
      <strong>📍 ${safe(city)}</strong>
      <button onclick="removeCity(${i})">${tr("remove")}</button>
    </div>
  `).join("") || `<p>${tr("noDestinations")}</p>`;

  renderActivities();
  renderTravelers();
  renderTripExpenses();
}

function addCity() {
  const city = prompt(tr("destination"));
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
  if (!trip) return;

  const name = prompt(tr("activityName"));
  if (!name?.trim()) return;

  const day = prompt(tr("whichDay")) || "Day 1";
  const time = prompt(tr("time")) || "";
  const city = prompt(
    tr("location") + " " + trip.cities.join(", ")
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
        <p>📅 ${safe(a.day)} · ${safe(a.time || "—")}</p>
        <p>📍 ${safe(a.city || tr("locationNotSet"))}</p>
        <button onclick="editActivity(${index})">${tr("edit")}</button>
        <button onclick="removeActivity(${index})">${tr("remove")}</button>
      </div>
    `;
  }).join("") || `<p>${tr("noActivities")}</p>`;
}

function editActivity(index) {
  const activity = trips[currentTrip]?.activities[index];
  if (!activity) return;

  const name = prompt(tr("activityName"), activity.name);
  if (!name?.trim()) return;

  activity.name = name.trim();
  activity.day = prompt(tr("whichDay"), activity.day) || activity.day;
  activity.time = prompt(tr("time"), activity.time) ?? activity.time;
  activity.city = prompt(tr("location"), activity.city) ?? activity.city;

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
  if (!trip) return;

  const name = prompt(tr("travelerName"));
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
      ${travelers.length > 1
        ? `<button onclick="removeTraveler(${i})">${tr("remove")}</button>`
        : ""}
    </div>
  `).join("");
}

function removeTraveler(index) {
  const trip = trips[currentTrip];
  const name = trip.travelers[index];

  if (expenses.some(e =>
    e.tripId === trip.id && e.payer === name
  )) {
    alert("This traveler has paid expenses. Reassign their expenses first.");
    return;
  }

  if (expenses.some(e => e.tripId === trip.id)) {
    alert("Remove or settle this trip's expenses before changing its traveler list.");
    return;
  }

  if (trip.travelers.length <= 1) {
    alert("A trip must have at least one traveler.");
    return;
  }

  if (!confirm("Remove " + name + "?")) return;

  trip.travelers.splice(index, 1);
  save();
  renderTrip();
}

function addExpense() {
  const title = prompt(tr("expenseDescription"));
  if (!title?.trim()) return;

  const amount = Number(prompt(tr("amount")));

  if (!Number.isFinite(amount) || amount <= 0) {
    alert(tr("validAmount"));
    return;
  }

  const activePage =
    document.querySelector(".page:not(.hidden)")?.id;

  let trip = activePage === "detail" && currentTrip !== null
    ? trips[currentTrip]
    : null;

  if (!trip && trips.length) {
    const choice = prompt(
      "Enter trip number, or 0 for general expense:\n" +
      trips.map((t, i) => `${i + 1}. ${t.name}`).join("\n")
    );

    if (choice === null) return;

    const index = Number(choice) - 1;

    if (choice !== "0") {
      if (!trips[index]) {
        alert("Invalid trip number.");
        return;
      }
      trip = trips[index];
    }
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
    amount: Number(amount.toFixed(2)),
    payer,
    tripId: trip?.id || null,
    date: new Date().toISOString().slice(0, 10)
  });

  save();
  renderAll();

  if (activePage === "detail" && currentTrip !== null) {
    renderTrip();
  }
}

function renderExpenses() {
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  $("totalExpenses").textContent = money(total);
  $("expenseCount").textContent =
    expenses.length + " " + tr("expensesCount");

  $("expenseList").innerHTML = expenses.map((e, i) => `
    <div class="expense-card">
      <strong>💳 ${safe(e.title)}</strong>
      <h3>${money(e.amount)}</h3>
      <p>${tr("paidBy")} ${safe(e.payer)} · ${safe(e.date || "")}</p>
      <button onclick="deleteExpense(${i})">${tr("remove")}</button>
    </div>
  `).join("") || `<p>${tr("noExpenses")}</p>`;
}

function deleteExpense(index) {
  if (!confirm("Delete this expense?")) return;

  expenses.splice(index, 1);
  save();
  renderAll();

  if (currentTrip !== null) renderTrip();
}

/* Calculate who owes whom, using integer cents. */
function calculateSettlement(trip) {
  const list = expenses.filter(e => e.tripId === trip.id);
  const travelers = trip.travelers;

  if (!travelers.length) {
    return { total: 0, share: 0, balances: {}, payments: [] };
  }

  const totalCents = Math.round(
    list.reduce((sum, e) => sum + Number(e.amount || 0), 0) * 100
  );

  const baseShare = Math.floor(totalCents / travelers.length);
  const remainder = totalCents % travelers.length;

  const balances = Object.fromEntries(
    travelers.map((name, index) => [
      name,
      -(baseShare + (index < remainder ? 1 : 0))
    ])
  );

  list.forEach(e => {
    if (balances[e.payer] !== undefined) {
      balances[e.payer] += Math.round(Number(e.amount) * 100);
    }
  });

  const creditors = [];
  const debtors = [];

  Object.entries(balances).forEach(([name, cents]) => {
    if (cents > 0) creditors.push({ name, cents });
    if (cents < 0) debtors.push({ name, cents: -cents });
  });

  const payments = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(
      debtors[i].cents,
      creditors[j].cents
    );

    if (amount > 0) {
      payments.push({
        from: debtors[i].name,
        to: creditors[j].name,
        amount: amount / 100
      });
    }

    debtors[i].cents -= amount;
    creditors[j].cents -= amount;

    if (debtors[i].cents === 0) i++;
    if (creditors[j].cents === 0) j++;
  }

  return {
    total: totalCents / 100,
    share: totalCents / 100 / travelers.length,
    balances: Object.fromEntries(
      Object.entries(balances).map(([name, cents]) =>
        [name, cents / 100]
      )
    ),
    payments
  };
}

function renderTripExpenses() {
  const trip = trips[currentTrip];
  if (!trip) return;

  const list = expenses.filter(e => e.tripId === trip.id);
  const result = calculateSettlement(trip);

  const balanceHTML = trip.travelers.map(name => {
    const balance = result.balances[name] || 0;

    return `
      <div class="activity-card">
        <strong>${safe(name)}</strong>
        <p>
          ${balance >= 0
            ? tr("shouldReceive") + ": " + money(balance)
            : tr("owes") + ": " + money(Math.abs(balance))}
        </p>
      </div>
    `;
  }).join("");

  const paymentHTML = result.payments.length
    ? result.payments.map(p => `
        <div class="activity-card">
          <strong>${safe(p.from)} ${tr("pay")} ${safe(p.to)}</strong>
          <h3>${money(p.amount)}</h3>
        </div>
      `).join("")
    : `<p>${tr("noPayments")}</p>`;

  $("tripExpenses").innerHTML = `
    <div class="budget-card">
      <small>${tr("totalSpending")}</small>
      <strong>${money(result.total)}</strong>
      <span>${tr("equalShare")}: ${money(result.share)} ${tr("perTraveler") || "per traveler"}</span>
    </div>

    <h3>${tr("settlement")}</h3>
    <p class="muted">Expenses are split equally among the current travelers.</p>

    ${balanceHTML}

    <h3>${tr("settlement")}</h3>
    ${paymentHTML}

    <h3>${tr("allExpenses")}</h3>

    ${list.map(e => `
      <div class="expense-card">
        <strong>${safe(e.title)}</strong>
        <p>${money(e.amount)} · ${tr("paidBy")} ${safe(e.payer)}</p>
      </div>
    `).join("") || `<p>${tr("noExpenses")}</p>`}
  `;
}

function renderTripSelect() {
  $("organizeTripSelect").innerHTML =
    `<option value="">${tr("chooseTrip")}</option>` +
    trips.map(t =>
      `<option value="${safe(t.id)}">${safe(t.name)}</option>`
    ).join("");
}

function organizeDays() {
  const id = $("organizeTripSelect").value;
  const trip = trips.find(t => t.id === id);

  if (!trip) {
    alert(tr("chooseFirst"));
    return;
  }

  trip.activities.sort((a, b) =>
    a.day.localeCompare(b.day) ||
    a.time.localeCompare(b.time)
  );

  save();
  renderAll();

  if (currentTrip !== null && trips[currentTrip]?.id === trip.id) {
    renderTrip();
  }

  $("organizerResults").innerHTML =
    `<p class="muted">Activities sorted by day and time. This organizes your schedule, not road distances.</p>` +
    trip.activities.map(a => `
      <div class="activity-card">
        <strong>${safe(a.day)} · ${safe(a.time || "—")}</strong>
        <p>${safe(a.name)} — ${safe(a.city)}</p>
      </div>
    `).join("");
}

function renderChecklist() {
  $("checklist").innerHTML = checklist.map((item, i) => `
    <div class="activity-card">
      <label>
        <input type="checkbox"
          ${item.done ? "checked" : ""}
          onchange="toggleChecklist(${i}, this.checked)"
          style="width:auto;display:inline">
        ${safe(item.title)}
      </label>
      <button onclick="removeChecklist(${i})">${tr("remove")}</button>
    </div>
  `).join("") || `<p>${tr("noChecklist")}</p>`;
}

function addChecklist() {
  const title = prompt(tr("checklistItem"));
  if (!title?.trim()) return;

  checklist.push({
    id: uid(),
    title: title.trim(),
    done: false
  });

  save();
  renderChecklist();
}

function toggleChecklist(index, checked) {
  if (!checklist[index]) return;

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
    checklist,
    settings
  }, null, 2)], { type: "application/json" });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = "TravelMate-V4-backup.json";
  a.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
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

      if (!confirm(tr("replaceData"))) return;

      trips = backupData.trips;
      expenses = backupData.expenses;
      checklist = Array.isArray(backupData.checklist)
        ? backupData.checklist
        : [];

      if (backupData.settings) {
        settings = {
          ...settings,
          ...backupData.settings
        };
      }

      normalize();
      currentTrip = null;

      applySettings();
      renderAll();
      showPage("home");

      alert(tr("restored"));
    } catch {
      alert(tr("invalidBackup"));
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
    <html dir="${settings.language === "ar" ? "rtl" : "ltr"}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>${safe(trip.name)} - TravelMate</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 25px;
          color: #18263d;
          line-height: 1.7;
        }
        h1 { color: #3978e8; }
        .item {
          padding: 12px;
          border-bottom: 1px solid #ddd;
          page-break-inside: avoid;
        }
        @media print {
          button { display:none; }
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <h1>${safe(trip.name)}</h1>
      <p>${safe(trip.date || "")}</p>
      <h2>${tr("destinations")}</h2>
      <p>${trip.cities.map(safe).join(" → ")}</p>
      <h2>${tr("dailyItinerary")}</h2>

      ${activities.map(a => `
        <div class="item">
          <strong>${safe(a.day)} · ${safe(a.time)}</strong>
          <p>${safe(a.name)}</p>
          <p>${safe(a.city)}</p>
        </div>
      `).join("")}

      <button onclick="window.print()">${tr("printPDF")}</button>
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
  if (!map) return;

  markers.forEach(marker => map.removeLayer(marker));
  markers = [];
}

async function searchPlace() {
  const query = $("placeSearch").value.trim();
  if (!query) return;

  $("searchResults").innerHTML =
    `<p>${tr("searching")}</p>`;

  try {
    const results = await geocode(query);
    searchPlaces = results;

    $("searchResults").innerHTML = results.map((p, i) => `
      <div class="activity-card">
        <strong>${safe(p.display_name)}</strong>
        <button onclick="selectPlace(${i})">${tr("showMap")}</button>
        <button onclick="addSearchPlace(${i})">${tr("addToTrip")}</button>
      </div>
    `).join("") || `<p>${tr("noPlaces")}</p>`;

  } catch (error) {
    $("searchResults").textContent = error.message;
  }
}

function selectPlace(index) {
  const p = searchPlaces[index];
  if (!p) return;

  initMap();
  if (!map) return;

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
    alert(tr("chooseFirst"));
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

  if (!trips[tripIndex]) {
    alert("Invalid trip.");
    return;
  }

  const place = p.name || p.display_name.split(",")[0];

  if (!trips[tripIndex].cities.includes(place)) {
    trips[tripIndex].cities.push(place);
  }

  save();
  renderAll();

  if (currentTrip !== null) renderTrip();

  alert("Destination added!");
}

async function calculateRoute() {
  const start = $("routeStart").value.trim();
  const end = $("routeEnd").value.trim();

  if (!start || !end) {
    alert("Enter both starting point and destination.");
    return;
  }

  const mode = $("routeMode").value;

  if (mode !== "driving") {
    alert(tr("modeUnavailable"));
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

    const coordinates =
      `${a[0].lon},${a[0].lat};${b[0].lon},${b[0].lat}`;

    const url =
      `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`;

    const response = await fetch(url);
    if (!response.ok) throw new Error("Route service unavailable.");

    const result = await response.json();

    if (!result.routes?.length) {
      throw new Error(tr("noRoute"));
    }

    initMap();
    if (!map) throw new Error("Map unavailable.");

    if (routeLayer) map.removeLayer(routeLayer);

    clearMarkers();

    const route = result.routes[0];

    routeLayer = L.geoJSON(route.geometry).addTo(map);
    map.fitBounds(routeLayer.getBounds(), {
      padding: [25, 25]
    });

    const distance = (route.distance / 1000).toFixed(2);
    const duration = Math.round(route.duration / 60);

    $("routeInfo").innerHTML = `
      <div class="activity-card">
        <strong>${tr("routeFound")}</strong>
        <p>${tr("distance")}: ${distance} km</p>
        <p>${tr("estimatedTime")}: ${duration} minutes</p>
        <p>${tr("driving")}</p>
        <p class="muted">${tr("routeDisclaimer")}</p>
      </div>
    `;

  } catch (error) {
    $("routeInfo").textContent = error.message;
  }
}

function applySettings() {
  document.body.classList.toggle(
    "dark",
    settings.theme === "dark"
  );

  $("themeBtn").textContent =
    settings.theme === "dark" ? "☾" : "☀";

  $("languageSelect").value = settings.language;
  $("currencySelect").value = settings.currency;

  applyLanguage();
  save();
}

function toggleTheme() {
  settings.theme =
    settings.theme === "dark" ? "light" : "dark";

  applySettings();
}

function changeLanguage(value) {
  settings.language = value === "ar" ? "ar" : "en";

  applySettings();
  renderAll();

  if (currentTrip !== null) renderTrip();
}

function changeCurrency(value) {
  settings.currency = value || "EGP";

  save();
  renderAll();

  if (currentTrip !== null) renderTrip();
}

function init() {
  normalize();

  $("newTripBtn").onclick = addTrip;
  $("addTripBtn").onclick = addTrip;
  $("addCityBtn").onclick = addCity;
  $("addDayBtn").onclick = addActivity;
  $("addTravelerBtn").onclick = addTraveler;
  $("tripExpenseBtn").onclick = addExpense;
  $("addExpenseBtn").onclick = addExpense;

  $("backBtn").onclick = () => showPage("trips");
  $("themeBtn").onclick = toggleTheme;

  $("addChecklistBtn").onclick = addChecklist;
  $("organizeBtn").onclick = organizeDays;

  $("searchPlaceBtn").onclick = searchPlace;
  $("routeBtn").onclick = calculateRoute;

  $("backupBtn").onclick = backup;
  $("restoreBtn").onclick = () => $("restoreFile").click();
  $("exportTripBtn").onclick = exportPDF;

  $("restoreFile").onchange = event => {
    restore(event.target.files[0]);
    event.target.value = "";
  };

  $("languageSelect").onchange = event =>
    changeLanguage(event.target.value);

  $("currencySelect").onchange = event =>
    changeCurrency(event.target.value);

  document.querySelectorAll("[data-page]").forEach(button => {
    button.onclick = () => showPage(button.dataset.page);
  });

  applySettings();
  renderAll();
  showPage("home");
}

init();
