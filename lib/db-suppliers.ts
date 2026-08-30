import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { suppliers as suppliersTable } from "@/db/schema";

export type DbSupplier = { id: string; name: string; envKey: string };

export async function listSuppliers(): Promise<DbSupplier[]> {
  const rows = await db.select().from(suppliersTable).orderBy(asc(suppliersTable.createdAt));
  return rows.map((r) => ({ id: r.id, name: r.name, envKey: r.envKey }));
}

export async function getSupplierByIdFromDb(id: string): Promise<DbSupplier | undefined> {
  const rows = await db.select().from(suppliersTable).where(eq(suppliersTable.id, id)).limit(1);
  const r = rows[0];
  return r ? { id: r.id, name: r.name, envKey: r.envKey } : undefined;
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
  return { id: row.id, name: row.name, envKey: row.envKey };
}

export async function updateSupplierName(id: string, name: string): Promise<void> {
  await db.update(suppliersTable).set({ name }).where(eq(suppliersTable.id, id));
}

export async function deleteSupplier(id: string): Promise<void> {
  await db.delete(suppliersTable).where(eq(suppliersTable.id, id));
}
