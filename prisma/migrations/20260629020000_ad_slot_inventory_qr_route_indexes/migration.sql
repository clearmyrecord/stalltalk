CREATE INDEX IF NOT EXISTS "AdSlotInventory_issueId_month_qrCodeId_status_idx"
  ON "AdSlotInventory"("issueId", "month", "qrCodeId", "status");
