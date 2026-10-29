import { Prisma } from "@prisma/client";

/** Makes Prisma/query results safe for JSON and React Client Component props. */
export function toClientJson<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, v) => {
      if (Prisma.Decimal.isDecimal(v)) {
        return v.toString();
      }
      if (v instanceof Date) {
        return v.toISOString();
      }
      return v;
    })
  ) as T;
}
