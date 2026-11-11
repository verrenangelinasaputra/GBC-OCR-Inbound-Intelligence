import type { DbmInboundAggregate, DbmInboundRecord, DbmShipmentAttachment } from "@/lib/dbm/dbm-inbound-types";
import { parseQuantityAmount } from "@/lib/dbm/parse-quantity";

function shipmentFromRecord(r: DbmInboundRecord): DbmShipmentAttachment {
  const q = parseQuantityAmount(r.jumlah);
  return {
    docKey: r.docKey,
    rowKey: r.rowKey,
    tanggalSj: r.tanggalSj,
    noSj: r.noSj,
    supplier: r.supplier,
    gudang: r.gudang,
    jumlah: r.jumlah,
    jumlahAmount: q.amount,
    jumlahUnit: q.unit,
    linkSjDrive: r.linkSjDrive,
    ocrReviewPath: `/ocr-review/${encodeURIComponent(r.docKey)}`,
  };
}

function aggregateGroupKey(r: DbmInboundRecord): string {
  const exact = r.matchScore >= 0.999;
  if (exact && r.skuLengkap.trim()) {
    return `exact-sku:${r.skuLengkap.trim()}`;
  }
  if (exact && r.namaProdukAcuan.trim()) {
    return `exact-name:${r.namaProdukAcuan.trim().toUpperCase()}`;
  }
  return `line:${r.rowKey}`;
}

export function aggregateDbmInboundRecords(records: DbmInboundRecord[]): DbmInboundAggregate[] {
  const map = new Map<string, DbmInboundAggregate>();

  for (const r of records) {
    const key = aggregateGroupKey(r);
    const ship = shipmentFromRecord(r);
    let group = map.get(key);
    if (!group) {
      const q = parseQuantityAmount(r.jumlah);
      group = {
        aggregateKey: key,
        merged: key.startsWith("exact-"),
        namaProdukAcuan: r.namaProdukAcuan,
        skuLengkap: r.skuLengkap,
        namaBarangOcr: r.namaBarangOcr,
        kategoriUtama: r.kategoriUtama,
        skus: r.skus,
        totalAmount: q.amount,
        unit: q.unit,
        shipmentCount: 1,
        shipments: [ship],
      };
      map.set(key, group);
      continue;
    }

    const q = parseQuantityAmount(r.jumlah);
    if (!group.unit && q.unit) group.unit = q.unit;
    group.totalAmount += q.amount;
    group.shipmentCount += 1;
    group.shipments.push(ship);
  }

  return [...map.values()].sort((a, b) =>
    b.shipments[0]?.tanggalSj.localeCompare(a.shipments[0]?.tanggalSj ?? "", "id") ?? 0
  );
}

export function summarizeInboundTotals(groups: DbmInboundAggregate[]) {
  const records = groups.reduce((n, g) => n + g.shipmentCount, 0);
  const uniqueSku = new Set(groups.filter((g) => g.merged).map((g) => g.skuLengkap)).size;
  const totalQty = groups.reduce((s, g) => s + g.totalAmount, 0);
  return { groupCount: groups.length, shipmentRows: records, mergedSkuGroups: uniqueSku, totalQty };
}
