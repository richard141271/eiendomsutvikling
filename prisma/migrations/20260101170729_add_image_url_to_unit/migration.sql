/*
  Warnings:

  - You are about to drop the column `rooms` on the `Unit` table. All the data in the column will be lost.
  - Added the required column `roomCount` to the `Unit` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('LIVING_ROOM', 'KITCHEN', 'BEDROOM', 'BATHROOM', 'HALLWAY', 'STORAGE', 'BALCONY', 'GARAGE', 'OTHER');

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "Unit" DROP COLUMN "rooms",
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "roomCount" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "standardRentPerSqm" INTEGER NOT NULL DEFAULT 185;

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "RoomType" NOT NULL DEFAULT 'OTHER',
    "sizeSqm" DOUBLE PRECISION,
    "description" TEXT,
    "scanUrl" TEXT,
    "scanFormat" TEXT,
    "scanStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "thumbnailUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
