import assert from "node:assert/strict";
import test from "node:test";
import { assignCategoryMix } from "../src/services/categoryMixPacker.js";

test("assignCategoryMix distributes 50/50 across ten shelves", () => {
  const shelves = Array.from({ length: 10 }, (_, i) => ({ id: `s-${i}` }));
  const categories = [
    { id: "fresh-produce", color: "#22c55e" },
    { id: "grocery", color: "#16a34a" },
  ];
  const mix = [
    { categoryId: "fresh-produce", percent: 50, temperatureZone: "ambient" },
    { categoryId: "grocery", percent: 50, temperatureZone: "ambient" },
  ];
  const { shelves: out, shelfMappings } = assignCategoryMix(shelves, mix, categories);
  const produce = out.filter((s) => s.categoryId === "fresh-produce").length;
  const grocery = out.filter((s) => s.categoryId === "grocery").length;
  assert.equal(produce, 5);
  assert.equal(grocery, 5);
  assert.equal(shelfMappings.length, 20);
  assert.ok(out.every((s) => s.doubleSided && s.faces?.length === 2));
});

test("assignCategoryMix paired units: single category assigns same to front and back", () => {
  const shelves = [
    { id: "f1", pairId: "p1", pairRole: "front" },
    { id: "b1", pairId: "p1", pairRole: "back" },
    { id: "f2", pairId: "p2", pairRole: "front" },
    { id: "b2", pairId: "p2", pairRole: "back" },
  ];
  const categories = [{ id: "grocery", color: "#16a34a" }];
  const mix = [{ categoryId: "grocery", percent: 100, temperatureZone: "ambient" }];
  const { shelves: out } = assignCategoryMix(shelves, mix, categories);
  for (const s of out) {
    assert.equal(s.categoryId, "grocery");
  }
});

test("assignCategoryMix paired units: two categories alternate on back when different", () => {
  const shelves = [
    { id: "f1", pairId: "p1", pairRole: "front" },
    { id: "b1", pairId: "p1", pairRole: "back" },
    { id: "f2", pairId: "p2", pairRole: "front" },
    { id: "b2", pairId: "p2", pairRole: "back" },
  ];
  const categories = [
    { id: "fresh-produce", color: "#22c55e" },
    { id: "grocery", color: "#16a34a" },
  ];
  const mix = [
    { categoryId: "fresh-produce", percent: 50, temperatureZone: "ambient" },
    { categoryId: "grocery", percent: 50, temperatureZone: "ambient" },
  ];
  const { shelves: out } = assignCategoryMix(shelves, mix, categories);
  const front = out.find((s) => s.id === "f1");
  const back = out.find((s) => s.id === "b1");
  assert.notEqual(front.categoryId, back.categoryId);
});

test("assignCategoryMix tags chilled zone", () => {
  const shelves = [{ id: "s1" }, { id: "s2" }, { id: "s3" }, { id: "s4" }, { id: "s5" }];
  const categories = [{ id: "chilled", color: "#0ea5e9" }];
  const mix = [{ categoryId: "chilled", percent: 100, temperatureZone: "chilled" }];
  const { shelves: out } = assignCategoryMix(shelves, mix, categories);
  assert.ok(out.every((s) => s.temperatureZone === "chilled"));
});
