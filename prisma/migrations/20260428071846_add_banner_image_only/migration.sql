-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Banner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'New Banner',
    "bgColor" TEXT NOT NULL DEFAULT '#111184',
    "bgImageUrl" TEXT,
    "title" TEXT NOT NULL DEFAULT '',
    "subtitle" TEXT NOT NULL DEFAULT '',
    "textColor" TEXT NOT NULL DEFAULT '#ffffff',
    "logoUrl" TEXT,
    "imageOnly" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Banner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Banner" ("bgColor", "bgImageUrl", "createdAt", "id", "logoUrl", "name", "subtitle", "textColor", "title", "updatedAt", "userId") SELECT "bgColor", "bgImageUrl", "createdAt", "id", "logoUrl", "name", "subtitle", "textColor", "title", "updatedAt", "userId" FROM "Banner";
DROP TABLE "Banner";
ALTER TABLE "new_Banner" RENAME TO "Banner";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
