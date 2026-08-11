import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "./api.js";
import ToastStack from "./components/ToastStack.jsx";
import AlertBanner from "./components/AlertBanner.jsx";
import FieldError from "./components/FieldError.jsx";
import {
  friendlyError,
  validateLayoutCreate,
  validateUser,
  validateFixtureTemplates,
} from "./validationMessages.js";
import LayoutEditor from "./layout-editor/LayoutEditor.jsx";
import CatalogPage from "./catalog/CatalogPage.jsx";
import ProductFormDrawer from "./catalog/ProductFormDrawer.jsx";
import { inchesInputFromMeters, lbInputFromKg } from "./units.js";
import { normalizeStorageType, productStorageType, resolveCategoryStorageType } from "./storageType.js";
import CategoryFormDrawer from "./catalog/CategoryFormDrawer.jsx";
import DashboardPage from "./modules/DashboardPage.jsx";
import LayoutsPortfolio from "./modules/LayoutsPortfolio.jsx";
import ShopperKioskPage from "./modules/ShopperKioskPage.jsx";
import AdminShopperPanel from "./modules/AdminShopperPanel.jsx";
import LayoutCreateModal, { EMPTY_CREATE_DRAFT } from "./modules/LayoutCreateModal.jsx";
import FixtureTemplatesEditor from "./modules/FixtureTemplatesEditor.jsx";
import { fixtureTemplatesForVertical } from "./fixtureCatalog.js";
import { NAV_MODULES, STORE_TYPES, mixForStoreType } from "./storeTypes.js";
import { pathForModule } from "./routes.js";
import { resolveAssetUrl } from "./assetUrl.js";
import { useAppRoute } from "./useAppRoute.js";
import { downloadCatalogImportTemplate, parseCatalogImportWorkbook } from "./catalog/importExcel.js";
import { catalogVerticalsForLayout, mergeCategoriesForLayout } from "./layout-editor/categoryFilter.js";
import ImportDialog from "./catalog/ImportDialog.jsx";
import {
  VERTICALS,
  STATUS_META,
  PRODUCTS,
  flatCategories,
  initials,
} from "./referenceCatalog.js";
import {
  adminTabsForRole,
  adminTabLabel,
  canAccessModule,
  canEditCatalog,
  canEditLayouts,
  canManageUsers,
  defaultModuleForRole,
  isCustomerRole,
  navModulesForRole,
  shopPathForUser,
} from "./rolePermissions.js";

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

