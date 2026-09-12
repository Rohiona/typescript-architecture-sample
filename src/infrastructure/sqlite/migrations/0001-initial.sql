CREATE TABLE customers (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('member', 'staff'))
);
CREATE TABLE equipment (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('camera', 'projector', 'tripod')),
  description TEXT NOT NULL,
  total_quantity INTEGER NOT NULL CHECK (total_quantity > 0),
  turnaround_minutes INTEGER NOT NULL CHECK (turnaround_minutes >= 0),
  maintenance TEXT NOT NULL
);
CREATE TABLE reservations (
  id TEXT PRIMARY KEY NOT NULL,
  equipment_id TEXT NOT NULL REFERENCES equipment(id),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  start_at INTEGER NOT NULL,
  end_at INTEGER NOT NULL CHECK (end_at > start_at),
  status TEXT NOT NULL CHECK (status IN ('held', 'confirmed', 'checked_out', 'returned', 'cancelled', 'expired')),
  hold_expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  returned_at INTEGER,
  version INTEGER NOT NULL CHECK (version > 0)
);
CREATE INDEX reservations_equipment ON reservations(equipment_id);
CREATE TABLE activities (
  id TEXT PRIMARY KEY NOT NULL,
  at INTEGER NOT NULL,
  message TEXT NOT NULL
);
CREATE TABLE demo_clock (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  now INTEGER NOT NULL
);
