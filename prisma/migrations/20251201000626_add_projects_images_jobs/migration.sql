/*
  Warnings:

  - You are about to drop the column `fileName` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `fileSizeBytes` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `hashSha256` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `heightPx` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `mimeType` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `widthPx` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `exifScrubbed` on the `ImageVersion` table. All the data in the column will be lost.
  - You are about to drop the column `heightPx` on the `ImageVersion` table. All the data in the column will be lost.
  - You are about to drop the column `isFinal` on the `ImageVersion` table. All the data in the column will be lost.
  - You are about to drop the column `jobId` on the `ImageVersion` table. All the data in the column will be lost.
  - You are about to drop the column `kind` on the `ImageVersion` table. All the data in the column will be lost.
  - You are about to drop the column `presetName` on the `ImageVersion` table. All the data in the column will be lost.
  - You are about to drop the column `widthPx` on the `ImageVersion` table. All the data in the column will be lost.
  - You are about to drop the column `createdById` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `etaSeconds` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Job` table. All the data in the column will be lost.
  - The `status` column on the `Job` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `ownerUserId` on the `Project` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `Image` table without a default value. This is not possible if the table is not empty.
  - Made the column `projectId` on table `Image` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `type` to the `ImageVersion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `imageId` to the `Job` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Job` table without a default value. This is not possible if the table is not empty.
  - Made the column `projectId` on table `Job` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `userId` to the `Project` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ImageVersionType" AS ENUM ('ORIGINAL', 'ENHANCED', 'STAGED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- DropForeignKey
ALTER TABLE "Image" DROP CONSTRAINT "Image_projectId_fkey";

-- DropForeignKey
ALTER TABLE "ImageVersion" DROP CONSTRAINT "ImageVersion_jobId_fkey";

-- DropForeignKey
ALTER TABLE "Job" DROP CONSTRAINT "Job_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Job" DROP CONSTRAINT "Job_projectId_fkey";

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_ownerUserId_fkey";

-- DropIndex
DROP INDEX "Project_ownerUserId_name_key";

-- AlterTable
ALTER TABLE "Image" DROP COLUMN "fileName",
DROP COLUMN "fileSizeBytes",
DROP COLUMN "hashSha256",
DROP COLUMN "heightPx",
DROP COLUMN "mimeType",
DROP COLUMN "widthPx",
ADD COLUMN     "label" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "projectId" SET NOT NULL;

-- AlterTable
ALTER TABLE "ImageVersion" DROP COLUMN "exifScrubbed",
DROP COLUMN "heightPx",
DROP COLUMN "isFinal",
DROP COLUMN "jobId",
DROP COLUMN "kind",
DROP COLUMN "presetName",
DROP COLUMN "widthPx",
ADD COLUMN     "type" "ImageVersionType" NOT NULL;

-- AlterTable
ALTER TABLE "Job" DROP COLUMN "createdById",
DROP COLUMN "etaSeconds",
DROP COLUMN "type",
ADD COLUMN     "imageId" INTEGER NOT NULL,
ADD COLUMN     "userId" INTEGER NOT NULL,
ALTER COLUMN "projectId" SET NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "JobStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "ownerUserId",
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "userId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "EnhancementJob" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "projectId" INTEGER NOT NULL,
    "imageId" INTEGER NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnhancementJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EnhancementJob_userId_idx" ON "EnhancementJob"("userId");

-- CreateIndex
CREATE INDEX "EnhancementJob_projectId_idx" ON "EnhancementJob"("projectId");

-- CreateIndex
CREATE INDEX "EnhancementJob_imageId_idx" ON "EnhancementJob"("imageId");

-- CreateIndex
CREATE INDEX "Image_projectId_idx" ON "Image"("projectId");

-- CreateIndex
CREATE INDEX "ImageVersion_imageId_type_idx" ON "ImageVersion"("imageId", "type");

-- CreateIndex
CREATE INDEX "Job_userId_idx" ON "Job"("userId");

-- CreateIndex
CREATE INDEX "Job_projectId_idx" ON "Job"("projectId");

-- CreateIndex
CREATE INDEX "Job_imageId_idx" ON "Job"("imageId");

-- CreateIndex
CREATE INDEX "Project_userId_idx" ON "Project"("userId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnhancementJob" ADD CONSTRAINT "EnhancementJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnhancementJob" ADD CONSTRAINT "EnhancementJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnhancementJob" ADD CONSTRAINT "EnhancementJob_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
