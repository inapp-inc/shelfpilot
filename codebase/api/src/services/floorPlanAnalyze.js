/**
 * Server-side floor-plan dimension parsing (shared rules with web import).
 * @see Docs/FLOOR_PLAN_IMPORT_SPEC.md
 */
export {
  mergeDimensionCandidates,
  parseStoreDimensionsFromFileName,
  parseStoreDimensionsFromSvgMarkup,
  parseStoreDimensionsFromText,
} from "../../../shared/floorPlanDimensions.mjs";
