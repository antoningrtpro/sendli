-- CreateTable
CREATE TABLE "ProposalLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proposalId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "recipientEmail" TEXT,
    "recipientName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProposalLink_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ProposalEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proposalId" TEXT NOT NULL,
    "linkId" TEXT,
    "eventType" TEXT NOT NULL,
    "blockId" TEXT,
    "visitorHash" TEXT,
    "durationSeconds" INTEGER,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProposalEvent_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProposalEvent_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "ProposalLink" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ProposalEvent" ("blockId", "createdAt", "durationSeconds", "eventType", "id", "metadata", "proposalId", "visitorHash") SELECT "blockId", "createdAt", "durationSeconds", "eventType", "id", "metadata", "proposalId", "visitorHash" FROM "ProposalEvent";
DROP TABLE "ProposalEvent";
ALTER TABLE "new_ProposalEvent" RENAME TO "ProposalEvent";
CREATE INDEX "ProposalEvent_proposalId_eventType_idx" ON "ProposalEvent"("proposalId", "eventType");
CREATE INDEX "ProposalEvent_proposalId_createdAt_idx" ON "ProposalEvent"("proposalId", "createdAt");
CREATE INDEX "ProposalEvent_proposalId_visitorHash_idx" ON "ProposalEvent"("proposalId", "visitorHash");
CREATE INDEX "ProposalEvent_linkId_idx" ON "ProposalEvent"("linkId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ProposalLink_token_key" ON "ProposalLink"("token");

-- CreateIndex
CREATE INDEX "ProposalLink_proposalId_idx" ON "ProposalLink"("proposalId");
