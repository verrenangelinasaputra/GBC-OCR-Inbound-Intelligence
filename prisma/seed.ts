import {
  PermissionAction,
  PrismaClient,
  IntegrationStatus,
  MappingStatus,
} from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { MODULES } from "../src/lib/rbac/modules";

const prisma = new PrismaClient();

async function main() {
  const actions: PermissionAction[] = [
    "VIEW",
    "CREATE",
    "EDIT",
    "SUBMIT",
    "APPROVE",
    "EXPORT",
    "MANAGE",
  ];

  for (const module of MODULES) {
    for (const action of actions) {
      await prisma.permission.upsert({
        where: { module_action: { module, action } },
        create: { module, action, description: `${module} ${action}` },
        update: {},
      });
    }
  }

  const roles = [
    { code: "SUPER_ADMIN", name: "Super Admin", description: "Full access" },
    { code: "DBM_OPERATOR", name: "DBM Operator", description: "Purchasing" },
    { code: "WAREHOUSE_OPERATOR", name: "Warehouse Operator", description: "Receiving" },
    { code: "SUPPLIER_USER", name: "Supplier User", description: "External portal" },
    { code: "MANAGEMENT_VIEWER", name: "Management Viewer", description: "Read-only reports" },
  ];

  for (const r of roles) {
    await prisma.role.upsert({
      where: { code: r.code },
      create: r,
      update: { name: r.name, description: r.description },
    });
  }

  const warehouse = await prisma.warehouse.upsert({
    where: { code: "WH-DEMO" },
    create: { code: "WH-DEMO", name: "GBC Warehouse Demo", address: "Lokasi fiktif untuk development" },
    update: {},
  });

  const supplier = await prisma.supplier.upsert({
    where: { code: "SSC" },
    create: {
      code: "SSC",
      name: "SSC (Suryagraha) — Demo",
      notes: "Pilot supplier — data fiktif untuk development",
    },
    update: {},
  });

  const adminPass = process.env.SEED_ADMIN_PASSWORD ?? "AdminGBC!2026";
  const supplierPass = process.env.SEED_SUPPLIER_PASSWORD ?? "SupplierSSC!2026";

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { code: "SUPER_ADMIN" } });
  const dbmRole = await prisma.role.findUniqueOrThrow({ where: { code: "DBM_OPERATOR" } });
  const whRole = await prisma.role.findUniqueOrThrow({ where: { code: "WAREHOUSE_OPERATOR" } });
  const supRole = await prisma.role.findUniqueOrThrow({ where: { code: "SUPPLIER_USER" } });

  const admin = await prisma.user.upsert({
    where: { username: process.env.SEED_ADMIN_USERNAME ?? "admin" },
    create: {
      username: process.env.SEED_ADMIN_USERNAME ?? "admin",
      fullName: "Administrator GBC",
      passwordHash: await hashPassword(adminPass),
      email: "admin.demo@gbc.local",
      userRoles: { create: [{ roleId: adminRole.id }, { roleId: dbmRole.id }] },
    },
    update: {},
  });

  const warehouseUser = await prisma.user.upsert({
    where: { username: "warehouse_demo" },
    create: {
      username: "warehouse_demo",
      fullName: "Operator Gudang Demo",
      passwordHash: await hashPassword("Warehouse!2026"),
      userRoles: { create: [{ roleId: whRole.id }] },
    },
    update: {},
  });

  const supplierUser = await prisma.user.upsert({
    where: { username: process.env.SEED_SUPPLIER_USERNAME ?? "fauzi_ssc" },
    create: {
      username: process.env.SEED_SUPPLIER_USERNAME ?? "fauzi_ssc",
      fullName: "Fauzi (Demo SSC)",
      passwordHash: await hashPassword(supplierPass),
      supplierId: supplier.id,
      userRoles: { create: [{ roleId: supRole.id }] },
    },
    update: { supplierId: supplier.id },
  });

  const products = [
    { sku: "GBC-DEMO-001", name: "Internal Produk Demo Alpha", defaultUnit: "PCS" },
    { sku: "GBC-DEMO-002", name: "Internal Produk Demo Beta", defaultUnit: "BOX" },
  ];
  for (const p of products) {
    await prisma.internalProduct.upsert({
      where: { sku: p.sku },
      create: p,
      update: {},
    });
  }

  const p1 = await prisma.internalProduct.findUniqueOrThrow({ where: { sku: "GBC-DEMO-001" } });
  const p2 = await prisma.internalProduct.findUniqueOrThrow({ where: { sku: "GBC-DEMO-002" } });

  await prisma.supplierProductMapping.upsert({
    where: { id: "seed-mapping-1" },
    create: {
      id: "seed-mapping-1",
      supplierId: supplier.id,
      internalProductId: p1.id,
      supplierProductCode: "SSC-DEMO-A",
      supplierProductName: "Produk Demo A - Merk Fiktif",
      unit: "PCS",
      status: MappingStatus.VERIFIED,
      lastVerifiedAt: new Date(),
      verifiedById: admin.id,
      createdById: admin.id,
    },
    update: {},
  });

  await prisma.purchasePriceHistory.createMany({
    data: [
      {
        internalProductId: p1.id,
        supplierId: supplier.id,
        unit: "PCS",
        unitPrice: 24500,
        currency: "IDR",
        effectiveFrom: new Date("2026-01-01"),
        sourceReference: "DEMO-PRICE-SEED",
        verificationStatus: "verified",
        updatedById: admin.id,
      },
      {
        internalProductId: p2.id,
        supplierId: supplier.id,
        unit: "BOX",
        unitPrice: 120000,
        currency: "IDR",
        effectiveFrom: new Date("2026-01-01"),
        sourceReference: "DEMO-PRICE-SEED",
        verificationStatus: "verified",
        updatedById: admin.id,
      },
    ],
    skipDuplicates: true,
  });

  const terms = [
    { code: "CBD", name: "Cash Before Delivery", daysUntilDue: 0 },
    { code: "COD", name: "Cash On Delivery", daysUntilDue: 0 },
    { code: "N7", name: "Net 7", daysUntilDue: 7 },
    { code: "N14", name: "Net 14", daysUntilDue: 14 },
    { code: "N30", name: "Net 30", daysUntilDue: 30 },
    { code: "N45", name: "Net 45", daysUntilDue: 45 },
  ];
  for (const t of terms) {
    await prisma.paymentTerm.upsert({
      where: { code: t.code },
      create: t,
      update: {},
    });
  }

  const integrations = [
    { providerKey: "ocr", displayName: "OCR Provider", status: IntegrationStatus.NOT_CONFIGURED },
    { providerKey: "telegram", displayName: "Telegram Notifications", status: IntegrationStatus.NOT_CONFIGURED },
    { providerKey: "whatsapp", displayName: "WhatsApp Notifications", status: IntegrationStatus.NOT_CONFIGURED },
    { providerKey: "accurate", displayName: "Accurate Accounting", status: IntegrationStatus.NOT_CONFIGURED },
    { providerKey: "google_workspace", displayName: "Google Workspace", status: IntegrationStatus.NOT_CONFIGURED },
  ];
  for (const i of integrations) {
    await prisma.integrationSetting.upsert({
      where: { providerKey: i.providerKey },
      create: i,
      update: {},
    });
  }

  await prisma.systemSetting.upsert({
    where: { key: "app.name" },
    create: { key: "app.name", value: { id: "GBC Inbound Intelligence", en: "GBC Inbound Intelligence" } },
    update: {},
  });

  console.log("Seed selesai.");
  console.log("Admin:", admin.username, "| Supplier:", supplierUser.username, "| Warehouse:", warehouseUser.username);
  console.log("Warehouse demo ID:", warehouse.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
