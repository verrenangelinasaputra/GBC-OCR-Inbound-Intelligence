"use client";

import { SkuMasterWorkspace } from "@/components/master-mapping/sku-master-workspace";

export function MasterMappingWorkspace({
  canEdit,
}: {
  canEdit: boolean;
  /** @deprecated Alias OCR disembunyikan di UI; query `?ocr=` diabaikan. */
  initialOcrName?: string;
}) {
  return (
    <div className="space-y-6">
      <SkuMasterWorkspace canEdit={canEdit} />
    </div>
  );
}