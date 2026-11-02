# DM Remission

ระบบติดตามผู้ป่วยเบาหวานในโปรแกรม Remission สำหรับเจ้าหน้าที่โรงพยาบาล รายละเอียดผลิตภัณฑ์และข้อจำกัดอยู่ใน [PRODUCT.md](PRODUCT.md)

- **ข้อมูลผู้ป่วย:** PostgreSQL ของโรงพยาบาล เข้าถึงผ่าน Prisma
- **การยืนยันตัวตน:** Supabase Auth (เก็บเฉพาะบัญชีผู้ใช้ ไม่เก็บข้อมูลผู้ป่วย)
- **แอป:** Next.js, TypeScript, Tailwind CSS

> ยังไม่พร้อมใช้กับผู้ป่วยจริง จนกว่าแพทย์จะกำหนดเกณฑ์น้ำตาลครบ (ดู "ยังไม่ตัดสินใจ" ใน PRODUCT.md)

## พัฒนาบนเครื่องตัวเอง

ต้องมี Node.js 20 ขึ้นไป และ Docker

1. สร้าง `.env` และ `.env.local` ตามรูปแบบใน `.env.example`
2. ติดตั้งและเตรียมฐานข้อมูล

   ```bash
   npm ci
   npx prisma migrate deploy
   npm run dev
   ```

3. เปิด http://localhost:3000

| คำสั่ง | ใช้ทำอะไร |
|---|---|
| `npm run dev` | รันโหมดพัฒนา |
| `npm run build` | ตรวจ production build |
| `npm test` | รัน unit test |
| `npm run lint` | ตรวจรูปแบบโค้ด |

`/api/dev/seed` สร้างข้อมูลผู้ป่วยสมมติได้เฉพาะโหมดพัฒนา (วิธีใช้อยู่ต้นไฟล์ `src/app/api/dev/seed/route.ts`)

## ติดตั้งบนเครื่องแม่ข่ายของโรงพยาบาล

### 1. ตั้งค่า

```bash
cp .env.production.example .env.production
```

แก้ค่าใน `.env.production` และตั้ง `POSTGRES_PASSWORD` เป็นรหัสผ่านที่สุ่มขึ้นใหม่ เช่นจาก `openssl rand -hex 32` (ค่าแบบ hex ไม่มีอักขระพิเศษ จึงใส่ใน URL เชื่อมต่อได้เลย)

### 2. เปิดระบบ

ทุกคำสั่ง `docker compose` ต้องมี `--env-file .env.production` ถ้าไม่ใส่ คำสั่งจะหยุดพร้อมแจ้งว่าไม่ได้ตั้งรหัสผ่าน

```bash
docker compose --env-file .env.production up -d --build
```

ตอนเริ่มทำงาน แอปจะรัน migration ก่อนเสมอ ถ้า migration ล้มเหลว container จะหยุดและไม่เปิดแอป ให้ดูสาเหตุด้วย `docker compose --env-file .env.production logs app`

### 3. สร้าง Admin คนแรกและเกณฑ์ชุดเริ่มต้น

1. สร้างผู้ใช้ใน Supabase Dashboard ที่ Authentication > Users แล้วคัดลอก User UID
2. เพิ่มโปรไฟล์ในฐานข้อมูล

   ```bash
   docker compose --env-file .env.production exec postgres psql -U postgres -d dm_remission -c \
     "INSERT INTO profiles (id, \"fullName\", email, role, \"updatedAt\") VALUES ('USER_UID', 'ชื่อ นามสกุล', 'admin@example.com', 'ADMIN', now());"
   ```

3. สร้างเกณฑ์ชุดเริ่มต้น

   ```bash
   docker compose --env-file .env.production exec -T postgres psql -U postgres -d dm_remission < prisma/sql/002_initial_rule_set.sql
   ```

ถ้าตั้ง `POSTGRES_USER` หรือ `POSTGRES_DB` เป็นค่าอื่น ให้แทน `postgres` และ `dm_remission` ในคำสั่งด้วย

### 4. เปิดใช้ HTTPS

`docker-compose.yml` เปิดแอปเป็น HTTP ที่พอร์ต 3000 ก่อนใช้งานจริงต้องวาง reverse proxy ที่ทำ TLS ไว้ด้านหน้า ตั้ง HSTS ที่ proxy และให้ proxy เขียนทับ `X-Forwarded-For` เพราะระบบ Login ใช้ค่านี้นับการกรอกรหัสผ่านผิด

## เปลี่ยนรหัสผ่านฐานข้อมูลที่ใช้อยู่

`POSTGRES_PASSWORD` มีผลเฉพาะตอนสร้าง volume ครั้งแรก การแก้ไฟล์อย่างเดียวจึงไม่เปลี่ยนรหัสผ่านจริง และแอปจะเชื่อมต่อไม่ได้ ต้องเปลี่ยนตามลำดับนี้

```bash
docker compose --env-file .env.production exec postgres psql -U postgres -d dm_remission -c "ALTER USER postgres PASSWORD 'รหัสผ่านใหม่';"
# แก้ POSTGRES_PASSWORD ใน .env.production ให้ตรงกับรหัสผ่านใหม่ แล้วสั่ง
docker compose --env-file .env.production up -d
```

## สำรองและกู้คืนข้อมูล

ไฟล์สำรองมีข้อมูลสุขภาพของผู้ป่วย ต้องเก็บในที่ที่จำกัดสิทธิ์และอยู่นอกเครื่องแม่ข่ายนี้ ห้ามเก็บใน Git

**สำรอง** (ควรตั้งเวลาให้รันทุกวัน)

```bash
docker compose --env-file .env.production exec -T postgres pg_dump -U postgres -d dm_remission -Fc > dm_remission_$(date +%Y%m%d_%H%M).dump
```

**กู้คืน** (ซ้อมกับฐานข้อมูลทดสอบเป็นประจำ ก่อนกู้คืนจริงให้หยุดแอปด้วย `docker compose --env-file .env.production stop app`)

```bash
docker compose --env-file .env.production exec -T postgres pg_restore -U postgres -d dm_remission --clean --if-exists < ไฟล์สำรอง.dump
```

`--clean` จะลบข้อมูลปัจจุบันในตารางที่กู้คืน ให้ตรวจชื่อฐานข้อมูลก่อนสั่งทุกครั้ง
