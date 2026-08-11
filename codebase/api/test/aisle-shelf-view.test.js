import test from "node:test";
import assert from "node:assert/strict";
import { buildAisleShelfView, oppositeMateShelf, shelvesOnAisle } from "../../web/src/layout-editor/aisleShelfView.js";

const layout = {
  aisles: [
    { id: "a4", aisleNumber: 4, name: "Aisle 4" },
    { id: "a5", aisleNumber: 5, name: "Aisle 5" },
  ],
  shelves: [
    { id: "s4a", aisleId: "a4", shelfIndexAlongAisle: 0, pairId: "p1", pairRole: "front" },
    { id: "s4b", aisleId: "a4", shelfIndexAlongAisle: 1 },
    { id: "s5a", aisleId: "a5", shelfIndexAlongAisle: 0, pairId: "p1", pairRole: "back" },
  ],
};

test("shelvesOnAisle sorts by shelf index", () => {
  const rows = shelvesOnAisle(layout, "a4");
  assert.deepEqual(rows.map((s) => s.id), ["s4a", "s4b"]);
});

test("buildAisleShelfView lists adjacent shelves and opposite aisle row", () => {
  const view = buildAisleShelfView(layout, "s4b");
  assert.equal(view.aisleNumber, 4);
  assert.equal(view.slots.length, 2);
  assert.equal(view.slots[0].label, "4A");
  assert.equal(view.slots[1].label, "4B");
  assert.equal(view.focusLabel, "4B");
  assert.equal(view.oppositeRows.length, 1);
  assert.equal(view.oppositeRows[0].aisleNumber, 5);
  assert.equal(view.oppositeRows[0].slots[0].label, "5A");
  assert.equal(oppositeMateShelf(layout.shelves[0], layout.shelves).id, "s5a");
});
