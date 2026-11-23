# DataGrip / IntelliJ Database Tools: PostgreSQL feature catalogue (state as of Nov 2026)

Scope: what DataGrip, and the Database Tools and SQL plugin in paid JetBrains IDEs, offers for PostgreSQL. The aim is to compare it with Tezgah. Tezgah already has connection folders and env colors, an SSH tunnel, transactional scripts, a tabbed console with history and autocomplete, a paged and filtered table view, a PK-editable grid with pending changes and SQL preview, and add-column with ALTER preview.

Release timeline used below:
- 2024.1: 3 Apr 2024
- 2024.2: 12 Aug 2024
- 2024.3: 14 Nov 2024
- 2025.1: 16 Apr 2025
- 2025.2: 6 Aug 2025 (search summary; the blog URL is dated 29 Jul 2025)
- 2025.3: 2 Dec 2025
- 2026.1: 26 Mar 2026
- 2026.2: 16 Jul 2026
- 2026.3: 5 Nov 2026

Source note: blog.jetbrains.com returned HTTP 403 to the fetcher. Release facts come from jetbrains.com "What's New" pages and help release notes. Some 2024.x and 2025.1 dates and details come from search-result summaries of JetBrains and ComponentSource pages, as marked.

## 1. Data sources & connection (introspection, schema filtering, read-only, transaction modes, colors, sessions)

### Takeaway
DataGrip's connection model goes well beyond host, user and password. It has three introspection levels, set per schema, with fragment introspection and smart refresh. It also offers a driver-level read-only flag, Auto or Manual transaction mode with an isolation level, three session-distribution modes, startup scripts, keep-alive and auto-disconnect, Kerberos and pgpass auth, cloud-account discovery, and data source templates synced through the JetBrains Account. Tezgah's prod-is-read-only plus env-color model is a subset of this.

