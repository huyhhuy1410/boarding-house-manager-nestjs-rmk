-- AlterTable
ALTER TABLE "BoardingHouse" ADD COLUMN     "electricityUnitPrice" INTEGER NOT NULL DEFAULT 3500,
ADD COLUMN     "waterUnitPrice" INTEGER NOT NULL DEFAULT 30000;
