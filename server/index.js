/* ==========================================================================
   MealMate – backend
   Serves the static frontend and proxies AI requests to KKU IntelSphere.
   No user accounts, no personal-data database: meal logs stay in the
   browser's localStorage exactly as in the static version. This server's
   only job is to keep the AI API key off the client and add three AI
   features on top of the existing rule-based planner.
   ========================================================================== */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const ai = require("./aiService");

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "..", "public");

app.disable("x-powered-by");
app.use(cors());
app.use(express.json({ limit: "32kb" }));

// Static frontend (index.html, styles.css, app.js, manifest, service worker, assets)
app.use(
  express.static(PUBLIC_DIR, {
    setHeaders: function (res, filePath) {
      if (filePath.endsWith("service-worker.js")) {
        res.setHeader("Cache-Control", "no-cache");
      }
    }
  })
);

// ------------------------------------------------------------------
// AI routes — rate limited since they call a shared free API key.
// ------------------------------------------------------------------

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "ขอ AI บ่อยเกินไป กรุณาลองใหม่อีกสักครู่" }
});

app.use("/api/ai", aiLimiter);

app.get("/api/health", function (req, res) {
  res.json({
    ok: true,
    aiConfigured: ai.isConfigured(),
    model: ai.MODEL
  });
});

const SYSTEM_PROMPT =
  "คุณคือผู้ช่วยของแอป MealMate ซึ่งช่วยนักศึกษาไทยเลือกมื้ออาหารให้เหมาะกับเวลาและงบประมาณ " +
  "ตอบเป็นภาษาไทย น้ำเสียงเป็นมิตร ให้กำลังใจ ไม่กล่าวโทษผู้ใช้ ไม่ตัดสิน " +
  "ห้ามวินิจฉัยโรค ห้ามให้คำแนะนำทางการแพทย์เฉพาะบุคคล และห้ามอ้างว่าเป็นผู้เชี่ยวชาญด้านโภชนาการ " +
  "หากถูกถามเรื่องสุขภาพเชิงลึก ให้แนะนำให้ปรึกษาผู้เชี่ยวชาญ ตอบให้กระชับ ไม่เกิน 4-5 ประโยค";

function friendlyAiError(res, err) {
  if (err && err.code === "AI_NOT_CONFIGURED") {
    return res.status(503).json({
      error: "ยังไม่ได้ตั้งค่า AI บนเซิร์ฟเวอร์นี้ (ไม่มี KKU_API_KEY) ฟีเจอร์นี้จึงใช้งานไม่ได้ชั่วคราว"
    });
  }
  if (err && (err.name === "AbortError" || err.code === "ETIMEDOUT")) {
    return res.status(504).json({ error: "AI ตอบช้าเกินไป ลองใหม่อีกครั้งนะ" });
  }
  console.error("[AI error]", err && err.message ? err.message : err);
  return res.status(502).json({ error: "เชื่อมต่อ AI ไม่สำเร็จตอนนี้ ลองใหม่อีกครั้งได้เลย" });
}

// 1) AI-written explanation for the planner's top picks.
//    The client sends the *already filtered and scored* candidates — this
//    endpoint never re-decides which menus qualify, it only explains them.
app.post("/api/ai/suggest", async function (req, res) {
  try {
    var criteria = (req.body && req.body.criteria) || {};
    var candidates = Array.isArray(req.body && req.body.candidates) ? req.body.candidates.slice(0, 3) : [];

    if (candidates.length === 0) {
      return res.status(400).json({ error: "ไม่มีเมนูให้ AI ช่วยอธิบาย" });
    }

    var menuLines = candidates
      .map(function (m, i) {
        return (
          (i + 1) +
          ". " +
          (m.name || "") +
          " — ฿" +
          (m.price || "?") +
          ", รอ " +
          (m.time || "?") +
          " นาที, " +
          (m.calories || "?") +
          " kcal, โปรตีน " +
          (m.protein || "?") +
          " ก."
        );
      })
      .join("\n");

    var userPrompt =
      "ผู้ใช้ต้องการมื้อ " +
      (criteria.meal || "-") +
      " มีเวลา " +
      (criteria.time || "-") +
      " นาที งบไม่เกิน " +
      (criteria.budget || "-") +
      " บาท เป้าหมาย " +
      (criteria.goal || "-") +
      " รูปแบบอาหาร " +
      (criteria.diet || "-") +
      "\n\nระบบเลือกเมนูแนะนำ 3 อันดับมาให้แล้วดังนี้:\n" +
      menuLines +
      "\n\nช่วยเขียนคำอธิบายสั้น ๆ เป็นมิตร บอกว่าทำไมเมนูเหล่านี้ถึงเหมาะกับสถานการณ์ของผู้ใช้ " +
      "(ไม่ต้องเสนอเมนูอื่นเพิ่ม ใช้เฉพาะเมนูที่ให้มา) ความยาวไม่เกิน 3 ประโยค";

    var text = await ai.chatCompletion([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt }
    ]);

    res.json({ message: text });
  } catch (err) {
    friendlyAiError(res, err);
  }
});

// 2) Free-form chat assistant about food / nutrition / the app itself.
app.post("/api/ai/chat", async function (req, res) {
  try {
    var userMessage = (req.body && req.body.message ? String(req.body.message) : "").trim();
    var history = Array.isArray(req.body && req.body.history) ? req.body.history : [];

    if (!userMessage) {
      return res.status(400).json({ error: "กรุณาพิมพ์ข้อความก่อนส่ง" });
    }
    if (userMessage.length > 1000) {
      return res.status(400).json({ error: "ข้อความยาวเกินไป กรุณาพิมพ์ให้สั้นลง" });
    }

    var trimmedHistory = history.slice(-6).filter(function (m) {
      return m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string";
    });

    var messages = [{ role: "system", content: SYSTEM_PROMPT }]
      .concat(trimmedHistory)
      .concat([{ role: "user", content: userMessage }]);

    var text = await ai.chatCompletion(messages);
    res.json({ message: text });
  } catch (err) {
    friendlyAiError(res, err);
  }
});

// 3) Short encouraging note based on today's logged stats.
app.post("/api/ai/encourage", async function (req, res) {
  try {
    var stats = (req.body && req.body.stats) || {};
    var userPrompt =
      "สถิติวันนี้ของผู้ใช้: มื้อที่บันทึกแล้ว " +
      (stats.totalLogs || 0) +
      " มื้อ, ตรงเวลา " +
      (stats.onTimeCount || 0) +
      " มื้อ, พลังงานรวม " +
      (stats.kcal || 0) +
      " kcal, อาหารครบ " +
      (stats.groupsCount || 0) +
      "/5 หมู่. เขียนข้อความให้กำลังใจสั้น ๆ 1 ประโยค เป็นภาษาไทย เป็นมิตร ไม่กล่าวโทษ ไม่ว่าสถิติจะเป็นอย่างไร";

    var text = await ai.chatCompletion(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ],
      { temperature: 0.8, timeoutMs: 12000 }
    );

    res.json({ message: text });
  } catch (err) {
    friendlyAiError(res, err);
  }
});

// SPA fallback for any non-API GET route (keeps deep-linking harmless; the
// frontend itself is a single index.html with in-page navigation).
app.get(/^\/(?!api\/).*/, function (req, res) {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.use(function (req, res) {
  res.status(404).json({ error: "Not found" });
});

app.use(function (err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error("[Unhandled error]", err);
  res.status(500).json({ error: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" });
});

app.listen(PORT, function () {
  console.log("MealMate server listening on port " + PORT);
  console.log("AI configured: " + ai.isConfigured());
});
