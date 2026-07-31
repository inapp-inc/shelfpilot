# Store Layout Solution – Reports: Calculation Logic & Visualization Guide

**Companion document to:** BRD_Store_Layout_Design_Solution.md (Module M9 – Analytics & Reporting)
**Purpose:** Defines the calculation logic, data inputs, and recommended visualization type for each report/analytic.

---

## 1. Space Utilization & Efficiency

### 1.1 Space Utilization Report
- **Logic:**
  - `Total Store Area = Store Length × Store Width` (or sum of polygon area for irregular layouts)
  - `Allocated Area = Σ (Fixture Footprint Area)` for all placed shelves/fixtures
  - `Aisle Area = Σ (Aisle Length × Aisle Width)`
  - `Unused/Dead Area = Total Store Area − Allocated Area − Aisle Area − Blocked Zone Area`
  - `Utilization % = (Allocated Area / Total Store Area) × 100`
- **Inputs:** Store dimensions, fixture footprints, aisle dimensions, blocked zone (pillars/walls) area
- **Visualization:** Stacked bar or donut chart (Allocated vs. Aisle vs. Unused vs. Blocked) + a single KPI tile showing overall Utilization %. Overlay as a heat-colored 2D floor plan for spatial context.

### 1.2 Fixture Density Report
- **Logic:**
  - `Fixture Density = Total Number of Fixtures / Total Store Area`
  - Can be computed per zone: `Zone Density = Fixtures in Zone / Zone Area`
- **Inputs:** Fixture count and location (by zone), store/zone area
- **Visualization:** Heat map overlay on the 2D layout (color intensity = density per zone) + bar chart comparing density across zones/stores.

### 1.3 Unallocated/Empty Shelf Report
- **Logic:**
  - For each fixture: `Mapped = TRUE/FALSE` based on category/product mapping
  - `Empty Shelf Area = Σ (Area of fixtures where Mapped = FALSE)`
  - `% Empty = (Empty Shelf Area / Total Shelf Area) × 100`
- **Inputs:** Fixture list, mapping status per fixture/tier
- **Visualization:** Highlighted/flagged zones in red on the 2D/3D layout + a tabular list of unmapped fixture IDs with location reference.

### 1.4 Vertical Space Utilization (Tier-Level)
- **Logic:**
  - For each fixture, per tier: `Tier Utilization % = (Mapped Tier Area / Total Tier Area) × 100`
  - Aggregate by tier level across the store: `Avg Utilization (Top/Eye-Level/Bottom) = Mean of tier utilization for that level across all fixtures`
- **Inputs:** Fixture tier configuration, mapping per tier
- **Visualization:** Horizontal stacked bar per fixture (showing tier-by-tier fill) or a side-elevation 2D diagram color-coded by utilization level.

---

## 2. Capacity & Planning

### 2.1 Auto-Calculated vs. Actual Capacity Report
- **Logic:**
  - `Theoretical Max Capacity = f(Usable Area, Selected Fixture Footprint, Min Aisle Width Rule)` — computed by the Auto-Calculation Engine (Module M4) using a packing algorithm across usable area
  - `Actual Configured Count = Count of fixtures actually placed by designer`
  - `Variance % = ((Actual − Theoretical) / Theoretical) × 100`
- **Inputs:** Usable area, fixture dimensions, aisle rules, actual placed fixture count
- **Visualization:** Side-by-side bar chart (Theoretical vs. Actual) with a variance % callout; color-coded (green = near-optimal, red = large gap).

### 2.2 Fixture Mix Report
- **Logic:**
  - `Fixture Type % = (Count of Fixture Type X / Total Fixture Count) × 100`
  - Can also be computed by area: `Area Share % = (Area occupied by Type X / Total Allocated Area) × 100`
- **Inputs:** Fixture catalog type per placed fixture
- **Visualization:** Pie/donut chart of fixture type distribution; treemap if showing area-based share.

### 2.3 Scenario Comparison Report
- **Logic:**
  - For each saved "what-if" scenario, compute: Utilization %, Fixture Count, Category Coverage %, Aisle Compliance status
  - `Delta = Scenario B metric − Scenario A metric` for each KPI
- **Inputs:** Snapshot data from each saved scenario version
- **Visualization:** Side-by-side comparison table with delta indicators (▲/▼), supplemented by a grouped bar chart across scenarios.

### 2.4 Store-to-Store Capacity Benchmarking
- **Logic:**
  - `Capacity Index = Store's Fixture Count (normalized per 1000 sq. ft.) / Peer Group Average`
  - Peer group defined by store format/vertical/size band
