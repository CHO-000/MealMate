/* ==========================================================================
   MealMate – มื้อดีมีเวลา
   Vanilla JS single-page app. Core planner/log/progress logic never depends
   on a server — it works standalone with just localStorage, same as the
   static version. The AI features below (suggestion explanations, chat,
   encouragement) are optional calls to this app's own backend (same origin,
   /api/ai/*), which proxies to KKU IntelSphere. If that backend isn't
   present or unreachable, those UI pieces simply stay hidden.
   ========================================================================== */

(function () {
  "use strict";

  /* ------------------------------------------------------------------ */
  /* Constants                                                          */
  /* ------------------------------------------------------------------ */

  var STORAGE_KEY = "mealmate_state";

  // Supabase project config — safe to expose client-side (protected by
  // Row Level Security, not by secrecy). Filled in once the project exists;
  // until then SUPABASE_URL stays a placeholder and account features stay
  // hidden, so the app runs exactly like the guest-only version.
  var SUPABASE_URL = "https://rgvtxmlezqdmwmpqlabu.supabase.co";
  var SUPABASE_ANON_KEY = "sb_publishable_iKd8yx34iJq6x7L-rxb05A_soU5vJ1u";

  var MEAL_LABELS = {
    breakfast: "มื้อเช้า",
    lunch: "มื้อกลางวัน",
    dinner: "มื้อเย็น",
    late_night: "มื้อดึก/ก่อนนอน",
    snack: "ขนม/ของว่าง",
    other: "มื้ออื่นๆ"
  };

  function mealDisplayLabel(log) {
    if (log.meal === "other" && log.customMealLabel) return log.customMealLabel;
    return MEAL_LABELS[log.meal] || MEAL_LABELS.other;
  }

  var GOAL_LABELS = {
    balanced: "สมดุล",
    protein: "โปรตีน",
    light: "เบา"
  };

  var DIET_LABELS = {
    general: "ทั่วไป",
    "no-pork": "ไม่กินหมู",
    vegetarian: "มังสวิรัติ"
  };

  var GROUP_LABELS = {
    carb: "คาร์โบไฮเดรต",
    protein: "โปรตีน",
    veggie: "ผัก",
    fruit: "ผลไม้",
    fat: "ไขมัน"
  };

  var DEFAULT_SETTINGS = {
    breakfast: "07:30",
    lunch: "12:00",
    dinner: "18:00"
  };

  function defaultState() {
    return {
      logs: [],
      groupsSelected: [],
      groupsDate: todayStr(),
      settings: {
        breakfast: DEFAULT_SETTINGS.breakfast,
        lunch: DEFAULT_SETTINGS.lunch,
        dinner: DEFAULT_SETTINGS.dinner
      },
      profile: {
        displayName: "",
        age: null,
        avatarUrl: null
      }
    };
  }

  /* ------------------------------------------------------------------ */
  /* Menu database                                                      */
  /* ------------------------------------------------------------------ */

  var MENU_DB = [
    {
      id: "kaprao-chicken",
      name: "ข้าวกะเพราไก่ไข่ดาว",
      emoji: "🍳",
      meal: ["lunch", "dinner"],
      price: 45,
      time: 15,
      calories: 550,
      protein: 25,
      goal: ["balanced", "protein"],
      diet: ["general", "no-pork"],
      groups: ["carb", "protein", "fat"],
      keywords: "กะเพรา ไก่ ไข่ ไข่ดาว"
    },
    {
      id: "grilled-chicken-rice",
      name: "ข้าวไก่ย่าง",
      emoji: "🍗",
      meal: ["lunch", "dinner"],
      price: 50,
      time: 20,
      calories: 500,
      protein: 30,
      goal: ["protein", "balanced"],
      diet: ["general", "no-pork"],
      groups: ["carb", "protein"],
      keywords: "ไก่ย่าง ไก่"
    },
    {
      id: "veggie-fried-rice",
      name: "ข้าวผัดผัก",
      emoji: "🥦",
      meal: ["breakfast", "lunch", "dinner"],
      price: 35,
      time: 10,
      calories: 400,
      protein: 8,
      goal: ["light", "balanced"],
      diet: ["general", "no-pork", "vegetarian"],
      groups: ["carb", "veggie", "fat"],
      keywords: "ข้าวผัด ผัก มังสวิรัติ"
    },
    {
      id: "chicken-breast-salad",
      name: "สลัดอกไก่",
      emoji: "🥗",
      meal: ["lunch", "dinner"],
      price: 55,
      time: 10,
      calories: 320,
      protein: 35,
      goal: ["protein", "light"],
      diet: ["general", "no-pork"],
      groups: ["protein", "veggie", "fat"],
      keywords: "สลัด ไก่ อกไก่"
    },
    {
      id: "fish-congee",
      name: "ข้าวต้มปลา",
      emoji: "🐟",
      meal: ["breakfast"],
      price: 40,
      time: 15,
      calories: 300,
      protein: 18,
      goal: ["light", "balanced"],
      diet: ["general", "no-pork"],
      groups: ["carb", "protein"],
      keywords: "ข้าวต้ม ปลา"
    },
    {
      id: "chicken-porridge",
      name: "โจ๊กไก่",
      emoji: "🥣",
      meal: ["breakfast"],
      price: 30,
      time: 10,
      calories: 280,
      protein: 15,
      goal: ["light", "balanced"],
      diet: ["general", "no-pork"],
      groups: ["carb", "protein"],
      keywords: "โจ๊ก ไก่"
    },
    {
      id: "chicken-noodle-soup",
      name: "ก๋วยเตี๋ยวไก่",
      emoji: "🍜",
      meal: ["lunch", "dinner"],
      price: 40,
      time: 15,
      calories: 380,
      protein: 20,
      goal: ["balanced"],
      diet: ["general", "no-pork"],
      groups: ["carb", "protein", "veggie"],
      keywords: "ก๋วยเตี๋ยว ไก่"
    },
    {
      id: "omelette-rice",
      name: "ข้าวไข่เจียว",
      emoji: "🍳",
      meal: ["breakfast", "lunch", "dinner"],
      price: 35,
      time: 10,
      calories: 450,
      protein: 14,
      goal: ["balanced", "light"],
      diet: ["general", "no-pork", "vegetarian"],
      groups: ["carb", "protein", "fat"],
      keywords: "ไข่เจียว ไข่"
    },
    {
      id: "tofu-veggie-rice",
      name: "ข้าวเต้าหู้ผัดผัก",
      emoji: "🌱",
      meal: ["lunch", "dinner"],
      price: 40,
      time: 15,
      calories: 380,
      protein: 16,
      goal: ["light", "balanced"],
      diet: ["general", "no-pork", "vegetarian"],
      groups: ["carb", "protein", "veggie"],
      keywords: "เต้าหู้ ผัก มังสวิรัติ"
    },
    {
      id: "chicken-suki",
      name: "สุกี้น้ำไก่",
      emoji: "🍲",
      meal: ["lunch", "dinner"],
      price: 45,
      time: 20,
      calories: 350,
      protein: 22,
      goal: ["light", "balanced"],
      diet: ["general", "no-pork"],
      groups: ["protein", "veggie"],
      keywords: "สุกี้ ไก่ วุ้นเส้น"
    },
    {
      id: "deboned-fish-rice",
      name: "ข้าวปลาแกะ",
      emoji: "🐠",
      meal: ["lunch", "dinner"],
      price: 50,
      time: 20,
      calories: 420,
      protein: 28,
      goal: ["protein", "balanced"],
      diet: ["general", "no-pork"],
      groups: ["carb", "protein"],
      keywords: "ปลาแกะ ปลา"
    },
    {
      id: "glass-noodle-salad-pork",
      name: "ยำวุ้นเส้นหมูสับ",
      emoji: "🌶️",
      meal: ["lunch", "dinner"],
      price: 45,
      time: 15,
      calories: 350,
      protein: 18,
      goal: ["light"],
      diet: ["general"],
      groups: ["carb", "protein", "veggie"],
      keywords: "ยำ วุ้นเส้น หมู หมูสับ"
    },
    {
      id: "veggie-curry-rice",
      name: "ข้าวแกงผัก",
      emoji: "🍛",
      meal: ["lunch", "dinner"],
      price: 35,
      time: 10,
      calories: 400,
      protein: 10,
      goal: ["balanced", "light"],
      diet: ["general", "no-pork", "vegetarian"],
      groups: ["carb", "veggie", "fat"],
      keywords: "แกง ผัก"
    },
    {
      id: "egg-sandwich",
      name: "แซนด์วิชไข่",
      emoji: "🥪",
      meal: ["breakfast"],
      price: 30,
      time: 10,
      calories: 320,
      protein: 14,
      goal: ["light", "balanced"],
      diet: ["general", "no-pork", "vegetarian"],
      groups: ["carb", "protein", "fat"],
      keywords: "แซนด์วิช ไข่ ขนมปัง"
    },
    {
      id: "fruit-yogurt",
      name: "โยเกิร์ตผลไม้",
      emoji: "🍓",
      meal: ["breakfast"],
      price: 25,
      time: 10,
      calories: 200,
      protein: 8,
      goal: ["light"],
      diet: ["general", "no-pork", "vegetarian"],
      groups: ["fruit", "protein"],
      keywords: "โยเกิร์ต ผลไม้ นม"
    },
    {
      id: "garlic-pork-rice",
      name: "ข้าวหมูทอดกระเทียม",
      emoji: "🍖",
      meal: ["lunch", "dinner"],
      price: 45,
      time: 20,
      calories: 520,
      protein: 24,
      goal: ["balanced", "protein"],
      diet: ["general"],
      groups: ["carb", "protein", "fat"],
      keywords: "หมูทอด หมู กระเทียม"
    }
  ];

  /* ------------------------------------------------------------------ */
  /* State: load / save                                                 */
  /* ------------------------------------------------------------------ */

  var state = null;

  function isValidState(obj) {
    if (!obj || typeof obj !== "object") return false;
    if (!Array.isArray(obj.logs)) return false;
    if (!Array.isArray(obj.groupsSelected)) return false;
    if (!obj.settings || typeof obj.settings !== "object") return false;
    return true;
  }

  function loadState() {
    var raw;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return defaultState();
    }
    if (!raw) return defaultState();
    try {
      var parsed = JSON.parse(raw);
      if (!isValidState(parsed)) return defaultState();
      // Fill in any missing fields defensively
      var s = defaultState();
      s.logs = Array.isArray(parsed.logs) ? parsed.logs : [];
      s.groupsSelected = Array.isArray(parsed.groupsSelected) ? parsed.groupsSelected : [];
      s.groupsDate = typeof parsed.groupsDate === "string" ? parsed.groupsDate : todayStr();
      s.settings = {
        breakfast: (parsed.settings && parsed.settings.breakfast) || DEFAULT_SETTINGS.breakfast,
        lunch: (parsed.settings && parsed.settings.lunch) || DEFAULT_SETTINGS.lunch,
        dinner: (parsed.settings && parsed.settings.dinner) || DEFAULT_SETTINGS.dinner
      };
      s.profile = {
        displayName: (parsed.profile && typeof parsed.profile.displayName === "string") ? parsed.profile.displayName : "",
        age: (parsed.profile && typeof parsed.profile.age === "number") ? parsed.profile.age : null,
        avatarUrl: (parsed.profile && typeof parsed.profile.avatarUrl === "string") ? parsed.profile.avatarUrl : null
      };
      // Reset group toggles on a new day
      if (s.groupsDate !== todayStr()) {
        s.groupsSelected = [];
        s.groupsDate = todayStr();
      }
      return s;
    } catch (e) {
      return defaultState();
    }
  }

  function saveState() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // Storage unavailable or full — fail silently, app keeps working in-memory.
    }
  }

  /* ------------------------------------------------------------------ */
  /* Date / time helpers                                                */
  /* ------------------------------------------------------------------ */

  var selectedLogDate = todayStr();
  var selectedHistoryMonth = monthKeyOf(todayStr());

  function monthKeyOf(dateStr) {
    if (!dateStr || dateStr.length < 7) return "";
    return dateStr.slice(0, 7);
  }

  function parseYmd(dateStr) {
    if (!dateStr) return new Date();
    var parts = dateStr.split("-");
    if (parts.length < 3) return new Date();
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }

  function pad2(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function formatThaiDate(date) {
    var days = ["วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์"];
    var months = [
      "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
      "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];
    var buddhistYear = date.getFullYear() + 543;
    return days[date.getDay()] + " " + date.getDate() + " " + months[date.getMonth()] + " " + buddhistYear;
  }

  function formatThaiMonthLabel(monthKey) {
    if (!monthKey || monthKey.length < 7) return "";
    var parts = monthKey.split("-");
    var y = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10);
    var months = [
      "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
      "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];
    return months[m - 1] + " " + (y + 543);
  }

  function formatShortThaiDate(dateStr) {
    var d = parseYmd(dateStr);
    var monthsShort = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    return d.getDate() + " " + monthsShort[d.getMonth()] + " " + (d.getFullYear() + 543);
  }

  function parseTimeToday(hhmm) {
    var parts = (hhmm || "00:00").split(":");
    var h = parseInt(parts[0], 10) || 0;
    var m = parseInt(parts[1], 10) || 0;
    var d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  }

  function getLogsForDate(dateStr) {
    var targetDate = dateStr || selectedLogDate || todayStr();
    return state.logs.filter(function (l) {
      return l.date === targetDate;
    });
  }

  function loggedMealsToday() {
    var logs = getTodayLogs();
    var set = {};
    logs.forEach(function (l) {
      set[l.meal] = true;
    });
    return set;
  }

  function computeNextMeal() {
    var order = ["breakfast", "lunch", "dinner"];
    var logged = loggedMealsToday();
    var now = new Date();

    for (var i = 0; i < order.length; i++) {
      var key = order[i];
      if (logged[key]) continue;
      var mealTime = parseTimeToday(state.settings[key]);
      var diffMs = mealTime.getTime() - now.getTime();
      if (diffMs > 0) {
        return {
          key: key,
          label: MEAL_LABELS[key],
          time: state.settings[key],
          overdue: false,
          minutesLeft: Math.ceil(diffMs / 60000)
        };
      } else {
        return {
          key: key,
          label: MEAL_LABELS[key],
          time: state.settings[key],
          overdue: true,
          minutesLeft: 0
        };
      }
    }

    // All three meals logged today
    return { key: null, label: "ครบทุกมื้อแล้ว", time: "", overdue: false, minutesLeft: null, done: true };
  }

  /* ------------------------------------------------------------------ */
  /* Rendering: Home page                                               */
  /* ------------------------------------------------------------------ */

  function renderHeaderDate() {
    var el = document.getElementById("header-date");
    if (el) el.textContent = formatThaiDate(new Date());
  }

  function renderNextMeal() {
    var next = computeNextMeal();
    var nameEl = document.getElementById("next-meal-name");
    var timeEl = document.getElementById("next-meal-time");
    var countdownEl = document.getElementById("next-meal-countdown");

    if (next.done) {
      nameEl.textContent = "ครบทุกมื้อแล้ววันนี้ 🎉";
      timeEl.textContent = "เก่งมาก พรุ่งนี้เจอกันใหม่";
      countdownEl.textContent = "";
      return;
    }

    nameEl.textContent = next.label;
    timeEl.textContent = "เวลา " + next.time + " น.";

    if (next.overdue) {
      countdownEl.textContent = "ถึงเวลา" + next.label + "แล้ว ลองเลือกเมนูที่เหมาะกับเวลาที่มีได้เลย";
    } else {
      countdownEl.textContent = "เหลืออีก " + next.minutesLeft + " นาที";
    }
  }

  function renderDailySummary() {
    var logs = getTodayLogs();
    var onTimeCount = logs.filter(function (l) { return l.onTime; }).length;
    var cappedOnTime = Math.min(onTimeCount, 3);
    var totalKcal = logs.reduce(function (sum, l) { return sum + (Number(l.calories) || 0); }, 0);
    var groupsCount = state.groupsSelected.length;

    document.getElementById("summary-ontime").textContent = cappedOnTime + "/3";
    document.getElementById("summary-groups").textContent = groupsCount + "/5";
    document.getElementById("summary-kcal").textContent = totalKcal + " kcal";
  }

  function renderHome() {
    renderHeaderDate();
    renderNextMeal();
    renderDailySummary();
  }

  /* ------------------------------------------------------------------ */
  /* Meal planner: filtering + scoring                                  */
  /* ------------------------------------------------------------------ */

  function validatePlannerForm(data) {
    var errors = {};

    if (!data.meal) errors.meal = "กรุณาเลือกมื้ออาหาร";
    if (!data.time) errors.time = "กรุณาเลือกเวลาที่มี";

    if (!data.budgetRaw || data.budgetRaw.trim() === "") {
      errors.budget = "กรุณากรอกงบสูงสุด";
    } else if (isNaN(Number(data.budgetRaw))) {
      errors.budget = "งบต้องเป็นตัวเลขเท่านั้น";
    } else if (Number(data.budgetRaw) <= 0) {
      errors.budget = "งบต้องมากกว่า 0";
    }

    if (!data.goal) errors.goal = "กรุณาเลือกเป้าหมาย";
    if (!data.diet) errors.diet = "กรุณาเลือกรูปแบบอาหาร";

    return errors;
  }

  function showFieldError(fieldId, errorId, message) {
    var field = document.getElementById(fieldId);
    var errorEl = document.getElementById(errorId);
    if (errorEl) errorEl.textContent = message || "";
    if (field) {
      var wrapper = field.closest(".field");
      if (wrapper) wrapper.classList.toggle("has-error", !!message);
    }
  }

  function clearPlannerErrors() {
    ["meal", "time", "budget", "goal", "diet"].forEach(function (key) {
      showFieldError("planner-" + key, "error-" + key, "");
    });
  }

  function parseExcludeKeywords(text) {
    if (!text) return [];
    return text
      .split(",")
      .map(function (t) { return t.trim(); })
      .filter(function (t) { return t.length > 0; });
  }

  function filterMenus(criteria) {
    return MENU_DB.filter(function (item) {
      if (item.meal.indexOf(criteria.meal) === -1) return false;
      if (item.time > criteria.time) return false;
      if (item.price > criteria.budget) return false;
      if (item.diet.indexOf(criteria.diet) === -1) return false;

      if (criteria.excludeKeywords.length > 0) {
        var haystack = (item.name + " " + item.keywords).toLowerCase();
        var hasExcluded = criteria.excludeKeywords.some(function (kw) {
          return haystack.indexOf(kw.toLowerCase()) !== -1;
        });
        if (hasExcluded) return false;
      }

      return true;
    });
  }

  function scoreMenu(item, criteria) {
    // Goal match — up to 40 points
    var goalScore = item.goal.indexOf(criteria.goal) !== -1 ? 40 : 12;

    // Budget closeness — up to 20 points. Using more of the available
    // budget scores higher, so the cheapest option doesn't always win.
    var budgetScore = 20 * (item.price / criteria.budget);
    budgetScore = Math.max(0, Math.min(20, budgetScore));

    // Time suitability — up to 20 points. Less waiting relative to the
    // time available scores higher.
    var timeScore = 20 * ((criteria.time - item.time) / criteria.time);
    timeScore = Math.max(0, Math.min(20, timeScore));

    // Food group coverage — up to 20 points.
    var groupsScore = 20 * (item.groups.length / 5);
    groupsScore = Math.max(0, Math.min(20, groupsScore));

    var total = goalScore + budgetScore + timeScore + groupsScore;
    return Math.round(total * 10) / 10;
  }

  function renderPlannerResults(criteria) {
    var container = document.getElementById("planner-results");
    container.innerHTML = "";

    var aiWrap = document.getElementById("ai-suggest-wrap");
    var aiNote = document.getElementById("ai-suggest-note");
    aiNote.textContent = "";
    aiWrap.hidden = true;
    lastPlannerCandidates = [];
    lastPlannerCriteria = null;

    var filtered = filterMenus(criteria);

    if (filtered.length === 0) {
      container.appendChild(buildEmptyState());
      return;
    }

    var scored = filtered.map(function (item) {
      return { item: item, score: scoreMenu(item, criteria) };
    });

    scored.sort(function (a, b) { return b.score - a.score; });

    var top3 = scored.slice(0, 3);
    top3.forEach(function (entry) {
      container.appendChild(buildMenuCard(entry.item));
    });

    lastPlannerCandidates = top3.map(function (entry) { return entry.item; });
    lastPlannerCriteria = criteria;
    if (aiFeaturesAvailable) aiWrap.hidden = false;
  }

  function buildEmptyState() {
    var wrap = document.createElement("div");
    wrap.className = "empty-state";
    wrap.innerHTML =
      '<span class="empty-state__icon" aria-hidden="true">🍽️</span>' +
      '<p class="empty-state__title">ยังไม่เจอเมนูที่ตรงทุกเงื่อนไข</p>' +
      '<p>ลองปรับตัวเลือกดูนะ ไม่เป็นไรเลย</p>' +
      '<ul class="empty-state__tips">' +
      "<li>ลองเพิ่มงบสูงสุด</li>" +
      "<li>ลองเพิ่มเวลาที่มี</li>" +
      "<li>ลองผ่อนเงื่อนไขอาหารที่ไม่ต้องการ</li>" +
      "</ul>" +
      '<button type="button" class="btn btn--primary" id="empty-state-edit">แก้ตัวเลือก</button>';

    var btn = wrap.querySelector("#empty-state-edit");
    btn.addEventListener("click", function () {
      document.getElementById("planner-meal").focus();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    return wrap;
  }

  function buildMenuCard(item) {
    var card = document.createElement("article");
    card.className = "menu-card";

    var groupNames = item.groups.map(function (g) { return GROUP_LABELS[g]; }).join(", ");

    card.innerHTML =
      '<div class="menu-card__header">' +
      '<span class="menu-card__emoji" aria-hidden="true">' + item.emoji + "</span>" +
      '<div><p class="menu-card__name">' + escapeHtml(item.name) + "</p></div>" +
      "</div>" +
      '<div class="menu-card__meta">' +
      "<span>฿" + item.price + "</span>" +
      "<span>⏱ " + item.time + " นาที</span>" +
      "<span>🔥 " + item.calories + " kcal</span>" +
      "<span>💪 โปรตีน " + item.protein + " ก.</span>" +
      "<span>🥗 " + item.groups.length + " หมู่</span>" +
      "</div>" +
      '<div class="menu-card__tags">' +
      '<span class="tag">' + GOAL_LABELS[item.goal[0]] + "</span>" +
      '<span class="tag tag--accent">' + groupNames + "</span>" +
      "</div>" +
      '<button type="button" class="btn btn--primary menu-card__save" data-menu-id="' + item.id + '">บันทึกมื้อนี้</button>';

    var saveBtn = card.querySelector(".menu-card__save");
    saveBtn.addEventListener("click", function () {
      saveMenuAsLog(item);
    });

    return card;
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function saveMenuAsLog(item) {
    var mealSelect = document.getElementById("planner-meal");
    var mealKey = mealSelect.value || item.meal[0];

    var log = {
      id: "log-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
      date: selectedLogDate || todayStr(),
      name: item.name,
      meal: mealKey,
      calories: item.calories,
      onTime: true,
      emoji: item.emoji
    };

    persistNewLog(log)
      .then(function (finalLog) {
        state.logs.push(finalLog);
        saveState();

        showToast("บันทึกมื้อนี้แล้ว");
        renderHome();
        renderLogPage();
        renderProgressPage();
      })
      .catch(function () {
        showToast("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
      });
  }

  function handlePlannerSubmit(e) {
    e.preventDefault();

    var data = {
      meal: document.getElementById("planner-meal").value,
      time: document.getElementById("planner-time").value,
      budgetRaw: document.getElementById("planner-budget").value,
      goal: document.getElementById("planner-goal").value,
      diet: document.getElementById("planner-diet").value,
      exclude: document.getElementById("planner-exclude").value
    };

    var errors = validatePlannerForm(data);
    clearPlannerErrors();

    if (Object.keys(errors).length > 0) {
      Object.keys(errors).forEach(function (key) {
        showFieldError("planner-" + key, "error-" + key, errors[key]);
      });
      var firstKey = Object.keys(errors)[0];
      var el = document.getElementById("planner-" + firstKey);
      if (el) el.focus();
      return;
    }

    var criteria = {
      meal: data.meal,
      time: Number(data.time),
      budget: Number(data.budgetRaw),
      goal: data.goal,
      diet: data.diet,
      excludeKeywords: parseExcludeKeywords(data.exclude)
    };

    renderPlannerResults(criteria);
  }

  /* ------------------------------------------------------------------ */
  /* Food log page                                                      */
  /* ------------------------------------------------------------------ */

  function validateLogForm(data) {
    var errors = {};
    if (!data.name || data.name.trim() === "") errors["log-name"] = "กรุณากรอกชื่ออาหาร";
    if (!data.meal) errors["log-meal"] = "กรุณาเลือกมื้อ";
    if (data.meal === "other" && (!data.customMeal || data.customMeal.trim() === "")) {
      errors["log-custom-meal"] = "กรุณาระบุชื่อมื้อ";
    }

    if (data.caloriesRaw === "" || data.caloriesRaw === null || typeof data.caloriesRaw === "undefined") {
      errors["log-calories"] = "กรุณากรอกพลังงานโดยประมาณ";
    } else if (isNaN(Number(data.caloriesRaw))) {
      errors["log-calories"] = "พลังงานต้องเป็นตัวเลข";
    } else if (Number(data.caloriesRaw) < 0) {
      errors["log-calories"] = "พลังงานต้องไม่ติดลบ";
    }

    return errors;
  }

  function showLogFieldError(fieldId, message) {
    var field = document.getElementById(fieldId);
    var errorEl = document.getElementById("error-" + fieldId);
    if (errorEl) errorEl.textContent = message || "";
    if (field) {
      var wrapper = field.closest(".field");
      if (wrapper) wrapper.classList.toggle("has-error", !!message);
    }
  }

  function clearLogErrors() {
    ["log-name", "log-meal", "log-custom-meal", "log-calories"].forEach(function (id) {
      showLogFieldError(id, "");
    });
  }

  function updateCustomMealFieldVisibility() {
    var meal = document.getElementById("log-meal").value;
    var field = document.getElementById("log-custom-meal-field");
    field.hidden = meal !== "other";
    if (meal !== "other") document.getElementById("log-custom-meal").value = "";
  }

  function mealEmoji(mealKey) {
    if (mealKey === "breakfast") return "🌅";
    if (mealKey === "lunch") return "🍛";
    if (mealKey === "dinner") return "🌙";
    if (mealKey === "late_night") return "🌃";
    if (mealKey === "snack") return "🍪";
    if (mealKey === "other") return "🍽️";
    return "🍽️";
  }

  // AI auto-fills the calorie field from the menu name so the user usually
  // doesn't have to look up or type a number themselves. Triggered when they
  // finish typing the name (debounced) or leave the field. Always leaves the
  // number editable afterward in case AI is unavailable or off by a lot.
  var calorieEstimateTimer = null;
  var lastCalorieEstimateName = "";

  function scheduleCalorieEstimate() {
    if (!aiFeaturesAvailable) return;
    if (calorieEstimateTimer) clearTimeout(calorieEstimateTimer);
    calorieEstimateTimer = setTimeout(estimateCaloriesForLog, 900);
  }

  function estimateCaloriesForLog() {
    var nameInput = document.getElementById("log-name");
    var caloriesInput = document.getElementById("log-calories");
    var note = document.getElementById("log-calories-ai-note");
    var name = nameInput.value.trim();

    if (!aiFeaturesAvailable || !name) {
      note.hidden = true;
      return;
    }
    if (name === lastCalorieEstimateName) return;
    lastCalorieEstimateName = name;

    note.hidden = false;
    note.classList.add("is-loading");
    note.textContent = "🤖 AI กำลังประเมินแคลอรี่และหมู่อาหารให้...";

    var meal = document.getElementById("log-meal").value;
    var groupsNote = document.getElementById("log-groups-ai-note");

    apiPost("/api/ai/estimate-calories", { name: name, meal: meal })
      .then(function (data) {
        // Only auto-fill if the name hasn't changed again while we waited.
        if (nameInput.value.trim() !== name) return;
        caloriesInput.value = data.calories;
        note.classList.remove("is-loading");
        note.textContent = "🤖 AI ประเมินไว้ที่ " + data.calories + " kcal (ปรับเองได้ถ้าไม่ตรง)";

        var groups = Array.isArray(data.groups) ? data.groups.filter(function (g) {
          return GROUP_LABELS.hasOwnProperty(g);
        }) : [];
        if (groups.length > 0) {
          applyAiDetectedGroups(groups);
          var labels = groups.map(function (g) { return GROUP_LABELS[g]; }).join(", ");
          groupsNote.hidden = false;
          groupsNote.textContent = "🤖 AI คิดว่าเป็นหมู่: " + labels + " (ติ๊กในหน้าสรุปให้อัตโนมัติแล้ว)";
        } else {
          groupsNote.hidden = true;
        }
      })
      .catch(function (err) {
        note.classList.remove("is-loading");
        note.textContent = err.message || "AI ประเมินแคลไม่สำเร็จ กรอกเองได้เลย";
        groupsNote.hidden = true;
      });
  }

  // Merges AI-guessed food groups into today's group toggles (additive —
  // never un-checks a group the user already marked), and persists them
  // the same way a manual toggle would.
  function applyAiDetectedGroups(groups) {
    var changed = false;
    groups.forEach(function (g) {
      if (state.groupsSelected.indexOf(g) === -1) {
        state.groupsSelected.push(g);
        changed = true;
      }
    });
    if (!changed) return;
    state.groupsDate = todayStr();
    saveState();
    renderGroupToggles();
    renderHome();
    upsertGroupsRemote(state.groupsSelected);
  }

  function handleLogSubmit(e) {
    e.preventDefault();

    var data = {
      name: document.getElementById("log-name").value,
      meal: document.getElementById("log-meal").value,
      customMeal: document.getElementById("log-custom-meal").value,
      caloriesRaw: document.getElementById("log-calories").value,
      onTime: document.getElementById("log-ontime").checked
    };

    var errors = validateLogForm(data);
    clearLogErrors();

    if (Object.keys(errors).length > 0) {
      Object.keys(errors).forEach(function (id) {
        showLogFieldError(id, errors[id]);
      });
      var firstId = Object.keys(errors)[0];
      document.getElementById(firstId).focus();
      return;
    }

    var log = {
      id: "log-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
      date: selectedLogDate || todayStr(),
      name: data.name.trim(),
      meal: data.meal,
      customMealLabel: data.meal === "other" ? data.customMeal.trim() : null,
      calories: Number(data.caloriesRaw),
      onTime: data.onTime,
      emoji: mealEmoji(data.meal)
    };

    persistNewLog(log)
      .then(function (finalLog) {
        state.logs.push(finalLog);
        saveState();

        document.getElementById("log-form").reset();
        document.getElementById("log-calories-ai-note").hidden = true;
        document.getElementById("log-groups-ai-note").hidden = true;
        updateCustomMealFieldVisibility();
        lastCalorieEstimateName = "";
        showToast("บันทึกอาหารแล้ว");

        renderHome();
        renderLogPage();
        renderProgressPage();
      })
      .catch(function () {
        showToast("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
      });
  }

  function renderLogPage() {
    var datePicker = document.getElementById("log-date-picker");
    if (datePicker && datePicker.value !== selectedLogDate) {
      datePicker.value = selectedLogDate;
    }

    var isToday = (selectedLogDate === todayStr());
    var headingEl = document.getElementById("log-list-heading");
    var submitBtn = document.getElementById("log-submit-btn");

    if (headingEl) {
      headingEl.textContent = isToday ? "รายการอาหารวันนี้" : "รายการประจำวันที่ " + formatShortThaiDate(selectedLogDate);
    }
    if (submitBtn) {
      submitBtn.textContent = isToday ? "บันทึกอาหาร" : "บันทึกอาหารย้อนหลัง (วันที่ " + formatShortThaiDate(selectedLogDate) + ")";
    }

    var list = document.getElementById("log-list");
    var emptyHint = document.getElementById("log-empty");
    var logs = getLogsForDate(selectedLogDate).slice().reverse();

    var totalKcal = logs.reduce(function (sum, l) { return sum + (Number(l.calories) || 0); }, 0);
    var summaryBadge = document.getElementById("log-list-summary-badge");
    if (summaryBadge) {
      summaryBadge.textContent = totalKcal.toLocaleString() + " kcal (" + logs.length + " มื้อ)";
    }

    list.innerHTML = "";

    if (logs.length === 0) {
      emptyHint.hidden = false;
      emptyHint.textContent = isToday
        ? "ยังไม่มีรายการอาหารวันนี้ เริ่มบันทึกมื้อแรกได้เลย"
        : "ไม่มีรายการอาหารบันทึกไว้ในวันที่ " + formatShortThaiDate(selectedLogDate);
      return;
    }
    emptyHint.hidden = true;

    logs.forEach(function (log) {
      var li = document.createElement("li");
      li.className = "log-item";

      var statusClass = log.onTime ? "log-item__status--ontime" : "log-item__status--late";
      var statusText = log.onTime ? "ตรงเวลา" : "ไม่ตรงเวลา";

      li.innerHTML =
        '<span class="log-item__emoji" aria-hidden="true">' + (log.emoji || "🍽️") + "</span>" +
        '<div class="log-item__info">' +
        '<p class="log-item__name">' + escapeHtml(log.name) + "</p>" +
        '<p class="log-item__meta">' +
        "<span>" + escapeHtml(mealDisplayLabel(log)) + "</span>" +
        "<span>" + log.calories + " kcal</span>" +
        '<span class="log-item__status ' + statusClass + '">' + statusText + "</span>" +
        "</p>" +
        "</div>" +
        '<div class="log-item__actions">' +
        '<button type="button" class="log-item__share" aria-label="แชร์รายการ ' + escapeHtml(log.name) + '" data-log-id="' + log.id + '">📤</button>' +
        '<button type="button" class="log-item__delete" aria-label="ลบรายการ ' + escapeHtml(log.name) + '" data-log-id="' + log.id + '">🗑️</button>' +
        "</div>";

      var deleteBtn = li.querySelector(".log-item__delete");
      deleteBtn.addEventListener("click", function () {
        confirmDialog("ต้องการลบรายการนี้หรือไม่?", function () {
          deleteLog(log.id);
        });
      });

      var shareBtn = li.querySelector(".log-item__share");
      shareBtn.addEventListener("click", function () {
        shareMealLog(log);
      });

      list.appendChild(li);
    });
  }

  function deleteLog(logId) {
    state.logs = state.logs.filter(function (l) { return l.id !== logId; });
    saveState();
    renderLogPage();
    renderHome();
    renderProgressPage();
    showToast("ลบรายการแล้ว");
    deleteLogRemote(logId);
  }

  /* ------------------------------------------------------------------ */
  /* Share a logged meal as a branded image card                        */
  /* ------------------------------------------------------------------ */

  function drawRoundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function generateMealShareImage(log) {
    var W = 1080, H = 1080;
    var canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    var ctx = canvas.getContext("2d");

    // Background
    ctx.fillStyle = "#faf8f3";
    ctx.fillRect(0, 0, W, H);

    // Decorative header band
    var grad = ctx.createLinearGradient(0, 0, W, 320);
    grad.addColorStop(0, "#2e7d52");
    grad.addColorStop(1, "#1f5c3a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, 320);

    // Brand mark
    ctx.fillStyle = "#ffffff";
    ctx.font = "600 40px Tahoma, 'Segoe UI', sans-serif";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("🍚 MealMate", 64, 110);
    ctx.font = "400 28px Tahoma, 'Segoe UI', sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText("มื้อดีมีเวลา", 64, 155);

    ctx.font = "700 30px Tahoma, 'Segoe UI', sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "right";
    ctx.fillText("ภูมิใจกับมื้อนี้ 💚", W - 64, 130);
    ctx.textAlign = "left";

    // Main card
    var cardX = 64, cardY = 380, cardW = W - 128, cardH = 560;
    ctx.fillStyle = "#ffffff";
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 32);
    ctx.fill();

    // Emoji badge
    ctx.fillStyle = "#e6f4ec";
    ctx.beginPath();
    ctx.arc(cardX + 140, cardY + 140, 90, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = "84px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(log.emoji || "🍽️", cardX + 140, cardY + 148);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    // Meal name
    ctx.fillStyle = "#22301f";
    ctx.font = "700 56px Tahoma, 'Segoe UI', sans-serif";
    wrapCanvasText(ctx, log.name, cardX + 260, cardY + 120, cardW - 320, 60);

    // Meal label pill
    ctx.font = "600 28px Tahoma, 'Segoe UI', sans-serif";
    ctx.fillStyle = "#5b6a56";
    ctx.fillText(mealDisplayLabel(log), cardX + 260, cardY + 200);

    // Stats row
    var statsY = cardY + 320;
    drawStatBlock(ctx, cardX + 60, statsY, String(log.calories), "kcal โดยประมาณ");
    drawStatBlock(ctx, cardX + 60 + cardW / 3, statsY, log.onTime ? "ตรงเวลา ✓" : "ไม่ตรงเวลา", "สถานะมื้อนี้");
    drawStatBlock(ctx, cardX + 60 + (cardW / 3) * 2, statsY, todayStr().split("-").reverse().join("/"), "วันที่บันทึก");

    // Footer
    ctx.font = "400 26px Tahoma, 'Segoe UI', sans-serif";
    ctx.fillStyle = "#8b9587";
    ctx.textAlign = "center";
    ctx.fillText("บันทึกและวางแผนมื้ออาหารได้ที่ MealMate", W / 2, H - 60);
    ctx.textAlign = "left";

    return new Promise(function (resolve) {
      canvas.toBlob(function (blob) { resolve(blob); }, "image/png");
    });
  }

  function drawStatBlock(ctx, x, y, value, label) {
    ctx.textAlign = "left";
    ctx.font = "700 40px Tahoma, 'Segoe UI', sans-serif";
    ctx.fillStyle = "#2e7d52";
    ctx.fillText(value, x, y);
    ctx.font = "400 22px Tahoma, 'Segoe UI', sans-serif";
    ctx.fillStyle = "#8b9587";
    ctx.fillText(label, x, y + 34);
  }

  // Minimal word-wrap for canvas text (canvas has no built-in wrapping).
  function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
    var words = String(text).split(" ");
    var line = "";
    var lines = [];
    words.forEach(function (word) {
      var test = line ? line + " " + word : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    });
    if (line) lines.push(line);
    lines = lines.slice(0, 2);
    lines.forEach(function (l, i) {
      ctx.fillText(l, x, y + i * lineHeight);
    });
  }

  function shareMealLog(log) {
    showToast("กำลังสร้างรูปสำหรับแชร์...");
    generateMealShareImage(log)
      .then(function (blob) {
        if (!blob) {
          showToast("สร้างรูปไม่สำเร็จ ลองใหม่อีกครั้ง");
          return;
        }
        var fileName = "mealmate-" + log.id + ".png";
        var file = new File([blob], fileName, { type: "image/png" });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({
            files: [file],
            title: "MealMate",
            text: "ภูมิใจกับมื้อนี้: " + log.name + " 🍽️ #MealMate"
          }).catch(function () {
            // User cancelled the share sheet — not an error.
          });
        } else {
          var url = URL.createObjectURL(blob);
          var a = document.createElement("a");
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(function () { URL.revokeObjectURL(url); }, 3000);
          showToast("บันทึกรูปแล้ว พร้อมแชร์ได้เลย");
        }
      })
      .catch(function () {
        showToast("สร้างรูปไม่สำเร็จ ลองใหม่อีกครั้ง");
      });
  }

  /* ------------------------------------------------------------------ */
  /* Progress & settings page                                           */
  /* ------------------------------------------------------------------ */

  function renderProgressPage() {
    var logs = getTodayLogs();
    var total = logs.length;
    var onTime = logs.filter(function (l) { return l.onTime; }).length;
    var percent = total > 0 ? Math.round((onTime / total) * 100) : 0;

    document.getElementById("progress-meal-count").textContent = total + " มื้อ";
    document.getElementById("progress-ontime").textContent = onTime + "/" + total;
    document.getElementById("progress-percent").textContent = percent + "%";

    renderGroupToggles();
    renderSettingsForm();
    renderMonthlySummary();
  }

  /* ------------------------------------------------------------------ */
  /* Monthly History & Summary Dashboard                                */
  /* ------------------------------------------------------------------ */

  function getAvailableMonths() {
    var monthsSet = {};
    monthsSet[monthKeyOf(todayStr())] = true;
    state.logs.forEach(function (l) {
      if (l.date) {
        monthsSet[monthKeyOf(l.date)] = true;
      }
    });
    var months = Object.keys(monthsSet);
    months.sort(function (a, b) { return b.localeCompare(a); });
    return months;
  }

  function renderMonthlySummary() {
    var monthSelect = document.getElementById("history-month-select");
    if (!monthSelect) return;

    var availableMonths = getAvailableMonths();
    if (availableMonths.indexOf(selectedHistoryMonth) === -1) {
      selectedHistoryMonth = availableMonths[0] || monthKeyOf(todayStr());
    }

    monthSelect.innerHTML = "";
    availableMonths.forEach(function (mKey) {
      var opt = document.createElement("option");
      opt.value = mKey;
      opt.textContent = formatThaiMonthLabel(mKey);
      if (mKey === selectedHistoryMonth) opt.selected = true;
      monthSelect.appendChild(opt);
    });

    var monthLogs = state.logs.filter(function (l) {
      return l.date && l.date.indexOf(selectedHistoryMonth) === 0;
    });

    var activeDaysSet = {};
    monthLogs.forEach(function (l) { activeDaysSet[l.date] = true; });
    var activeDaysCount = Object.keys(activeDaysSet).length;

    var totalKcal = monthLogs.reduce(function (sum, l) { return sum + (Number(l.calories) || 0); }, 0);
    var avgKcal = activeDaysCount > 0 ? Math.round(totalKcal / activeDaysCount) : 0;
    var totalMeals = monthLogs.length;
    var onTimeCount = monthLogs.filter(function (l) { return l.onTime; }).length;
    var onTimePercent = totalMeals > 0 ? Math.round((onTimeCount / totalMeals) * 100) : 0;

    var daysEl = document.getElementById("monthly-stat-days");
    var kcalEl = document.getElementById("monthly-stat-kcal");
    var avgEl = document.getElementById("monthly-stat-avg");
    var onTimeEl = document.getElementById("monthly-stat-ontime");

    if (daysEl) daysEl.textContent = activeDaysCount + " วัน";
    if (kcalEl) kcalEl.textContent = totalKcal.toLocaleString() + " kcal";
    if (avgEl) avgEl.textContent = avgKcal.toLocaleString() + " kcal";
    if (onTimeEl) onTimeEl.textContent = onTimePercent + "% (" + onTimeCount + "/" + totalMeals + " มื้อ)";

    renderMonthlyChart(selectedHistoryMonth, monthLogs);
    renderMonthlyDaysList(selectedHistoryMonth, monthLogs);
  }

  function renderMonthlyChart(monthKey, monthLogs) {
    var container = document.getElementById("monthly-chart-container");
    if (!container) return;
    container.innerHTML = "";

    var parts = monthKey.split("-");
    var year = parseInt(parts[0], 10);
    var month = parseInt(parts[1], 10);
    var daysInMonth = new Date(year, month, 0).getDate();

    var dailyKcal = {};
    monthLogs.forEach(function (l) {
      var d = parseInt(l.date.split("-")[2], 10);
      dailyKcal[d] = (dailyKcal[d] || 0) + (Number(l.calories) || 0);
    });

    var maxDailyKcal = 0;
    for (var d = 1; d <= daysInMonth; d++) {
      if ((dailyKcal[d] || 0) > maxDailyKcal) maxDailyKcal = dailyKcal[d];
    }

    if (maxDailyKcal === 0) {
      container.innerHTML = '<p class="monthly-chart-empty">ยังไม่มีข้อมูลบันทึกในเดือนนี้</p>';
      return;
    }

    for (var dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      var dayStr = monthKey + "-" + pad2(dayNum);
      var kcal = dailyKcal[dayNum] || 0;
      var heightPct = maxDailyKcal > 0 ? Math.max(8, Math.round((kcal / maxDailyKcal) * 100)) : 0;

      var barItem = document.createElement("div");
      barItem.className = "chart-bar-item";
      if (dayStr === selectedLogDate) barItem.classList.add("is-selected");
      barItem.setAttribute("title", "วันที่ " + dayNum + ": " + (kcal > 0 ? kcal + " kcal" : "ไม่ได้บันทึก"));

      var valSpan = document.createElement("span");
      valSpan.className = "chart-bar-val";
      valSpan.textContent = kcal > 0 ? kcal : "";

      var track = document.createElement("div");
      track.className = "chart-bar-track";

      var fill = document.createElement("div");
      fill.className = "chart-bar-fill";
      fill.style.height = (kcal > 0 ? heightPct : 0) + "%";
      track.appendChild(fill);

      var dateSpan = document.createElement("span");
      dateSpan.className = "chart-bar-date";
      dateSpan.textContent = String(dayNum);

      barItem.appendChild(valSpan);
      barItem.appendChild(track);
      barItem.appendChild(dateSpan);

      (function (targetDate) {
        barItem.addEventListener("click", function () {
          selectedLogDate = targetDate;
          navigateTo("log");
        });
      })(dayStr);

      container.appendChild(barItem);
    }
  }

  function renderMonthlyDaysList(monthKey, monthLogs) {
    var container = document.getElementById("monthly-days-list");
    if (!container) return;
    container.innerHTML = "";

    var daysGrouped = {};
    monthLogs.forEach(function (l) {
      if (!daysGrouped[l.date]) daysGrouped[l.date] = [];
      daysGrouped[l.date].push(l);
    });

    var sortedDates = Object.keys(daysGrouped).sort(function (a, b) { return b.localeCompare(a); });

    if (sortedDates.length === 0) {
      container.innerHTML = '<p class="empty-hint">ยังไม่มีประวัติการบันทึกอาหารในเดือนนี้</p>';
      return;
    }

    sortedDates.forEach(function (dateStr) {
      var dayLogs = daysGrouped[dateStr];
      var totalKcal = dayLogs.reduce(function (sum, l) { return sum + (Number(l.calories) || 0); }, 0);
      var thaiDate = formatThaiDate(parseYmd(dateStr));

      var card = document.createElement("div");
      card.className = "day-history-card";

      var header = document.createElement("div");
      header.className = "day-history-header";
      header.setAttribute("tabindex", "0");
      header.setAttribute("role", "button");
      header.setAttribute("aria-expanded", "false");

      header.innerHTML =
        '<div class="day-history-date">' +
        '<span>' + thaiDate + '</span>' +
        '<span class="day-history-date-badge">' + dayLogs.length + ' มื้อ</span>' +
        '</div>' +
        '<div class="day-history-summary">' +
        '<span class="day-history-kcal">' + totalKcal.toLocaleString() + ' kcal</span>' +
        '<span class="day-history-toggle-icon">▼</span>' +
        '</div>';

      var body = document.createElement("div");
      body.className = "day-history-body";
      body.hidden = true;

      var ul = document.createElement("ul");
      ul.className = "day-history-meal-list";

      dayLogs.forEach(function (log) {
        var li = document.createElement("li");
        li.className = "day-history-meal-item";
        var onTimeSymbol = log.onTime ? '<span style="color:#16a34a; font-weight:bold;">✓ ตรงเวลา</span>' : '<span style="color:#c0392b; font-weight:bold;">✕ ไม่ตรงเวลา</span>';
        li.innerHTML =
          '<div class="day-history-meal-info">' +
          '<span>' + (log.emoji || '🍽️') + '</span>' +
          '<span class="day-history-meal-name">' + escapeHtml(log.name) + '</span>' +
          '<span class="day-history-meal-tag">' + escapeHtml(mealDisplayLabel(log)) + '</span>' +
          '</div>' +
          '<div style="display:flex; align-items:center; gap:8px;">' +
          '<span class="day-history-meal-kcal">' + log.calories + ' kcal</span>' +
          '<span style="font-size:0.8rem;">' + onTimeSymbol + '</span>' +
          '</div>';
        ul.appendChild(li);
      });

      var actions = document.createElement("div");
      actions.className = "day-history-actions";
      var viewBtn = document.createElement("button");
      viewBtn.type = "button";
      viewBtn.className = "btn btn--ghost btn--small";
      viewBtn.textContent = "ดู / แก้ไขในหน้าบันทึก ➔";
      viewBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        selectedLogDate = dateStr;
        navigateTo("log");
      });
      actions.appendChild(viewBtn);

      body.appendChild(ul);
      body.appendChild(actions);

      header.addEventListener("click", function () {
        var isOpen = !body.hidden;
        body.hidden = isOpen;
        card.classList.toggle("is-open", !isOpen);
        header.setAttribute("aria-expanded", !isOpen ? "true" : "false");
      });

      card.appendChild(header);
      card.appendChild(body);
      container.appendChild(card);
    });
  }

  function renderGroupToggles() {
    var buttons = document.querySelectorAll(".group-toggle");
    buttons.forEach(function (btn) {
      var group = btn.getAttribute("data-group");
      var selected = state.groupsSelected.indexOf(group) !== -1;
      btn.classList.toggle("is-selected", selected);
      btn.setAttribute("aria-pressed", selected ? "true" : "false");
    });
  }

  function toggleGroup(group) {
    var idx = state.groupsSelected.indexOf(group);
    if (idx === -1) {
      state.groupsSelected.push(group);
    } else {
      state.groupsSelected.splice(idx, 1);
    }
    state.groupsDate = todayStr();
    saveState();
    renderGroupToggles();
    renderHome();
    upsertGroupsRemote(state.groupsSelected);
  }

  function renderSettingsForm() {
    document.getElementById("setting-breakfast").value = state.settings.breakfast;
    document.getElementById("setting-lunch").value = state.settings.lunch;
    document.getElementById("setting-dinner").value = state.settings.dinner;
  }

  function handleProfileSubmit(e) {
    e.preventDefault();
    var nameInput = document.getElementById("profile-name");
    var ageInput = document.getElementById("profile-age");
    var ageErr = document.getElementById("error-profile-age");
    ageErr.textContent = "";

    var displayName = nameInput.value.trim().slice(0, 60);
    var ageRaw = ageInput.value.trim();
    var age = null;
    if (ageRaw !== "") {
      var parsedAge = parseInt(ageRaw, 10);
      if (isNaN(parsedAge) || parsedAge <= 0 || parsedAge >= 130) {
        ageErr.textContent = "กรุณาใส่อายุที่ถูกต้อง (1-129 ปี)";
        return;
      }
      age = parsedAge;
    }

    state.profile = { displayName: displayName, age: age, avatarUrl: state.profile.avatarUrl || null };
    saveState();
    upsertProfileRemote(state.profile);
    updateAccountButton();

    var savedMsg = document.getElementById("profile-saved");
    savedMsg.textContent = "บันทึกโปรไฟล์แล้ว";
    setTimeout(function () { savedMsg.textContent = ""; }, 3000);
  }

  function handleSettingsSubmit(e) {
    e.preventDefault();
    var breakfast = document.getElementById("setting-breakfast").value || DEFAULT_SETTINGS.breakfast;
    var lunch = document.getElementById("setting-lunch").value || DEFAULT_SETTINGS.lunch;
    var dinner = document.getElementById("setting-dinner").value || DEFAULT_SETTINGS.dinner;

    state.settings = { breakfast: breakfast, lunch: lunch, dinner: dinner };
    saveState();
    upsertSettingsRemote(state.settings);

    var savedMsg = document.getElementById("settings-saved");
    savedMsg.textContent = "บันทึกเวลามื้ออาหารแล้ว";
    setTimeout(function () { savedMsg.textContent = ""; }, 3000);

    renderHome();
  }

  function handleClearData() {
    confirmDialog(
      "ข้อมูลอาหารและการตั้งค่าทั้งหมดในอุปกรณ์จะถูกลบ คุณต้องการดำเนินการต่อหรือไม่?",
      function () {
        try {
          window.localStorage.removeItem(STORAGE_KEY);
        } catch (e) {
          // ignore
        }
        state = defaultState();
        saveState();
        renderAll();
        showToast("ล้างข้อมูลทั้งหมดแล้ว");
      }
    );
  }

  /* ------------------------------------------------------------------ */
  /* Toast + confirm dialog                                             */
  /* ------------------------------------------------------------------ */

  var toastTimer = null;

  function showToast(message) {
    var toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("is-visible");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove("is-visible");
    }, 2400);
  }

  var confirmCallback = null;

  function confirmDialog(message, onConfirm) {
    var overlay = document.getElementById("confirm-dialog");
    var title = document.getElementById("confirm-dialog-title");
    title.textContent = message;
    confirmCallback = onConfirm;
    overlay.hidden = false;
    document.getElementById("confirm-dialog-ok").focus();
  }

  function closeConfirmDialog() {
    var overlay = document.getElementById("confirm-dialog");
    overlay.hidden = true;
    confirmCallback = null;
  }

  /* ------------------------------------------------------------------ */
  /* Navigation (SPA)                                                   */
  /* ------------------------------------------------------------------ */

  function navigateTo(pageKey) {
    var pages = document.querySelectorAll(".page");
    pages.forEach(function (page) {
      page.hidden = page.getAttribute("data-page") !== pageKey;
    });

    var navItems = document.querySelectorAll(".bottom-nav__item");
    navItems.forEach(function (item) {
      var isActive = item.getAttribute("data-nav") === pageKey;
      item.classList.toggle("is-active", isActive);
      if (isActive) {
        item.setAttribute("aria-current", "page");
      } else {
        item.removeAttribute("aria-current");
      }
    });

    if (pageKey === "home") renderHome();
    if (pageKey === "log") renderLogPage();
    if (pageKey === "progress") renderProgressPage();

    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }

  function renderAll() {
    renderHome();
    renderLogPage();
    renderProgressPage();
  }

  /* ------------------------------------------------------------------ */
  /* PWA: service worker registration                                   */
  /* ------------------------------------------------------------------ */

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    if (window.location.protocol === "file:") return; // SW unsupported on file://
    try {
      navigator.serviceWorker.register("./service-worker.js").catch(function () {
        // Registration failed — app still works without offline caching.
      });
    } catch (e) {
      // Never let PWA setup crash the app.
    }
  }

  /* ------------------------------------------------------------------ */
  /* AI features (optional — degrade gracefully with no backend)        */
  /* ------------------------------------------------------------------ */

  var aiFeaturesAvailable = false;
  var lastPlannerCandidates = [];
  var lastPlannerCriteria = null;
  var chatHistory = [];
  var chatOpen = false;

  function apiPost(path, body) {
    return fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {})
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) {
          var err = new Error((data && data.error) || "AI request failed");
          throw err;
        }
        return data;
      });
    });
  }

  function checkAiAvailability() {
    fetch("/api/health", { headers: { Accept: "application/json" } })
      .then(function (res) {
        if (!res.ok) throw new Error("health check failed");
        return res.json();
      })
      .then(function (data) {
        aiFeaturesAvailable = !!(data && data.ok && data.aiConfigured);
        if (aiFeaturesAvailable) {
          document.getElementById("chat-fab").hidden = false;
          document.getElementById("ai-encourage-wrap").hidden = false;
        }
      })
      .catch(function () {
        // No backend reachable (e.g. running as a plain static site) —
        // the app keeps working exactly like the static version.
        aiFeaturesAvailable = false;
      });
  }

  function handleAiSuggestClick() {
    var btn = document.getElementById("ai-suggest-btn");
    var note = document.getElementById("ai-suggest-note");

    if (lastPlannerCandidates.length === 0 || !lastPlannerCriteria) return;

    btn.disabled = true;
    note.classList.add("is-loading");
    note.textContent = "AI กำลังช่วยอธิบาย...";

    apiPost("/api/ai/suggest", {
      criteria: lastPlannerCriteria,
      candidates: lastPlannerCandidates
    })
      .then(function (data) {
        note.classList.remove("is-loading");
        note.textContent = (data && data.message) || "ขออภัย AI ไม่ได้ตอบข้อความมา";
      })
      .catch(function (err) {
        note.classList.remove("is-loading");
        note.textContent = err.message || "เชื่อมต่อ AI ไม่สำเร็จ ลองใหม่อีกครั้งนะ";
      })
      .finally(function () {
        btn.disabled = false;
      });
  }

  function handleAiEncourageClick() {
    var btn = document.getElementById("ai-encourage-btn");
    var note = document.getElementById("ai-encourage-note");
    var logs = getTodayLogs();
    var onTimeCount = logs.filter(function (l) { return l.onTime; }).length;
    var kcal = logs.reduce(function (sum, l) { return sum + (Number(l.calories) || 0); }, 0);

    btn.disabled = true;
    note.classList.add("is-loading");
    note.textContent = "กำลังคิดคำให้กำลังใจ...";

    apiPost("/api/ai/encourage", {
      stats: {
        totalLogs: logs.length,
        onTimeCount: onTimeCount,
        kcal: kcal,
        groupsCount: state.groupsSelected.length
      }
    })
      .then(function (data) {
        note.classList.remove("is-loading");
        note.textContent = (data && data.message) || "";
      })
      .catch(function (err) {
        note.classList.remove("is-loading");
        note.textContent = err.message || "เชื่อมต่อ AI ไม่สำเร็จตอนนี้";
      })
      .finally(function () {
        btn.disabled = false;
      });
  }

  function appendChatMessage(role, text) {
    var list = document.getElementById("chat-messages");
    var bubble = document.createElement("p");
    bubble.className = "chat-msg chat-msg--" + role;
    bubble.textContent = text;
    list.appendChild(bubble);
    list.scrollTop = list.scrollHeight;
    return bubble;
  }

  // "กำลังพิมพ์..." indicator so the user knows AI is still working, not stuck.
  var chatTypingBubble = null;

  function showChatTyping() {
    if (chatTypingBubble) return;
    var list = document.getElementById("chat-messages");
    var bubble = document.createElement("p");
    bubble.className = "chat-msg chat-msg--assistant chat-msg--typing";
    bubble.setAttribute("aria-label", "AI กำลังพิมพ์คำตอบ");
    bubble.innerHTML =
      '<span class="chat-typing-dots"><span></span><span></span><span></span></span>';
    list.appendChild(bubble);
    list.scrollTop = list.scrollHeight;
    chatTypingBubble = bubble;
  }

  function hideChatTyping() {
    if (chatTypingBubble && chatTypingBubble.parentNode) {
      chatTypingBubble.parentNode.removeChild(chatTypingBubble);
    }
    chatTypingBubble = null;
  }

  function openChat() {
    chatOpen = true;
    document.getElementById("chat-panel").hidden = false;
    document.getElementById("chat-fab").setAttribute("aria-expanded", "true");
    document.getElementById("chat-input").focus();
  }

  function closeChat() {
    chatOpen = false;
    document.getElementById("chat-panel").hidden = true;
    document.getElementById("chat-fab").setAttribute("aria-expanded", "false");
  }

  function handleChatSubmit(e) {
    e.preventDefault();
    var input = document.getElementById("chat-input");
    var text = input.value.trim();
    if (!text) return;

    appendChatMessage("user", text);
    input.value = "";
    input.disabled = true;
    document.getElementById("chat-send").disabled = true;
    showChatTyping();

    var historyForRequest = chatHistory.slice();

    apiPost("/api/ai/chat", { message: text, history: historyForRequest })
      .then(function (data) {
        var reply = (data && data.message) || "ขออภัย AI ไม่ได้ตอบข้อความมา";
        hideChatTyping();
        appendChatMessage("assistant", reply);
        chatHistory.push({ role: "user", content: text });
        chatHistory.push({ role: "assistant", content: reply });
      })
      .catch(function (err) {
        hideChatTyping();
        appendChatMessage("error", err.message || "เชื่อมต่อ AI ไม่สำเร็จ ลองใหม่อีกครั้งนะ");
      })
      .finally(function () {
        input.disabled = false;
        document.getElementById("chat-send").disabled = false;
        input.focus();
      });
  }

  function initAiFeatures() {
    checkAiAvailability();

    document.getElementById("ai-suggest-btn").addEventListener("click", handleAiSuggestClick);
    document.getElementById("ai-encourage-btn").addEventListener("click", handleAiEncourageClick);

    // Auto-estimate calories: fire while the user pauses typing the name,
    // and immediately when they leave the field or pick a meal.
    var logNameInput = document.getElementById("log-name");
    logNameInput.addEventListener("input", scheduleCalorieEstimate);
    logNameInput.addEventListener("blur", function () {
      if (calorieEstimateTimer) clearTimeout(calorieEstimateTimer);
      estimateCaloriesForLog();
    });
    document.getElementById("log-meal").addEventListener("change", function () {
      updateCustomMealFieldVisibility();
      // Meal changed — re-estimate even if the name itself didn't change.
      lastCalorieEstimateName = "";
      estimateCaloriesForLog();
    });

    document.getElementById("chat-fab").addEventListener("click", function () {
      if (chatOpen) closeChat(); else openChat();
    });
    document.getElementById("chat-panel-close").addEventListener("click", closeChat);
    document.getElementById("chat-form").addEventListener("submit", handleChatSubmit);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && chatOpen) closeChat();
    });
  }

  /* ------------------------------------------------------------------ */
  /* Accounts (optional — Supabase auth + database)                     */
  /* Guest mode (signed out, or Supabase not configured) keeps working  */
  /* exactly as before: everything lives in localStorage on this device.*/
  /* Signed in: the same actions also read/write Supabase, so data      */
  /* follows the account across devices. Local state stays the source   */
  /* of truth for rendering either way — Supabase just feeds it.        */
  /* ------------------------------------------------------------------ */

  var supabaseClient = null;
  var currentUser = null;
  var authMode = "signin";

  function isSupabaseConfigured() {
    return (
      SUPABASE_URL.indexOf("PLACEHOLDER") === -1 &&
      SUPABASE_ANON_KEY.indexOf("PLACEHOLDER") === -1
    );
  }

  function initSupabaseClient() {
    if (!isSupabaseConfigured()) return;
    if (typeof window.supabase === "undefined" || !window.supabase.createClient) {
      console.warn("[supabase] SDK failed to load — account features disabled, guest mode only.");
      return;
    }
    try {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (e) {
      console.warn("[supabase] failed to initialize client", e);
      supabaseClient = null;
      return;
    }

    document.getElementById("account-btn").hidden = false;
    supabaseClient.auth.onAuthStateChange(handleAuthStateChange);
  }

  function handleAuthStateChange(event, session) {
    if (session && session.user) {
      currentUser = session.user;
      updateAccountButton();
      loadRemoteDataForToday()
        .then(function () {
          renderAll();
          updateAccountButton();
          if (event === "SIGNED_IN") {
            closeAuthDialog();
            showToast("เข้าสู่ระบบสำเร็จ");
          }
        })
        .catch(function () {
          showToast("เข้าสู่ระบบสำเร็จ แต่ดึงข้อมูลไม่สำเร็จ ลองรีเฟรชหน้าเว็บ");
        });
    } else {
      currentUser = null;
      updateAccountButton();
      if (event === "SIGNED_OUT") {
        state = loadState();
        renderAll();
        showToast("ออกจากระบบแล้ว");
      }
    }
  }

  function updateAccountButton() {
    var btn = document.getElementById("account-btn");
    var label = document.getElementById("account-btn-label");
    var avatar = document.getElementById("account-btn-avatar");
    if (currentUser) {
      var displayName = state.profile && state.profile.displayName;
      label.textContent = displayName || currentUser.email || "บัญชีของฉัน";
      btn.classList.add("is-signed-in");
      var avatarUrl = state.profile && state.profile.avatarUrl;
      if (avatarUrl) {
        avatar.src = avatarUrl;
        avatar.hidden = false;
      } else {
        avatar.hidden = true;
      }
    } else {
      label.textContent = "เข้าสู่ระบบ";
      btn.classList.remove("is-signed-in");
      avatar.hidden = true;
    }
  }

  function handleAccountBtnClick() {
    if (currentUser) {
      openProfileDialog();
    } else {
      openAuthDialog();
    }
  }

  function openProfileDialog() {
    renderProfileDialog();
    document.getElementById("profile-dialog").hidden = false;
  }

  function closeProfileDialog() {
    document.getElementById("profile-dialog").hidden = true;
    document.getElementById("profile-saved").textContent = "";
    document.getElementById("profile-avatar-status").textContent = "";
  }

  function renderProfileDialog() {
    document.getElementById("profile-name").value = state.profile.displayName || "";
    document.getElementById("profile-age").value =
      typeof state.profile.age === "number" ? String(state.profile.age) : "";

    var preview = document.getElementById("profile-avatar-preview");
    var empty = document.getElementById("profile-avatar-empty");
    if (state.profile.avatarUrl) {
      preview.src = state.profile.avatarUrl;
      preview.hidden = false;
      empty.hidden = true;
    } else {
      preview.hidden = true;
      empty.hidden = false;
    }
  }

  function handleAvatarInputChange(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var status = document.getElementById("profile-avatar-status");

    if (!currentUser || !supabaseClient) {
      status.textContent = "ต้องเข้าสู่ระบบก่อนถึงจะอัปโหลดรูปได้";
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      status.textContent = "ไฟล์ใหญ่เกินไป (ไม่เกิน 3MB)";
      return;
    }

    status.textContent = "กำลังอัปโหลดรูป...";

    var ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    var path = currentUser.id + "/avatar." + ext;

    supabaseClient.storage
      .from("avatars")
      .upload(path, file, { upsert: true, cacheControl: "3600" })
      .then(function (res) {
        if (res.error) throw res.error;
        var pub = supabaseClient.storage.from("avatars").getPublicUrl(path);
        // Bust cache so the new photo shows immediately, not a stale cached one.
        var url = pub.data.publicUrl + "?t=" + Date.now();
        state.profile.avatarUrl = url;
        saveState();
        upsertProfileRemote(state.profile);
        updateAccountButton();
        renderProfileDialog();
        status.textContent = "อัปโหลดรูปโปรไฟล์แล้ว";
      })
      .catch(function (err) {
        status.textContent = (err && err.message) || "อัปโหลดรูปไม่สำเร็จ ลองใหม่อีกครั้ง";
      });
  }

  function openAuthDialog() {
    document.getElementById("auth-error").textContent = "";
    document.getElementById("auth-dialog").hidden = false;
    document.getElementById("auth-email").focus();
  }

  function closeAuthDialog() {
    document.getElementById("auth-dialog").hidden = true;
    document.getElementById("auth-form").reset();
    document.getElementById("auth-error").textContent = "";
  }

  function setAuthMode(mode) {
    authMode = mode;
    var signinTab = document.getElementById("auth-tab-signin");
    var signupTab = document.getElementById("auth-tab-signup");
    var submitBtn = document.getElementById("auth-submit-btn");

    signinTab.classList.toggle("is-active", mode === "signin");
    signinTab.setAttribute("aria-selected", mode === "signin" ? "true" : "false");
    signupTab.classList.toggle("is-active", mode === "signup");
    signupTab.setAttribute("aria-selected", mode === "signup" ? "true" : "false");
    submitBtn.textContent = mode === "signin" ? "เข้าสู่ระบบ" : "สมัครสมาชิก";
    document.getElementById("auth-error").textContent = "";
  }

  function handleAuthSubmit(e) {
    e.preventDefault();
    var email = document.getElementById("auth-email").value.trim();
    var password = document.getElementById("auth-password").value;
    var errorEl = document.getElementById("auth-error");
    var submitBtn = document.getElementById("auth-submit-btn");

    errorEl.textContent = "";
    if (!email || !password) {
      errorEl.textContent = "กรุณากรอกอีเมลและรหัสผ่าน";
      return;
    }
    if (password.length < 6) {
      errorEl.textContent = "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร";
      return;
    }

    submitBtn.disabled = true;

    var action =
      authMode === "signin"
        ? supabaseClient.auth.signInWithPassword({ email: email, password: password })
        : supabaseClient.auth.signUp({ email: email, password: password });

    action
      .then(function (result) {
        if (result.error) {
          errorEl.textContent = translateAuthError(result.error.message);
          return;
        }
        if (authMode === "signup" && result.data && !result.data.session) {
          errorEl.textContent = "";
          closeAuthDialog();
          showToast("สมัครสำเร็จ! กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ");
        }
        // On sign-in (or signup with an immediate session), onAuthStateChange
        // handles the rest.
      })
      .catch(function () {
        errorEl.textContent = "เชื่อมต่อไม่สำเร็จ ลองใหม่อีกครั้ง";
      })
      .finally(function () {
        submitBtn.disabled = false;
      });
  }

  function translateAuthError(message) {
    if (!message) return "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง";
    if (message.indexOf("Invalid login credentials") !== -1) return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
    if (message.indexOf("already registered") !== -1) return "อีเมลนี้สมัครไว้แล้ว ลองเข้าสู่ระบบแทน";
    if (message.indexOf("Password should be") !== -1) return "รหัสผ่านสั้นเกินไป";
    return message;
  }

  function handleGoogleSignIn() {
    if (!supabaseClient) return;
    supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin }
    });
  }

  function mapRemoteLog(row) {
    return {
      id: row.id,
      date: row.log_date,
      name: row.name,
      meal: row.meal,
      customMealLabel: row.custom_meal_label || null,
      calories: row.calories,
      onTime: row.on_time,
      emoji: row.emoji
    };
  }

  function loadRemoteDataForToday() {
    if (!currentUser || !supabaseClient) return Promise.resolve();
    var today = todayStr();

    var logsQuery = supabaseClient
      .from("meal_logs")
      .select("*")
      .order("log_date", { ascending: true });

    var settingsQuery = supabaseClient
      .from("user_settings")
      .select("*")
      .eq("user_id", currentUser.id)
      .maybeSingle();

    var groupsQuery = supabaseClient
      .from("daily_groups")
      .select("*")
      .eq("user_id", currentUser.id)
      .eq("log_date", today)
      .maybeSingle();

    return Promise.all([logsQuery, settingsQuery, groupsQuery]).then(function (results) {
      var logsRes = results[0];
      var settingsRes = results[1];
      var groupsRes = results[2];

      if (logsRes.error) throw logsRes.error;

      state.logs = (logsRes.data || []).map(mapRemoteLog);

      if (!settingsRes.error && settingsRes.data) {
        state.settings = {
          breakfast: settingsRes.data.breakfast_time,
          lunch: settingsRes.data.lunch_time,
          dinner: settingsRes.data.dinner_time
        };
        state.profile = {
          displayName: settingsRes.data.display_name || "",
          age: typeof settingsRes.data.age === "number" ? settingsRes.data.age : null,
          avatarUrl: settingsRes.data.avatar_url || null
        };
      } else {
        // First time this account logs in — seed the row from current defaults.
        upsertSettingsRemote(state.settings);
        if (state.profile && (state.profile.displayName || state.profile.age)) {
          upsertProfileRemote(state.profile);
        }
      }

      if (!groupsRes.error && groupsRes.data) {
        state.groupsSelected = groupsRes.data.groups || [];
      } else {
        state.groupsSelected = [];
      }
      state.groupsDate = today;

      saveState();
    });
  }

  function initDateNavigator() {
    var picker = document.getElementById("log-date-picker");
    var prevBtn = document.getElementById("log-date-prev");
    var nextBtn = document.getElementById("log-date-next");
    var todayBtn = document.getElementById("log-date-today-btn");

    if (picker) {
      picker.value = selectedLogDate;
      picker.addEventListener("change", function (e) {
        if (e.target.value) {
          selectedLogDate = e.target.value;
          renderLogPage();
        }
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        var d = parseYmd(selectedLogDate);
        d.setDate(d.getDate() - 1);
        selectedLogDate = d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
        renderLogPage();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        var d = parseYmd(selectedLogDate);
        d.setDate(d.getDate() + 1);
        selectedLogDate = d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
        renderLogPage();
      });
    }

    if (todayBtn) {
      todayBtn.addEventListener("click", function () {
        selectedLogDate = todayStr();
        renderLogPage();
      });
    }

    var monthSelect = document.getElementById("history-month-select");
    if (monthSelect) {
      monthSelect.addEventListener("change", function (e) {
        selectedHistoryMonth = e.target.value;
        renderMonthlySummary();
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Init                                                                */
  /* ------------------------------------------------------------------ */

  function init() {
    state = loadState();
    saveState();

    initDateNavigator();

    // Navigation
    document.querySelectorAll("[data-nav]").forEach(function (el) {
      el.addEventListener("click", function () {
        navigateTo(el.getAttribute("data-nav"));
      });
    });

    // Forms
    document.getElementById("planner-form").addEventListener("submit", handlePlannerSubmit);
    document.getElementById("log-form").addEventListener("submit", handleLogSubmit);
    document.getElementById("settings-form").addEventListener("submit", handleSettingsSubmit);
    document.getElementById("profile-form").addEventListener("submit", handleProfileSubmit);
    document.getElementById("clear-data-btn").addEventListener("click", handleClearData);

    // Group toggles
    document.querySelectorAll(".group-toggle").forEach(function (btn) {
      btn.addEventListener("click", function () {
        toggleGroup(btn.getAttribute("data-group"));
      });
    });

    // Confirm dialog
    document.getElementById("confirm-dialog-cancel").addEventListener("click", closeConfirmDialog);
    document.getElementById("confirm-dialog-ok").addEventListener("click", function () {
      var cb = confirmCallback;
      closeConfirmDialog();
      if (cb) cb();
    });
    document.getElementById("confirm-dialog").addEventListener("click", function (e) {
      if (e.target === document.getElementById("confirm-dialog")) closeConfirmDialog();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !document.getElementById("confirm-dialog").hidden) {
        closeConfirmDialog();
      }
    });

    renderAll();
    navigateTo("home");

    // Refresh next-meal countdown every 30 seconds
    setInterval(function () {
      var homePage = document.getElementById("page-home");
      if (!homePage.hidden) renderHome();
    }, 30000);

    registerServiceWorker();
    initAiFeatures();
    initAccountFeatures();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
