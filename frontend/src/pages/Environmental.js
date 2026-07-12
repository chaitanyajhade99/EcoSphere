import { useEffect, useState } from "react";
import api from "@/lib/api";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area } from "recharts";
import { TreePine, Zap, Plus, Loader2, Settings2, Package, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

const SCOPE_COLORS = ["#166534", "#059669", "#10B981"];
const TABS = ["emissions", "products", "factors"];

export default function Environmental() {
  const [factors, setFactors] = useState([]);
  const [txs, setTxs] = useState([]);
  const [goals, setGoals] = useState([]);
  const [scopes, setScopes] = useState([]);
  const [trend, setTrend] = useState([]);
  const [products, setProducts] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showAddFactor, setShowAddFactor] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [editFactor, setEditFactor] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("emissions");

  const load = () => {
    Promise.all([
      api.get("/environmental/factors").then((r) => setFactors(r.data)),
      api.get("/environmental/transactions").then((r) => setTxs(r.data)),
      api.get("/environmental/goals").then((r) => setGoals(r.data)),
      api.get("/environmental/scope-breakdown").then((r) => setScopes(r.data)),
      api.get("/dashboard/carbon-trend").then((r) => setTrend(r.data)),
      api.get("/environmental/products").then((r) => setProducts(r.data)),
    ]);
  };
  useEffect(load, []);

  const totalCO2 = txs.reduce((s, t) => s + t.co2e_kg, 0);
  const trees = Math.round(totalCO2 / 21);

  const runForecast = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/ai/carbon-forecast");
      setForecast(data);
      toast.success("Forecast generated");
    } catch (e) { toast.error("Forecast failed"); }
    setBusy(false);
  };

  const deleteFactor = async (id) => {
    if (!window.confirm("Delete this emission factor?")) return;
    try { await api.delete(`/environmental/factors/${id}`); toast.success("Factor deleted"); load(); } catch (e) { toast.error(e.response?.data?.detail || "Delete failed"); }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm("Delete this product ESG profile?")) return;
    try { await api.delete(`/environmental/products/${id}`); toast.success("Product deleted"); load(); } catch (e) { toast.error(e.response?.data?.detail || "Delete failed"); }
  };

  return (
    <div className="space-y-6 fade-in" data-testid="environmental-page">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Environmental</h1>
          <p className="text-sm text-slate-500 mt-1">Carbon accounting · Scope 1/2/3 emissions · Sustainability goals · Product ESG</p>
        </div>
        <div className="flex gap-2">
          <button onClick={runForecast} disabled={busy} className="btn-outline flex items-center gap-2" data-testid="run-forecast-btn">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />} AI Forecast
          </button>
          <button onClick={() => setShowAddGoal(true)} className="btn-outline flex items-center gap-2" data-testid="add-goal-btn">
            <Plus size={14} /> New Goal
          </button>
          <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2" data-testid="add-transaction-btn">
            <Plus size={14} /> Log Emission
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total CO₂e</div>
          <div className="text-3xl font-heading font-semibold mt-2">{totalCO2.toLocaleString()} <span className="text-sm text-slate-500 font-sans font-normal">kg</span></div>
        </div>
        <div className="card p-5 flex items-center gap-3">
          <TreePine className="text-emerald-600" size={36} />
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Trees to offset</div>
            <div className="text-3xl font-heading font-semibold mt-1">{trees.toLocaleString()}</div>
            <div className="text-xs text-slate-400">per year</div>
          </div>
        </div>
        <div className="card p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Goals</div>
          <div className="text-3xl font-heading font-semibold mt-2">{goals.length}</div>
        </div>
        <div className="card p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Products Tracked</div>
          <div className="text-3xl font-heading font-semibold mt-2">{products.length}</div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all ${tab === t ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
            data-testid={`tab-${t}`}>{t === "factors" ? "Emission Factors" : t === "products" ? "Product ESG" : "Emissions"}</button>
        ))}
      </div>

      {/* === EMISSIONS TAB === */}
      {tab === "emissions" && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="card p-6">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Scope Breakdown</div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={scopes} dataKey="value" nameKey="scope" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
                    {scopes.map((_, i) => <Cell key={i} fill={SCOPE_COLORS[i % 3]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-3 mt-2">
                {scopes.map((s, i) => (
                  <div key={s.scope} className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span className="h-2 w-2 rounded-full" style={{ background: SCOPE_COLORS[i % 3] }} />
                    {s.scope}: {s.value.toLocaleString()}kg
                  </div>
                ))}
              </div>
            </div>
            <div className="card p-6 lg:col-span-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">6-Month Trend</div>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="c1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#166534" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#166534" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                  <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" fontSize={12} />
                  <Tooltip />
                  <Area type="monotone" dataKey="co2e_kg" stroke="#166534" strokeWidth={2} fill="url(#c1)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {forecast && !forecast.error && (
            <div className="card p-6 border-emerald-200 bg-emerald-50/40" data-testid="ai-forecast-result">
              <div className="flex items-center gap-2 mb-3">
                <Zap size={16} className="text-emerald-700" />
                <div className="font-heading font-semibold text-lg">AI Carbon Forecast · Next 3 months</div>
                <span className="pill" style={{ background: "#fff", color: "#166534", border: "1px solid #DCFCE7" }}>trend: {forecast.trend}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                {(forecast.forecast || []).map((f, i) => (
                  <div key={i} className="bg-white border border-emerald-200 rounded-lg p-4">
                    <div className="text-xs uppercase text-slate-500">{f.month}</div>
                    <div className="font-heading text-2xl font-semibold text-slate-900">{f.co2e_kg.toLocaleString()} <span className="text-sm text-slate-500 font-sans">kg</span></div>
                  </div>
                ))}
              </div>
              <div className="text-sm">
                <div className="text-xs uppercase tracking-widest text-emerald-800 font-semibold mb-1">Why</div>
                <div className="text-slate-700">{forecast.why}</div>
                {forecast.recommendations?.length > 0 && (
                  <ul className="mt-3 space-y-1 list-disc list-inside text-slate-700">
                    {forecast.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                )}
              </div>
            </div>
          )}

          <div className="card p-6">
            <div className="flex justify-between items-center mb-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Sustainability Goals</div>
              <span className="text-xs text-slate-400">Aligned with ISO 14001 · GHG Protocol</span>
            </div>
            <div className="space-y-4">
              {goals.map((g) => {
                const pct = Math.min(100, (g.current_value / g.target_value) * 100);
                const color = g.status === "at_risk" ? "#F59E0B" : g.status === "achieved" ? "#22C55E" : "#166534";
                return (
                  <div key={g.id}>
                    <div className="flex justify-between items-baseline mb-1">
                      <div>
                        <div className="text-sm font-medium">{g.title}</div>
                        <div className="text-xs text-slate-500">{g.description}</div>
                      </div>
                      <div className="text-sm text-slate-600 font-mono">{g.current_value}{g.unit} / {g.target_value}{g.unit}</div>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div style={{ width: `${pct}%`, background: color, transition: "width 500ms" }} className="h-full rounded-full" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card p-6">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">Recent Carbon Transactions</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-slate-500 border-b border-slate-200">
                    <th className="py-2 font-medium">Date</th>
                    <th className="py-2 font-medium">Department</th>
                    <th className="py-2 font-medium">Category</th>
                    <th className="py-2 font-medium text-right">Quantity</th>
                    <th className="py-2 font-medium">Scope</th>
                    <th className="py-2 font-medium text-right">CO₂e (kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {txs.slice(0, 10).map((t) => (
                    <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 text-slate-600 font-mono text-xs">{new Date(t.date).toLocaleDateString()}</td>
                      <td className="py-2">{t.department}</td>
                      <td className="py-2 text-slate-600">{t.category}</td>
                      <td className="py-2 text-right font-mono">{t.quantity} {t.unit}</td>
                      <td className="py-2"><span className="pill" style={{ background: "#F1F5F9", color: "#475569" }}>Scope {t.scope}</span></td>
                      <td className="py-2 text-right font-mono font-medium">{t.co2e_kg.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* === PRODUCT ESG TAB === */}
      {tab === "products" && (
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Package size={16} className="text-emerald-700" />
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Product ESG Profiles</div>
            </div>
            <button onClick={() => { setEditProduct(null); setShowAddProduct(true); }} className="btn-primary flex items-center gap-2" data-testid="add-product-btn">
              <Plus size={14} /> Add Product
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-500 border-b border-slate-200">
                  <th className="py-2 font-medium">Name</th>
                  <th className="py-2 font-medium">SKU</th>
                  <th className="py-2 font-medium">Category</th>
                  <th className="py-2 font-medium text-right">CO₂ (kg)</th>
                  <th className="py-2 font-medium text-right">Recyclability</th>
                  <th className="py-2 font-medium text-right">Score</th>
                  <th className="py-2 font-medium">Certifications</th>
                  <th className="py-2 font-medium">Stage</th>
                  <th className="py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 font-medium">{p.name}</td>
                    <td className="py-2 text-slate-500 font-mono text-xs">{p.sku}</td>
                    <td className="py-2"><span className="pill capitalize" style={{ background: "#F1F5F9", color: "#475569" }}>{p.category?.replace("_", " ")}</span></td>
                    <td className="py-2 text-right font-mono">{p.carbon_footprint_kg}</td>
                    <td className="py-2 text-right font-mono">{p.recyclability_percent}%</td>
                    <td className="py-2 text-right">
                      <span className="pill font-mono" style={{ background: p.sustainability_score >= 80 ? "#DCFCE720" : p.sustainability_score >= 50 ? "#FEF9C320" : "#FEE2E220", color: p.sustainability_score >= 80 ? "#166534" : p.sustainability_score >= 50 ? "#854D0E" : "#991B1B" }}>
                        {p.sustainability_score}
                      </span>
                    </td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-1">
                        {(p.certifications || []).map((c, i) => <span key={i} className="pill text-[10px]" style={{ background: "#ECFDF5", color: "#065F46" }}>{c}</span>)}
                      </div>
                    </td>
                    <td className="py-2 capitalize text-slate-600 text-xs">{p.lifecycle_stage?.replace("_", " ")}</td>
                    <td className="py-2 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => { setEditProduct(p); setShowAddProduct(true); }} className="p-1 hover:bg-slate-100 rounded" data-testid={`edit-product-${p.id}`}><Pencil size={13} className="text-slate-500" /></button>
                        <button onClick={() => deleteProduct(p.id)} className="p-1 hover:bg-red-50 rounded" data-testid={`delete-product-${p.id}`}><Trash2 size={13} className="text-red-500" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && <tr><td colSpan={9} className="py-8 text-center text-slate-400">No product ESG profiles yet. Click "Add Product" to get started.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* === EMISSION FACTORS TAB === */}
      {tab === "factors" && (
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Settings2 size={16} className="text-emerald-700" />
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Emission Factor Configuration</div>
            </div>
            <button onClick={() => { setEditFactor(null); setShowAddFactor(true); }} className="btn-primary flex items-center gap-2" data-testid="add-factor-btn">
              <Plus size={14} /> Add Factor
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-500 border-b border-slate-200">
                  <th className="py-2 font-medium">Category</th>
                  <th className="py-2 font-medium">Unit</th>
                  <th className="py-2 font-medium text-right">Factor (kg CO₂e)</th>
                  <th className="py-2 font-medium">Scope</th>
                  <th className="py-2 font-medium">Source</th>
                  <th className="py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {factors.map((f) => (
                  <tr key={f.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 capitalize font-medium">{f.category}</td>
                    <td className="py-2 text-slate-600">{f.unit}</td>
                    <td className="py-2 text-right font-mono">{f.factor}</td>
                    <td className="py-2"><span className="pill" style={{ background: "#F1F5F9", color: "#475569" }}>Scope {f.scope}</span></td>
                    <td className="py-2 text-slate-500 text-xs">{f.source}</td>
                    <td className="py-2 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => { setEditFactor(f); setShowAddFactor(true); }} className="p-1 hover:bg-slate-100 rounded" data-testid={`edit-factor-${f.id}`}><Pencil size={13} className="text-slate-500" /></button>
                        <button onClick={() => deleteFactor(f.id)} className="p-1 hover:bg-red-50 rounded" data-testid={`delete-factor-${f.id}`}><Trash2 size={13} className="text-red-500" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAdd && <AddTransactionModal factors={factors} onClose={() => setShowAdd(false)} onSaved={() => { load(); setShowAdd(false); }} />}
      {showAddGoal && <AddGoalModal onClose={() => setShowAddGoal(false)} onSaved={() => { load(); setShowAddGoal(false); }} />}
      {showAddFactor && <AddFactorModal existing={editFactor} onClose={() => setShowAddFactor(false)} onSaved={() => { load(); setShowAddFactor(false); }} />}
      {showAddProduct && <AddProductModal existing={editProduct} onClose={() => setShowAddProduct(false)} onSaved={() => { load(); setShowAddProduct(false); }} />}
    </div>
  );
}

/* ========== MODALS ========== */

function AddGoalModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    title: "", description: "", target_value: 1000, current_value: 0,
    unit: "kg CO2e", deadline: new Date().toISOString().split("T")[0],
    department: "Operations", status: "active"
  });

  const save = async (e) => {
    e.preventDefault();
    try {
      await api.post("/environmental/goals", form);
      toast.success("Sustainability Goal created successfully!");
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create goal");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="card p-6 max-w-lg w-full space-y-4" data-testid="add-goal-modal">
        <div className="font-heading text-xl font-semibold">New Sustainability Goal</div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Goal Title</label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Reduce Scope 1 emissions" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Description</label>
            <textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Implement strict monitoring on company fleet travel." rows="3" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">Target Value</label>
              <input required type="number" step="0.01" value={form.target_value} onChange={(e) => setForm({ ...form, target_value: parseFloat(e.target.value) })} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">Unit</label>
              <input required value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="kg CO2e" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">Deadline</label>
              <input required type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">Department</label>
              <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                <option value="">Global (All)</option>
                {["Operations", "Engineering", "Marketing", "Sales", "HR", "Finance"].map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
          <button type="submit" className="btn-primary" data-testid="save-goal-btn">Create Goal</button>
        </div>
      </form>
    </div>
  );
}

function AddTransactionModal({ factors, onClose, onSaved }) {
  const [form, setForm] = useState({
    department: "Operations", category: factors[0]?.category || "",
    activity: "", quantity: 100, unit: factors[0]?.unit || "",
    factor_id: factors[0]?.id || "", co2e_kg: 0, scope: 2,
    date: new Date().toISOString(),
  });

  const handleFactor = (fid) => {
    const f = factors.find((x) => x.id === fid);
    if (f) setForm((p) => ({ ...p, factor_id: fid, category: f.category, unit: f.unit, scope: f.scope, co2e_kg: p.quantity * f.factor }));
  };

  const save = async (e) => {
    e.preventDefault();
    await api.post("/environmental/transactions", { ...form, logged_by: "current" });
    toast.success("Emission logged");
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="card p-6 max-w-lg w-full" data-testid="add-transaction-modal">
        <div className="font-heading text-xl font-semibold mb-4">Log Carbon Transaction</div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Department</label>
            <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
              {["Operations", "Engineering", "Marketing", "Sales", "HR", "Finance"].map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Emission Factor</label>
            <select value={form.factor_id} onChange={(e) => handleFactor(e.target.value)}>
              {factors.map((f) => <option key={f.id} value={f.id}>{f.category} ({f.unit}) · Scope {f.scope}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Activity Description</label>
            <input required value={form.activity} onChange={(e) => setForm({ ...form, activity: e.target.value })} placeholder="e.g. Server room electricity" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Quantity ({form.unit})</label>
            <input required type="number" step="0.01" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseFloat(e.target.value) })} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
          <button type="submit" className="btn-primary" data-testid="save-transaction-btn">Log Emission</button>
        </div>
      </form>
    </div>
  );
}

function AddFactorModal({ existing, onClose, onSaved }) {
  const isEdit = !!existing;
  const [form, setForm] = useState(existing ? { ...existing } : {
    category: "electricity", unit: "kWh", factor: 0.5, scope: 2, source: "GHG Protocol"
  });

  const save = async (e) => {
    e.preventDefault();
    try {
      if (isEdit) {
        await api.put(`/environmental/factors/${existing.id}`, form);
        toast.success("Factor updated");
      } else {
        await api.post("/environmental/factors", form);
        toast.success("Factor created");
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save factor");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="card p-6 max-w-lg w-full space-y-4" data-testid="add-factor-modal">
        <div className="font-heading text-xl font-semibold">{isEdit ? "Edit" : "Add"} Emission Factor</div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Category</label>
            <input required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. electricity, fuel, travel" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">Unit</label>
              <input required value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="e.g. kWh, litres" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">Factor (kg CO₂e per unit)</label>
              <input required type="number" step="0.001" value={form.factor} onChange={(e) => setForm({ ...form, factor: parseFloat(e.target.value) })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">Scope</label>
              <select value={form.scope} onChange={(e) => setForm({ ...form, scope: parseInt(e.target.value) })}>
                <option value={1}>Scope 1 (Direct)</option>
                <option value={2}>Scope 2 (Energy)</option>
                <option value={3}>Scope 3 (Indirect)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">Source</label>
              <input required value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="GHG Protocol" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
          <button type="submit" className="btn-primary" data-testid="save-factor-btn">{isEdit ? "Update" : "Create"} Factor</button>
        </div>
      </form>
    </div>
  );
}

function AddProductModal({ existing, onClose, onSaved }) {
  const isEdit = !!existing;
  const [form, setForm] = useState(existing ? { ...existing, certifications: (existing.certifications || []).join(", ") } : {
    name: "", sku: "", category: "packaging",
    carbon_footprint_kg: 0, recyclability_percent: 0, sustainability_score: 0,
    certifications: "", lifecycle_stage: "production",
    department: "Operations", notes: ""
  });

  const save = async (e) => {
    e.preventDefault();
    const payload = { ...form, certifications: form.certifications.split(",").map(s => s.trim()).filter(Boolean) };
    try {
      if (isEdit) {
        await api.put(`/environmental/products/${existing.id}`, payload);
        toast.success("Product updated");
      } else {
        await api.post("/environmental/products", payload);
        toast.success("Product created");
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save product");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="card p-6 max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto" data-testid="add-product-modal">
        <div className="font-heading text-xl font-semibold">{isEdit ? "Edit" : "Add"} Product ESG Profile</div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">Product Name</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. EcoPackaging Box" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">SKU</label>
              <input required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="e.g. PKG-001" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {["packaging", "electronics", "raw_material", "finished_good"].map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">Lifecycle Stage</label>
              <select value={form.lifecycle_stage} onChange={(e) => setForm({ ...form, lifecycle_stage: e.target.value })}>
                {["design", "production", "distribution", "use", "end_of_life"].map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">CO₂ (kg)</label>
              <input required type="number" step="0.01" value={form.carbon_footprint_kg} onChange={(e) => setForm({ ...form, carbon_footprint_kg: parseFloat(e.target.value) })} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">Recyclability %</label>
              <input required type="number" step="0.1" min="0" max="100" value={form.recyclability_percent} onChange={(e) => setForm({ ...form, recyclability_percent: parseFloat(e.target.value) })} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">Score (0-100)</label>
              <input required type="number" step="0.1" min="0" max="100" value={form.sustainability_score} onChange={(e) => setForm({ ...form, sustainability_score: parseFloat(e.target.value) })} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Certifications (comma-separated)</label>
            <input value={form.certifications} onChange={(e) => setForm({ ...form, certifications: e.target.value })} placeholder="e.g. FSC, ISO 14001, Energy Star" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">Department</label>
              <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                {["Operations", "Engineering", "Marketing", "Sales", "HR", "Finance"].map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">Notes</label>
              <input value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
          <button type="submit" className="btn-primary" data-testid="save-product-btn">{isEdit ? "Update" : "Create"} Product</button>
        </div>
      </form>
    </div>
  );
}
