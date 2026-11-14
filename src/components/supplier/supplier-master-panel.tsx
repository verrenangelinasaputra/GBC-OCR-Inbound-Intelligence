"use client";

import { SupplierDriveSettingsTable } from "@/components/admin/supplier-drive-settings-table";

export function SupplierMasterPanel() {
  return (
    <SupplierDriveSettingsTable
      listUrl="/api/supplier/master/suppliers"
      driveSaveUrl={(username) =>
        `/api/supplier/master/suppliers/${encodeURIComponent(username)}/drive`
      }
    />
  );
}