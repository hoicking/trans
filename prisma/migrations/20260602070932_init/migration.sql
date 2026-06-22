-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'TRANSLATOR', 'REVIEWER');

-- CreateEnum
CREATE TYPE "KeyGenerationMode" AS ENUM ('SEMANTIC', 'TEXT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'TRANSLATOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranslationProject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TranslationProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectLanguage" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectLanguage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMember" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectAiConfig" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "providerName" TEXT NOT NULL DEFAULT 'OpenAI compatible',
    "baseUrl" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "encryptedApiKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectAiConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranslationEntry" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "sourceLanguage" TEXT NOT NULL DEFAULT 'en',
    "keyGenerationMode" "KeyGenerationMode" NOT NULL DEFAULT 'TEXT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TranslationEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranslationValue" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "value" TEXT NOT NULL DEFAULT '',
    "isTranslated" BOOLEAN NOT NULL DEFAULT false,
    "translatedAt" TIMESTAMP(3),
    "translatedById" TEXT,
    "isReviewed" BOOLEAN NOT NULL DEFAULT false,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TranslationValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectLanguage_projectId_code_key" ON "ProjectLanguage"("projectId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMember_projectId_userId_key" ON "ProjectMember"("projectId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectAiConfig_projectId_key" ON "ProjectAiConfig"("projectId");

-- CreateIndex
CREATE INDEX "TranslationEntry_projectId_key_idx" ON "TranslationEntry"("projectId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "TranslationEntry_projectId_key_key" ON "TranslationEntry"("projectId", "key");

-- CreateIndex
CREATE INDEX "TranslationValue_languageCode_isTranslated_isReviewed_idx" ON "TranslationValue"("languageCode", "isTranslated", "isReviewed");

-- CreateIndex
CREATE UNIQUE INDEX "TranslationValue_entryId_languageCode_key" ON "TranslationValue"("entryId", "languageCode");

-- AddForeignKey
ALTER TABLE "ProjectLanguage" ADD CONSTRAINT "ProjectLanguage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "TranslationProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "TranslationProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAiConfig" ADD CONSTRAINT "ProjectAiConfig_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "TranslationProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranslationEntry" ADD CONSTRAINT "TranslationEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "TranslationProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranslationValue" ADD CONSTRAINT "TranslationValue_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "TranslationEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranslationValue" ADD CONSTRAINT "TranslationValue_translatedById_fkey" FOREIGN KEY ("translatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranslationValue" ADD CONSTRAINT "TranslationValue_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
