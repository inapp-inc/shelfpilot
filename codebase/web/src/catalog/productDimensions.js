import { formatDimensionTripleInches } from "../units.js";
import { productDimensions } from "../productCatalog.js";

export function catalogProductDimensionsInches(product) {
  const dims = productDimensions(product);
  return {
    widthInches: dims.widthMeters,
    heightInches: dims.heightMeters,
    depthInches: dims.depthMeters,
    label: formatDimensionTripleInches(dims.widthMeters, dims.heightMeters, dims.depthMeters),
    assumed: dims.assumedDimensions,
  };
}
