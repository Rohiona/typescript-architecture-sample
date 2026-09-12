import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const project = process.env.COMPOSE_PROJECT_NAME;
assert.match(project ?? "", /^architecture-container-check-[a-z0-9-]+$/, "Use a dedicated container-check project.");
const baseUrl = "http://127.0.0.1:3001";

async function request(path, body) {
  const response = await fetch(
    baseUrl + path,
    body === undefined
      ? undefined
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  assert.equal(response.ok, true, path + " returned " + response.status);
  return response;
}
async function dashboard() {
  return (await request("/api/dashboard")).json();
}

assert.deepEqual(await (await request("/api/health")).json(), { status: "ok" });
const html = await (await request("/")).text();
assert.match(html, /<html/i);
assert.match(html, /機材レンタル管理/);
const asset = html.match(/src="(\/assets\/[^"]+\.js)"/)?.[1];
assert.ok(asset, "Built client script is served.");
await request(asset);
assert.notEqual(execFileSync("docker", ["compose", "exec", "-T", "app", "id", "-u"], { encoding: "utf8" }).trim(), "0");
assert.match(
  execFileSync("docker", ["compose", "port", "app", "3001"], { encoding: "utf8" }).trim(),
  /^127\.0\.0\.1:3001$/,
);

const before = await dashboard();
assert.equal(before.customers.length, 3);
assert.equal(before.equipment.length, 3);
const created = await (
  await request("/api/reservations", {
    actorId: "customer-a",
    equipmentId: "camera",
    quantity: 1,
    startAt: before.now + 3_600_000,
    endAt: before.now + 7_200_000,
  })
).json();
const advanced = await (await request("/api/demo/advance", { minutes: 60 })).json();
assert.equal(advanced.now, before.now + 3_600_000);
const saved = await dashboard();

execFileSync("docker", ["compose", "up", "-d", "--force-recreate", "--wait", "--wait-timeout", "90", "app"], {
  stdio: "inherit",
  timeout: 120_000,
});

assert.deepEqual(await (await request("/api/health")).json(), { status: "ok" });
const restored = await dashboard();
assert.equal(restored.now, advanced.now);
assert.equal(restored.reservations.length, before.reservations.length + 1);
assert.deepEqual(restored, saved);
assert.equal(restored.reservations.find((item) => item.id === created.reservation.id)?.effectiveStatus, "expired");
console.log("Container checks passed: HTML/assets/API, non-root, loopback port, health, and SQLite persistence.");
