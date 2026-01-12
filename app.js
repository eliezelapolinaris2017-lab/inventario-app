/* Oasis Inventario — Básico (Tabs + Color + No apilado) */
const HUB_URL = "https://eliezelapolinaris2017-lab.github.io/oasis-hub/";
const KEY = "oasis_inventory_basic_v1";

const $ = (id) => document.getElementById(id);
const fmt = (n) => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(n||0));
const today = () => new Date().toISOString();

const escapeHtml = (s="") =>
  String(s).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));

/* Tabs */
const tabs = $("tabs");
const views = {
  dash: $("view-dash"),
  products: $("view-products"),
  moves: $("view-moves"),
  history: $("view-history"),
  data: $("view-data")
};
function setView(name){
  Object.keys(views).forEach(k=>{
    views[k].classList.toggle("is-active", k===name);
  });
  document.querySelectorAll(".tab").forEach(t=>{
    t.classList.toggle("is-active", t.dataset.view===name);
  });
}

/* KPIs */
const kpiProducts = $("kpiProducts");
const kpiLow = $("kpiLow");
const kpiValue = $("kpiValue");

/* Products form */
const prodMode = $("prodMode");
const sku = $("sku");
const nameF = $("name");
const category = $("category");
const cost = $("cost");
const price = $("price");
const min = $("min");
const stock = $("stock");
const note = $("note");

const btnNewProduct = $("btnNewProduct");
const btnSaveProduct = $("btnSaveProduct");
const btnDuplicate = $("btnDuplicate");
const btnDeleteProduct = $("btnDeleteProduct");

const prodSearch = $("prodSearch");
const prodBody = $("prodBody");

/* Moves */
const mSku = $("mSku");
const mType = $("mType");
const mQty = $("mQty");
const mRef = $("mRef");
const mNote = $("mNote");
const btnApplyMove = $("btnApplyMove");
const btnGoProducts = $("btnGoProducts");

/* History */
const histSearch = $("histSearch");
const histBody = $("histBody");

/* Dashboard */
const dashCards = $("dashCards");
const dbStatus = $("dbStatus");

/* Data */
const btnExport = $("btnExport");
const btnImport = $("btnImport");
const importFile = $("importFile");
const btnReset = $("btnReset");

/* State */
let activeSku = null;

/* Storage */
function loadDB(){
  return JSON.parse(localStorage.getItem(KEY) || JSON.stringify({
    products: [],
    moves: []
  }));
}
function saveDB(db){ localStorage.setItem(KEY, JSON.stringify(db)); }

/* Helpers */
function normSku(s){ return (s||"").trim().toUpperCase(); }

function updateKPIs(){
  const db = loadDB();
  const products = db.products || [];
  const low = products.filter(p => Number(p.stock||0) < Number(p.min||0)).length;
  const value = products.reduce((acc,p)=> acc + (Number(p.cost||0) * Number(p.stock||0)), 0);

  kpiProducts.textContent = products.length;
  kpiLow.textContent = low;
  kpiValue.textContent = fmt(value);

  dbStatus.textContent = low ? `Atención · ${low} bajo mínimo` : "OK";
}

function clearProductForm(){
  activeSku = null;
  prodMode.textContent = "Nuevo";
  sku.value = "";
  nameF.value = "";
  category.value = "";
  cost.value = "";
  price.value = "";
  min.value = "";
  stock.value = "";
  note.value = "";
}

function readProductForm(){
  return {
    sku: normSku(sku.value),
    name: (nameF.value||"").trim(),
    category: (category.value||"").trim(),
    cost: Number(cost.value||0),
    price: Number(price.value||0),
    min: Number(min.value||0),
    stock: Number(stock.value||0),
    note: (note.value||"").trim(),
    updatedAt: today()
  };
}

function saveProduct(){
  const p = readProductForm();
  if (!p.sku || !p.name){
    alert("SKU y Nombre son obligatorios.");
    return;
  }

  const db = loadDB();
  const idx = db.products.findIndex(x => x.sku === p.sku);

  if (idx >= 0){
    db.products[idx] = { ...db.products[idx], ...p };
  } else {
    db.products.unshift({ ...p, createdAt: today() });
  }

  saveDB(db);
  activeSku = p.sku;
  prodMode.textContent = "Editando";
  renderProducts();
  renderDashboard();
  updateKPIs();
}

function duplicateProduct(){
  if (!sku.value.trim() && !nameF.value.trim()){
    alert("Nada para duplicar.");
    return;
  }
  activeSku = null;
  prodMode.textContent = "Nuevo (duplicado)";
  sku.value = "";
  sku.focus();
}

