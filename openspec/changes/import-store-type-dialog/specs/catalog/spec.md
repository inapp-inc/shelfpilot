## ADDED Requirements

### Requirement: Import dialog with store-type selection

Starting an Excel import SHALL open a dialog that lets the user select the target store
type before importing. The store type SHALL default to the currently active store type.
The catalog SHALL be imported into the selected store type's vertical.

#### Scenario: Import into the chosen store type

- **GIVEN** the active store type is Retail and the user has a hypermarket product sheet
- **WHEN** the user clicks Import Excel, selects **Hypermarket**, and imports the file
- **THEN** the imported categories and products are stored under the **hypermarket** vertical
- **AND** the catalog view switches to Hypermarket

#### Scenario: Blank store type resolves to the selected type

- **GIVEN** a sheet whose rows have no `storeType` value
- **WHEN** the user imports it with **Hypermarket** selected
- **THEN** the rows are imported as hypermarket (not the previous `retail` fallback)

### Requirement: Drag-and-drop import

The import dialog SHALL accept a file via drag-and-drop as well as click-to-browse, for
`.xlsx`, `.xls`, and `.csv` files, and SHALL reject unsupported file types with a clear
message.

#### Scenario: Drop a file to import

- **GIVEN** the import dialog is open with a store type selected
- **WHEN** the user drags an `.xlsx` file onto the drop zone
- **THEN** the file is accepted and the Import action becomes available

#### Scenario: Unsupported file rejected

- **WHEN** the user drops a file that is not `.xlsx` / `.xls` / `.csv`
- **THEN** the dialog shows an error and does not start the import
