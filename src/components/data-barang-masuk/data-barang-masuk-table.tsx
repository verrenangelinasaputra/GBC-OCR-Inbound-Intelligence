"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import type { DbmInboundAggregate } from "@/lib/dbm/dbm-inbound-types";
import { StatusBadge } from "@/components/ui/status-badge";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";

export function DataBarangMasukTable({ groups }: { groups: DbmInboundAggregate[] }) {
  const [open, setOpen] = useState<Set<string>>(new Set());

  if (!groups.length) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        Belum ada final DBM. Konfirmasi barang di <Link href="/sku-mapping" className="text-blue-600 hover:underline">Product SKU Mapping</Link>{" "}
        terlebih dahulu.
      </p>
    );
  }

  function toggle(key: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-600">
          <tr>
            <th className="w-10 px-2 py-3" />
            <th className="px-3 py-3">Produk (acuan SKU)</th>
            <th className="px-3 py-3">SKU lengkap</th>
            <th className="px-3 py-3">Kategori</th>
            <th className="px-3 py-3 text-right">Total jumlah</th>
            <th className="px-3 py-3 text-center">Pengiriman</th>
            <th className="px-3 py-3">Agregasi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {groups.map((g) => {
            const expanded = open.has(g.aggregateKey);
            return (
              <Fragment key={g.aggregateKey}>
                <tr className="bg-white hover:bg-slate-50">
                  <td className="px-2 py-3">
                    <button
                      type="button"
                      className="rounded p-1 text-slate-500 hover:bg-slate-100"
                      onClick={() => toggle(g.aggregateKey)}
                      aria-expanded={expanded}
                    >
                      {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-medium text-slate-900">{g.namaProdukAcuan || g.namaBarangOcr}</p>
                    {g.merged && g.namaBarangOcr && g.namaBarangOcr !== g.namaProdukAcuan ? (
                      <p className="text-xs text-slate-500">OCR: {g.namaBarangOcr}</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-xs">{g.skuLengkap || "—"}</td>
                  <td className="px-3 py-3 text-xs">{g.kategoriUtama || "—"}</td>
                  <td className="px-3 py-3 text-right font-medium tabular-nums text-slate-900">
                    {g.totalAmount.toLocaleString("id-ID")} {g.unit}
                  </td>
                  <td className="px-3 py-3 text-center tabular-nums">{g.shipmentCount}</td>
                  <td className="px-3 py-3">
                    {g.merged ? (
                      <StatusBadge label="Digabung (match 100%)" tone="success" />
                    ) : (
                      <StatusBadge label="Per baris" tone="info" />
                    )}
                  </td>
                </tr>
                {expanded ? (
                  <tr key={`${g.aggregateKey}-detail`} className="bg-slate-50/80">
                    <td colSpan={7} className="px-4 py-3">
                      <p className="mb-2 text-xs font-medium text-slate-600">Surat Jalan per pengiriman</p>
                      <ul className="space-y-2">
                        {g.shipments.map((s) => (
                          <li
                            key={s.rowKey}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                          >
                            <div>
                              <span className="font-medium">{s.noSj || "—"}</span>
                              <span className="text-slate-500"> · {s.tanggalSj}</span>
                              <span className="text-slate-500"> · {s.supplier}</span>
                              <span className="text-slate-500"> · {s.gudang}</span>
                              <span className="ml-2 text-slate-700">Jumlah: {s.jumlah || "—"}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                              <Link href={s.ocrReviewPath} className="font-medium text-blue-600 hover:underline">
                                Review SJ
                              </Link>
                              {s.linkSjDrive.startsWith("http") ? (
                                <a
                                  href={s.linkSjDrive}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                                >
                                  Drive foto SJ
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : (
                                <span className="text-slate-400">Drive belum tersedia</span>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