function deleteProduct(){
  const s = normSku(sku.value);
  if (!s) { clearProductForm(); return; }
  if (!confirm(`¿Borrar producto ${s}?`)) return;

  const db = loadDB();
  db.products = db.products.filter(p => p.sku !== s);
  saveDB(db);
  clearProductForm();
  renderProducts();
  renderDashboard();
  updateKPIs();
}

function openProduct(s){
  const db = loadDB();
  const p = db.products.find(x => x.sku === s);
  if (!p) return;

  activeSku = p.sku;
  prodMode.textContent = "Editando";
  sku.value = p.sku || "";
  nameF.value = p.name || "";
  category.value = p.category || "";
  cost.value = p.cost ?? "";
  price.value = p.price ?? "";
  min.value = p.min ?? "";
  stock.value = p.stock ?? "";
  note.value = p.note || "";

  setView("products");
  updateKPIs();
}

function renderProducts(){
  const db = loadDB();
  const q = (prodSearch.value||"").trim().toLowerCase();
  const rows = (db.products||[]).filter(p=>{
    if (!q) return true;
    const hay = [p.sku,p.name,p.category,p.note].join(" ").toLowerCase();
    return hay.includes(q);
  });

  prodBody.innerHTML = "";
  if (!rows.length){
    prodBody.innerHTML = `<tr><td colspan="7" style="opacity:.7;padding:14px">Sin productos.</td></tr>`;
    return;
  }

  rows.forEach(p=>{
    const low = Number(p.stock||0) < Number(p.min||0);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${escapeHtml(p.sku)}</strong></td>
      <td>${escapeHtml(p.name)}</td>
      <td>${escapeHtml(p.category||"—")}</td>
      <td>${escapeHtml(String(p.stock||0))}</td>
      <td>${escapeHtml(String(p.min||0))}</td>
      <td>${escapeHtml(fmt(p.price||0))}</td>
      <td>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <button class="btn ghost" type="button" data-open="${escapeHtml(p.sku)}">Abrir</button>
          <button class="btn" type="button" data-move="${escapeHtml(p.sku)}">Mover</button>
          ${low ? `<span style="opacity:.85;font-size:12px;border:1px solid rgba(239,68,68,.45);background:rgba(239,68,68,.14);padding:4px 8px;border-radius:999px">Bajo mín</span>` : ``}
        </div>
      </td>
    `;
    prodBody.appendChild(tr);
  });

  prodBody.querySelectorAll("[data-open]").forEach(b=>{
    b.addEventListener("click", ()=>openProduct(b.dataset.open));
  });
  prodBody.querySelectorAll("[data-move]").forEach(b=>{
    b.addEventListener("click", ()=>{
      mSku.value = b.dataset.move;
      mQty.value = 1;
      mType.value = "OUT";
      setView("moves");
      mQty.focus();
    });
  });
}

/* Movements */
function applyMove(){
  const db = loadDB();
  const s = normSku(mSku.value);
  const qty = Number(mQty.value||0);
  const type = mType.value;

  if (!s || !qty){
    alert("SKU y cantidad son obligatorios.");
    return;
  }

  const p = db.products.find(x=>x.sku===s);
  if (!p){
    alert("SKU no existe. Crea el producto primero.");
    return;
  }

  let newStock = Number(p.stock||0);
  if (type==="IN") newStock += qty;
  if (type==="OUT") newStock -= qty;
  if (type==="ADJ") newStock = qty; // ajuste = set stock

  p.stock = newStock;
  p.updatedAt = today();

  const move = {
    id: `m_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    at: today(),
    sku: s,
    type,
    qty,
    stockFinal: newStock,
    ref: (mRef.value||"").trim(),
    note: (mNote.value||"").trim()
  };
  db.moves.unshift(move);

  saveDB(db);

  // reset move fields (keep sku)
  mQty.value = "";
  mRef.value = "";
  mNote.value = "";

  renderProducts();
  renderHistory();
  renderDashboard();
  updateKPIs();

  alert("Movimiento aplicado ✅");
}

function renderHistory(){
  const db = loadDB();
  const q = (histSearch.value||"").trim().toLowerCase();

  const rows = (db.moves||[]).filter(m=>{
    if (!q) return true;
    const hay = [m.at,m.sku,m.type,m.qty,m.ref,m.note].join(" ").toLowerCase();
    return hay.includes(q);
  });

  histBody.innerHTML = "";
  if (!rows.length){
    histBody.innerHTML = `<tr><td colspan="7" style="opacity:.7;padding:14px">Sin movimientos.</td></tr>`;
    return;
  }

  rows.forEach(m=>{
    const t = new Date(m.at);
    const date = isNaN(t.getTime()) ? (m.at||"") : t.toLocaleString();
    const typeLabel =
      m.type==="IN" ? "Entrada" :
      m.type==="OUT" ? "Salida" : "Ajuste";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(date)}</td>
      <td><strong>${escapeHtml(m.sku)}</strong></td>
      <td>${escapeHtml(typeLabel)}</td>
      <td>${escapeHtml(String(m.qty))}</td>
      <td>${escapeHtml(String(m.stockFinal))}</td>
      <td>${escapeHtml(m.ref||"—")}</td>
      <td>${escapeHtml(m.note||"—")}</td>
    `;
    histBody.appendChild(tr);
  });
}

function renderDashboard(){
  const db = loadDB();
  const products = db.products || [];
  const low = products
    .filter(p => Number(p.stock||0) < Number(p.min||0))
    .slice(0, 8);

  dashCards.innerHTML = "";

  const card1 = document.createElement("div");
  card1.className = "dashCard dash-blue";
  card1.innerHTML = `<strong>Acción rápida</strong><div class="meta">Usa “Movimientos” para entrada/salida. Sin clicks inútiles.</div>`;
  dashCards.appendChild(card1);

  if (!products.length){
    const c = document.createElement("div");
    c.className = "dashCard dash-warn";
    c.innerHTML = `<strong>Catálogo vacío</strong><div class="meta">Ve a “Productos” y crea tu primer SKU.</div>`;
    dashCards.appendChild(c);
    return;
  }

  if (!low.length){
    const c = document.createElement("div");
    c.className = "dashCard dash-ok";
    c.innerHTML = `<strong>Stock saludable</strong><div class="meta">No hay productos bajo mínimo. Business as usual.</div>`;
    dashCards.appendChild(c);
    return;
  }

  low.forEach(p=>{
    const c = document.createElement("div");
    c.className = "dashCard dash-bad";
    c.innerHTML = `
      <strong>${escapeHtml(p.sku)} · ${escapeHtml(p.name)}</strong>
      <div class="meta">Stock: <b>${escapeHtml(String(p.stock||0))}</b> · Mín: <b>${escapeHtml(String(p.min||0))}</b></div>
      <div class="meta">Click: abre producto para ajustar.</div>
    `;
    c.addEventListener("click", ()=>openProduct(p.sku));
    dashCards.appendChild(c);
  });
}

/* Export/Import/Reset */
function exportJSON(){
  const db = loadDB();
  const payload = { exportedAt: today(), db };
  const blob = new Blob([JSON.stringify(payload,null,2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `oasis_inventario_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(url), 300);
}

async function importJSON(file){
  try{
    const txt = await file.text();
    const data = JSON.parse(txt);
    const db = data.db || data;
    if (!db.products || !Array.isArray(db.products) || !db.moves || !Array.isArray(db.moves)){
      alert("Archivo inválido.");
      return;
    }
    saveDB({ products: db.products, moves: db.moves });
    clearProductForm();
    renderProducts();
    renderHistory();
    renderDashboard();
    updateKPIs();
    alert("Importado ✅");
  }catch{
    alert("No se pudo importar.");
  }
}

function resetAll(){
  if (!confirm("Reset total: borra productos y movimientos. ¿Seguro?")) return;
  saveDB({ products: [], moves: [] });
  clearProductForm();
  renderProducts();
  renderHistory();
  renderDashboard();
  updateKPIs();
}

/* Boot */
(function boot(){
  $("hubBtn").href = HUB_URL;

  tabs.addEventListener("click", (e)=>{
    const btn = e.target.closest(".tab");
    if (!btn) return;
    setView(btn.dataset.view);
  });

  btnNewProduct.addEventListener("click", clearProductForm);
  btnSaveProduct.addEventListener("click", saveProduct);
  btnDuplicate.addEventListener("click", duplicateProduct);
  btnDeleteProduct.addEventListener("click", deleteProduct);

  prodSearch.addEventListener("input", renderProducts);

  btnApplyMove.addEventListener("click", applyMove);
  btnGoProducts.addEventListener("click", ()=>setView("products"));

  histSearch.addEventListener("input", renderHistory);

  btnExport.addEventListener("click", exportJSON);
  btnImport.addEventListener("click", ()=>importFile.click());
  importFile.addEventListener("change", (e)=>{
    const f = e.target.files?.[0];
    if (f) importJSON(f);
    e.target.value = "";
  });

  btnReset.addEventListener("click", resetAll);

  renderProducts();
  renderHistory();
  renderDashboard();
  updateKPIs();
})();