### Cited Findings
- **PostgreSQL versions:** supported versions are 9.1–19. Default port 5432. Connection types are "default" (host/port/db) and "URL only". In URL-only mode the URL and credentials are stored in plain text and may appear in logs. Auth methods are pgpass, User & Password, No auth and Kerberos (GSS/SSPI on Windows). — [DataGrip PostgreSQL help](https://www.jetbrains.com/help/datagrip/postgresql.html)
- **Schema selection:** by default only the default database and schema are introspected. The Schemas tab selects more databases and schemas. Options include "Show internal system schemas" (pg_temp, pg_toast) and "Show template databases". The Database Explorer shows an "N of M" button. — [PostgreSQL help](https://www.jetbrains.com/help/datagrip/postgresql.html)
- **Filtering options:** the Schemas tab has "Schema pattern" and "Object filter". — [Data Sources and Drivers dialog](https://www.jetbrains.com/help/datagrip/data-sources-and-drivers-dialog.html)
- **Options tab, Connection section:**
  - **Read-only:** blocks edits in the data editor. Consoles may still write if the driver doesn't support read-only.
  - **Transaction control:** Auto or Manual commit mode, plus an isolation level.
  - **Time zone.**
  - **Run keep-alive query each N.**
  - **Auto-disconnect after N s.**
  - **Single database mode.**
  - **Session control:** see the 2026.2 item below.
  - **Startup script:** SQL that runs on every connect.
  - **Switch schema:** Automatic, Manual or Disable.
  - Source: [Data Sources and Drivers dialog](https://www.jetbrains.com/help/datagrip/data-sources-and-drivers-dialog.html)
- **Options tab, Introspection section:**
  - **Auto sync:** refreshes the explorer after DDL run from consoles.
  - **Default level.**
  - **Load sources for:** All, All excl. system, or None.
  - **Automatic introspection interval.**
  - **Virtual objects and attributes:** virtual FKs, columns and views kept in an external-data.xml file.
  - Source: [Data Sources and Drivers dialog](https://www.jetbrains.com/help/datagrip/data-sources-and-drivers-dialog.html)
- **Options tab, Other section:** per-data-source SQL Code style, "Before connection" tasks, and Session Templates. — [Data Sources and Drivers dialog](https://www.jetbrains.com/help/datagrip/data-sources-and-drivers-dialog.html)
- **SSH/SSL tab:** SSH tunnel with an SSH configuration and local port. SSL with a CA file, truststore, client certificate and client key. — [Data Sources and Drivers dialog](https://www.jetbrains.com/help/datagrip/data-sources-and-drivers-dialog.html)
- **Introspection levels:**
  - Level 1: names and signatures only; column types are "unknown".
  - Level 2: everything except source code.
  - Level 3: everything, including routine and view bodies.
  - Levels can be set per database or per schema, and children inherit. Icons in the explorer show the level.
  - Default levels depend on object count. Current schema: L3 if ≤1000 objects, L2 if ≤3000, otherwise L1. Non-current schemas never default to L3.
  - Fragment introspection fetches a single object's source on demand.
  - Source: [Introspection levels](https://www.jetbrains.com/help/datagrip/introspection-levels.html)
- **PostgreSQL-specific introspection (2025.2):** "Introspection by levels" for large databases, and PostgreSQL "Smart refresh", which after DDL refreshes only the objects the statement could have modified. — [What's New 2025.2](https://www.jetbrains.com/datagrip/whatsnew/2025-2/)
- **Sessions:**
  - 2024.1 simplified sessions so users no longer pick a session manually for queries. — search summary of [What's New 2024.1](https://jetbrains.com/datagrip/whatsnew/2024-1)
  - 2026.2 added a "Two sessions: shared and introspection" mode. The existing modes were renamed "Single shared session" and "Dedicated sessions" (the former default). — [2026.2 release notes](https://www.jetbrains.com/help/datagrip/2026.2/release-notes-datagrip.html)
  - The data editor has "Switch Session" to change or create a session. — [Data editor](https://www.jetbrains.com/help/datagrip/data-editor-and-viewer.html)
  - In 2026.3 the Database Output header has a session-client dropdown with "Manage sessions". — [2026.3 release notes](https://www.jetbrains.com/help/datagrip/2026.3/release-notes-datagrip.html)
- **Manual transactions (2026.3):**
  - Running COMMIT, ROLLBACK, END, ABORT or AND CHAIN in a console now updates the toolbar's Commit and Rollback buttons, for PostgreSQL among others.
  - PostgreSQL fixes: statements after COMMIT or ROLLBACK no longer fail; user SAVEPOINT and RELEASE SAVEPOINT work and no longer trigger introspection.
  - Consoles sharing a session share the transaction state.
  - "Automatically roll back a failed statement to an unnamed savepoint" stays on by default for the PostgreSQL family.
  - Source: [2026.3 release notes](https://www.jetbrains.com/help/datagrip/2026.3/release-notes-datagrip.html)
- **Data source templates (2026.1):** General and Advanced tab settings can be saved as templates in the JetBrains Account, excluding credentials, and reused in any JetBrains IDE. The Data Sources and Drivers dialog was restructured into Data Sources, Clouds, Drivers and DDL Mappings tabs. — [What's New 2026.1](https://www.jetbrains.com/datagrip/whatsnew/2026-1/)
- **Cloud accounts (2025.3):** connect AWS, Azure or GCP accounts and register their databases as data sources. Explorer folders were redesigned, are stored in a config file, can be empty and can be freely ordered. — search summary of [What's New 2025.3](https://www.jetbrains.com/datagrip/whatsnew/2025-3/)
- **2026.2 additions:**
  - Bundled JDBC drivers, including PostgreSQL 42.7.3, so no download is needed.
  - CLI `dataSources list/manage` commands that take JSON batches.
  - Reworked database colors and prefix-based grouping of schema objects.
  - Source: [2026.2 release notes](https://www.jetbrains.com/help/datagrip/2026.2/release-notes-datagrip.html)
- **Project trust (2026.3):** an untrusted project must be trusted before any DB connection, including Test Connection. Safe mode keeps connections disabled. — [2026.3 release notes](https://www.jetbrains.com/help/datagrip/2026.3/release-notes-datagrip.html)

### Inferences
- DataGrip's read-only mode is a per-data-source driver flag, and the docs warn that consoles may still write. Tezgah's prod read-only default with one-click write is a deliberate UX choice that DataGrip does not have as a built-in "env tag → policy" link.
- The most relevant depth gaps for Tezgah are:
  - Startup script per connection, for example `SET search_path` or `SET statement_timeout`.
  - Keep-alive and auto-disconnect.
  - pgpass as an auth method. Tezgah imports .pgpass instead.
  - Tracking transaction state when the user types COMMIT or ROLLBACK by hand.
  - An automatic unnamed savepoint so a failed statement doesn't abort the whole transaction (the PostgreSQL "current transaction is aborted" problem).
- Introspection levels only matter for very large schemas. Tezgah can probably get by with lazy loading per schema.

### Gaps
- Connection color: the Data Sources dialog page does not document a color option. 2026.2 mentions "reworked database colors" without detail. I knew from training that DataGrip has per-data-source and per-schema colors, but I didn't verify that against current docs.
- I didn't verify the exact current Read-only behaviour for PostgreSQL. pgjdbc's `setReadOnly` normally maps to `SET SESSION CHARACTERISTICS ... READ ONLY`, but I haven't confirmed that in DataGrip docs.

## 2. Query console & editor (completion, inspections, refactoring, formatting, parameters, explain plan, history, results)

### Takeaway
The editor is a full IDE language engine. It has schema-aware completion (including value completion and cloud/AI completion), inspections with quick-fixes, a set of refactorings (Rename, Introduce Variable, Subquery as CTE, Extract Routine), a configurable formatter, user parameters, a statement chooser, and a tree/flame-graph Explain Plan. Results go to a dedicated output window with session handling. Since 2025.3 "consoles" have become "query files".

### Cited Findings
- **Execution:**
  - Ctrl+Enter runs the statement under the caret. With several statements, a chooser offers "all" or one statement, and is configurable to always run the statement under the caret.
  - Running a selection executes only the selection, such as a subquery.
  - 2026.1 added "Execute Selection as Single Statement" for code the parser splits wrongly.
  - Sources: [Run a query](https://www.jetbrains.com/help/datagrip/run-a-query.html); [What's New 2026.1](https://www.jetbrains.com/datagrip/whatsnew/2026-1/)
- **User parameters:** regex-based patterns. Positional `\?\w+` treats each occurrence separately; named `\?(\w+)` treats same names as one parameter. DataGrip prompts for values on execute. — [Run a query](https://www.jetbrains.com/help/datagrip/run-a-query.html)
- **Cancel:**
  - The "Cancel Running Statements" toolbar or gutter button warns on a second click and offers to terminate the remote process or wait.
  - "Deactivate" stops the client while the query keeps running on the server.
  - Connection creation can also be cancelled.
  - 2025.2: hovering the gutter progress icon turns it into a cancel button.
  - Sources: [Run a query](https://www.jetbrains.com/help/datagrip/run-a-query.html); [What's New 2025.2](https://www.jetbrains.com/datagrip/whatsnew/2025-2/)
- **Long-running query notification** after 20 s, configurable. — [Run a query](https://www.jetbrains.com/help/datagrip/run-a-query.html)
- **Run SQL files and scripts:**
  - Two resolve modes: Playground (the console default) and Script (the local-file default), where `SET search_path TO` changes the context for later statements.
  - Files over 20 MB show only the first 2.5 MB.
  - "Execute to File" streams a SELECT straight to an export format.
  - Source: [Run a query](https://www.jetbrains.com/help/datagrip/run-a-query.html)
- **Query history:** Ctrl+Alt+E, filter by typing, double-click to paste. Delete a single record (2025.3). — [Run a query](https://www.jetbrains.com/help/datagrip/run-a-query.html); search summary of [What's New 2025.3](https://www.jetbrains.com/datagrip/whatsnew/2025-3/)
- **Local History and Git integration** for backups of query files. — [JetBrains features overview](https://lp.jetbrains.com/features-overview/)
- **Refactoring:**
  - Rename DB objects (Shift+F6), optionally in comments and strings, with a preview of usages in the Find window.
  - In-place rename of a column or alias that updates usages.
  - Introduce Variable (Ctrl+Alt+V).
  - Subquery as CTE.
  - Extract Routine, which turns a query into a table function (Ctrl+Alt+M).
  - Source: [Refactoring](https://www.jetbrains.com/help/datagrip/refactoring-source-code.html)
- **Completion and inspections:**
  - "Smart code completion, code inspections, on-the-fly error highlighting, quick-fixes, refactoring". — [features overview](https://lp.jetbrains.com/features-overview/)
  - 2024.1: GROUP BY column completion. 2024.2: automatic value completion. 2024.3: inspection for queries with too many JOINs, plus highlighting of all occurrences of selected text. — search summaries of [What's New 2024.1](https://jetbrains.com/datagrip/whatsnew/2024-1), [2024.2](https://jetbrains.com/datagrip/whatsnew/2024-2), [2024.3 notes](https://www.jetbrains.com/help/datagrip/2024.3/release-notes-datagrip.html)
- **Cloud and AI inline completion (2025.1.1, 2025.2):** suggests lines, blocks or whole scripts (Alt+Shift+\). It needs the AI Assistant plugin. — [What's New 2025.2](https://www.jetbrains.com/datagrip/whatsnew/2025-2/)
- **Floating toolbar on selection (2025.2)** with context and AI actions. Persistent "attached data source" per file. Reformat popup links straight to code style settings. — [What's New 2025.2](https://www.jetbrains.com/datagrip/whatsnew/2025-2/)
- **PostgreSQL syntax support:**
  - PG 18 (2026.1): OLD/NEW in RETURNING, WITHOUT OVERLAPS, PERIOD foreign keys, VIRTUAL generated columns, NOT ENFORCED and NOT VALID constraints. — [What's New 2026.1](https://www.jetbrains.com/datagrip/whatsnew/2026-1/)
  - PG 19 (2026.3): `ON CONFLICT DO SELECT ... RETURNING`, `WAIT FOR LSN`, `CREATE PUBLICATION ... EXCEPT`, plus minicatalogs updated with PG 19 functions. — [2026.3 release notes](https://www.jetbrains.com/help/datagrip/2026.3/release-notes-datagrip.html)
- **Explain Plan:**
  - 2026.1 toolbar dropdown with "Explain Plan" and "Explain Analyse".
  - A Query Plan tab next to Output and Result, with a per-row details panel and quick documentation on hover over table names.
  - A Flame Graph view with "Total Cost" and "Startup Cost" modes.
  - "Copy Original Query Plan" copies the native JSON, for PostgreSQL among others.
  - Source: [What's New 2026.1](https://www.jetbrains.com/datagrip/whatsnew/2026-1/)
  - 2026.2 restored the Raw view and the "Explain Plan (Raw)" and "Explain Analyse (Raw)" actions, plus a "Show Tree" button. — [2026.2 notes](https://www.jetbrains.com/help/datagrip/2026.2/release-notes-datagrip.html)
  - 2025.3 put an Explain Plan button on the query-file toolbar and added AI explanation and rewrite of plans. — search summary of [What's New 2025.3](https://www.jetbrains.com/datagrip/whatsnew/2025-3/)
- **Consoles become query files:**
  - 2025.3 retired the term "query console". Consoles migrate to query files stored in a project `queries` folder ("Migrate All"). — search summary of [What's New 2025.3](https://www.jetbrains.com/datagrip/whatsnew/2025-3/)
  - 2026.1: New Query File flow (Ctrl+Alt+Shift+Q), a "Query Files" folder under each data source in the explorer, and display options for schema colors and data source names on tabs. — [What's New 2026.1](https://www.jetbrains.com/datagrip/whatsnew/2026-1/)
  - 2026.2: customizable console names in tab headers. — [2026.2 notes](https://www.jetbrains.com/help/datagrip/2026.2/release-notes-datagrip.html)
- **Results UI (2026.3):**
  - A new "Database Output" tool window (Alt+8) replaces Services. Its header tabs are Output, Query Plan and Result.
  - Content follows the active editor tab.
  - "Open in Editor Tab" for a result set.
  - A SQL action popup shows the query behind a result, with rerun, copy and navigate.
  - Source: [2026.3 notes](https://www.jetbrains.com/help/datagrip/2026.3/release-notes-datagrip.html)
- **In-editor results:** the grid uses full editor width since 2024.3. — search summary of [2024.3 notes](https://www.jetbrains.com/help/datagrip/2024.3/release-notes-datagrip.html)
- **Cross-database queries (2026.3):**
  - A DuckDB-based in-memory "Workspace Data Source" lets one query join tables from different data sources, such as PostgreSQL with MySQL.
  - Syntax: `#ds.db.schema.table`, `#ds...table.#filter('cond')`, `#ds.#query('sql')`.
  - Source: [2026.3 notes](https://www.jetbrains.com/help/datagrip/2026.3/release-notes-datagrip.html)

### Inferences
- These are the high-value editor features Tezgah lacks, roughly in order of payoff versus effort:
  1. Statement-under-caret execution with a chooser.
  2. Named parameters (`:name` or `?name`) that prompt for values.
  3. Explain / Explain Analyze rendered as a tree with cost columns. A flame graph is a stretch goal.
  4. A formatter.
  5. Cancel that sends `pg_cancel_backend`.
  6. A long-query notification.
  7. "Execute to file".
- Rename refactoring and inspections need a real SQL parser and resolver, which is high effort. They're probably out of scope for a personal tool.
- The 2026.3 transaction-state tracking and the unnamed-savepoint-on-error behaviour fit Tezgah's "script in transaction, stop on error" rule directly.

### Gaps
- I didn't fetch a dedicated page for live templates, the full PostgreSQL inspection list, or formatter options. Their existence comes from the general features overview and my training knowledge, not from verified current docs.
- I didn't verify "Pin result tab" or multiple result tabs per query in current docs. They exist in older DataGrip versions as far as I know, but that's unconfirmed here.
- "Run in background" isn't documented as such. Queries already run asynchronously with gutter progress.

## 3. Database explorer (object types, DDL, navigation, quick doc, search)

### Takeaway
The explorer is the hub for navigation. It offers quick documentation with DDL (Ctrl+Q), jump to DDL or related symbols (Ctrl+Alt+B), full-text search across databases, folders and grouping, introspection-level icons, and since 2026.1 a "Query Files" node under each data source.

### Cited Findings
- Ctrl+Q previews a table's structure, including its CREATE DDL. — [Run a query](https://www.jetbrains.com/help/datagrip/run-a-query.html)
- From the grid, "Related Symbol" and DDL navigation (Ctrl+Alt+B) open related objects or definitions. "Full-Text Search" (Ctrl+Alt+Shift+F) searches data across one or more databases. — [Data editor](https://www.jetbrains.com/help/datagrip/data-editor-and-viewer.html)
- The object DDL can be generated to files (with several folder layouts), a console, or the clipboard. — [Export data](https://www.jetbrains.com/help/datagrip/export-data.html)
- 2024.2 "improved Search Everywhere", from the release title. — [search result: DataGrip 2024.2 blog title](https://blog.jetbrains.com/datagrip/2024/08/13/datagrip-2024-2-text-to-sql-scripted-loaders-improved-search-everywhere-and-more/)
- Explorer folders (2025.3) can be empty and are ordered freely. Prefix-based grouping of schema objects and deletion of non-empty folders came in 2026.2. — search summary of [2025.3](https://www.jetbrains.com/datagrip/whatsnew/2025-3/); [2026.2 notes](https://www.jetbrains.com/help/datagrip/2026.2/release-notes-datagrip.html)
- Create and Modify dialogs became non-modal in 2024.3. — search summary of [2024.3 notes](https://www.jetbrains.com/help/datagrip/2024.3/release-notes-datagrip.html)
- Virtual foreign keys, columns and views can be defined in external-data.xml, for example to navigate relations that have no real FK. — [Data Sources and Drivers dialog](https://www.jetbrains.com/help/datagrip/data-sources-and-drivers-dialog.html)

### Inferences
- Cheap wins for Tezgah: a quick-doc or DDL popup for any object, and "jump to DDL" from the grid or editor.
- Full-text data search across tables is a distinctive feature, implementable with per-table ILIKE over text columns.

### Gaps
- I didn't fetch a page that enumerates the PostgreSQL object kinds in the tree (views, materialized views, functions, procedures, triggers, sequences, indexes, constraints, roles, extensions, foreign tables, and so on). From training knowledge, DataGrip shows all of these, but that's unverified here.
- I didn't verify Find Usages or Go to Declaration from current docs.

## 4. Data editor / grid (filters, aggregates, value editor, transpose, FK navigation, export/import, compare, charts)

### Takeaway
The grid is DataGrip's deepest area. It has:
- A server-side WHERE/ORDER BY bar plus local per-column filters.
- An aggregate view.
- Table, Tree, Text and Transpose modes, a value editor and a record view.
- FK navigation both ways.
- Auto or Manual submit with a DML preview.
- Editable JOIN results.
- SQL-expression cell values.
- Heatmap coloring, column pinning and Manage Columns.
- Pluggable extractors and loaders, Compare Data, charts and a geo viewer.

### Cited Findings
- **Views:**
  - "View as" Table, Tree (expands nested JSON and arrays), Text (rendered by the current extractor), and Transpose (can be the default for tables).
  - Value Editor (Shift+Enter).
  - Record View side panel.
  - Source: [Data editor](https://www.jetbrains.com/help/datagrip/data-editor-and-viewer.html)
- **Sort and filter:**
  - Header-click sort or an ORDER BY field. Server-side (new query) versus client-side (current page only).
  - Filter conditions or a WHERE field.
  - "Enable Local Filter" adds a filter to every column.
  - Find on Current Page (Ctrl+F).
  - 2025.2 added "Clear Local Filter For All Columns".
  - Sources: [Data editor](https://www.jetbrains.com/help/datagrip/data-editor-and-viewer.html); [What's New 2025.2](https://www.jetbrains.com/datagrip/whatsnew/2025-2/)
- **Aggregates:** "Show Aggregate View" summarizes selected cells. Copy Aggregation Result (SUM by default). A status-bar aggregator widget picks the function. — [Data editor](https://www.jetbrains.com/help/datagrip/data-editor-and-viewer.html)
- **Editing:**
  - Set DEFAULT (Ctrl+Alt+D) and NULL (Ctrl+Alt+N).
  - Generate UUID, Load File, Save LOB.
  - Change Display Type and Set Highlighting Language per cell.
  - Revert Selected.
  - Add, Delete and Clone rows. Go To Row (column:row).
  - Source: [Data editor](https://www.jetbrains.com/help/datagrip/data-editor-and-viewer.html)
- **UUID editing (2024.1):** Generate UUID action; UUID editing in any column, including binary(16). — search summary of [What's New 2024.1](https://jetbrains.com/datagrip/whatsnew/2024-1)
- **SQL Expression mode (2026.2):** a cell value can be an expression such as `NOW()` or `gen_random_uuid()`. It is inserted verbatim into the generated UPDATE or INSERT and works for multi-cell edits. — [2026.2 notes](https://www.jetbrains.com/help/datagrip/2026.2/release-notes-datagrip.html)
- **Submit:**
  - Submit (Ctrl+Enter).
  - Transaction Mode: Auto commits each submit; Manual accumulates changes until "Submit and Commit" or Roll Back.
  - "Preview Pending Changes" shows the DML.
  - The isolation level is selectable.
  - Source: [Data editor](https://www.jetbrains.com/help/datagrip/data-editor-and-viewer.html)
- **Editable JOIN results (2025.2):**
  - Cells in SELECT ... JOIN results are editable, with Revert, Preview Pending Changes, Submit and a DML Preview dialog.
  - Not supported: UNION, self-joins, computed columns.
  - Each row needs unique identifying fields.
  - Source: [What's New 2025.2](https://www.jetbrains.com/datagrip/whatsnew/2025-2/)
- **FK navigation:** "Related Rows" (F4) goes to rows this row references, or rows that reference it, with a popup when there are several. — [Data editor](https://www.jetbrains.com/help/datagrip/data-editor-and-viewer.html)
- **Paging and refresh:**
  - Page size control, Ctrl+Alt+Up/Down between pages, Reload Page (Ctrl+F5).
  - "Update Interval" auto-refreshes a table.
  - Cancel (Ctrl+F2).
  - 2024.3 moved the paging control to a floating bottom-center toolbar.
  - Sources: [Data editor](https://www.jetbrains.com/help/datagrip/data-editor-and-viewer.html); search summary of [2024.3 notes](https://www.jetbrains.com/help/datagrip/2024.3/release-notes-datagrip.html)
- **Columns (2026.3):**
  - Pin Column(s) or Pin Columns Up to Here; pinned columns stay fixed with a blue divider.
  - Fit Columns to Window and Reset Columns Width.
  - Manage Columns popup (Ctrl+F12): search, show/hide, reorder (Alt+Up/Down), copy names and types, types shown.
  - Source: [2026.3 notes](https://www.jetbrains.com/help/datagrip/2026.3/release-notes-datagrip.html)
- **Grid heatmap (2025.2):** Diverging or Sequential coloring per table, per column, or Boolean-only. — [What's New 2025.2](https://www.jetbrains.com/datagrip/whatsnew/2025-2/)
- **Export:**
  - Extractors: TXT, CSV/DSV (configurable formats), JSON, XML, Markdown, Excel (xlsx, optionally with a "Query" sheet), and custom scripted extractors via an API.
  - Options include "Skip computed/generated columns" and "Add table definition (DDL)".
  - Targets: file, clipboard, or "Export Table to Clipboard", which copies the whole table regardless of page size.
  - Sources: [Export data](https://www.jetbrains.com/help/datagrip/export-data.html); [Data editor](https://www.jetbrains.com/help/datagrip/data-editor-and-viewer.html)
- **Import:**
  - CSV/TSV/DSV through an Import dialog with a mapping tree (file→table, table→table, query→table).
  - Column mapping, a preview with editable generated DDL, new or existing table, "First row is header", "Insert inconvertible values as null".
  - Dragging a file onto a schema creates a table.
  - Source: [Import data](https://www.jetbrains.com/help/datagrip/import-data.html)
  - 2024.2 added scripted loaders for Excel, JSON, Parquet and Shapefile. — search summary of [What's New 2024.2](https://jetbrains.com/datagrip/whatsnew/2024-2)
- **Copy between databases:** "Copy Tables to" or drag and drop to another schema or data source, with mapping. "Copy to Database" from the grid. — [Import data](https://www.jetbrains.com/help/datagrip/import-data.html); [Data editor](https://www.jetbrains.com/help/datagrip/data-editor-and-viewer.html)
- **Compare Data:** compare the current table with another, with a column tolerance and the option to ignore an extra column. — [Data editor](https://www.jetbrains.com/help/datagrip/data-editor-and-viewer.html)
- **Visualization:** "Show Chart" opens data visualization. "Show Geo Viewer" handles geospatial data, including PostGIS; it moved to the data editor toolbar in 2026.1. — [Data editor](https://www.jetbrains.com/help/datagrip/data-editor-and-viewer.html); [What's New 2026.1](https://www.jetbrains.com/datagrip/whatsnew/2026-1/)
- **Query behind a result:** "View Query", "Copy Query to Console", "Copy Query to Clipboard". — [Data editor](https://www.jetbrains.com/help/datagrip/data-editor-and-viewer.html)
- **CSV and TSV files** can be opened and edited as tables ("Edit as Table"). — [Data editor](https://www.jetbrains.com/help/datagrip/data-editor-and-viewer.html)

### Inferences
- Tezgah already matches the core: a PK-based editable grid with pending changes and SQL preview.
- Grid features worth considering, in rough order of value for a PostgreSQL daily driver:
  1. FK "Related Rows" navigation.
  2. Value editor or Tree view for json/jsonb and arrays.
  3. Set NULL / DEFAULT actions.
  4. SQL-expression cell values such as `now()`.
  5. Copy the selection as CSV, Markdown or INSERT.
  6. Aggregate of the selection in the status bar.
  7. Transpose or record view.
  8. Column pin, hide and reorder.
  9. Client-side quick filter.
  10. Export of the whole result to CSV, JSON or xlsx.
- Charts, Compare Data, heatmaps, scripted loaders and extractors are DataGrip "power" features with lower priority.

### Gaps
- The visualize-data help page URL returned 404, so I couldn't verify chart types or details.
- The export page didn't explicitly list "SQL INSERT" or "SQL UPDATE" extractors, though they exist per training knowledge. That's unverified here.

## 5. Schema operations (modify table, DDL generation, schema compare, migration, pg_dump/restore, data copy)

### Takeaway
DataGrip offers:
- Non-modal Create and Modify dialogs.
- DDL generation to files, consoles or the clipboard.
- A full Compare Structure and Migration dialog that diffs two schemas or tables (even across servers) and generates a selectable migration script with many options.
- GUI wrappers for pg_dump, pg_restore and psql, including Docker and WSL paths.
- Table copy between data sources with mapping.

### Cited Findings
- **Compare Structure With** (Ctrl+D) works on two objects of the same type, which may be on different servers. The Migration dialog:
  - Color-codes Added, Modified and To be deleted.
  - Has "Object Properties Diff" and "DDL Diff" tabs, plus Show identical and Swap.
  - Generates a "Script Preview" so the target matches the origin. You can Execute it or "Open Query in Console", and per-change checkboxes include or exclude items.
  - Options cover schema qualification, ignoring owner, grants or column order, skipping extension-owned objects or routine bodies, and reformatting with the code style.
  - Source: [Compare structures](https://www.jetbrains.com/help/datagrip/differences-viewer-for-database-objects.html)
- **"Export with 'pg_dump'":**
  - The executable can be local, in Docker or under WSL.
  - Statement styles: COPY, `--inserts`, `--column-inserts`.
  - Formats: plain, directory, custom, tar.
  - Options: Clean, If Exists, Create database, Data only, and object selection.
  - Source: [Export data](https://www.jetbrains.com/help/datagrip/export-data.html)
- **Restore:** with pg_restore (custom or directory dumps) or psql (SQL dumps) at schema, database or table level, with the tool path (local or Docker) and CLI options. It requires a correct JDBC URL. — [Import data](https://www.jetbrains.com/help/datagrip/import-data.html)
- **Run SQL Script** on a data source or schema from the explorer. — [Import data](https://www.jetbrains.com/help/datagrip/import-data.html)
- **Create and Modify dialogs** became non-modal in 2024.3. — search summary of [2024.3 notes](https://www.jetbrains.com/help/datagrip/2024.3/release-notes-datagrip.html)

### Inferences
- Tezgah's add-column-with-ALTER-preview is a narrow slice of the Modify Table dialog. Rename column, change type, defaults, NOT NULL, and index or constraint creation are the natural next steps, but the project CLAUDE.md puts schema design out of scope.
- A pg_dump/pg_restore wrapper is cheap in a Node backend: spawn the binary with the credentials via PGPASSWORD or a temporary pgpass. It's a meaningful "IntelliJ parity" item for backups.
- Schema compare is a large feature. A light version could be done by comparing `pg_dump --schema-only` text diffs.

### Gaps
- I didn't fetch the Modify Table dialog page, so its PostgreSQL-specific tabs (partitions, policies, storage parameters) are unverified.

## 6. Newer features 2024–2026 (AI, sessions, UI, notable releases)

### Takeaway
From 2024 to 2026 most effort went into AI: schema-attached chat, text-to-SQL with diff, Explain or Fix with AI on errors, cloud completion, @dbObject context, AI plan analysis, then agents (Claude Agent and Codex in 2026.1, agent skills and MCP tools in 2026.2, JetBrains Air in 2026.3). Alongside that came UI modernization: the New UI as default, the Islands theme, the Database Output window, and query files instead of consoles. Explain Plan, sessions and transactions were reworked, and cross-database queries arrived through a DuckDB workspace.

### Cited Findings
- **2024.1 (3 Apr 2024):** AI Assistant can attach schemas as context and remember that choice. Simplified sessions. Generate UUID. GROUP BY completion. — search summary of [What's New 2024.1](https://jetbrains.com/datagrip/whatsnew/2024-1)
- **2024.2 (12 Aug 2024):** New UI is the default, with Classic UI as a plugin. Text-to-SQL in the editor. Automatic value completion. Selecting a whole column by clicking its header. Scripted import loaders (Excel, JSON, Parquet, Shapefile). Improved Search Everywhere. — search summary of [What's New 2024.2](https://jetbrains.com/datagrip/whatsnew/2024-2)
- **2024.3 (14 Nov 2024):** "Explain with AI" and "Fix with AI" on query errors. Text-to-SQL shows a diff. Floating paging control. Full-width in-editor results. Non-modal Create and Modify dialogs. Too-many-JOINs inspection. — search summary of [2024.3 notes](https://www.jetbrains.com/help/datagrip/2024.3/release-notes-datagrip.html)
- **2025.1 (16 Apr 2025):** "Explain with AI" auto-attaches the schema. More models. 2025.1.1 enhanced SQL cloud completion. — search summary of [What's New 2025.1](https://www.jetbrains.com/datagrip/whatsnew/2025-1/)
- **2025.2 (Aug 2025):** @dbObject context in AI chat. Cloud completion. Introspection levels and smart refresh for PostgreSQL. Editable JOIN results. Grid heatmap. Floating toolbar. — [What's New 2025.2](https://www.jetbrains.com/datagrip/whatsnew/2025-2/)
- **2025.3 (2 Dec 2025):**
  - Consoles migrated to query files.
  - Cloud provider connections.
  - Redesigned explorer folders.
  - AI explanation and rewrite of query plans.
  - Explain Plan button on the toolbar; per-record history deletion.
  - Islands theme is the default, and the main menu was redesigned.
  - 2025.3.3 (9 Jan 2026) changed the Postgres formatter.
  - Source: search summary of [What's New 2025.3](https://www.jetbrains.com/datagrip/whatsnew/2025-3/)
- **2026.1 (26 Mar 2026):**
  - Claude Agent and Codex in AI Chat.
  - Create a SQL file from chat with the data source attached.
  - AI consent settings: schema access, data access, schema modification, data modification.
  - MCP server DB tools: list schemas and objects, see running queries, execute or cancel, preview data as CSV.
  - Data source templates. PG 18 syntax. Explain Plan flow redesign with a flame graph.
  - Source: [What's New 2026.1](https://www.jetbrains.com/datagrip/whatsnew/2026-1/)
- **2026.2 (16 Jul 2026):**
  - Agent skills: database-tools, database-connection-management, database-text-to-sql.
  - MCP tools `create_database_connection` and `edit_database_connection`.
  - Agents keep earlier results, auto-introspect objects they create, and log their queries to history.
  - CLI dataSources commands. Bundled JDBC drivers. Two-session mode. SQL Expression cell mode. Raw Explain restored.
  - Interactive onboarding tour and a non-modal Welcome screen.
  - Source: [2026.2 notes](https://www.jetbrains.com/help/datagrip/2026.2/release-notes-datagrip.html)
- **2026.3 (5 Nov 2026):**
  - JetBrains Air bundled for ACP agents (Claude Agent, Codex, Gemini, Copilot, Junie and others); free "Junie Lite".
  - SQL snippets in chat can run against a data source; agent CSV output opens in the data editor.
  - Token-saving object links via MCP.
  - Database Output tool window. Column pinning and Manage Columns. Manual-transaction state tracking. Cross-database queries via a DuckDB Workspace Data Source. Full DuckDB support. Project trust gate. PG 19 syntax.
  - Sources: [2026.3 notes](https://www.jetbrains.com/help/datagrip/2026.3/release-notes-datagrip.html); search summary of [DataGrip 2026.3 help/AI pages](https://www.jetbrains.com/help/datagrip/2026.3/air-in-jetbrains-ides.html)
- **Licensing:** DataGrip is free for non-commercial use, and the same feature set ships in paid JetBrains IDEs through the Database Tools and SQL plugin. — [features overview](https://lp.jetbrains.com/features-overview/)

### Inferences
- The AI and agent direction (MCP tools exposing schemas, query execution and cancel) is the biggest recent investment. For Tezgah, the cheapest analogue would be a tiny local MCP or HTTP endpoint exposing schema listing and read-only queries. That conflicts with Tezgah's strict localhost and token model only if exposed carelessly.
- Several 2025–2026 UX items are directly relevant to Tezgah's scope and low-cost:
  - Editable JOIN results.
  - SQL-expression cells.
  - Column pinning and Manage Columns.
  - COMMIT/ROLLBACK state sync.
  - Copying the original JSON plan.
  - The SQL popup showing the query behind a result.

### Gaps
- I couldn't fetch the full JetBrains blog posts (HTTP 403), so the 2024.x, 2025.1 and 2025.3 items rely on search-result summaries rather than the primary page text.
- I found no pricing details for the AI features.