- **Inputs:** Fixture count and area across multiple stores, store format/vertical tag
- **Visualization:** Ranked horizontal bar chart across stores; box-plot to show distribution and outliers within a peer group.

---

## 3. Category & Product Allocation

### 3.1 Category Space Allocation Report
- **Logic:**
  - `Category Area = Σ (Area of shelf/tier mapped to Category X)`
  - `Category Share % = (Category Area / Total Mapped Area) × 100`
  - Can also use **linear space**: `Linear Ft = Σ (Width of shelf front mapped to Category X)`
- **Inputs:** Category-to-shelf mapping (M7), fixture dimensions
- **Visualization:** Treemap or stacked horizontal bar (category share of total space); color-matched to the category color-coding used in the 2D/3D view for consistency.

### 3.2 Category vs. Sales Contribution Report (future integration with sales data)
- **Logic:**
  - `Space Index = Category Space Share % / Category Sales (or Margin) Contribution %`
  - `Space Index > 1` → over-spaced relative to sales; `< 1` → under-spaced
- **Inputs:** Category space allocation (from 3.1), sales/margin data (external system)
- **Visualization:** Quadrant/scatter chart (X = Sales Contribution %, Y = Space Contribution %) — quickly identifies over-indexed vs. under-indexed categories.

### 3.3 Product Mapping Coverage Report
- **Logic:**
  - `Mapped Product Count = Count of SKUs with an assigned shelf location`
  - `Coverage % = (Mapped Product Count / Total Active SKUs in Catalog) × 100`
  - `Unmapped List = Products where Shelf Location = NULL`
- **Inputs:** Product catalog (M6), mapping table (M7)
- **Visualization:** KPI gauge/donut for Coverage %, plus a filterable data table of unmapped SKUs.

### 3.4 Category Adjacency Report
- **Logic:**
  - Build an adjacency matrix: for each pair of categories (A, B), flag `Adjacent = TRUE` if their mapped shelf zones share a boundary or are within a defined proximity threshold (e.g., same aisle)
  - Optionally flag rule violations: `Violation = TRUE` if two categories marked "incompatible" in configuration are adjacent (e.g., pharma restricted items near general OTC without required separation)
- **Inputs:** Category zone coordinates, category compatibility rules (M11 configuration)
- **Visualization:** Adjacency matrix/heat grid (rows/columns = categories, cell color = adjacent/non-adjacent/violation) plus a 2D layout overlay highlighting violations.

---

## 4. Aisle & Compliance

### 4.1 Aisle Compliance Report
- **Logic:**
  - For each aisle: `Compliant = TRUE if Aisle Width ≥ Minimum Width Rule (by region/vertical), else FALSE`
  - `Compliance % = (Compliant Aisle Count / Total Aisle Count) × 100`
- **Inputs:** Aisle dimensions (M3), minimum width configuration (M11)
- **Visualization:** 2D layout overlay with aisles color-coded green/red; summary KPI tile for overall Compliance %.

### 4.2 Walkability/Flow Report
- **Logic:**
  - Path-finding/graph traversal: treat aisles as graph edges and fixtures/walls as obstacles; verify a connected path exists from every aisle segment to at least one entrance/exit node
  - `Unreachable Zones = Zones with no valid path to an exit`
- **Inputs:** Aisle network graph, entrance/exit coordinates, blocked zones
- **Visualization:** Path/flow diagram overlaid on 2D layout (arrows showing connectivity); flagged zones highlighted where no path exists.

### 4.3 Regulatory Compliance Report (vertical-specific)
- **Logic:**
  - Rule-based checks configured per vertical, e.g.: `IF Category = "Prescription" AND Adjacent Category NOT IN [Approved List] THEN Flag Violation`
  - `Compliance Score = (Rules Passed / Total Rules Evaluated) × 100`
- **Inputs:** Vertical-specific rule configuration (M11), category mapping, adjacency data
- **Visualization:** Checklist/scorecard view (pass/fail per rule) plus overall compliance score gauge.

---

## 5. Version & Change Management

### 5.1 Layout Version Comparison Report
- **Logic:**
  - Field-by-field diff between two layout versions: fixture count, area allocated, category mapping, aisle configuration
  - `Change Count = Number of added + removed + modified elements`
- **Inputs:** Snapshot data of each version (M1 versioning)
- **Visualization:** Side-by-side 2D layout comparison (v1 vs. v2) with change markers; supplementary diff table.

