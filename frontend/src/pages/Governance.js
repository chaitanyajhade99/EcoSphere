import { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { ShieldCheck, FileWarning, CheckCircle2, ClipboardList, Loader2, Sparkles, Plus, Pencil, Trash2 } from "lucide-react";

const SEV_COLOR = { low: "#22C55E", medium: "#F59E0B", high: "#EF4444", critical: "#7F1D1D" };
const STATUS_COLOR = { open: "#EF4444", in_progress: "#F59E0B", resolved: "#22C55E", scheduled: "#3B82F6", completed: "#22C55E" };

export default function Governance() {
  const [policies, setPolicies] = useState([]);
  const [audits, setAudits] = useState([]);
  const [issues, setIssues] = useState([]);
  const [check, setCheck] = useState(null);
  const [ctx, setCtx] = useState("");
  const [busy, setBusy] = useState(false);
  const [showAddIssue, setShowAddIssue] = useState(false);
  const [showAddAudit, setShowAddAudit] = useState(false);
  const [showAddPolicy, setShowAddPolicy] = useState(false);

  const load = () => { Promise.all([
    api.get("/governance/policies").then((r) => setPolicies(r.data)),
    api.get("/governance/audits").then((r) => setAudits(r.data)),
    api.get("/governance/issues").then((r) => setIssues(r.data)),
  ]); };
  useEffect(load, []);

  const ack = async (id) => {
    await api.post(`/governance/policies/${id}/acknowledge`);
    toast.success("Policy acknowledged");
    load();
  };

  const sendReminder = async (id) => {
    try {
      const { data } = await api.post(`/governance/policies/${id}/remind`);
      toast.success(`Policy reminders sent successfully to ${data.reminded_count} employee(s).`);
    } catch (e) {
      toast.error("Failed to send policy reminders.");
    }
  };

  const deletePolicy = async (id) => {
    if (!window.confirm("Delete this policy?")) return;
    try { await api.delete(`/governance/policies/${id}`); toast.success("Policy deleted"); load(); } catch (e) { toast.error(e.response?.data?.detail || "Delete failed"); }
  };

  const updateAuditStatus = async (id, newStatus, score = null, findings = null) => {
    try {
      const body = { status: newStatus };
      if (score !== null) body.score = score;
      if (findings !== null) body.findings = findings;
      await api.patch(`/governance/audits/${id}/status`, body);
      toast.success(`Audit status → ${newStatus.replace("_", " ")}`);
      load();
    } catch (e) { toast.error(e.response?.data?.detail || "Status update failed"); }
  };

  const updateIssueStatus = async (id, newStatus) => {
    try {
      await api.patch(`/governance/issues/${id}/status`, { status: newStatus });
      toast.success(`Issue status → ${newStatus.replace("_", " ")}`);
      load();
    } catch (e) { toast.error(e.response?.data?.detail || "Status update failed"); }
  };

  const runCheck = async () => {
    if (!ctx.trim()) return toast.error("Describe a situation to check");
    setBusy(true);
    try {
      const { data } = await api.post("/ai/compliance-check", { context: ctx });
      setCheck(data);
    } catch (e) { toast.error("Compliance check failed"); }
    setBusy(false);
  };

  return (
    <div className="space-y-6 fade-in" data-testid="governance-page">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Governance</h1>
        <p className="text-sm text-slate-500 mt-1">Policies · Audits · Compliance risk register · AI compliance checker</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-5"><div className="text-xs font-semibold uppercase text-slate-500">Policies</div><div className="text-3xl font-heading font-semibold mt-2">{policies.length}</div></div>
        <div className="card p-5"><div className="text-xs font-semibold uppercase text-slate-500">Audits</div><div className="text-3xl font-heading font-semibold mt-2">{audits.length}</div></div>
        <div className="card p-5"><div className="text-xs font-semibold uppercase text-slate-500">Open Issues</div><div className="text-3xl font-heading font-semibold mt-2 text-red-600">{issues.filter(i => i.status !== "resolved").length}</div></div>
        <div className="card p-5"><div className="text-xs font-semibold uppercase text-slate-500">Critical Risks</div><div className="text-3xl font-heading font-semibold mt-2 text-red-800">{issues.filter(i => i.severity === "critical").length}</div></div>
      </div>

      {/* AI Compliance Checker */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} className="text-emerald-700" />
          <div className="font-heading text-lg font-semibold">AI Compliance Checker</div>
          <span className="pill" style={{ background: "#F1F5F9", color: "#475569" }}>ISO 37301 · GRI</span>
        </div>
        <p className="text-sm text-slate-500 mb-3">Describe a situation or upload a scenario — the assistant will assess risk level with WHY reasoning.</p>
        <div className="flex gap-2">
          <textarea rows="2" placeholder="e.g. Our supplier hasn't shared Scope 3 data for 3 months and we sign renewal next week..."
                    value={ctx} onChange={(e)=>setCtx(e.target.value)} data-testid="compliance-input" />
          <button onClick={runCheck} disabled={busy} className="btn-primary flex items-center gap-2 shrink-0" data-testid="run-compliance-btn">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />} Check
          </button>
        </div>
        {check && !check.error && (
          <div className="mt-4 border-t border-slate-200 pt-4" data-testid="compliance-result">
            <div className="flex items-center gap-2 mb-3">
              <span className="pill uppercase" style={{ background: `${SEV_COLOR[check.risk_level] || "#94A3B8"}20`, color: SEV_COLOR[check.risk_level] || "#475569" }}>
                Risk: {check.risk_level}
              </span>
              <span className="text-sm text-slate-500">{check.overall_status}</span>
            </div>
            {check.findings?.length > 0 && (
              <div className="mb-3">
                <div className="text-xs font-semibold uppercase text-slate-500 mb-1">Findings</div>
                <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                  {check.findings.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              </div>
            )}
            <div>
              <div className="text-xs font-semibold uppercase text-slate-500 mb-1">Recommendations</div>
              <div className="space-y-2">
                {(check.recommendations || []).map((r, i) => (
                  <div key={i} className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-lg text-sm">
                    <div className="font-medium">{r.action}</div>
                    <div className="text-xs text-emerald-800 uppercase tracking-widest mt-1">Why · {r.standard_ref}</div>
                    <div className="text-slate-600 mt-0.5">{r.why}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Policies */}
      <div className="card p-6">
        <div className="text-xs font-semibold uppercase text-slate-500 mb-4 flex items-center justify-between">
          <span>ESG Policies</span>
          <button onClick={() => setShowAddPolicy(true)} className="btn-primary flex items-center gap-1 !py-1 !text-[11px] !px-3" data-testid="add-policy-btn">
            <Plus size={12} /> Add Policy
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {policies.map((p) => (
            <div key={p.id} className="border border-slate-200 rounded-xl p-4">
              <div className="flex justify-between items-start mb-2">
                <span className="pill capitalize" style={{ background: "#F1F5F9", color: "#475569" }}>{p.category}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-mono">v{p.version}</span>
                  <button onClick={() => deletePolicy(p.id)} className="p-1 hover:bg-red-50 rounded" data-testid={`delete-policy-${p.id}`}><Trash2 size={12} className="text-red-400" /></button>
                </div>
              </div>
              <div className="font-heading font-semibold text-base mb-1">{p.title}</div>
              <div className="text-xs text-slate-500 mb-3 line-clamp-2">{p.summary}</div>
              <div className="flex items-center justify-between text-xs gap-2">
                <span className="text-slate-500">{p.acknowledgements.length} acks</span>
                <div className="flex gap-1.5">
                  <button onClick={() => sendReminder(p.id)} className="btn-outline !py-1 !text-[11px] !px-2" data-testid={`remind-policy-${p.id}`}>
                    Remind
                  </button>
                  <button onClick={() => ack(p.id)} className="btn-outline !py-1 !text-[11px] !px-2" data-testid={`ack-policy-${p.id}`}>
                    <CheckCircle2 size={12} className="inline mr-1" /> Acknowledge
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Audits + Issues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="text-xs font-semibold uppercase text-slate-500 mb-4 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2"><ClipboardList size={14} /> Audits</span>
            <button onClick={() => setShowAddAudit(true)} className="btn-outline !py-1 !text-[11px] !px-2 flex items-center gap-1" data-testid="add-audit-btn">
              <Plus size={11} /> Add Audit
            </button>
          </div>
          <div className="space-y-3">
            {audits.map((a) => (
              <div key={a.id} className="border border-slate-200 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <div className="text-sm font-medium">{a.title}</div>
                    <div className="text-xs text-slate-500">{a.type} · {a.department} · {a.auditor}</div>
                  </div>
                  <div className="text-right">
                    <span className="pill" style={{ background: `${STATUS_COLOR[a.status]}15`, color: STATUS_COLOR[a.status] }}>{a.status?.replace("_", " ")}</span>
                    {a.score != null && <div className="text-xs text-slate-500 mt-1 font-mono">Score: {a.score}</div>}
                  </div>
                </div>
                {/* Status transition buttons */}
                <div className="flex gap-1.5 mt-1">
                  {a.status === "scheduled" && (
                    <button onClick={() => updateAuditStatus(a.id, "in_progress")} className="btn-outline !py-0.5 !text-[10px] !px-2" data-testid={`audit-start-${a.id}`}>▶ Start</button>
                  )}
                  {a.status === "in_progress" && (
                    <button onClick={() => {
                      const score = prompt("Enter audit score (0-100):", "85");
                      const findings = prompt("Number of findings:", "0");
                      if (score !== null) updateAuditStatus(a.id, "completed", parseFloat(score), parseInt(findings || "0"));
                    }} className="btn-outline !py-0.5 !text-[10px] !px-2" data-testid={`audit-complete-${a.id}`}>✓ Complete</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <div className="text-xs font-semibold uppercase text-slate-500 mb-4 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2"><FileWarning size={14} /> Compliance Issues</span>
            <button onClick={() => setShowAddIssue(true)} className="btn-outline !py-1 !text-[11px] !px-2 flex items-center gap-1" data-testid="add-issue-btn">
              <Plus size={11} /> Log Issue
            </button>
          </div>
          <div className="space-y-3">
            {issues.map((i) => (
              <div key={i.id} className="border border-slate-200 rounded-lg p-3">
                <div className="flex justify-between items-start mb-1">
                  <div className="text-sm font-medium flex-1 pr-2 flex items-center gap-2">
                    {i.title}
                    {i.overdue && (
                      <span className="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded animate-pulse" data-testid={`overdue-badge-${i.id}`}>
                        ⚠️ OVERDUE
                      </span>
                    )}
                  </div>
                  <span className="pill uppercase" style={{ background: `${SEV_COLOR[i.severity]}15`, color: SEV_COLOR[i.severity] }}>{i.severity}</span>
                </div>
                <div className="text-xs text-slate-500 mb-2">Owner: {i.owner} · Due {new Date(i.due_date).toLocaleDateString()}</div>
                {/* Status + transition buttons */}
                <div className="flex items-center gap-2">
                  <span className="pill text-[10px]" style={{ background: `${STATUS_COLOR[i.status]}15`, color: STATUS_COLOR[i.status] }}>{i.status?.replace("_", " ")}</span>
                  {i.status === "open" && (
                    <button onClick={() => updateIssueStatus(i.id, "in_progress")} className="btn-outline !py-0.5 !text-[10px] !px-2" data-testid={`issue-progress-${i.id}`}>→ In Progress</button>
                  )}
                  {i.status === "in_progress" && (
                    <button onClick={() => updateIssueStatus(i.id, "resolved")} className="btn-outline !py-0.5 !text-[10px] !px-2" data-testid={`issue-resolve-${i.id}`}>✓ Resolve</button>
                  )}
                  {i.status === "open" && (
                    <button onClick={() => updateIssueStatus(i.id, "resolved")} className="btn-outline !py-0.5 !text-[10px] !px-2" data-testid={`issue-resolve-direct-${i.id}`}>✓ Resolve</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showAddIssue && <AddIssueModal onClose={() => setShowAddIssue(false)} onSaved={() => { load(); setShowAddIssue(false); }} />}
      {showAddAudit && <AddAuditModal onClose={() => setShowAddAudit(false)} onSaved={() => { load(); setShowAddAudit(false); }} />}
      {showAddPolicy && <AddPolicyModal onClose={() => setShowAddPolicy(false)} onSaved={() => { load(); setShowAddPolicy(false); }} />}
    </div>
  );
}

function AddIssueModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    title: "", description: "", department: "Operations",
    severity: "medium", owner: "", due_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    status: "open", overdue: false
  });

  const save = async (e) => {
    e.preventDefault();
    try {
      await api.post("/governance/issues", form);
      toast.success("Compliance issue logged successfully!");
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to log issue");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="card p-6 max-w-lg w-full space-y-4" data-testid="add-issue-modal">
        <div className="font-heading text-xl font-semibold">Log Compliance Issue</div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Issue Title</label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Uncertified Scope 1 fuel logs" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Description</label>
            <textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe compliance discrepancy..." rows="3" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">Department</label>
              <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                {["Operations", "Engineering", "Marketing", "Sales", "HR", "Finance"].map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">Severity</label>
              <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
                {["low", "medium", "high", "critical"].map((s) => <option key={s} value={s}>{s.toUpperCase()}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">Assigned Owner</label>
              <input required value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} placeholder="Owner Name / Email" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">Due Date</label>
              <input required type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
          <button type="submit" className="btn-primary" data-testid="save-issue-btn">Log Issue</button>
        </div>
      </form>
    </div>
  );
}

function AddAuditModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    title: "", type: "internal", department: "Operations",
    auditor: "", scheduled_date: new Date().toISOString().split("T")[0],
    status: "scheduled", score: 100
  });

  const save = async (e) => {
    e.preventDefault();
    try {
      await api.post("/governance/audits", form);
      toast.success("Audit scheduled successfully!");
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to schedule audit");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="card p-6 max-w-lg w-full space-y-4" data-testid="add-audit-modal">
        <div className="font-heading text-xl font-semibold">Schedule Audit</div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Audit Title</label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. ISO 14001 Environmental Audit" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">Audit Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="internal">Internal</option>
                <option value="external">External</option>
                <option value="certification">Certification</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">Department</label>
              <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                {["Operations", "Engineering", "Marketing", "Sales", "HR", "Finance"].map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">Lead Auditor</label>
              <input required value={form.auditor} onChange={(e) => setForm({ ...form, auditor: e.target.value })} placeholder="Auditor Name" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">Scheduled Date</label>
              <input required type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
          <button type="submit" className="btn-primary" data-testid="save-audit-btn">Schedule Audit</button>
        </div>
      </form>
    </div>
  );
}

function AddPolicyModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    title: "", category: "environmental", version: "1.0",
    summary: "", body: "",
    effective_date: new Date().toISOString().split("T")[0],
    review_date: new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0],
    status: "active"
  });

  const save = async (e) => {
    e.preventDefault();
    try {
      await api.post("/governance/policies", form);
      toast.success("Policy created successfully!");
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create policy");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="card p-6 max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto" data-testid="add-policy-modal">
        <div className="font-heading text-xl font-semibold">Create New Policy</div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Policy Title</label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Anti-Corruption Policy" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {["environmental", "social", "governance", "ethics"].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">Version</label>
              <input required value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} placeholder="1.0" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Summary</label>
            <textarea required value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="Brief summary of this policy..." rows="2" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Policy Body</label>
            <textarea required value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Full policy text..." rows="4" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">Effective Date</label>
              <input required type="date" value={form.effective_date} onChange={(e) => setForm({ ...form, effective_date: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">Review Date</label>
              <input required type="date" value={form.review_date} onChange={(e) => setForm({ ...form, review_date: e.target.value })} />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
          <button type="submit" className="btn-primary" data-testid="save-policy-btn">Create Policy</button>
        </div>
      </form>
    </div>
  );
}
