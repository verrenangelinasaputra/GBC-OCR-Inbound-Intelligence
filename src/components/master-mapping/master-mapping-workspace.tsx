"use client";

import { useState } from "react";
import { MasterMappingPanel } from "@/components/master-mapping/master-mapping-panel";
import { SkuMasterProductPanel } from "@/components/master-mapping/sku-master-product-panel";

type TabId = "produk" | "alias";

export function MasterMappingWorkspace({
  canEdit,
  initialOcrName = "",
}: {
  canEdit: boolean;
  initialOcrName?: string;
}) {
  const [tab, setTab] = useState<TabId>(initialOcrName ? "alias" : "produk");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setTab("produk")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            tab === "produk" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Master produk (generator)
        </button>
        <button
          type="button"
          onClick={() => setTab("alias")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            tab === "alias" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Alias nama OCR
        </button>
      </div>

      {tab === "produk" ? <SkuMasterProductPanel canEdit={canEdit} /> : null}
      {tab === "alias" ? <MasterMappingPanel canEdit={canEdit} initialOcrName={initialOcrName} /> : null}
    </div>
  );
}