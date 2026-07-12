import { useEffect, useState } from "react";
import api, { formatApiErrorDetail } from "@/lib/api";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Users, Heart, Plus, Check, X, ShieldAlert, Award, FileText } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function Social() {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState("activities");
  
  // Data state
  const [csr, setCsr] = useState([]);
  const [div, setDiv] = useState([]);
  const [participations, setParticipations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [esgConfig, setEsgConfig] = useState({ evidence_required: true });

  // Modal / forms state
  const [showAdd, setShowAdd] = useState(false);
  const [participateActivity, setParticipateActivity] = useState(null);
  const [proofText, setProofText] = useState("");

  const loadData = () => {
    refreshUser();
    Promise.all([
      api.get("/social/csr").then((r) => setCsr(r.data)),
      api.get("/social/diversity").then((r) => setDiv(r.data)),
      api.get("/social/participations").then((r) => setParticipations(r.data)),
      api.get("/settings/categories").then((r) => setCategories(r.data.filter(c => c.type === "csr" && c.status === "active"))),
      api.get("/settings/config").then((r) => setEsgConfig(r.data)),
    ]).catch((e) => toast.error(formatApiErrorDetail(e.response?.data?.detail)));
  };

  useEffect(loadData, []);

  const handleStatus = async (id, s) => {
    try {
      await api.patch(`/social/csr/${id}/status`, { status: s });
      toast.success(`CSR Activity marked ${s}`);
      loadData();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    }
  };

  const handleParticipationStatus = async (pid, s) => {
    try {
      await api.patch(`/social/participations/${pid}/status`, { status: s });
      toast.success(`Participation marked ${s}`);
      loadData();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    }
  };

  const submitParticipation = async (e) => {
    e.preventDefault();
    if (esgConfig.evidence_required && !proofText.trim()) {
      toast.error("Evidence/proof is required by configuration!");
      return;
    }
    try {
      await api.post("/social/participations", {
        employee_id: user.id,
        employee_name: user.name,
        activity_id: participateActivity.id,
        activity_title: participateActivity.title,
        proof: proofText,
        approval_status: "pending",
        points_earned: 0,
        completion_date: new Date().toISOString()
      });
      toast.success("Volunteer participation logged. Pending approval.");
      setParticipateActivity(null);
      setProofText("");
      loadData();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    }
  };

  const approved = csr.filter((c) => c.status === "approved");
  const totalHours = approved.reduce((s, c) => s + c.hours, 0);
  const totalPeople = participations.filter(p => p.approval_status === "approved").length;
  const pendingApprovals = participations.filter(p => p.approval_status === "pending").length + csr.filter(c => c.status === "pending").length;

  return (
    <div className="space-y-6 fade-in" data-testid="social-page">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Social</h1>
          <p className="text-sm text-slate-500 mt-1">CSR activities · Employee volunteerism · Diversity metrics</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2" data-testid="add-csr-btn">
          <Plus size={14} /> New CSR Activity
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-5"><div className="text-xs font-semibold uppercase text-slate-500">CSR Projects</div><div className="text-3xl font-heading font-semibold mt-2">{csr.length}</div></div>
        <div className="card p-5"><div className="text-xs font-semibold uppercase text-slate-500">Volunteer Hours</div><div className="text-3xl font-heading font-semibold mt-2">{totalHours} hrs</div></div>
        <div className="card p-5"><div className="text-xs font-semibold uppercase text-slate-500">Total Participations</div><div className="text-3xl font-heading font-semibold mt-2">{totalPeople}</div></div>
        <div className="card p-5"><div className="text-xs font-semibold uppercase text-slate-500">Pending Actions</div><div className="text-3xl font-heading font-semibold mt-2 text-amber-600">{pendingApprovals}</div></div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button onClick={() => setActiveTab("activities")} className={`px-4 py-2 text-sm font-semibold border-b-2 ${activeTab === "activities" ? "border-[#166534] text-[#166534]" : "border-transparent text-slate-500"}`} data-testid="tab-activities">
          CSR Projects
        </button>
        <button onClick={() => setActiveTab("participation")} className={`px-4 py-2 text-sm font-semibold border-b-2 ${activeTab === "participation" ? "border-[#166534] text-[#166534]" : "border-transparent text-slate-500"}`} data-testid="tab-participation">
          Employee Participation
        </button>
        <button onClick={() => setActiveTab("diversity")} className={`px-4 py-2 text-sm font-semibold border-b-2 ${activeTab === "diversity" ? "border-[#166534] text-[#166534]" : "border-transparent text-slate-500"}`} data-testid="tab-diversity">
          Diversity & Training
        </button>
      </div>

      {activeTab === "activities" && (
        <div className="card p-6">
          <div className="font-heading text-lg font-semibold mb-4">Active & Pending CSR Activities</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {csr.map((c) => (
              <div key={c.id} className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all flex flex-col justify-between" data-testid={`csr-card-${c.id}`}>
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="pill text-[10px]" style={{ background: "#F1F5F9", color: "#475569" }}>{c.category}</span>
                    <span className={`pill text-[10px] ${c.status === "approved" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : c.status === "pending" ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-red-50 text-red-700 border border-red-200"}`}>{c.status}</span>
                  </div>
                  <div className="font-heading text-lg font-semibold mb-1">{c.title}</div>
                  <div className="text-xs text-slate-500 mb-3">{c.description}</div>
                </div>
                <div className="border-t border-slate-100 pt-3 mt-3">
                  <div className="grid grid-cols-3 gap-2 text-xs text-slate-600 mb-3">
                    <div><div className="text-slate-400">Hours</div><div className="font-medium">{c.hours} hrs</div></div>
                    <div><div className="text-slate-400">Reward</div><div className="font-medium text-purple-600">+{c.xp_reward} XP</div></div>
                    <div><div className="text-slate-400">Department</div><div className="font-medium truncate">{c.department || "All"}</div></div>
                  </div>

                  {c.status === "approved" && (
                    <button onClick={() => setParticipateActivity(c)} className="btn-primary w-full !py-1.5 !text-xs flex items-center justify-center gap-1.5" data-testid={`participate-csr-${c.id}`}>
                      <Heart size={12} /> Log Participation
                    </button>
                  )}

                  {c.status === "pending" && (user?.role === "admin" || user?.role === "manager") && (
                    <div className="flex gap-2">
                      <button onClick={() => handleStatus(c.id, "approved")} className="btn-primary !py-1.5 !text-xs flex-1 flex items-center justify-center gap-1" data-testid={`approve-csr-${c.id}`}><Check size={12} /> Approve</button>
                      <button onClick={() => handleStatus(c.id, "rejected")} className="btn-outline !py-1.5 !text-xs flex items-center justify-center gap-1"><X size={12} /> Reject</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "participation" && (
        <div className="card p-6">
          <div className="font-heading text-lg font-semibold mb-4">Employee Participation Log</div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                  <th className="p-3.5">Employee</th>
                  <th className="p-3.5">CSR Activity</th>
                  <th className="p-3.5">Evidence / Proof</th>
                  <th className="p-3.5">Completion Date</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {participations.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50" data-testid={`participation-${p.id}`}>
                    <td className="p-3.5 font-medium">{p.employee_name}</td>
                    <td className="p-3.5">{p.activity_title}</td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-1 text-xs text-slate-600 max-w-xs truncate" title={p.proof}>
                        <FileText size={12} className="shrink-0" />
                        {p.proof || <span className="text-red-500 italic">No proof provided</span>}
                      </div>
                    </td>
                    <td className="p-3.5 font-mono text-xs">{p.completion_date?.split("T")[0]}</td>
                    <td className="p-3.5">
                      <span className={`pill text-[10px] ${p.approval_status === "approved" ? "bg-emerald-50 text-emerald-700" : p.approval_status === "pending" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>{p.approval_status}</span>
                    </td>
                    <td className="p-3.5 text-right">
                      {p.approval_status === "pending" && (user?.role === "admin" || user?.role === "manager") ? (
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => handleParticipationStatus(p.id, "approved")} className="btn-primary !py-1 !px-2 !text-xs flex items-center gap-1" data-testid={`approve-part-${p.id}`}><Check size={11} /> Approve</button>
                          <button onClick={() => handleParticipationStatus(p.id, "rejected")} className="btn-outline !py-1 !px-2 !text-xs flex items-center gap-1"><X size={11} /> Reject</button>
                        </div>
                      ) : p.approval_status === "approved" ? (
                        <span className="text-xs text-emerald-700 font-semibold font-mono">+{p.points_earned} XP awarded</span>
                      ) : (
                        <span className="text-xs text-slate-400">No action</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "diversity" && (
        <div className="space-y-6">
          <div className="card p-6">
            <div className="text-xs font-semibold uppercase text-slate-500 mb-4">Diversity & Training by Department (Female % vs ESG Training Completion %)</div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={div.map(d => ({ dept: d.department, female: Math.round((d.female_count/d.total_employees)*100), training: d.training_completion }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis dataKey="dept" stroke="#4B5563" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip />
                <Bar dataKey="female" name="Female %" fill="#8B5CF6" radius={[6,6,0,0]} />
                <Bar dataKey="training" name="Training %" fill="#166534" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-6">
            <div className="font-heading text-lg font-semibold mb-4">Diversity Statistics Table</div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                    <th className="p-3.5">Department</th>
                    <th className="p-3.5">Total Employees</th>
                    <th className="p-3.5">Gender Balance</th>
                    <th className="p-3.5">Minority Ratio</th>
                    <th className="p-3.5">ESG Training Rate</th>
                    <th className="p-3.5">Audit Period</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {div.map((d) => {
                    const fPct = Math.round((d.female_count / d.total_employees) * 100);
                    const mPct = Math.round((d.male_count / d.total_employees) * 100);
                    return (
                      <tr key={d.id} className="hover:bg-slate-50/50">
                        <td className="p-3.5 font-medium">{d.department}</td>
                        <td className="p-3.5 font-mono">{d.total_employees}</td>
                        <td className="p-3.5 font-mono text-xs">👩 {fPct}% / 👨 {mPct}%</td>
                        <td className="p-3.5 font-mono">{d.minority_percent}%</td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono">{d.training_completion}%</span>
                            <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-700" style={{ width: `${d.training_completion}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 font-mono text-xs">{d.period}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Activity Modal */}
      {showAdd && (
        <AddCsrModal categories={categories} onClose={() => setShowAdd(false)} onSaved={() => { loadData(); setShowAdd(false); }} />
      )}

      {/* Log Participation Modal */}
      {participateActivity && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setParticipateActivity(null)}>
          <form onSubmit={submitParticipation} onClick={(e) => e.stopPropagation()} className="card p-6 max-w-md w-full space-y-4" data-testid="participation-modal">
            <div className="font-heading text-xl font-semibold">Log volunteer participation</div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600">
              Logging participation for <strong>{participateActivity.title}</strong>. This activity rewards <strong>+{participateActivity.xp_reward} XP</strong> on verification.
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Proof of completion</label>
              <textarea required={esgConfig.evidence_required} placeholder={esgConfig.evidence_required ? "Provide description / link of your participation proof (required by ESG settings)..." : "Write details about your participation..."} rows="4" value={proofText} onChange={(e) => setProofText(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => setParticipateActivity(null)} className="btn-outline">Cancel</button>
              <button type="submit" className="btn-primary" data-testid="save-participation-btn">Submit Log</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function AddCsrModal({ categories, onClose, onSaved }) {
  const [f, setF] = useState({ title: "", description: "", category: "community", date: new Date().toISOString(), hours: 4, organizer: "", location: "Mumbai", participants: [], xp_reward: 100 });

  const save = async (e) => {
    e.preventDefault();
    try {
      await api.post("/social/csr", f);
      toast.success("CSR activity submitted for approval");
      onSaved();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={save} onClick={(e)=>e.stopPropagation()} className="card p-6 max-w-lg w-full space-y-3" data-testid="add-csr-modal">
        <div className="font-heading text-xl font-semibold mb-4">New CSR Activity</div>
        <input required placeholder="Title" value={f.title} onChange={(e)=>setF({...f, title: e.target.value})} />
        <textarea required placeholder="Description" rows="3" value={f.description} onChange={(e)=>setF({...f, description: e.target.value})} />
        <select value={f.category} onChange={(e)=>setF({...f, category: e.target.value})}>
          {categories.length > 0 ? (
            categories.map(c=><option key={c.id} value={c.name}>{c.name}</option>)
          ) : (
            ["community","education","health","environment"].map(c=><option key={c} value={c}>{c}</option>)
          )}
        </select>
        <input type="number" min="1" placeholder="Hours" value={f.hours} onChange={(e)=>setF({...f, hours: parseFloat(e.target.value)})} />
        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
          <button type="submit" className="btn-primary" data-testid="save-csr-btn">Submit</button>
        </div>
      </form>
    </div>
  );
}
