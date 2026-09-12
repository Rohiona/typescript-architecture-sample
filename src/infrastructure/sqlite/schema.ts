import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { Equipment, Period, ReservationStatus } from "../../domain/rentals/types.js";

export const customers = sqliteTable("customers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role", { enum: ["member", "staff"] }).notNull(),
});
export const equipment = sqliteTable("equipment", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").$type<Equipment["category"]>().notNull(),
  description: text("description").notNull(),
  totalQuantity: integer("total_quantity").notNull(),
  turnaroundMinutes: integer("turnaround_minutes").notNull(),
  maintenance: text("maintenance", { mode: "json" }).$type<Period[]>().notNull(),
});
export const reservations = sqliteTable("reservations", {
  id: text("id").primaryKey(),
  equipmentId: text("equipment_id")
    .notNull()
    .references(() => equipment.id),
  customerId: text("customer_id")
    .notNull()
    .references(() => customers.id),
  quantity: integer("quantity").notNull(),
  startAt: integer("start_at").notNull(),
  endAt: integer("end_at").notNull(),
  status: text("status").$type<ReservationStatus>().notNull(),
  holdExpiresAt: integer("hold_expires_at").notNull(),
  createdAt: integer("created_at").notNull(),
  returnedAt: integer("returned_at"),
  version: integer("version").notNull(),
});
export const activities = sqliteTable("activities", {
  id: text("id").primaryKey(),
  at: integer("at").notNull(),
  message: text("message").notNull(),
});
export const demoClock = sqliteTable("demo_clock", {
  id: integer("id").primaryKey(),
  now: integer("now").notNull(),
});
