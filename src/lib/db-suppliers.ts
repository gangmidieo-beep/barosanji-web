import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { suppliers as suppliersTable } from "@/db/schema";

export type DbSupplier = { id: string; name: string; envKey: string; orderingEnabled: boolean };

export async function listSuppliers(): Promise<DbSupplier[]> {
  const rows = await db.select().from(suppliersTable).orderBy(asc(suppliersTable.createdAt));
  return rows.map((r) => ({ id: r.id, name: r.name, envKey: r.envKey, orderingEnabled: r.orderingEnabled }));
}

export async function getSupplierByIdFromDb(id: string): Promise<DbSupplier | undefined> {
  const rows = await db.select().from(suppliersTable).where(eq(suppliersTable.id, id)).limit(1);
  const r = rows[0];
  return r ? { id: r.id, name: r.name, envKey: r.envKey, orderingEnabled: r.orderingEnabled } : undefined;
}

function nextEnvKey(existing: DbSupplier[]): string {
  let n = existing.length + 1;
  const used = new Set(existing.map((s) => s.envKey));
  while (used.has(`NEW${n}`)) n++;
  return `NEW${n}`;
}

export async function createSupplier(): Promise<DbSupplier> {
  const existing = await listSuppliers();
  const id = `supplier-${Date.now()}`;
  const envKey = nextEnvKey(existing);
  const [row] = await db.insert(suppliersTable).values({ id, name: "", envKey }).returning();
  return { id: row.id, name: row.name, envKey: row.envKey, orderingEnabled: row.orderingEnabled };
}

export async function updateSupplierName(id: string, name: string): Promise<void> {
  await db.update(suppliersTable).set({ name }).where(eq(suppliersTable.id, id));
}

/** 발주 사용 여부 전환. 끄면 이 업체로는 발주가 나가지 않고, 이 업체 상품은 고객 화면에서 품절 처리된다. */
export async function setSupplierOrderingEnabled(id: string, enabled: boolean): Promise<void> {
  await db.update(suppliersTable).set({ orderingEnabled: enabled }).where(eq(suppliersTable.id, id));
}

/** 발주가 중지된 업체 ID 집합 — 상품 품절 처리·결제 차단에서 쓴다. */
export async function getOrderingDisabledSupplierIds(): Promise<Set<string>> {
  const rows = await db
    .select({ id: suppliersTable.id })
    .from(suppliersTable)
    .where(eq(suppliersTable.orderingEnabled, false));
  return new Set(rows.map((r) => r.id));
}

export async function deleteSupplier(id: string): Promise<void> {
  await db.delete(suppliersTable).where(eq(suppliersTable.id, id));
}
