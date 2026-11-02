#!/bin/sh
set -e

echo "Checking database connection and applying migrations..."
# migration ล้มเหลวต้องหยุดทันที (set -e) ห้ามเปิดแอปบนโครงสร้างฐานข้อมูลที่ไม่ตรงกับโค้ด
prisma migrate deploy

echo "Starting DM Remission application on port 3000..."
exec node server.js