### 5.2 Audit/Change History Report
- **Logic:**
  - Simple log aggregation: `List of (User, Action, Object, Timestamp, Old Value, New Value)`
  - Can be filtered/grouped by user, date range, or module
- **Inputs:** System audit log (M10)
- **Visualization:** Chronological table/timeline view; optionally a bar chart of "changes per user" or "changes per week" for activity trend monitoring.

### 5.3 Approval Status Report
- **Logic:**
  - `Count of Layouts by Status = GROUP BY Workflow Status (Draft/Submitted/Approved/Published)`
  - `Avg Time in Stage = Mean (Timestamp of Stage Exit − Timestamp of Stage Entry)`
- **Inputs:** Workflow status log (M10)
- **Visualization:** Funnel chart (layouts progressing through stages) + KPI tile for average approval cycle time.

---

## 6. Cross-Store / Portfolio-Level Analytics

### 6.1 Layout Standardization Report
- **Logic:**
  - `Deviation Score = Weighted difference between store layout attributes (fixture mix %, category share %) and the master/prototype template`
  - Example: `Deviation = Σ |Store Category % − Template Category %|` across all categories
- **Inputs:** Store layout data, designated master/prototype template
- **Visualization:** Ranked bar chart of stores by deviation score; radar/spider chart comparing one store's profile vs. template across key dimensions.

### 6.2 Rollout Progress Dashboard
- **Logic:**
  - `% Complete = (Stores with Status = "Published" / Total Stores in Rollout Program) × 100`
  - Track by region/format for sub-group progress
- **Inputs:** Workflow status (M10) across all stores in a rollout program
- **Visualization:** Progress bar / funnel by stage, plus a map view (if store geo-location available) color-coded by rollout status.

### 6.3 Vertical/Format Comparison Report
- **Logic:**
  - Aggregate KPIs (Utilization %, Category Coverage %, Fixture Density) grouped by vertical/format
  - `Format Average = Mean(KPI) grouped by Vertical`
- **Inputs:** Layout data tagged by vertical/format (M10 store master data)
- **Visualization:** Grouped/clustered bar chart comparing KPIs across verticals; small-multiples layout for quick cross-format scanning.

---

## 7. Executive/KPI Dashboard

- **Logic:** Aggregates key metrics already calculated above into single-view tiles:
  - Overall Utilization % (from 1.1)
  - Category Coverage % (from 3.3)
  - Aisle Compliance % (from 4.1)
  - Unmapped Space % (from 1.3)
  - Layouts Pending Approval (count, from 5.3)
- **Inputs:** Rollup of outputs from all reports above (recomputed on schedule or on-demand)
- **Visualization:** KPI tile/scorecard grid at top, with drill-down links to each detailed report; trend sparklines showing change over recent versions/time periods.

---

## Summary Table — Report to Visualization Quick Reference

| Report | Recommended Primary Visualization |
|---|---|
| Space Utilization | Stacked bar / donut + 2D heat overlay |
| Fixture Density | Heat map overlay + bar chart |
| Unallocated Shelf | Flagged 2D overlay + table |
| Vertical Space Utilization | Stacked bar per fixture / elevation diagram |
| Auto-Calc vs. Actual Capacity | Side-by-side bar with variance callout |
| Fixture Mix | Pie/donut or treemap |
| Scenario Comparison | Comparison table + grouped bar |
| Store Benchmarking | Ranked bar + box plot |
| Category Space Allocation | Treemap / stacked horizontal bar |
| Category vs. Sales Index | Quadrant/scatter chart |
| Product Mapping Coverage | KPI gauge + data table |
| Category Adjacency | Adjacency matrix/heat grid |
| Aisle Compliance | 2D overlay (color-coded) + KPI tile |
| Walkability/Flow | Path/flow diagram overlay |
| Regulatory Compliance | Scorecard/checklist + gauge |
| Layout Version Comparison | Side-by-side 2D + diff table |
| Audit/Change History | Timeline/table + activity bar chart |
| Approval Status | Funnel chart + KPI tile |
| Layout Standardization | Ranked bar + radar chart |
| Rollout Progress | Progress/funnel + map view |
| Vertical/Format Comparison | Grouped bar / small multiples |
| Executive KPI Dashboard | KPI tile grid + sparklines |

---

*End of Document — For use alongside BRD_Store_Layout_Design_Solution.md, Module M9 (Analytics & Reporting)*
