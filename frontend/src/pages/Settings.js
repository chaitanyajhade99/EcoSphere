import { useEffect, useState } from "react";
import api, { formatApiErrorDetail } from "@/lib/api";
import { toast } from "sonner";
import { Sliders, FolderGit2, Landmark, BellRing, Plus, Edit2, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function Settings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("config");
  const [config, setConfig] = useState({ weight_e: 40.0, weight_s: 30.0, weight_g: 30.0, auto_emission_calc: true, evidence_required: true, badge_auto_award: true });
  const [depts, setDepts] = useState([]);
  const [cats, setCats] = useState([]);
  const [notifs, setNotifs] = useState({ new_compliance_issue: true, approval_decisions: true, policy_reminders: true, badge_unlocks: true });

  // Modals / forms state
  const [deptForm, setDeptForm] = useState(null);
  const [catForm, setCatForm] = useState(null);

  const loadData = () => {
    Promise.all([
      api.get("/settings/config").then((r) => setConfig(r.data)),
      api.get("/settings/departments").then((r) => setDepts(r.data)),
      api.get("/settings/categories").then((r) => setCats(r.data)),
      api.get("/settings/notifications").then((r) => setNotifs(r.data)),
    ]).catch((e) => toast.error(formatApiErrorDetail(e.response?.data?.detail)));
  };

  useEffect(loadData, []);

  const saveConfig = async (e) => {
    e.preventDefault();
    if (config.weight_e + config.weight_s + config.weight_g !== 100) {
      toast.error("ESG Weights must sum to exactly 100%!");
      return;
    }
    try {
      await api.put("/settings/config", config);
      toast.success("ESG Configuration saved successfully!");
      loadData();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    }
  };

  const saveNotifications = async () => {
    try {
      await api.put("/settings/notifications", notifs);
      toast.success("Notification settings saved successfully!");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    }
  };

  const submitDept = async (e) => {
    e.preventDefault();
    try {
      if (deptForm.id) {
        await api.put(`/settings/departments/${deptForm.id}`, deptForm);
        toast.success("Department updated successfully!");
      } else {
        await api.post("/settings/departments", deptForm);
        toast.success("Department created successfully!");
      }
      setDeptForm(null);
      loadData();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    }
  };

  const deleteDept = async (id) => {
    if (!confirm("Are you sure you want to delete this department?")) return;
    try {
      await api.delete(`/settings/departments/${id}`);
      toast.success("Department deleted successfully!");
      loadData();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    }
  };

  const submitCat = async (e) => {
    e.preventDefault();
    try {
      if (catForm.id) {
        await api.put(`/settings/categories/${catForm.id}`, catForm);
        toast.success("Category updated successfully!");
      } else {
        await api.post("/settings/categories", catForm);
        toast.success("Category created successfully!");
      }
      setCatForm(null);
      loadData();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    }
  };

  const deleteCat = async (id) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    try {
      await api.delete(`/settings/categories/${id}`);
      toast.success("Category deleted successfully!");
      loadData();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    }
  };

  const handleWeightChange = (key, val) => {
    const newVal = Math.max(0, Math.min(100, Math.round(parseFloat(val) || 0)));
    const keys = ["weight_e", "weight_s", "weight_g"];
    const otherKeys = keys.filter((k) => k !== key);
    
    const targetOthersSum = 100 - newVal;
    const currentOthersSum = otherKeys.reduce((sum, k) => sum + config[k], 0);
    
    let newConfig = { ...config, [key]: newVal };
    
    if (currentOthersSum > 0) {
      otherKeys.forEach((k) => {
        newConfig[k] = Math.round((config[k] / currentOthersSum) * targetOthersSum);
      });
    } else {
      otherKeys.forEach((k) => {
        newConfig[k] = Math.round(targetOthersSum / 2);
      });
    }
    
    const total = newConfig.weight_e + newConfig.weight_s + newConfig.weight_g;
    if (total !== 100) {
      const diff = 100 - total;
      newConfig[otherKeys[0]] += diff;
    }
    
    setConfig(newConfig);
  };

  const sumWeights = config.weight_e + config.weight_s + config.weight_g;

  return (
    <div className="space-y-6 fade-in" data-testid="settings-page">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Configure weights, toggles, departments, and category mapping.</p>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        <button onClick={() => setActiveTab("config")} className={`px-4 py-2 text-sm font-semibold border-b-2 ${activeTab === "config" ? "border-[#166534] text-[#166534]" : "border-transparent text-slate-500"}`} data-testid="tab-config">
          <span className="flex items-center gap-1.5"><Sliders size={14} /> ESG Config</span>
        </button>
        <button onClick={() => setActiveTab("depts")} className={`px-4 py-2 text-sm font-semibold border-b-2 ${activeTab === "depts" ? "border-[#166534] text-[#166534]" : "border-transparent text-slate-500"}`} data-testid="tab-departments">
          <span className="flex items-center gap-1.5"><Landmark size={14} /> Departments</span>
        </button>
        <button onClick={() => setActiveTab("categories")} className={`px-4 py-2 text-sm font-semibold border-b-2 ${activeTab === "categories" ? "border-[#166534] text-[#166534]" : "border-transparent text-slate-500"}`} data-testid="tab-categories">
          <span className="flex items-center gap-1.5"><FolderGit2 size={14} /> Categories</span>
        </button>
        <button onClick={() => setActiveTab("notifications")} className={`px-4 py-2 text-sm font-semibold border-b-2 ${activeTab === "notifications" ? "border-[#166534] text-[#166534]" : "border-transparent text-slate-500"}`} data-testid="tab-notifications">
          <span className="flex items-center gap-1.5"><BellRing size={14} /> Notifications</span>
        </button>
      </div>

      {activeTab === "config" && (
        <form onSubmit={saveConfig} className="card p-6 space-y-6 max-w-2xl">
          <div className="font-heading text-lg font-semibold">ESG Weighted Scoring & Business Rules</div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-slate-700">Environmental Weight (E)</span>
                <span className="font-mono text-slate-500">{config.weight_e}%</span>
              </div>
              <input type="range" min="0" max="100" value={config.weight_e} onChange={(e) => handleWeightChange("weight_e", e.target.value)} className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer" data-testid="slider-e" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-slate-700">Social Weight (S)</span>
                <span className="font-mono text-slate-500">{config.weight_s}%</span>
              </div>
              <input type="range" min="0" max="100" value={config.weight_s} onChange={(e) => handleWeightChange("weight_s", e.target.value)} className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer" data-testid="slider-s" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-slate-700">Governance Weight (G)</span>
                <span className="font-mono text-slate-500">{config.weight_g}%</span>
              </div>
              <input type="range" min="0" max="100" value={config.weight_g} onChange={(e) => handleWeightChange("weight_g", e.target.value)} className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer" data-testid="slider-g" />
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-sm font-semibold text-slate-700">Total Sum:</span>
              <span className={`font-mono text-sm font-bold ${sumWeights === 100 ? "text-emerald-700" : "text-red-600"}`}>{sumWeights}% (must be 100%)</span>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6 space-y-4">
            <div className="font-heading text-base font-semibold">Toggles & Business Rules</div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-700">Auto Emission Calculation</div>
                <div className="text-xs text-slate-500">Calculate Scope 1/2/3 CO2e directly from metrics</div>
              </div>
              <input type="checkbox" checked={config.auto_emission_calc} onChange={(e) => setConfig({ ...config, auto_emission_calc: e.target.checked })} className="w-5 h-5 accent-[#166534] cursor-pointer" data-testid="toggle-auto-emission" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-700">Evidence Required</div>
                <div className="text-xs text-slate-500">Block CSR approval if proof attachment is missing</div>
              </div>
              <input type="checkbox" checked={config.evidence_required} onChange={(e) => setConfig({ ...config, evidence_required: e.target.checked })} className="w-5 h-5 accent-[#166534] cursor-pointer" data-testid="toggle-evidence" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-700">Badge Auto-Award</div>
                <div className="text-xs text-slate-500">Auto-assign badges when XP / Challenge requirements are satisfied</div>
              </div>
              <input type="checkbox" checked={config.badge_auto_award} onChange={(e) => setConfig({ ...config, badge_auto_award: e.target.checked })} className="w-5 h-5 accent-[#166534] cursor-pointer" data-testid="toggle-badge-auto" />
            </div>
          </div>

          <button type="submit" disabled={user?.role !== "admin"} className="btn-primary w-full" data-testid="save-config-btn">Save Configuration</button>
        </form>
      )}

      {activeTab === "depts" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="font-heading text-lg font-semibold">Department Structure & Hierarchy</div>
            <button onClick={() => setDeptForm({ name: "", code: "", head: "", parent_department: "", employee_count: 5, color: "#166534", status: "active" })} className="btn-primary !py-2 !text-xs flex items-center gap-1.5" data-testid="add-dept-btn">
              <Plus size={14} /> Add Department
            </button>
          </div>

          <div className="card overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                  <th className="p-3.5">Name</th>
                  <th className="p-3.5">Code</th>
                  <th className="p-3.5">Head</th>
                  <th className="p-3.5">Parent</th>
                  <th className="p-3.5">Employees</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {depts.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/50" data-testid={`dept-row-${d.name.toLowerCase()}`}>
                    <td className="p-3.5 font-medium flex items-center gap-2">
                      <span className="h-3.5 w-3.5 rounded-full inline-block" style={{ background: d.color }} />
                      {d.name}
                    </td>
                    <td className="p-3.5 font-mono text-xs">{d.code || "—"}</td>
                    <td className="p-3.5">{d.head || "—"}</td>
                    <td className="p-3.5">{d.parent_department || "—"}</td>
                    <td className="p-3.5 font-mono">{d.employee_count}</td>
                    <td className="p-3.5">
                      <span className={`pill ${d.status === "active" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500 border border-slate-200"}`}>{d.status}</span>
                    </td>
                    <td className="p-3.5 text-right space-x-1">
                      <button onClick={() => setDeptForm(d)} className="btn-ghost !p-1.5" title="Edit"><Edit2 size={13} /></button>
                      <button onClick={() => deleteDept(d.id)} className="btn-ghost !p-1.5 text-red-600 hover:bg-red-50" title="Delete"><Trash2 size={13} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "categories" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="font-heading text-lg font-semibold">Shared Category Configurations</div>
            <button onClick={() => setCatForm({ name: "", type: "csr", status: "active" })} className="btn-primary !py-2 !text-xs flex items-center gap-1.5" data-testid="add-cat-btn">
              <Plus size={14} /> Add Category
            </button>
          </div>

          <div className="card overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                  <th className="p-3.5">Name</th>
                  <th className="p-3.5">Module Type</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {cats.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50" data-testid={`cat-row-${c.name.toLowerCase()}`}>
                    <td className="p-3.5 font-medium">{c.name}</td>
                    <td className="p-3.5 uppercase text-xs font-semibold tracking-wider text-slate-500">{c.type === "csr" ? "Social (CSR)" : "Gamification (Challenge)"}</td>
                    <td className="p-3.5">
                      <span className={`pill ${c.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{c.status}</span>
                    </td>
                    <td className="p-3.5 text-right space-x-1">
                      <button onClick={() => setCatForm(c)} className="btn-ghost !p-1.5" title="Edit"><Edit2 size={13} /></button>
                      <button onClick={() => deleteCat(c.id)} className="btn-ghost !p-1.5 text-red-600 hover:bg-red-50" title="Delete"><Trash2 size={13} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "notifications" && (
        <div className="card p-6 space-y-5 max-w-2xl">
          <div className="font-heading text-lg font-semibold">Notification Alerts settings</div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-700">New Compliance Issues</div>
                <div className="text-xs text-slate-500">Notify when a new compliance violation / risk is logged</div>
              </div>
              <input type="checkbox" checked={notifs.new_compliance_issue} onChange={(e) => setNotifs({ ...notifs, new_compliance_issue: e.target.checked })} className="w-5 h-5 accent-[#166534] cursor-pointer" data-testid="notify-compliance" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-700">CSR & Challenge Approvals</div>
                <div className="text-xs text-slate-500">Notify when participation decisions are verified and approved</div>
              </div>
              <input type="checkbox" checked={notifs.approval_decisions} onChange={(e) => setNotifs({ ...notifs, approval_decisions: e.target.checked })} className="w-5 h-5 accent-[#166534] cursor-pointer" data-testid="notify-approvals" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-700">Policy Acknowledgement Reminders</div>
                <div className="text-xs text-slate-500">Receive nudges for unacknowledged policies</div>
              </div>
              <input type="checkbox" checked={notifs.policy_reminders} onChange={(e) => setNotifs({ ...notifs, policy_reminders: e.target.checked })} className="w-5 h-5 accent-[#166534] cursor-pointer" data-testid="notify-policies" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-700">Badge Unlocks</div>
                <div className="text-xs text-slate-500">Celebrate and display toast alerts when a new badge is unlocked</div>
              </div>
              <input type="checkbox" checked={notifs.badge_unlocks} onChange={(e) => setNotifs({ ...notifs, badge_unlocks: e.target.checked })} className="w-5 h-5 accent-[#166534] cursor-pointer" data-testid="notify-badges" />
            </div>
          </div>

          <button onClick={saveNotifications} className="btn-primary w-full mt-4" data-testid="save-notifications-btn">Save Notification Preferences</button>
        </div>
      )}

      {/* Dept Modal */}
      {deptForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setDeptForm(null)}>
          <form onSubmit={submitDept} onClick={(e) => e.stopPropagation()} className="card p-6 max-w-md w-full space-y-4" data-testid="dept-modal">
            <div className="font-heading text-xl font-semibold">{deptForm.id ? "Edit Department" : "Add Department"}</div>
            <div className="space-y-3">
              <input required placeholder="Department Name" value={deptForm.name} onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })} />
              <input required placeholder="Department Code (e.g. ENG)" value={deptForm.code} onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })} />
              <input placeholder="Head of Department" value={deptForm.head || ""} onChange={(e) => setDeptForm({ ...deptForm, head: e.target.value })} />
              <input placeholder="Parent Department" value={deptForm.parent_department || ""} onChange={(e) => setDeptForm({ ...deptForm, parent_department: e.target.value })} />
              <input type="number" required min="1" placeholder="Employee Count" value={deptForm.employee_count} onChange={(e) => setDeptForm({ ...deptForm, employee_count: parseInt(e.target.value) })} />
              <input type="color" placeholder="Brand Color" value={deptForm.color} onChange={(e) => setDeptForm({ ...deptForm, color: e.target.value })} className="h-10 !p-1 cursor-pointer" />
              <select value={deptForm.status} onChange={(e) => setDeptForm({ ...deptForm, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => setDeptForm(null)} className="btn-outline">Cancel</button>
              <button type="submit" className="btn-primary" data-testid="save-dept-btn">Save</button>
            </div>
          </form>
        </div>
      )}

      {/* Category Modal */}
      {catForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setCatForm(null)}>
          <form onSubmit={submitCat} onClick={(e) => e.stopPropagation()} className="card p-6 max-w-sm w-full space-y-4" data-testid="cat-modal">
            <div className="font-heading text-xl font-semibold">{catForm.id ? "Edit Category" : "Add Category"}</div>
            <div className="space-y-3">
              <input required placeholder="Category Name" value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} />
              <select value={catForm.type} onChange={(e) => setCatForm({ ...catForm, type: e.target.value })}>
                <option value="csr">Social (CSR Activity)</option>
                <option value="challenge">Gamification (Challenge)</option>
              </select>
              <select value={catForm.status} onChange={(e) => setCatForm({ ...catForm, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => setCatForm(null)} className="btn-outline">Cancel</button>
              <button type="submit" className="btn-primary" data-testid="save-cat-btn">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
