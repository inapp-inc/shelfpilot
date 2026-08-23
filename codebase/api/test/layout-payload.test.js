import test from "node:test";
import assert from "node:assert/strict";
import {
  layoutIncludesPlanograms,
  stripPlanogramsFromLayout,
} from "../src/services/layoutPayload.js";

test("stripPlanogramsFromLayout removes shelf and face planograms", () => {
  const layout = {
    id: "L1",
    shelves: [
      {
        id: "s1",
        planogram: [{ productId: "p1", facings: 2 }],
        faces: [{ id: "A", planogram: [{ productId: "p2" }] }],
      },
    ],
  };
  const stripped = stripPlanogramsFromLayout(layout);
  assert.equal(stripped.shelves[0].planogram, undefined);
  assert.equal(stripped.shelves[0].faces[0].planogram, undefined);
  assert.equal(stripped.shelves[0].id, "s1");
});

test("layoutIncludesPlanograms parses include query", () => {
  assert.equal(layoutIncludesPlanograms({}), false);
  assert.equal(layoutIncludesPlanograms({ include: "planograms" }), true);
  assert.equal(layoutIncludesPlanograms({ include: "summary,planograms" }), true);
});
