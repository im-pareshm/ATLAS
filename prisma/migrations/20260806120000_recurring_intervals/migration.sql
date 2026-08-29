PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_RecurringTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "categoryId" TEXT NOT NULL,
    "description" TEXT,
    "intervalMonths" INTEGER NOT NULL DEFAULT 1,
    "startYear" INTEGER NOT NULL,
    "startMonth" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastGeneratedYear" INTEGER,
    "lastGeneratedMonth" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RecurringTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecurringTransaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_RecurringTransaction" (
    "id",
    "userId",
    "amount",
    "categoryId",
    "description",
    "intervalMonths",
    "startYear",
    "startMonth",
    "isActive",
    "lastGeneratedYear",
    "lastGeneratedMonth",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "userId",
    "amount",
    "categoryId",
    "description",
    1,
    COALESCE("lastGeneratedYear", CAST(strftime('%Y', 'now') AS INTEGER)),
    COALESCE("lastGeneratedMonth", CAST(strftime('%m', 'now') AS INTEGER)),
    "isActive",
    "lastGeneratedYear",
    "lastGeneratedMonth",
    "createdAt",
    "updatedAt"
FROM "RecurringTransaction";

DROP TABLE "RecurringTransaction";
ALTER TABLE "new_RecurringTransaction" RENAME TO "RecurringTransaction";

CREATE INDEX "RecurringTransaction_userId_isActive_idx" ON "RecurringTransaction"("userId", "isActive");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
