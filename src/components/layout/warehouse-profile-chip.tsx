import { getSession } from "@/lib/auth/session";
import { isInternalSheetAuthEnabled } from "@/lib/config/internal-sheet";
import { getInternalUserProfile } from "@/lib/internal-auth/profile";

export async function WarehouseProfileChip() {
  if (!isInternalSheetAuthEnabled()) return null;
  const session = await getSession();
  if (!session) return null;
  const profile = await getInternalUserProfile(session.username);
  if (!profile) return null;

  const gudangText = profile.gudangList.length
    ? profile.gudangList.join(", ")
    : "Semua gudang (belum diatur di profil)";

  return (
    <div className="flex max-w-xs items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white"
        aria-hidden
      >
        {(profile.fullName || profile.username).slice(0, 1).toUpperCase()}
      </div>
      <div className="min-w-0 text-left">
        <p className="truncate text-sm font-medium text-slate-900">{profile.fullName}</p>
        <p className="truncate text-xs text-slate-500" title={gudangText}>
          Gudang: {gudangText}
        </p>
      </div>
    </div>
  );
}