export default function App() {
  const [session, setSession] = useState(() => {
    const raw = localStorage.getItem("shelfpilot.session");
    return raw ? JSON.parse(raw) : null;
  });
  const { route, navigate } = useAppRoute();
  const page = route.module;
  const editorLayoutId = page === "layouts" ? route.layoutId : null;
  const shopLayoutId = page === "shop" ? route.layoutId : null;
  const [vertical, setVertical] = useState("pharmacy");
  const [layouts, setLayouts] = useState([]);
  const [layout, setLayout] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [config, setConfig] = useState(null);
  const [audit, setAudit] = useState([]);
  const [users, setUsers] = useState([]);
  const [adminTab, setAdminTab] = useState("users");
  const [configForm, setConfigForm] = useState({
    minAisleWidthMeters: 1.2,
    approvalWorkflowEnabled: true,
    fixtureTemplates: [],
  });
  const [createConfig, setCreateConfig] = useState(null);
  const [newUser, setNewUser] = useState({
    email: "",
    name: "",
    role: "Designer",
    password: "",
    shopperLayoutId: "",
  });
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
  const [createOpen, setCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState(() => ({ ...EMPTY_CREATE_DRAFT }));
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [userFormErrors, setUserFormErrors] = useState({});
  const [configSaveError, setConfigSaveError] = useState("");

  const token = session?.token;
  const role = session?.user?.role;
  const vMeta = VERTICALS[vertical];

  const catalogVertical = page === "layouts" && layout?.vertical ? layout.vertical : vertical;
  const configVertical = page === "layouts" && layout?.vertical ? layout.vertical : vertical;
  const cats =
    catCategories.length > 0 ? catCategories : token ? [] : flatCategories(catalogVertical);
  const products =
    catProducts.length > 0
      ? catProducts.map((p) => ({
          ...p,
          attr:
            p.attr ||
            (p.attributes ? Object.values(p.attributes).filter(Boolean).join(" · ") : ""),
        }))
      : token
        ? []
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
        fixtureTemplates: config.fixtureTemplates?.length ? [...config.fixtureTemplates] : [],
      });
    }
  }, [config, vertical, vMeta.minAisle]);

  useEffect(() => {
    if (!createOpen || !token) {
      setCreateConfig(null);
      return;
    }
    const storeType = STORE_TYPES.find((s) => s.id === createDraft.storeTypeId) || STORE_TYPES[0];
    api(`/admin/config?vertical=${storeType.vertical}`, { token })
      .then(setCreateConfig)
      .catch(() => setCreateConfig(null));
  }, [createOpen, createDraft.storeTypeId, token]);

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

  function dismissToast(id) {
    setToasts((t) => t.filter((x) => x.id !== id));
  }

  function toast(text, opts = {}) {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const type = opts.type || (opts.error ? "error" : opts.success ? "success" : opts.warning ? "warning" : "info");
    const duration = opts.duration ?? (type === "error" ? 8000 : 5000);
    setToasts((t) => [...t, { id, text, type }]);
    if (duration > 0) {
      setTimeout(() => dismissToast(id), duration);
    }
  }

  useEffect(() => {
    if (!token) return;
    api("/auth/me", { token }).catch((err) => {
      if (err.status === 401) {
        persist(null);
        toast("Session expired — please sign in again.");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!session || !role) return;
    // Public kiosk URLs are open to everyone — do not RBAC-redirect away from them.
    if (page === "shop" && route.layoutId) return;
    if (!canAccessModule(role, page)) {
      const target =
        role === "Customer"
          ? shopPathForUser(session.user) || pathForModule("dashboard")
          : pathForModule(defaultModuleForRole(role));
      navigate(target, { replace: true });
    }
  }, [session, role, page, route.layoutId, navigate]);

  useEffect(() => {
    if (page !== "admin" || !role) return;
    const tabs = adminTabsForRole(role);
    if (tabs.length && !tabs.includes(adminTab)) setAdminTab(tabs[0]);
  }, [page, role, adminTab]);

  async function refreshLayouts() {
    const q = statusFilter !== "all" ? `?status=${statusFilter}` : "";
    const data = await api(`/layouts${q}`, { token });
    setLayouts(data.items || []);
  }

  useEffect(() => {
    if (!token) return;
    refreshLayouts().catch((e) => toast(e.message));
    api(`/admin/config?vertical=${configVertical}`, { token })
      .then(setConfig)
      .catch(() => {});
  }, [token, configVertical, statusFilter, page]);

  const activeLayoutId = editorLayoutId || shopLayoutId;

  useEffect(() => {
    if (!token || !activeLayoutId) {
      setLayout(null);
      return;
    }
    api(`/layouts/${activeLayoutId}`, { token })
      .then(setLayout)
      .catch((e) => toast(e.message));
  }, [token, activeLayoutId]);

  useEffect(() => {
    if (!token || !activeLayoutId || !layout?.vertical) return;
    loadCatalog(layout.vertical).catch((e) => toast(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, activeLayoutId, layout?.vertical]);

  async function onLogin(e) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");
    try {
      const data = await api("/auth/login", { method: "POST", body: loginForm });
      persist(data);
      let target = pathForModule(defaultModuleForRole(data.user.role));
      if (data.user.role === "Customer") {
        target = shopPathForUser(data.user) || target;
      }
      navigate(target);
      toast(`Signed in as ${data.user.role}`, { type: "success" });
    } catch (err) {
      setLoginError(friendlyError(err, "Sign in failed. Check your email and password."));
    } finally {
      setLoginLoading(false);
    }
  }

  async function createLayout() {
    const fromFloorPlan = createDraft.footprintMode === "floorPlan" && createDraft.floorPlanAnalyzed;
    const draftForValidation = fromFloorPlan
      ? {
          ...createDraft,
          heightMeters: createDraft.heightMeters || 3.2,
          shape: "rectangle",
        }
      : createDraft;
    const check = validateLayoutCreate(draftForValidation);
    if (!check.ok) {
      toast(Object.values(check.errors)[0], { type: "error" });
      return false;
    }
    const storeType = STORE_TYPES.find((s) => s.id === createDraft.storeTypeId) || STORE_TYPES[0];
    const width = Number(draftForValidation.widthMeters);
    const depth = Number(draftForValidation.depthMeters);
    const fullStorePolygon = [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: depth },
      { x: 0, y: depth },
    ];
    const shape = fromFloorPlan ? "polygon" : createDraft.shape;
    const polygon = fromFloorPlan || shape === "polygon" ? fullStorePolygon : [];
    setCreating(true);
    try {
      const body = {
        name: createDraft.name || "New Store",
        vertical: storeType.vertical,
        widthMeters: width,
        depthMeters: depth,
        heightMeters: Number(draftForValidation.heightMeters) || 3.2,
        shape,
        polygon,
      };
      if (fromFloorPlan) {
        body.floorPlanImport = {
          sourceFileName: createDraft.floorPlanSourceFileName || createDraft.floorPlanFileName,
          sourceType: createDraft.floorPlanSourceType || "image",
          dimensionSource: createDraft.floorPlanDimensionSource || "manual",
          matchedText: createDraft.floorPlanMatchedText || null,
          pageIndex: createDraft.floorPlanPageIndex ?? 0,
        };
        body.autoGenerateFixtures = true;
        body.categoryMix = mixForStoreType(createDraft.storeTypeId);
      }
      const created = await api("/layouts", {
        token,
        method: "POST",
        body,
      });
      setCreateOpen(false);
      setCreateDraft({ ...EMPTY_CREATE_DRAFT });
      setVertical(storeType.vertical);
      await refreshLayouts();
      navigate(pathForModule("layouts", created.id));
      toast(
        fromFloorPlan
          ? `Layout built from ${createDraft.floorPlanFileName || "floor plan"} — ${created.shelves?.length || 0} shelves placed`
          : "Layout created",
        { type: "success" }
      );
    } catch (err) {
      toast(friendlyError(err), { type: "error" });
      throw err;
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
      toast(`Deleted "${l.name}"`, { type: "success" });
    } catch (err) {
      toast(friendlyError(err), { type: "error" });
    }
  }

  async function cloneLayout(l) {
    if (!window.confirm(`Duplicate "${l.name}" as a new draft layout?`)) return;
    try {
      const created = await api(`/layouts/${l.id}/clone`, {
        token,
        method: "POST",
        body: { name: `${l.name} (copy)` },
      });
      await refreshLayouts();
      if (created.vertical) setVertical(created.vertical);
      navigate(pathForModule("layouts", created.id));
      toast(`Duplicated as "${created.name}"`, { type: "success" });
    } catch (err) {
      toast(friendlyError(err), { type: "error" });
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

  async function saveConfig(partial) {
    setConfigSaveError("");
    const rawTemplates = partial.fixtureTemplates ?? configForm.fixtureTemplates ?? config?.fixtureTemplates ?? [];
    const templateCheck = validateFixtureTemplates(rawTemplates);
    if (!templateCheck.ok) {
      const msg = templateCheck.errors[0];
      setConfigSaveError(msg);
      toast(msg, { type: "error" });
      return;
    }
    const body = {
      vertical,
      units: config?.units || "metric",
      minAisleWidthMeters: Number(partial.minAisleWidthMeters ?? configForm.minAisleWidthMeters),
      fixtureTemplates: rawTemplates.map((t) => ({
        type: t.type,
        label: t.label || t.type,
        baseKind: t.baseKind || t.type,
        temperatureZone: t.temperatureZone || "ambient",
        defaultWidthMeters: Number(t.defaultWidthMeters),
        defaultDepthMeters: Number(t.defaultDepthMeters),
        defaultHeightMeters: Number(t.defaultHeightMeters ?? 2),
        defaultLevels: Math.max(1, Number(t.defaultLevels) || 2),
      })),
      complianceRules: config?.complianceRules || [],
      approvalWorkflowEnabled:
        partial.approvalWorkflowEnabled != null ? partial.approvalWorkflowEnabled : configForm.approvalWorkflowEnabled,
    };
    const updated = await api("/admin/config", { token, method: "PUT", body });
    setConfig(updated);
    toast("Configuration updated", { type: "success" });
  }

  async function createUser(e) {
    e.preventDefault();
    const check = validateUser(newUser);
    if (!check.ok) {
      setUserFormErrors(check.errors);
      toast(Object.values(check.errors)[0], { type: "error" });
      return;
    }
    setUserFormErrors({});
    try {
      const created = await api("/admin/users", {
        token,
        method: "POST",
        body: {
          ...newUser,
          shopperLayoutId: newUser.role === "Customer" ? newUser.shopperLayoutId || null : null,
        },
      });
      setUsers((u) => [...u, created]);
      setNewUser({ email: "", name: "", role: "Designer", password: "", shopperLayoutId: "" });
      toast("User created", { type: "success" });
    } catch (err) {
      toast(friendlyError(err), { type: "error" });
    }
  }

  async function loadCatalog(v = vertical) {
    const verticals = catalogVerticalsForLayout(v);
    const catResults = await Promise.all(
      verticals.map((cv) =>
        api(`/categories?vertical=${cv}`, { token }).catch(() => ({ items: [] }))
      )
    );
    const listsByVertical = Object.fromEntries(
      verticals.map((cv, i) => [cv, catResults[i]?.items || []])
    );
    const allCategories = mergeCategoriesForLayout(v, listsByVertical);
    const catIds = new Set(allCategories.map((c) => c.id));

    const prodResults = await Promise.all(
      verticals.map((cv) =>
        api(`/products?vertical=${cv}`, { token }).catch(() => ({ items: [] }))
      )
    );
    const seen = new Set();
    const merged = [];
    for (const r of prodResults) {
      for (const p of r.items || []) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          merged.push(p);
        }
      }
    }
    // Include any product whose category is in the loaded tree (e.g. after manual add/import).
    const prodAll = await api(`/products`, { token }).catch(() => ({ items: [] }));
    for (const p of prodAll.items || []) {
      if (catIds.has(p.categoryId) && !seen.has(p.id)) {
        seen.add(p.id);
        merged.push(p);
      }
    }

    setCatCategories(allCategories);
    setCatProducts(merged);
  }

  function openProductEditor(partial = {}) {
    const wM = partial.widthMeters ?? partial.attributes?.widthMeters;
    const hM = partial.heightMeters ?? partial.attributes?.heightMeters;
    const dM = partial.depthMeters ?? partial.attributes?.depthMeters ?? wM;
    setProductEditor({
      id: null,
      name: "",
      sku: "",
      categoryId: partial.categoryId || cats[0]?.id || "",
      imageUrl: "",
      attributes: {},
      ...partial,
      storageType: normalizeStorageType(
        partial.storageType || productStorageType(partial) || resolveCategoryStorageType(partial.categoryId || cats[0]?.id, cats)
      ),
      widthInches: partial.widthInches ?? inchesInputFromMeters(wM, "8"),
      heightInches: partial.heightInches ?? inchesInputFromMeters(hM, "10"),
      depthInches: partial.depthInches ?? inchesInputFromMeters(dM, "8"),
      weightLb:
        partial.weightLb ?? lbInputFromKg(partial.weightKg ?? partial.attributes?.weightKg, ""),
    });
  }

  async function uploadProductImage(file, productName) {
    const dataBase64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Could not read file"));
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
    const saved = await api("/catalog/product-images/upload", {
      token,
      method: "POST",
      body: {
        productName: productName || undefined,
        fileName: productName ? `${productName}.png` : file.name,
        dataBase64,
      },
    });
    return saved.url;
  }

  async function saveProduct(payload) {
    const editor = payload || productEditor;
    if (!editor) return;
    const attributes = { ...(editor.attributes || {}) };
    if (editor.widthMeters != null && editor.widthMeters !== "") {
      attributes.widthMeters = Number(editor.widthMeters);
    }
    if (editor.heightMeters != null && editor.heightMeters !== "") {
      attributes.heightMeters = Number(editor.heightMeters);
    }
    if (editor.depthMeters != null && editor.depthMeters !== "") {
      attributes.depthMeters = Number(editor.depthMeters);
    }
    if (editor.weightKg != null && editor.weightKg !== "") {
      attributes.weightKg = Number(editor.weightKg);
    } else {
      delete attributes.weightKg;
    }
    attributes.imageUrl = editor.imageUrl || "";
    if (editor.storageType) {
      attributes.storageTemp = normalizeStorageType(editor.storageType);
    }
    const body = {
      name: editor.name,
      sku: editor.sku,
      categoryId: editor.categoryId,
      imageUrl: editor.imageUrl || "",
      storageType: normalizeStorageType(editor.storageType || productStorageType(editor)),
      weightKg: editor.weightKg == null || editor.weightKg === "" ? null : Number(editor.weightKg),
      attributes,
    };
    try {
      if (editor.id) {
        await api(`/products/${editor.id}`, { token, method: "PATCH", body });
        toast("Product updated", { type: "success" });
      } else {
        await api("/products", { token, method: "POST", body });
        toast("Product created", { type: "success" });
      }
      setProductEditor(null);
      await loadCatalog(catalogVertical);
    } catch (err) {
      toast(friendlyError(err), { type: "error" });
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
        storageType: normalizeStorageType(categoryEditor.storageType || "ambient"),
      };
      if (categoryEditor.id) {
        await api(`/categories/${categoryEditor.id}`, { token, method: "PATCH", body });
        toast("Category updated", { type: "success" });
      } else {
        await api("/categories", { token, method: "POST", body });
        toast("Category created", { type: "success" });
      }
      setCategoryEditor(null);
      await loadCatalog(catalogVertical);
    } catch (err) {
      toast(friendlyError(err), { type: "error" });
    }
  }

  async function deleteProduct(product) {
    if (!product?.id) return;
    if (!window.confirm(`Delete product "${product.name || product.sku || product.id}"? This cannot be undone.`)) return;
    try {
      await api(`/products/${product.id}`, { token, method: "DELETE" });
      toast("Product deleted", { type: "success" });
      await loadCatalog(catalogVertical);
    } catch (err) {
      toast(friendlyError(err), { type: "error" });
    }
  }

  async function deleteCategory(category) {
    if (!category?.id) return;
    if (!window.confirm(`Delete category "${category.name || category.id}"? This cannot be undone.`)) return;
    try {
      await api(`/categories/${category.id}`, { token, method: "DELETE" });
      toast("Category deleted", { type: "success" });
      if (selectedCatalogCategoryId === category.id) setSelectedCatalogCategoryId(null);
      setCategoryEditor(null);
      await loadCatalog(catalogVertical);
    } catch (err) {
      toast(friendlyError(err), { type: "error" });
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
    if (!token) {
      toast("Sign in as Designer or Admin to import.");
      return;
    }
    if (!["Designer", "Admin"].includes(role)) {
      toast("Your role cannot import. Sign in as Designer or Admin.");
      return;
    }
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

      try {
        await api("/catalog/product-images/map", {
          token,
          method: "POST",
          body: { vertical: targetVertical },
        });
        await loadCatalog(targetVertical);
      } catch {
        /* images folder may be empty */
      }

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
      if (err.status === 401) persist(null);
      let friendly = apiErrorMessage(err);
      if (err.message === "no_rows") friendly = "No valid rows found in the Excel file.";
      else if (err.message === "empty_workbook") friendly = "The Excel file is empty.";
      else if (!friendly || friendly === "Request failed") friendly = "Import failed. Use the Excel template.";
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

  if (page === "shop" && shopLayoutId) {
    return (
      <>
        <ShopperKioskPage layoutId={shopLayoutId} />
      </>
    );
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
            <form className="login-card" onSubmit={onLogin} data-testid="login-form">
              {loginError ? (
                <AlertBanner variant="error" onDismiss={() => setLoginError("")} data-testid="login-error">
                  {loginError}
                </AlertBanner>
              ) : null}
              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  data-testid="login-email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  placeholder="you@shelfpilot.local"
                />
              </div>
              <div className="field">
                <label>Password</label>
                <input
                  type="password"
                  data-testid="login-password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Role</label>
                <select
                  data-testid="login-role"
                  value={loginForm.role}
                  onChange={(e) => setLoginForm({ ...loginForm, role: e.target.value })}
                >
                  {["Designer", "Approver", "Viewer", "Admin", "Customer"].map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </div>
              <button
                className="btn-primary"
                type="submit"
                data-testid="login-submit"
                style={{ marginTop: 6, padding: 13, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
              >
                {loginLoading ? <span className="spin" /> : null}
                <span>{loginLoading ? "Signing in…" : "Sign in"}</span>
              </button>
            </form>
            <div style={{ fontSize: 12, color: "#9aa1ab" }}>Built by the Foundry</div>
          </div>
        </div>
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  function navigateToModule(moduleId) {
    navigate(pathForModule(moduleId));
    if (moduleId === "admin") loadAdmin().catch((e) => toast(e.message));
  }

  const statusMeta = (s) => STATUS_META[s] || STATUS_META.draft;
  const visibleNav = navModulesForRole(role);
  const visibleAdminTabs = adminTabsForRole(role);
  const layoutEditDisabled = !canEditLayouts(role);
  const catalogEditDisabled = !canEditCatalog(role);
  const customerMode = isCustomerRole(role);

  return (
    <>
      <div className={`app-shell fade${customerMode ? " app-shell--customer" : ""}`}>
        <header className={`app-header${customerMode ? " app-header--customer" : ""}`}>
          <div className="header-brand">
            <LogoMark size="sm" />
            <span>ShelfPilot{customerMode ? " · Shopper" : ""}</span>
          </div>
          {!customerMode ? (
          <nav className="top-nav" aria-label="Main">
            {visibleNav.map((n) => (
              <a
                key={n.id}
                href={n.path}
                data-testid={`nav-${n.id}`}
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
          ) : (
            <div className="customer-header-tagline muted">Find products in store</div>
          )}
          <div className="header-actions">
            <div className="header-foundry-brand" aria-label="Built by The Foundry">
              <img
                className="header-foundry-logo"
                src={resolveAssetUrl("/branding/inapp-logo.png")}
                alt="InApp"
              />
              <span className="header-foundry-text">BUILT BY THE FOUNDRY</span>
            </div>
            <div className="user-chip" data-testid="user-chip">
              <div className="avatar">{initials(session.user.name)}</div>
              <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{session.user.name}</span>
                <span style={{ fontSize: 11, color: "#9aa1ab" }} data-testid="user-role">
                  {session.user.role}
                </span>
              </div>
            </div>
            <button
              className="btn-secondary"
              data-testid="sign-out"
              style={{ padding: "8px 14px", fontSize: 13 }}
              onClick={() => signOut()}
            >
              Sign out
            </button>
          </div>
        </header>

        <main className="main">
          <div className={`content${editorLayoutId ? " content--editor" : ""}${customerMode ? " content--customer" : ""}`}>

            {page === "dashboard" && !customerMode && (
              <DashboardPage
                layouts={layouts}
                token={token}
                role={role}
                toast={(msg, opts) => toast(msg, opts)}
                onNewLayout={() => {
                  navigate(pathForModule("layouts"));
                  setCreateOpen(true);
                }}
                onNavigateLayouts={(status) => {
                  setStatusFilter(status);
                  navigate(pathForModule("layouts"));
                }}
                onOpenLayout={openLayout}
                onNavigateAdmin={(tab) => {
                  setAdminTab(tab);
                  navigate(pathForModule("admin"));
                }}
              />
            )}

            {page === "layouts" && !editorLayoutId && !customerMode && (
              <LayoutsPortfolio
                layouts={layouts}
                statusFilter={statusFilter}
                onStatusFilter={setStatusFilter}
                onOpenLayout={openLayout}
                onNewLayout={() => setCreateOpen(true)}
                onDeleteLayout={deleteLayout}
                onCloneLayout={cloneLayout}
                editDisabled={layoutEditDisabled}
              />
            )}

            {page === "layouts" && editorLayoutId && !customerMode && (
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

            {page === "catalog" && !customerMode && (
              <>
                <ImportDialog
                  open={importOpen}
                  defaultStoreTypeId={STORE_TYPES.find((s) => s.vertical === vertical)?.id}
                  importing={importing}
                  onImport={(file, storeTypeId) =>
                    handleImportFile(file, storeTypeId).catch((err) => toast(friendlyError(err), { type: "error" }))
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
                  onDismissImportProgress={() => setImportProgress(null)}
                  onAddCategory={() =>
                    setCategoryEditor({ name: "", parentId: null, color: "#A30A2A", storageType: "ambient" })
                  }
                  onEditCategory={(c) =>
                    setCategoryEditor({
                      id: c.id,
                      name: c.name || "",
                      parentId: c.parentId || null,
                      color: c.color || "#A30A2A",
                      storageType: c.storageType || "ambient",
                    })
                  }
                  onDeleteCategory={(c) => deleteCategory(c)}
                  onAddProduct={(categoryId) =>
                    openProductEditor({ categoryId: categoryId || selectedCatalogCategoryId || cats[0]?.id })
                  }
                  onEditProduct={(p) =>
                    openProductEditor({
                      id: p.id,
                      name: p.name || "",
                      sku: p.sku || "",
                      categoryId: p.categoryId || "",
                      widthMeters: p.attributes?.widthMeters,
                      heightMeters: p.attributes?.heightMeters,
                      depthMeters: p.attributes?.depthMeters,
                      weightKg: p.weightKg ?? p.attributes?.weightKg,
                      imageUrl: p.imageUrl || p.attributes?.imageUrl || "",
                      attributes: p.attributes || {},
                      storageType: productStorageType(p),
                    })
                  }
                  onDeleteProduct={(p) => deleteProduct(p)}
                  onImport={() => setImportOpen(true)}
                  onExport={() => handleExport()}
                  onDownloadTemplate={handleDownloadImportTemplate}
                  editDisabled={catalogEditDisabled}
                />
              </>
            )}

            {page === "admin" && visibleAdminTabs.length > 0 && !customerMode && (
              <section className="fade" data-testid="admin-page">
                <h2 className="page-title" style={{ marginBottom: 16 }}>
                  {role === "Approver" ? "Audit Log" : "Admin & Config"}
                </h2>
                <div className="admin-tabs" data-testid="admin-tabs">
                  {visibleAdminTabs.map((t) => (
                    <button
                      key={t}
                      type="button"
                      data-testid={`admin-tab-${t}`}
                      className={`admin-tab ${adminTab === t ? "active" : ""}`}
                      onClick={() => setAdminTab(t)}
                    >
                      {adminTabLabel(t)}
                    </button>
                  ))}
                </div>
                <div className="panel" data-testid={`admin-panel-${adminTab}`}>
                  {adminTab === "users" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} data-testid="admin-users">
                      <div className="table-scroll">
                        <table data-testid="admin-users-table">
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Email</th>
                              <th>Role</th>
                              <th>Shop layout</th>
                            </tr>
                          </thead>
                          <tbody>
                            {users.map((u) => (
                              <tr key={u.id} data-testid={`admin-user-row-${u.email}`}>
                                <td>{u.name}</td>
                                <td>{u.email}</td>
                                <td>{u.role}</td>
                                <td className="mono" style={{ fontSize: 12 }}>
                                  {u.role === "Customer"
                                    ? layouts.find((l) => l.id === u.shopperLayoutId)?.name || u.shopperLayoutId || "—"
                                    : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {canManageUsers(role) ? (
                        <form onSubmit={createUser} className="form-grid-2" data-testid="admin-user-create-form">
                          <div className={`field${userFormErrors.name ? " field-invalid" : ""}`}>
                            <label>Name</label>
                            <input
                              data-testid="admin-user-name"
                              value={newUser.name}
                              onChange={(e) => {
                                setNewUser({ ...newUser, name: e.target.value });
                                if (userFormErrors.name) setUserFormErrors((prev) => ({ ...prev, name: "" }));
                              }}
                            />
                            <FieldError message={userFormErrors.name} />
                          </div>
                          <div className={`field${userFormErrors.email ? " field-invalid" : ""}`}>
                            <label>Email</label>
                            <input
                              type="email"
                              data-testid="admin-user-email"
                              value={newUser.email}
                              onChange={(e) => {
                                setNewUser({ ...newUser, email: e.target.value });
                                if (userFormErrors.email) setUserFormErrors((prev) => ({ ...prev, email: "" }));
                              }}
                            />
                            <FieldError message={userFormErrors.email} />
                          </div>
                          <div className="field">
                            <label>Role</label>
                            <select
                              data-testid="admin-user-role"
                              value={newUser.role}
                              onChange={(e) =>
                                setNewUser({
                                  ...newUser,
                                  role: e.target.value,
                                  shopperLayoutId: e.target.value === "Customer" ? newUser.shopperLayoutId : "",
                                })
                              }
                            >
                              {["Designer", "Approver", "Viewer", "Admin", "Customer"].map((r) => (
                                <option key={r}>{r}</option>
                              ))}
                            </select>
                          </div>
                          {newUser.role === "Customer" ? (
                            <div className={`field${userFormErrors.shopperLayoutId ? " field-invalid" : ""}`}>
                              <label>Shopper layout</label>
                              <select
                                data-testid="admin-user-shopper-layout"
                                value={newUser.shopperLayoutId}
                                onChange={(e) => {
                                  setNewUser({ ...newUser, shopperLayoutId: e.target.value });
                                  if (userFormErrors.shopperLayoutId) {
                                    setUserFormErrors((prev) => ({ ...prev, shopperLayoutId: "" }));
                                  }
                                }}
                              >
                                <option value="">Select layout…</option>
                                {layouts.map((l) => (
                                  <option key={l.id} value={l.id}>
                                    {l.name} ({l.status})
                                  </option>
                                ))}
                              </select>
                              <FieldError message={userFormErrors.shopperLayoutId} />
                            </div>
                          ) : null}
                          <div className={`field${userFormErrors.password ? " field-invalid" : ""}`}>
                            <label>Password</label>
                            <input
                              type="password"
                              data-testid="admin-user-password"
                              value={newUser.password}
                              onChange={(e) => {
                                setNewUser({ ...newUser, password: e.target.value });
                                if (userFormErrors.password) setUserFormErrors((prev) => ({ ...prev, password: "" }));
                              }}
                            />
                            <FieldError message={userFormErrors.password} />
                          </div>
                          <button
                            className="btn-primary form-grid-span-all"
                            type="submit"
                            data-testid="admin-user-create-submit"
                            style={{ padding: "10px 14px" }}
                          >
                            Create user
                          </button>
                        </form>
                      ) : (
                        <div className="muted">Only Admin can create users.</div>
                      )}
                    </div>
                  )}
                  {adminTab === "stores" && (
                    <div className="admin-stores-panel" data-testid="admin-stores">
                      <div className="admin-stores-bar">
                        <div className="admin-stores-bar-left">
                          <label className="admin-stores-inline-label" htmlFor="admin-stores-vertical">
                            Store type
                          </label>
                          <select
                            id="admin-stores-vertical"
                            data-testid="admin-stores-vertical"
                            value={vertical}
                            onChange={(e) => setVertical(e.target.value)}
                          >
                            {Object.entries(VERTICALS).map(([key, meta]) => (
                              <option key={key} value={key}>
                                {meta.label}
                              </option>
                            ))}
                          </select>
                          <span className="admin-stores-count muted">
                            {layouts.filter((l) => l.vertical === vertical).length} layout
                            {layouts.filter((l) => l.vertical === vertical).length === 1 ? "" : "s"}
                          </span>
                        </div>
                        {canManageUsers(role) ? (
                          <button
                            className="btn-primary admin-stores-save"
                            data-testid="admin-stores-save"
                            onClick={() => saveConfig({}).catch((e) => toast(friendlyError(e), { type: "error" }))}
                          >
                            Save
                          </button>
                        ) : null}
                      </div>
                      <FixtureTemplatesEditor
                        templates={
                          configForm.fixtureTemplates?.length
                            ? configForm.fixtureTemplates
                            : fixtureTemplatesForVertical(config, vertical)
                        }
                        disabled={!canManageUsers(role)}
                        onChange={(fixtureTemplates) => {
                          setConfigForm({ ...configForm, fixtureTemplates });
                          if (configSaveError) setConfigSaveError("");
                        }}
                      />
                      {configSaveError ? (
                        <AlertBanner variant="error" onDismiss={() => setConfigSaveError("")}>
                          {configSaveError}
                        </AlertBanner>
                      ) : null}
                      {!canManageUsers(role) ? (
                        <div className="muted" style={{ fontSize: 12 }}>
                          Only Admin can save store master shelf types.
                        </div>
                      ) : null}
                    </div>
                  )}
                  {adminTab === "approval" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }} data-testid="admin-approval">
                      <div style={{ fontWeight: 700 }}>Layouts require Approver sign-off before publishing</div>
                      <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
                        <input
                          type="checkbox"
                          data-testid="admin-approval-enabled"
                          checked={configForm.approvalWorkflowEnabled}
                          disabled={!canManageUsers(role)}
                          onChange={(e) => {
                            const next = e.target.checked;
                            setConfigForm({ ...configForm, approvalWorkflowEnabled: next });
                            if (canManageUsers(role)) {
                              saveConfig({ approvalWorkflowEnabled: next }).catch((err) => toast(err.message));
                            }
                          }}
                        />
                        Approval workflow enabled ({vMeta.label})
                      </label>
                    </div>
                  )}
                  {adminTab === "configuration" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }} data-testid="admin-configuration">
                      <div className="field" style={{ maxWidth: 280 }}>
                        <label>Store type / vertical</label>
                        <select
                          data-testid="admin-config-vertical"
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
                      <p className="muted" style={{ fontSize: 12, margin: 0 }}>
                        Shelf types and dimensions are managed in <strong>Store Master</strong>. This tab controls aisle
                        rules for {vMeta.label}.
                      </p>
                      <div className="field">
                        <label>Min aisle width (m)</label>
                        <input
                          className="mono"
                          type="number"
                          step="0.1"
                          data-testid="admin-config-min-aisle"
                          value={configForm.minAisleWidthMeters}
                          disabled={!canManageUsers(role)}
                          onChange={(e) => setConfigForm({ ...configForm, minAisleWidthMeters: e.target.value })}
                        />
                      </div>
                      {canManageUsers(role) ? (
                        <button
                          className="btn-primary"
                          data-testid="admin-config-save"
                          style={{ padding: "10px 14px", width: "fit-content" }}
                          onClick={() => saveConfig({}).catch((e) => toast(friendlyError(e), { type: "error" }))}
                        >
                          Save store configuration
                        </button>
                      ) : (
                        <div className="muted">Only Admin can save configuration.</div>
                      )}
                    </div>
                  )}
                  {adminTab === "shopper" && (
                    <AdminShopperPanel token={token} layouts={layouts} toast={toast} />
                  )}
                  {adminTab === "audit" && (
                    <ul style={{ margin: 0, paddingLeft: 18 }} data-testid="admin-audit-list">
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
        shelfTemplates={fixtureTemplatesForVertical(
          createConfig,
          STORE_TYPES.find((s) => s.id === createDraft.storeTypeId)?.vertical || "retail"
        )}
        onSubmit={() => createLayout()}
      />

      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <ProductFormDrawer
        open={!!productEditor}
        onClose={() => setProductEditor(null)}
        draft={productEditor}
        setDraft={setProductEditor}
        categories={cats}
        onSubmit={saveProduct}
        onUploadImage={catalogEditDisabled ? undefined : uploadProductImage}
        editDisabled={catalogEditDisabled}
      />
      <CategoryFormDrawer
        open={!!categoryEditor}
        onClose={() => setCategoryEditor(null)}
        vertical={catalogVertical}
        categories={cats}
        draft={categoryEditor}
        setDraft={setCategoryEditor}
        onSubmit={() => saveCategory()}
        editDisabled={catalogEditDisabled}
      />
    </>
  );
}
