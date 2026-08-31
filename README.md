# MealMate – มื้อดีมีเวลา (Full-stack + AI edition)

เวอร์ชันนี้ต่อยอดจาก MealMate เวอร์ชัน static เดิม โดยเพิ่ม **backend (Node.js/Express) + Docker + การเชื่อมต่อ AI ผ่าน KKU IntelSphere** (บริการ AI ฟรีของมหาวิทยาลัยขอนแก่น ที่มี API แบบเข้ากันได้กับ OpenAI)

หลักการสำคัญ: **ตรรกะหลักของแอป (กรอง/ให้คะแนนเมนู, บันทึกอาหาร, ตั้งเวลา, localStorage) ยังทำงานได้ 100% แม้ไม่มี backend เลย** — ฟีเจอร์ AI ทั้งหมดเป็นส่วนเสริมที่ตรวจสอบก่อนว่ามี backend อยู่หรือไม่ ถ้าไม่มีหรือเชื่อมต่อไม่ได้ ปุ่ม/แชท AI จะซ่อนไปเฉย ๆ แอปยังใช้งานได้ปกติ ไม่มีทาง crash

## โครงสร้างโปรเจกต์

```
mealmate-fullstack/
├── public/                 ส่วนหน้าเว็บ (frontend) — เหมือนเวอร์ชัน static เดิม + UI ของ AI
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   ├── manifest.json
│   ├── service-worker.js
│   └── assets/
├── server/                 backend (Express)
│   ├── index.js             เสิร์ฟไฟล์หน้าเว็บ + API เส้นทาง /api/ai/*
│   ├── aiService.js         wrapper เรียก KKU IntelSphere (OpenAI-compatible)
│   └── package.json
├── Dockerfile
├── docker-compose.yml
├── .env.example             ตัวอย่างตัวแปรแวดล้อม (copy เป็น .env แล้วใส่ค่าจริง)
└── README.md
```

## ฟีเจอร์ AI ที่เพิ่มเข้ามา

1. **AI ช่วยอธิบายเมนู** (หน้าแนะนำเมนู) — หลังระบบกรอง+ให้คะแนนเลือก Top 3 เมนูแบบเดิมแล้ว มีปุ่มให้ AI ช่วยเขียนคำอธิบายสั้น ๆ ว่าทำไมเมนูเหล่านี้เหมาะกับเงื่อนไขที่เลือก (AI **ไม่ได้เลือกเมนูเอง** แค่ช่วยอธิบายผลลัพธ์ที่ตรรกะเดิมกรองมาแล้ว)
2. **แชทผู้ช่วย AI** — ปุ่มลอยมุมขวาล่าง เปิดหน้าต่างแชทถามตอบเรื่องอาหาร/โภชนาการทั่วไป
3. **AI ให้กำลังใจ** (หน้าแรก) — ปุ่มขอข้อความให้กำลังใจสั้น ๆ จาก AI โดยอิงจากสถิติการกินวันนี้

ทั้งสามฟีเจอร์เรียกผ่าน backend ของแอปเอง (`/api/ai/suggest`, `/api/ai/chat`, `/api/ai/encourage`) ไม่มีการฝัง API key ไว้ฝั่ง frontend เด็ดขาด

## ตั้งค่าก่อนใช้งาน

1. คัดลอกไฟล์ตัวอย่าง:
   ```bash
   cp .env.example .env
   ```
2. แก้ไข `.env` ใส่ค่าจริงจาก KKU IntelSphere:
   ```
   KKU_API_KEY=sk-...
   KKU_BASE_URL=https://gen.ai.kku.ac.th/api/v1
   KKU_MODEL=gemini-2.5-flash-lite
   ```
   **ห้าม commit ไฟล์ `.env` ขึ้น GitHub เด็ดขาด** (มีอยู่ใน `.gitignore` ให้แล้ว)

## วิธีรันด้วย Docker (แนะนำ)

```bash
docker compose up --build
```

จากนั้นเปิด `http://localhost:3000`

## วิธีรันแบบไม่ใช้ Docker (สำหรับพัฒนา/debug)

```bash
cd server
npm install
npm start
```

เปิด `http://localhost:3000`

## วิธี Deploy ขึ้น Render.com (ฟรี ใช้ได้จากทุกที่)

1. Push โปรเจกต์นี้ขึ้น GitHub repository
2. ที่ [render.com](https://render.com) → New → Web Service → เชื่อมกับ GitHub repo นี้
3. เลือก **Environment: Docker** (Render จะ build จาก `Dockerfile` ให้อัตโนมัติ)
4. ตั้งค่า Environment Variables ในหน้า Render:
   - `KKU_API_KEY` = key จริงของคุณ
   - `KKU_BASE_URL` = `https://gen.ai.kku.ac.th/api/v1`
   - `KKU_MODEL` = `gemini-2.5-flash-lite`
5. กด Deploy — Render จะให้ URL สาธารณะ (เช่น `https://mealmate-xxxx.onrender.com`) ที่ทุกคนเข้าใช้งานได้ฟรี โดยไม่ต้องพึ่งเครื่องคอมเครื่องใดเครื่องหนึ่ง

> หมายเหตุ: Render free tier จะ "หลับ" เมื่อไม่มีคนใช้งานสักพัก แล้วปลุกตัวเองใหม่ตอนมีคนเข้า (ใช้เวลาโหลดหน้าแรกนานขึ้นนิดหน่อย) ซึ่งเป็นเรื่องปกติของแผนฟรี

## ความปลอดภัยของ API key

- Key อยู่ใน environment variable ฝั่ง server เท่านั้น ไม่เคยถูกส่งไปยัง browser ของผู้ใช้
- มี rate limit (15 ครั้ง/นาที ต่อ IP) ป้องกันการเรียกถี่เกินไปจน key โดนจำกัดการใช้งาน
- ทุก endpoint AI มี timeout และดักข้อผิดพลาดไว้ ไม่มีทางทำให้ทั้งแอป crash แม้ AI จะเชื่อมต่อไม่ได้ชั่วคราว

## ข้อจำกัดและ Disclaimer

ข้อมูลพลังงานและโภชนาการในแอป รวมถึงข้อความที่ AI ช่วยเขียน เป็นค่าประมาณเพื่อการศึกษาเท่านั้น ไม่ใช่การวินิจฉัยหรือคำแนะนำทางการแพทย์ และไม่ควรใช้แทนคำแนะนำจากผู้เชี่ยวชาญด้านสุขภาพ AI ถูกกำกับ system prompt ให้หลีกเลี่ยงการวินิจฉัย/ให้คำแนะนำทางการแพทย์เฉพาะบุคคลเสมอ

## เวอร์ชัน static เดิม

หากต้องการเวอร์ชันไม่มี backend (รันเป็นไฟล์ static ล้วน ๆ ได้บน GitHub Pages/Netlify ตามเกณฑ์การส่งงานเดิม) ยังมีอยู่แยกต่างหากในโปรเจกต์ `mealmate/` (ไม่มีโฟลเดอร์ `server/`, ไม่ต้องใช้ Docker หรือ API key ใด ๆ)
