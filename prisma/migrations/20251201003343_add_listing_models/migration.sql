/*
  Warnings:

  - You are about to drop the column `areaSqM` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `latitude` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `listerId` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `locationText` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `longitude` on the `Listing` table. All the data in the column will be lost.
  - You are about to alter the column `price` on the `Listing` table. The data in that column could be lost. The data in that column will be cast from `Decimal(14,2)` to `DoublePrecision`.
  - The `status` column on the `Listing` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `ListingMedia` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `position` on the `ListingMedia` table. All the data in the column will be lost.
  - Added the required column `projectId` to the `Listing` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Listing` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- DropForeignKey
ALTER TABLE "Listing" DROP CONSTRAINT "Listing_listerId_fkey";

-- AlterTable
ALTER TABLE "Listing" DROP COLUMN "areaSqM",
DROP COLUMN "isActive",
DROP COLUMN "latitude",
DROP COLUMN "listerId",
DROP COLUMN "locationText",
DROP COLUMN "longitude",
ADD COLUMN     "areaSqm" DOUBLE PRECISION,
ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "locationCity" TEXT,
ADD COLUMN     "locationCountry" TEXT,
ADD COLUMN     "locationState" TEXT,
ADD COLUMN     "projectId" INTEGER NOT NULL,
ADD COLUMN     "userId" INTEGER NOT NULL,
ALTER COLUMN "price" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "currency" DROP NOT NULL,
ALTER COLUMN "currency" DROP DEFAULT,
DROP COLUMN "status",
ADD COLUMN     "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "ListingMedia" DROP CONSTRAINT "ListingMedia_pkey",
DROP COLUMN "position",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD CONSTRAINT "ListingMedia_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE INDEX "Listing_status_idx" ON "Listing"("status");

-- CreateIndex
CREATE INDEX "Listing_isPublished_idx" ON "Listing"("isPublished");

-- CreateIndex
CREATE INDEX "Listing_locationCity_idx" ON "Listing"("locationCity");

-- CreateIndex
CREATE INDEX "Listing_locationCountry_idx" ON "Listing"("locationCountry");

-- CreateIndex
CREATE INDEX "ListingMedia_listingId_idx" ON "ListingMedia"("listingId");

-- CreateIndex
CREATE INDEX "ListingMedia_imageVersionId_idx" ON "ListingMedia"("imageVersionId");

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
