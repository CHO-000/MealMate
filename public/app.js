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

  var MEAL_LABELS = {
    breakfast: "มื้อเช้า",
    lunch: "มื้อกลางวัน",
    dinner: "มื้อเย็น"
  };

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

  function parseTimeToday(hhmm) {
    var parts = (hhmm || "00:00").split(":");
    var h = parseInt(parts[0], 10) || 0;
    var m = parseInt(parts[1], 10) || 0;
    var d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  }

  /* ------------------------------------------------------------------ */
  /* Next meal computation                                              */
  /* ------------------------------------------------------------------ */

  function getTodayLogs() {
    var today = todayStr();
    return state.logs.filter(function (l) {
      return l.date === today;
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
      date: todayStr(),
      name: item.name,
      meal: mealKey,
      calories: item.calories,
      onTime: true,
      emoji: item.emoji
    };

    state.logs.push(log);
    saveState();

    showToast("บันทึกมื้อนี้แล้ว");
    renderHome();
    renderLogPage();
    renderProgressPage();
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
    ["log-name", "log-meal", "log-calories"].forEach(function (id) {
      showLogFieldError(id, "");
    });
  }

  function mealEmoji(mealKey) {
    if (mealKey === "breakfast") return "🌅";
    if (mealKey === "lunch") return "🍛";
    if (mealKey === "dinner") return "🌙";
    return "🍽️";
  }

  function handleLogSubmit(e) {
    e.preventDefault();

    var data = {
      name: document.getElementById("log-name").value,
      meal: document.getElementById("log-meal").value,
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
      date: todayStr(),
      name: data.name.trim(),
      meal: data.meal,
      calories: Number(data.caloriesRaw),
      onTime: data.onTime,
      emoji: mealEmoji(data.meal)
    };

    state.logs.push(log);
    saveState();

    document.getElementById("log-form").reset();
    showToast("บันทึกอาหารแล้ว");

    renderHome();
    renderLogPage();
    renderProgressPage();
  }

  function renderLogPage() {
    var list = document.getElementById("log-list");
    var emptyHint = document.getElementById("log-empty");
    var logs = getTodayLogs().slice().reverse();

    list.innerHTML = "";

    if (logs.length === 0) {
      emptyHint.hidden = false;
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
        "<span>" + MEAL_LABELS[log.meal] + "</span>" +
        "<span>" + log.calories + " kcal</span>" +
        '<span class="log-item__status ' + statusClass + '">' + statusText + "</span>" +
        "</p>" +
        "</div>" +
        '<button type="button" class="log-item__delete" aria-label="ลบรายการ ' + escapeHtml(log.name) + '" data-log-id="' + log.id + '">🗑️</button>';

      var deleteBtn = li.querySelector(".log-item__delete");
      deleteBtn.addEventListener("click", function () {
        confirmDialog("ต้องการลบรายการนี้หรือไม่?", function () {
          deleteLog(log.id);
        });
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
  }

  function renderSettingsForm() {
    document.getElementById("setting-breakfast").value = state.settings.breakfast;
    document.getElementById("setting-lunch").value = state.settings.lunch;
    document.getElementById("setting-dinner").value = state.settings.dinner;
  }

  function handleSettingsSubmit(e) {
    e.preventDefault();
    var breakfast = document.getElementById("setting-breakfast").value || DEFAULT_SETTINGS.breakfast;
    var lunch = document.getElementById("setting-lunch").value || DEFAULT_SETTINGS.lunch;
    var dinner = document.getElementById("setting-dinner").value || DEFAULT_SETTINGS.dinner;

    state.settings = { breakfast: breakfast, lunch: lunch, dinner: dinner };
    saveState();

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

    var historyForRequest = chatHistory.slice();

    apiPost("/api/ai/chat", { message: text, history: historyForRequest })
      .then(function (data) {
        var reply = (data && data.message) || "ขออภัย AI ไม่ได้ตอบข้อความมา";
        appendChatMessage("assistant", reply);
        chatHistory.push({ role: "user", content: text });
        chatHistory.push({ role: "assistant", content: reply });
      })
      .catch(function (err) {
        appendChatMessage("error", err.message || "เชื่อมต่อ AI ไม่สำเร็จ ลองใหม่อีกครั้งนะ");
      })
      .finally(function () {
        input.disabled = false;
        input.focus();
      });
  }

  function initAiFeatures() {
    checkAiAvailability();

    document.getElementById("ai-suggest-btn").addEventListener("click", handleAiSuggestClick);
    document.getElementById("ai-encourage-btn").addEventListener("click", handleAiEncourageClick);

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
  /* Init                                                                */
  /* ------------------------------------------------------------------ */

  function init() {
    state = loadState();
    saveState();

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
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
