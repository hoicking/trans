-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "requestedRows" INTEGER NOT NULL DEFAULT 0,
    "importedRows" INTEGER NOT NULL DEFAULT 0,
    "skippedRows" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatchItem" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "translationValueId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportBatchItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranslationValueTag" (
    "id" TEXT NOT NULL,
    "translationValueId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TranslationValueTag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportBatch_projectId_createdAt_idx" ON "ImportBatch"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "ImportBatchItem_translationValueId_idx" ON "ImportBatchItem"("translationValueId");

-- CreateIndex
CREATE UNIQUE INDEX "ImportBatchItem_batchId_translationValueId_key" ON "ImportBatchItem"("batchId", "translationValueId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_projectId_name_key" ON "Tag"("projectId", "name");

-- CreateIndex
CREATE INDEX "TranslationValueTag_tagId_idx" ON "TranslationValueTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "TranslationValueTag_translationValueId_tagId_key" ON "TranslationValueTag"("translationValueId", "tagId");

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "TranslationProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatchItem" ADD CONSTRAINT "ImportBatchItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatchItem" ADD CONSTRAINT "ImportBatchItem_translationValueId_fkey" FOREIGN KEY ("translationValueId") REFERENCES "TranslationValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "TranslationProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranslationValueTag" ADD CONSTRAINT "TranslationValueTag_translationValueId_fkey" FOREIGN KEY ("translationValueId") REFERENCES "TranslationValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranslationValueTag" ADD CONSTRAINT "TranslationValueTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
