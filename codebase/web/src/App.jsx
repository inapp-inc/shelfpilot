import { useEffect, useState } from "react";
import { api } from "./api.js";
import LayoutEditor from "./layout-editor/LayoutEditor.jsx";
import CatalogPage from "./catalog/CatalogPage.jsx";
import ProductFormDrawer from "./catalog/ProductFormDrawer.jsx";
import CategoryFormDrawer from "./catalog/CategoryFormDrawer.jsx";
import DashboardPage from "./modules/DashboardPage.jsx";
import LayoutsPortfolio from "./modules/LayoutsPortfolio.jsx";
import LayoutCreateModal, { EMPTY_CREATE_DRAFT } from "./modules/LayoutCreateModal.jsx";
import { NAV_MODULES, STORE_TYPES } from "./storeTypes.js";
import { pathForModule } from "./routes.js";
import { useAppRoute } from "./useAppRoute.js";
import { downloadCatalogImportTemplate, parseCatalogImportWorkbook } from "./catalog/importExcel.js";
import ImportDialog from "./catalog/ImportDialog.jsx";
import {
  VERTICALS,
  STATUS_META,
  PRODUCTS,
  flatCategories,
  initials,
} from "./referenceCatalog.js";

function LogoMark({ size = "lg" }) {
  return (
    <div className={`logo-mark ${size}`}>
      <div className="shelf-bars">
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function ToastStack({ toasts }) {
  return (
    <div className="toast-stack">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          {t.text}
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(() => {
    const raw = localStorage.getItem("shelfpilot.session");
    return raw ? JSON.parse(raw) : null;
  });
  const { route, navigate } = useAppRoute();
  const page = route.module;
  const editorLayoutId = page === "layouts" ? route.layoutId : null;
  const [vertical, setVertical] = useState("pharmacy");
  const [layouts, setLayouts] = useState([]);
  const [layout, setLayout] = useState(null);
  const [analyticsLayoutId, setAnalyticsLayoutId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [config, setConfig] = useState(null);
  const [audit, setAudit] = useState([]);
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [adminTab, setAdminTab] = useState("users");
  const [configForm, setConfigForm] = useState({ minAisleWidthMeters: 1.2, approvalWorkflowEnabled: true });
  const [newUser, setNewUser] = useState({ email: "", name: "", role: "Designer", password: "" });
  const [compareA, setCompareA] = useState("");
  const [compareB, setCompareB] = useState("");
  const [comparison, setComparison] = useState(null);
  const [catCategories, setCatCategories] = useState([]);
  const [catProducts, setCatProducts] = useState([]);
  const [selectedCatalogCategoryId, setSelectedCatalogCategoryId] = useState(null);
  const [productEditor, setProductEditor] = useState(null);
  const [categoryEditor, setCategoryEditor] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({
    email: "designer@shelfpilot.local",
    password: "password",
    role: "Designer",
  });
  const [portfolio, setPortfolio] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState(() => ({ ...EMPTY_CREATE_DRAFT }));
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(null);
  const [importOpen, setImportOpen] = useState(false);

  const token = session?.token;
  const role = session?.user?.role;
  const vMeta = VERTICALS[vertical];

  const catalogVertical = page === "layouts" && layout?.vertical ? layout.vertical : vertical;
  const cats = catCategories.length > 0 ? catCategories : flatCategories(catalogVertical);
  const products =
    catProducts.length > 0
      ? catProducts.map((p) => ({
          ...p,
          attr:
            p.attr ||
            (p.attributes ? Object.values(p.attributes).filter(Boolean).join(" · ") : ""),
        }))
      : (PRODUCTS[catalogVertical] || []).map((p) => ({ ...p, id: p.id || p.sku }));

  useEffect(() => {
    if (!token || (page !== "catalog" && page !== "layouts")) return;
    loadCatalog(catalogVertical).catch((e) => toast(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, page, catalogVertical]);

  useEffect(() => {
    if (page !== "layouts" || !layout?.vertical) return;
    if (layout.vertical !== vertical) setVertical(layout.vertical);
  }, [layout?.id, layout?.vertical, page]);

  useEffect(() => {
    if (config) {
      setConfigForm({
        minAisleWidthMeters: config.minAisleWidthMeters ?? vMeta.minAisle,
        approvalWorkflowEnabled: config.approvalWorkflowEnabled !== false,
      });
    }
  }, [config, vertical, vMeta.minAisle]);

  function persist(next) {
    setSession(next);
    if (next) localStorage.setItem("shelfpilot.session", JSON.stringify(next));
    else localStorage.removeItem("shelfpilot.session");
  }

  async function signOut() {
    if (token) {
      try {
        await api("/auth/logout", { token, method: "POST" });
      } catch {
        // ignore errors, always clear local session
      }
    }
    persist(null);
  }

  function toast(text) {
    const id = `t-${Date.now()}`;
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }

  async function refreshLayouts() {
    const q = statusFilter !== "all" ? `?status=${statusFilter}` : "";
    const data = await api(`/layouts${q}`, { token });
    setLayouts(data.items || []);
  }

  async function loadPortfolio() {
    const data = await api("/analytics/portfolio", { token });
    setPortfolio(data);
  }

  useEffect(() => {
    if (!token) return;
    refreshLayouts().catch((e) => toast(e.message));
    api(`/admin/config?vertical=${vertical}`, { token })
      .then(setConfig)
      .catch(() => {});
    if (page === "dashboard") {
      loadPortfolio().catch((e) => toast(e.message));
    }
  }, [token, vertical, statusFilter, page]);

  useEffect(() => {
    if (!token || !editorLayoutId) {
      setLayout(null);
      return;
    }
    api(`/layouts/${editorLayoutId}`, { token })
      .then(setLayout)
      .catch((e) => toast(e.message));
  }, [token, editorLayoutId]);

  async function onLogin(e) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");
    try {
      const data = await api("/auth/login", { method: "POST", body: loginForm });
      persist(data);
      navigate("/dashboard");
      toast(`Signed in as ${data.user.role}`);
    } catch (err) {
      setLoginError(err.message === "invalid_credentials" ? "Invalid email or password." : err.message);
    } finally {
      setLoginLoading(false);
    }
  }

  async function createLayout() {
    const storeType = STORE_TYPES.find((s) => s.id === createDraft.storeTypeId) || STORE_TYPES[0];
    const width = Number(createDraft.widthMeters);
    const depth = Number(createDraft.depthMeters);
    const polygon =
      createDraft.shape === "polygon"
        ? [
            { x: 0, y: 0 },
            { x: width, y: 0 },
            { x: width, y: depth },
            { x: 0, y: depth },
          ]
        : [];
    setCreating(true);
    try {
      const created = await api("/layouts", {
        token,
        method: "POST",
        body: {
          name: createDraft.name || "New Store",
          vertical: storeType.vertical,
          widthMeters: width,
          depthMeters: depth,
          heightMeters: Number(createDraft.heightMeters),
          shape: createDraft.shape,
          polygon,
        },
      });
      setCreateOpen(false);
      setCreateDraft({ ...EMPTY_CREATE_DRAFT });
      setVertical(storeType.vertical);
      await refreshLayouts();
      navigate(pathForModule("layouts", created.id));
      toast("Layout created");
    } finally {
      setCreating(false);
    }
  }

  function openLayout(l) {
    if (l.vertical) setVertical(l.vertical);
    navigate(pathForModule("layouts", l.id));
  }

  async function deleteLayout(l) {
    if (!window.confirm(`Delete layout "${l.name}"? This can't be undone.`)) return;
    try {
      await api(`/layouts/${l.id}`, { token, method: "DELETE" });
      if (editorLayoutId === l.id) navigate(pathForModule("layouts"));
      await refreshLayouts();
      toast(`Deleted "${l.name}"`);
    } catch (err) {
      toast(err.message);
    }
  }

  async function loadAdmin() {
    const [cfg, aud, usr] = await Promise.all([
      api(`/admin/config?vertical=${vertical}`, { token }),
      api("/admin/audit", { token }).catch(() => ({ items: [] })),
      api("/admin/users", { token }).catch(() => ({ items: [] })),
    ]);
    setConfig(cfg);
    setAudit(aud.items || []);
    setUsers(usr.items || []);
  }

  async function loadAnalytics() {
    if (!analyticsLayoutId) return;
    setAnalytics(await api(`/analytics/layouts/${analyticsLayoutId}/summary`, { token }));
  }

  async function runCompare() {
    if (!compareA || !compareB) return;
    const result = await api("/analytics/compare", {
      token,
      method: "POST",
      body: { layoutIdA: compareA, layoutIdB: compareB },
    });
    setComparison(result);
  }

  async function saveConfig(partial) {
    const body = {
      vertical,
      units: config?.units || "metric",
      minAisleWidthMeters: Number(partial.minAisleWidthMeters ?? configForm.minAisleWidthMeters),
      fixtureTemplates: config?.fixtureTemplates || [],
      complianceRules: config?.complianceRules || [],
      approvalWorkflowEnabled:
        partial.approvalWorkflowEnabled != null ? partial.approvalWorkflowEnabled : configForm.approvalWorkflowEnabled,
    };
    const updated = await api("/admin/config", { token, method: "PUT", body });
    setConfig(updated);
    toast("Configuration updated");
  }

  async function createUser(e) {
    e.preventDefault();
    try {
      const created = await api("/admin/users", { token, method: "POST", body: newUser });
      setUsers((u) => [...u, created]);
      setNewUser({ email: "", name: "", role: "Designer", password: "" });
      toast("User created");
    } catch (err) {
      toast(err.message);
    }
  }

  async function loadCatalog(v = vertical) {
    const [catRes, prodRes] = await Promise.all([
      api(`/categories?vertical=${v}`, { token }).catch(() => ({ items: [] })),
      api(`/products?vertical=${v}`, { token }).catch(() => ({ items: [] })),
    ]);
    setCatCategories(catRes.items || []);
    setCatProducts(prodRes.items || []);
  }

  function openProductEditor(partial = {}) {
    setProductEditor({
      id: null,
      name: "",
      sku: "",
      categoryId: partial.categoryId || cats[0]?.id || "",
      widthMeters: "0.2",
      heightMeters: "0.25",
      imageUrl: "",
      attributes: {},
      ...partial,
    });
  }

  async function saveProduct() {
    if (!productEditor) return;
    const attributes = { ...(productEditor.attributes || {}) };
    if (productEditor.widthMeters !== "" && productEditor.widthMeters != null) {
      attributes.widthMeters = Number(productEditor.widthMeters);
    }
    if (productEditor.heightMeters !== "" && productEditor.heightMeters != null) {
      attributes.heightMeters = Number(productEditor.heightMeters);
    }
    attributes.imageUrl = productEditor.imageUrl || "";
    const body = {
      name: productEditor.name,
      sku: productEditor.sku,
      categoryId: productEditor.categoryId,
      imageUrl: productEditor.imageUrl || "",
      attributes,
    };
    try {
      if (productEditor.id) {
        await api(`/products/${productEditor.id}`, { token, method: "PATCH", body });
        toast("Product updated");
      } else {
        await api("/products", { token, method: "POST", body });
        toast("Product created");
      }
      setProductEditor(null);
      await loadCatalog(catalogVertical);
    } catch (err) {
      toast(err.message);
    }
  }

  async function saveCategory() {
    if (!categoryEditor) return;
    try {
      const body = {
        name: categoryEditor.name,
        vertical: catalogVertical,
        parentId: categoryEditor.parentId || null,
        color: categoryEditor.color || "#A30A2A",
      };
      if (categoryEditor.id) {
        await api(`/categories/${categoryEditor.id}`, { token, method: "PATCH", body });
        toast("Category updated");
      } else {
        await api("/categories", { token, method: "POST", body });
        toast("Category created");
      }
      setCategoryEditor(null);
      await loadCatalog(catalogVertical);
    } catch (err) {
      toast(err.message);
    }
  }

  async function handleExport() {
    try {
      const data = await api(`/catalog/export?vertical=${vertical}`, { token });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${vertical}-catalog-export.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast("Export downloaded");
    } catch (err) {
      toast(err.message);
    }
  }

  async function handleImportFile(file, storeTypeId) {
    if (!file || importing) return;
    const selectedStoreType =
      STORE_TYPES.find((s) => s.id === storeTypeId) || STORE_TYPES.find((s) => s.vertical === vertical);
    const defaultVertical = selectedStoreType?.vertical || vertical;

    setImporting(true);
    setImportProgress({ phase: "read", percent: 8, message: "Reading Excel file…" });

    try {
      await new Promise((r) => setTimeout(r, 120));
      const buffer = await file.arrayBuffer();

      setImportProgress({ phase: "parse", percent: 28, message: "Parsing categories and products…" });
      const payload = parseCatalogImportWorkbook(buffer, { defaultVertical });
      const catCount = payload.categories.length;
      const prodCount = payload.products.length;

      setImportProgress({
        phase: "upload",
        percent: 55,
        message: `Uploading ${catCount} categor${catCount === 1 ? "y" : "ies"} and ${prodCount} product${prodCount === 1 ? "" : "s"}…`,
        detail: `${catCount} categories · ${prodCount} products`,
      });

      const result = await api("/catalog/import", {
        token,
        method: "POST",
        body: {
          categories: payload.categories,
          products: payload.products.map(({ vertical, categoryName, ...p }) => ({
            ...p,
            categoryName,
            vertical,
          })),
        },
      });

      const importedVerticals = [
        ...new Set([
          ...(result.verticals || []),
          ...payload.categories.map((c) => c.vertical),
        ]),
      ].filter(Boolean);

      const targetVertical =
        importedVerticals.find((v) => v === defaultVertical) ||
        defaultVertical ||
        importedVerticals[0] ||
        vertical;

      setImportProgress({
        phase: "refresh",
        percent: 82,
        message: "Refreshing product list…",
        detail: `Store type: ${VERTICALS[targetVertical]?.label || targetVertical}`,
      });

      setSelectedCatalogCategoryId(null);
      if (targetVertical !== vertical) setVertical(targetVertical);
      await loadCatalog(targetVertical);

      const successMsg = `Import successful — ${result.importedCategories} categor${result.importedCategories === 1 ? "y" : "ies"}, ${result.importedProducts} product${result.importedProducts === 1 ? "" : "s"} added`;
      setImportProgress({
        phase: "done",
        percent: 100,
        message: successMsg,
        detail: `Showing ${VERTICALS[targetVertical]?.label || targetVertical} catalog`,
      });
      toast(successMsg);
      setImportOpen(false);
    } catch (err) {
      const msg = err.message;
      let friendly = msg || "Import failed. Use the Excel template.";
      if (msg === "no_rows") friendly = "No valid rows found in the Excel file.";
      else if (msg === "empty_workbook") friendly = "The Excel file is empty.";
      setImportProgress({ phase: "error", percent: 0, message: friendly });
      toast(friendly);
    } finally {
      setImporting(false);
      setTimeout(() => setImportProgress(null), 2800);
    }
  }

  function handleDownloadImportTemplate() {
    try {
      downloadCatalogImportTemplate();
      toast("Template downloaded");
    } catch (err) {
      toast(err.message || "Could not download template");
    }
  }

  if (!session) {
    return (
      <>
        <div className="login-page fade">
          <div className="login-inner">
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              <LogoMark />
              <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.02em" }}>ShelfPilot</div>
              <div style={{ fontSize: 16, color: "#6b7280", textAlign: "center" }}>Design store layouts in 2D and 3D</div>
            </div>
            <form className="login-card" onSubmit={onLogin}>
              {loginError ? <div className="alert-error">{loginError}</div> : null}
              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  placeholder="you@shelfpilot.local"
                />
              </div>
              <div className="field">
                <label>Password</label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Role</label>
                <select value={loginForm.role} onChange={(e) => setLoginForm({ ...loginForm, role: e.target.value })}>
                  {["Designer", "Approver", "Viewer", "Admin"].map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </div>
              <button className="btn-primary" type="submit" style={{ marginTop: 6, padding: 13, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                {loginLoading ? <span className="spin" /> : null}
                <span>{loginLoading ? "Signing in…" : "Sign in"}</span>
              </button>
            </form>
            <div style={{ fontSize: 12, color: "#9aa1ab" }}>Built by the Foundry</div>
          </div>
        </div>
        <ToastStack toasts={toasts} />
      </>
    );
  }

  function navigateToModule(moduleId) {
    navigate(pathForModule(moduleId));
    if (moduleId === "admin") loadAdmin().catch((e) => toast(e.message));
    if (moduleId === "analytics") loadAnalytics().catch((e) => toast(e.message));
    if (moduleId === "dashboard") loadPortfolio().catch((e) => toast(e.message));
  }

  const statusMeta = (s) => STATUS_META[s] || STATUS_META.draft;

  return (
    <>
      <div className="app-shell fade">
        <header className="app-header">
          <div className="header-brand">
            <LogoMark size="sm" />
            <span>ShelfPilot</span>
          </div>
          <nav className="top-nav" aria-label="Main">
            {NAV_MODULES.map((n) => (
              <a
                key={n.id}
                href={n.path}
                className={`top-nav-item ${page === n.id ? "active" : ""}`}
                onClick={(e) => {
                  e.preventDefault();
                  navigateToModule(n.id);
                }}
              >
                <span className="nav-emoji">{n.emoji}</span>
                {n.label}
              </a>
            ))}
          </nav>
          <div className="header-actions">
            <div className="user-chip">
              <div className="avatar">{initials(session.user.name)}</div>
              <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{session.user.name}</span>
                <span style={{ fontSize: 11, color: "#9aa1ab" }}>{session.user.role}</span>
              </div>
            </div>
            <button className="btn-secondary" style={{ padding: "8px 14px", fontSize: 13 }} onClick={() => signOut()}>
              Sign out
            </button>
          </div>
        </header>

        <main className="main">
          <div className="content">
            {page === "dashboard" && (
              <DashboardPage
                portfolio={portfolio}
                layouts={layouts}
                token={token}
                onOpenLayout={openLayout}
              />
            )}

            {page === "layouts" && !editorLayoutId && (
              <LayoutsPortfolio
                layouts={layouts}
                statusFilter={statusFilter}
                onStatusFilter={setStatusFilter}
                onOpenLayout={openLayout}
                onNewLayout={() => setCreateOpen(true)}
                onDeleteLayout={deleteLayout}
                editDisabled={!["Designer", "Admin"].includes(role)}
              />
            )}

            {page === "layouts" && editorLayoutId && (
              <LayoutEditor
                layout={layout}
                setLayout={setLayout}
                token={token}
                role={role}
                vertical={layout?.vertical || vertical}
                config={config}
                categories={cats}
                products={products}
                toast={toast}
                onBack={() => navigate(pathForModule("layouts"))}
                onRefreshLayouts={refreshLayouts}
                onDeleteLayout={deleteLayout}
                statusMeta={statusMeta}
                onQuickAddProduct={(categoryId) => openProductEditor({ categoryId })}
                onRefreshCatalog={() => loadCatalog(catalogVertical).catch((e) => toast(e.message))}
              />
            )}

            {page === "catalog" && (
              <>
                <ImportDialog
                  open={importOpen}
                  defaultStoreTypeId={STORE_TYPES.find((s) => s.vertical === vertical)?.id}
                  importing={importing}
                  onImport={(file, storeTypeId) =>
                    handleImportFile(file, storeTypeId).catch((err) => toast(err.message))
                  }
                  onClose={() => !importing && setImportOpen(false)}
                />
                <CatalogPage
                  vertical={vertical}
                  verticalOptions={Object.entries(VERTICALS).map(([key, meta]) => ({ key, label: meta.label }))}
                  onVerticalChange={setVertical}
                  categories={cats}
                  products={products}
                  selectedCategoryId={selectedCatalogCategoryId}
                  onSelectCategory={setSelectedCatalogCategoryId}
                  importing={importing}
                  importProgress={importProgress}
                  onAddCategory={() =>
                    setCategoryEditor({ name: "", parentId: null, color: "#A30A2A" })
                  }
                  onEditCategory={(c) =>
                    setCategoryEditor({
                      id: c.id,
                      name: c.name || "",
                      parentId: c.parentId || null,
                      color: c.color || "#A30A2A",
                    })
                  }
                  onAddProduct={(categoryId) =>
                    openProductEditor({ categoryId: categoryId || selectedCatalogCategoryId || cats[0]?.id })
                  }
                  onEditProduct={(p) =>
                    openProductEditor({
                      id: p.id,
                      name: p.name || "",
                      sku: p.sku || "",
                      categoryId: p.categoryId || "",
                      widthMeters: String(p.attributes?.widthMeters ?? "0.2"),
                      heightMeters: String(p.attributes?.heightMeters ?? "0.25"),
                      imageUrl: p.imageUrl || p.attributes?.imageUrl || "",
                      attributes: p.attributes || {},
                    })
                  }
                  onImport={() => setImportOpen(true)}
                  onExport={() => handleExport()}
                  onDownloadTemplate={handleDownloadImportTemplate}
                  editDisabled={!["Designer", "Admin"].includes(role)}
                />
              </>
            )}

            {page === "analytics" && (
              <section className="fade" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h2 className="page-title">Analytics</h2>
                  <select
                    value={analyticsLayoutId || ""}
                    onChange={(e) => {
                      setAnalyticsLayoutId(e.target.value);
                      setTimeout(() => loadAnalytics().catch((err) => toast(err.message)), 0);
                    }}
                    style={{ padding: "9px 13px", borderRadius: 9, border: "1px solid #e5e7eb" }}
                  >
                    <option value="">Select layout</option>
                    {layouts.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
                {!analytics ? (
                  <button className="btn-primary" style={{ padding: "10px 16px", width: "fit-content" }} onClick={() => loadAnalytics().catch((e) => toast(e.message))}>
                    Load summary
                  </button>
                ) : (
                  <>
                    <div className="grid-cards">
                      {[
                        { label: "Utilization", value: `${analytics.utilizationPercent}%` },
                        { label: "Fixture count", value: String(analytics.fixtureCount) },
                        { label: "Capacity", value: String(analytics.capacity) },
                        { label: "Footprint", value: `${analytics.footprintSqm} m²` },
                      ].map((k) => (
                        <div key={k.label} className="panel">
                          <div className="muted" style={{ fontSize: 12 }}>{k.label}</div>
                          <div className="mono" style={{ fontSize: 28, fontWeight: 700, color: "#A30A2A", marginTop: 8 }}>
                            {k.value}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="panel">
                      <div className="section-label" style={{ marginBottom: 12 }}>Category allocation</div>
                      {(analytics.allocationByCategory || []).map((a) => (
                        <div key={a.categoryId} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                          <span style={{ width: 10, height: 10, borderRadius: 3, background: a.color }} />
                          <span style={{ flex: 1 }}>{a.categoryName}</span>
                          <span className="mono">{a.fixtureCount}</span>
                        </div>
                      ))}
                      {!analytics.allocationByCategory?.length ? <div className="muted">No mappings yet.</div> : null}
                    </div>
                  </>
                )}
                <div className="panel">
                  <div className="section-label" style={{ marginBottom: 12 }}>
                    Compare layouts
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <select value={compareA} onChange={(e) => setCompareA(e.target.value)} style={{ padding: "9px 13px", borderRadius: 9, border: "1px solid #e5e7eb" }}>
                      <option value="">Layout A</option>
                      {layouts.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                    <span className="muted" style={{ fontSize: 12.5, fontWeight: 700 }}>
                      vs
                    </span>
                    <select value={compareB} onChange={(e) => setCompareB(e.target.value)} style={{ padding: "9px 13px", borderRadius: 9, border: "1px solid #e5e7eb" }}>
                      <option value="">Layout B</option>
                      {layouts.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                    <button
                      className="btn-primary"
                      style={{ padding: "9px 16px" }}
                      disabled={!compareA || !compareB}
                      onClick={() => runCompare().catch((e) => toast(e.message))}
                    >
                      Compare
                    </button>
                  </div>
                  {comparison ? (
                    <div style={{ display: "flex", gap: 32, marginTop: 18, flexWrap: "wrap" }}>
                      <div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          Utilization Δ (B − A)
                        </div>
                        <div
                          className="mono"
                          style={{
                            fontSize: 26,
                            fontWeight: 700,
                            marginTop: 6,
                            color: comparison.utilizationDelta >= 0 ? "oklch(0.5 0.12 150)" : "#A30A2A",
                          }}
                        >
                          {comparison.utilizationDelta > 0 ? "+" : ""}
                          {comparison.utilizationDelta}%
                        </div>
                      </div>
                      <div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          Fixture count Δ (B − A)
                        </div>
                        <div
                          className="mono"
                          style={{
                            fontSize: 26,
                            fontWeight: 700,
                            marginTop: 6,
                            color: comparison.fixtureCountDelta >= 0 ? "oklch(0.5 0.12 150)" : "#A30A2A",
                          }}
                        >
                          {comparison.fixtureCountDelta > 0 ? "+" : ""}
                          {comparison.fixtureCountDelta}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>
            )}

            {page === "admin" && (
              <section className="fade">
                <h2 className="page-title" style={{ marginBottom: 16 }}>
                  Admin & Config
                </h2>
                <div className="admin-tabs">
                  {["users", "stores", "approval", "configuration", "audit"].map((t) => (
                    <button key={t} className={`admin-tab ${adminTab === t ? "active" : ""}`} onClick={() => setAdminTab(t)}>
                      {t === "users" ? "Users & Roles" : t === "stores" ? "Store Master" : t === "approval" ? "Approval Workflow" : t === "configuration" ? "Configuration" : "Audit Log"}
                    </button>
                  ))}
                </div>
                <div className="panel">
                  {adminTab === "users" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      <table>
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((u) => (
                            <tr key={u.id}>
                              <td>{u.name}</td>
                              <td>{u.email}</td>
                              <td>{u.role}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {role === "Admin" ? (
                        <form onSubmit={createUser} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                          <div className="field">
                            <label>Name</label>
                            <input value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} required />
                          </div>
                          <div className="field">
                            <label>Email</label>
                            <input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} required />
                          </div>
                          <div className="field">
                            <label>Role</label>
                            <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                              {["Designer", "Approver", "Viewer", "Admin"].map((r) => (
                                <option key={r}>{r}</option>
                              ))}
                            </select>
                          </div>
                          <div className="field">
                            <label>Password</label>
                            <input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required />
                          </div>
                          <button className="btn-primary" type="submit" style={{ padding: "10px 14px", gridColumn: "1 / -1" }}>
                            Create user
                          </button>
                        </form>
                      ) : (
                        <div className="muted">Only Admin can create users.</div>
                      )}
                    </div>
                  )}
                  {adminTab === "stores" && <div className="muted">Store master records sync from layout portfolio ({layouts.length} projects).</div>}
                  {adminTab === "approval" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ fontWeight: 700 }}>Layouts require Approver sign-off before publishing</div>
                      <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
                        <input
                          type="checkbox"
                          checked={configForm.approvalWorkflowEnabled}
                          disabled={role !== "Admin"}
                          onChange={(e) => {
                            const next = e.target.checked;
                            setConfigForm({ ...configForm, approvalWorkflowEnabled: next });
                            if (role === "Admin") {
                              saveConfig({ approvalWorkflowEnabled: next }).catch((err) => toast(err.message));
                            }
                          }}
                        />
                        Approval workflow enabled ({vMeta.label})
                      </label>
                    </div>
                  )}
                  {adminTab === "configuration" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div className="field" style={{ maxWidth: 280 }}>
                        <label>Store type / vertical</label>
                        <select
                          value={vertical}
                          onChange={(e) => setVertical(e.target.value)}
                          style={{ padding: "9px 12px", borderRadius: 9, border: "1px solid #e5e7eb", width: "100%" }}
                        >
                          {Object.entries(VERTICALS).map(([key, meta]) => (
                            <option key={key} value={key}>
                              {meta.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div style={{ fontWeight: 700 }}>Configuration — {vMeta.label}</div>
                      <div className="field">
                        <label>Min aisle width (m)</label>
                        <input
                          className="mono"
                          type="number"
                          step="0.1"
                          value={configForm.minAisleWidthMeters}
                          disabled={role !== "Admin"}
                          onChange={(e) => setConfigForm({ ...configForm, minAisleWidthMeters: e.target.value })}
                        />
                      </div>
                      {role === "Admin" ? (
                        <button className="btn-primary" style={{ padding: "10px 14px", width: "fit-content" }} onClick={() => saveConfig({}).catch((e) => toast(e.message))}>
                          Save configuration
                        </button>
                      ) : (
                        <div className="muted">Only Admin can save configuration.</div>
                      )}
                      <pre className="mono" style={{ whiteSpace: "pre-wrap", fontSize: 12, marginTop: 8 }}>
                        {JSON.stringify(config || { vertical, minAisleWidthMeters: vMeta.minAisle }, null, 2)}
                      </pre>
                    </div>
                  )}
                  {adminTab === "audit" && (
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {audit.slice(0, 20).map((a) => (
                        <li key={a.id} className="mono" style={{ fontSize: 12, marginBottom: 6 }}>
                          {a.at} · {a.actorEmail} · {a.action} · {a.detail}
                        </li>
                      ))}
                      {!audit.length ? <li className="muted">No audit events yet.</li> : null}
                    </ul>
                  )}
                </div>
              </section>
            )}
          </div>
        </main>
      </div>

      <LayoutCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        draft={createDraft}
        setDraft={setCreateDraft}
        submitting={creating}
        onSubmit={() => createLayout().catch((e) => toast(e.message))}
      />

      <ToastStack toasts={toasts} />

      <ProductFormDrawer
        open={!!productEditor}
        onClose={() => setProductEditor(null)}
        draft={productEditor}
        setDraft={setProductEditor}
        categories={cats}
        onSubmit={() => saveProduct()}
        editDisabled={!["Designer", "Admin"].includes(role)}
      />
      <CategoryFormDrawer
        open={!!categoryEditor}
        onClose={() => setCategoryEditor(null)}
        vertical={catalogVertical}
        categories={cats}
        draft={categoryEditor}
        setDraft={setCategoryEditor}
        onSubmit={() => saveCategory()}
        editDisabled={!["Designer", "Admin"].includes(role)}
      />
    </>
  );
}
