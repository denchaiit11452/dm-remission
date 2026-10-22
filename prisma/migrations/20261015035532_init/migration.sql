-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'DOCTOR', 'STAFF');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "DiabetesType" AS ENUM ('TYPE1', 'TYPE2', 'OTHER', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ProgramStatus" AS ENUM ('IN_PROGRAM', 'REMISSION', 'LOST_REMISSION', 'DISCHARGED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('WELL_CONTROLLED', 'UNCONTROLLED', 'WATCH', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "GlucosePeriod" AS ENUM ('BEFORE_BREAKFAST', 'AFTER_BREAKFAST', 'BEFORE_DINNER', 'AFTER_DINNER');

-- CreateEnum
CREATE TYPE "MeterFlag" AS ENUM ('NONE', 'METER_LOW', 'METER_HIGH');

-- CreateEnum
CREATE TYPE "DataSource" AS ENUM ('MANUAL', 'CSV');

-- CreateEnum
CREATE TYPE "AssessmentSource" AS ENUM ('AUTO', 'OVERRIDE');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('CRITICAL_GLUCOSE_LOW', 'CRITICAL_GLUCOSE_HIGH', 'CRITICAL_BP', 'HIGH_RISK', 'LOST_REMISSION', 'MISSED_FOLLOWUP');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('NEW', 'ACKNOWLEDGED', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LocationMethod" AS ENUM ('MAP_PIN', 'DEVICE_GPS', 'GEOCODE');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'VOID', 'IMPORT_CSV', 'RISK_OVERRIDE', 'RULE_CHANGE', 'VIEW_LOCATION', 'OPEN_NAVIGATION', 'EXPORT');

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "phone" TEXT,
    "receiveSms" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastActiveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" UUID NOT NULL,
    "hn" TEXT NOT NULL,
    "nationalId" TEXT,
    "prefix" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "gender" "Gender",
    "birthDate" DATE,
    "phone" TEXT,
    "address" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "diabetesType" "DiabetesType" NOT NULL DEFAULT 'UNKNOWN',
    "diagnosedAt" DATE,
    "programStartDate" DATE,
    "programStatus" "ProgramStatus" NOT NULL DEFAULT 'IN_PROGRAM',
    "remissionStartedAt" DATE,
    "notes" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_locations" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "method" "LocationMethod" NOT NULL,
    "addressNote" TEXT,
    "consentGivenAt" TIMESTAMP(3) NOT NULL,
    "consentRecordedById" UUID NOT NULL,
    "updatedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medication_periods" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "drugName" TEXT NOT NULL,
    "isDiabetesDrug" BOOLEAN NOT NULL DEFAULT true,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medication_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "glucose_readings" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "measuredDate" DATE NOT NULL,
    "measuredTime" VARCHAR(5),
    "period" "GlucosePeriod" NOT NULL,
    "valueMgDl" INTEGER,
    "meterFlag" "MeterFlag" NOT NULL DEFAULT 'NONE',
    "note" TEXT,
    "source" "DataSource" NOT NULL DEFAULT 'MANUAL',
    "importBatchId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "voidedAt" TIMESTAMP(3),
    "voidedById" UUID,
    "voidReason" TEXT,

    CONSTRAINT "glucose_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_records" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "recordedDate" DATE NOT NULL,
    "hba1c" DOUBLE PRECISION,
    "weightKg" DOUBLE PRECISION,
    "heightCm" DOUBLE PRECISION,
    "bmi" DOUBLE PRECISION,
    "sbp" INTEGER,
    "dbp" INTEGER,
    "note" TEXT,
    "source" "DataSource" NOT NULL DEFAULT 'MANUAL',
    "importBatchId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "voidedAt" TIMESTAMP(3),
    "voidedById" UUID,
    "voidReason" TEXT,

    CONSTRAINT "lab_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_rule_sets" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "goodMin" INTEGER NOT NULL DEFAULT 80,
    "goodMax" INTEGER NOT NULL DEFAULT 140,
    "watchBelow" INTEGER,
    "watchAbove" INTEGER,
    "highBelow" INTEGER,
    "highAbove" INTEGER,
    "criticalGlucoseBelow" INTEGER,
    "criticalGlucoseAbove" INTEGER,
    "criticalSbp" INTEGER NOT NULL DEFAULT 180,
    "criticalDbp" INTEGER NOT NULL DEFAULT 120,
    "remissionHba1cMax" DOUBLE PRECISION NOT NULL DEFAULT 6.5,
    "remissionMedFreeDays" INTEGER NOT NULL DEFAULT 90,
    "staleDataDays" INTEGER NOT NULL DEFAULT 7,
    "alertOnHighRisk" BOOLEAN NOT NULL DEFAULT false,
    "changeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID NOT NULL,

    CONSTRAINT "risk_rule_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_assessments" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "level" "RiskLevel" NOT NULL,
    "source" "AssessmentSource" NOT NULL DEFAULT 'AUTO',
    "autoLevel" "RiskLevel",
    "reasons" JSONB,
    "ruleSetId" UUID NOT NULL,
    "triggerGlucoseId" UUID,
    "triggerLabId" UUID,
    "overrideReason" TEXT,
    "overrideById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risk_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "type" "AlertType" NOT NULL,
    "level" "RiskLevel" NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'NEW',
    "glucoseReadingId" UUID,
    "labRecordId" UUID,
    "eventDate" DATE NOT NULL,
    "summary" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ackById" UUID,
    "ackAt" TIMESTAMP(3),
    "doneById" UUID,
    "doneAt" TIMESTAMP(3),
    "doneNote" TEXT,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_batches" (
    "id" UUID NOT NULL,
    "fileName" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL,
    "successRows" INTEGER NOT NULL,
    "failedRows" INTEGER NOT NULL,
    "errorReport" JSONB,
    "importedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "action" "AuditAction" NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "patientId" UUID,
    "before" JSONB,
    "after" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" UUID,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE UNIQUE INDEX "patients_hn_key" ON "patients"("hn");

-- CreateIndex
CREATE UNIQUE INDEX "patients_nationalId_key" ON "patients"("nationalId");

-- CreateIndex
CREATE INDEX "patients_programStatus_idx" ON "patients"("programStatus");

-- CreateIndex
CREATE INDEX "patients_deletedAt_idx" ON "patients"("deletedAt");

-- CreateIndex
CREATE INDEX "patients_lastName_firstName_idx" ON "patients"("lastName", "firstName");

-- CreateIndex
CREATE UNIQUE INDEX "patient_locations_patientId_key" ON "patient_locations"("patientId");

-- CreateIndex
CREATE INDEX "medication_periods_patientId_startDate_idx" ON "medication_periods"("patientId", "startDate");

-- CreateIndex
CREATE INDEX "glucose_readings_patientId_measuredDate_idx" ON "glucose_readings"("patientId", "measuredDate");

-- CreateIndex
CREATE INDEX "glucose_readings_importBatchId_idx" ON "glucose_readings"("importBatchId");

-- CreateIndex
CREATE INDEX "lab_records_patientId_recordedDate_idx" ON "lab_records"("patientId", "recordedDate");

-- CreateIndex
CREATE INDEX "lab_records_importBatchId_idx" ON "lab_records"("importBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "risk_rule_sets_version_key" ON "risk_rule_sets"("version");

-- CreateIndex
CREATE INDEX "risk_assessments_patientId_createdAt_idx" ON "risk_assessments"("patientId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "risk_assessments_level_idx" ON "risk_assessments"("level");

-- CreateIndex
CREATE UNIQUE INDEX "alerts_dedupeKey_key" ON "alerts"("dedupeKey");

-- CreateIndex
CREATE INDEX "alerts_status_createdAt_idx" ON "alerts"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "alerts_patientId_createdAt_idx" ON "alerts"("patientId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_patientId_createdAt_idx" ON "audit_logs"("patientId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_userId_createdAt_idx" ON "audit_logs"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_action_createdAt_idx" ON "audit_logs"("action", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_locations" ADD CONSTRAINT "patient_locations_consentRecordedById_fkey" FOREIGN KEY ("consentRecordedById") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_locations" ADD CONSTRAINT "patient_locations_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_locations" ADD CONSTRAINT "patient_locations_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_periods" ADD CONSTRAINT "medication_periods_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "glucose_readings" ADD CONSTRAINT "glucose_readings_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "glucose_readings" ADD CONSTRAINT "glucose_readings_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "import_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "glucose_readings" ADD CONSTRAINT "glucose_readings_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "glucose_readings" ADD CONSTRAINT "glucose_readings_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_records" ADD CONSTRAINT "lab_records_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_records" ADD CONSTRAINT "lab_records_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "import_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_records" ADD CONSTRAINT "lab_records_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_records" ADD CONSTRAINT "lab_records_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_rule_sets" ADD CONSTRAINT "risk_rule_sets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "risk_rule_sets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_triggerGlucoseId_fkey" FOREIGN KEY ("triggerGlucoseId") REFERENCES "glucose_readings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_triggerLabId_fkey" FOREIGN KEY ("triggerLabId") REFERENCES "lab_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_overrideById_fkey" FOREIGN KEY ("overrideById") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_glucoseReadingId_fkey" FOREIGN KEY ("glucoseReadingId") REFERENCES "glucose_readings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_labRecordId_fkey" FOREIGN KEY ("labRecordId") REFERENCES "lab_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_ackById_fkey" FOREIGN KEY ("ackById") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_doneById_fkey" FOREIGN KEY ("doneById") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_importedById_fkey" FOREIGN KEY ("importedById") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
