import { useEffect, useState } from "react";
import api, { formatApiErrorDetail } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Trophy, Award, ShoppingBag, ListChecks, Plus, Check, X, ShieldAlert, FileText, ChevronRight, User } from "lucide-react";

export default function Gamification() {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState("challenges");
  
  // Data state
  const [challenges, setChallenges] = useState([]);
  const [participations, setParticipations] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [badges, setBadges] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [categories, setCategories] = useState([]);

  // Modals / forms state
  const [showAddChallenge, setShowAddChallenge] = useState(false);
  const [progressModal, setProgressModal] = useState(null);
  const [progressVal, setProgressVal] = useState(0);
  const [proofText, setProofText] = useState("");

  const loadData = () => {
    refreshUser();
    Promise.all([
      api.get("/gamification/challenges").then((r) => setChallenges(r.data)),
      api.get("/gamification/participations").then((r) => setParticipations(r.data)),
      api.get("/gamification/rewards").then((r) => setRewards(r.data)),
      api.get("/gamification/badges").then((r) => setBadges(r.data)),
      api.get("/gamification/leaderboard").then((r) => setLeaderboard(r.data)),
      api.get("/settings/categories").then((r) => setCategories(r.data.filter(c => c.type === "challenge" && c.status === "active"))),
    ]).catch((e) => toast.error(formatApiErrorDetail(e.response?.data?.detail)));
  };

  useEffect(loadData, []);

  const handleJoinOrUpdate = async (cid) => {
    // Joining challenge first time starts it at 0 progress
    try {
      await api.post("/gamification/participations", {
        challenge_id: cid,
        challenge_title: challenges.find(c => c.id === cid)?.title || "",
        progress: 0,
        proof: "",
        approval: "pending",
        xp_awarded: 0
      });
      toast.success("Joined challenge successfully!");
      loadData();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    }
  };

  const handleUpdateProgress = async (e) => {
    e.preventDefault();
    try {
      await api.post("/gamification/participations", {
        challenge_id: progressModal.id,
        challenge_title: progressModal.title,
        progress: parseInt(progressVal),
        proof: proofText,
        approval: "pending",
        xp_awarded: 0
      });
      toast.success("Progress reported successfully!");
      setProgressModal(null);
      setProgressVal(0);
      setProofText("");
      loadData();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    }
  };

  const handleChallengeStatus = async (cid, s) => {
    try {
      await api.patch(`/gamification/challenges/${cid}/status`, { status: s });
      toast.success(`Challenge status updated to ${s}`);
      loadData();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    }
  };

  const handleApproveParticipation = async (pid, statusVal) => {
    try {
      await api.patch(`/gamification/participations/${pid}/approve`, { status: statusVal });
      toast.success(`Participation marked ${statusVal}`);
      loadData();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    }
  };

  const redeemReward = async (rid) => {
    try {
      await api.post(`/gamification/rewards/${rid}/redeem`);
      toast.success("Reward redeemed successfully!");
      loadData();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    }
  };

  // Find user's progress for each challenge
  const getParticipation = (cid) => {
    return participations.find(p => p.challenge_id === cid && p.employee_id === user.id);
  };

  const pendingApprovals = participations.filter(p => p.approval === "pending" && p.progress === 100).length;

  return (
    <div className="space-y-6 fade-in" data-testid="gamification-page">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Gamification</h1>
          <p className="text-sm text-slate-500 mt-1">Join challenges, earn badges, and redeem eco-friendly rewards.</p>
        </div>
        {user?.role === "admin" && (
          <button onClick={() => setShowAddChallenge(true)} className="btn-primary flex items-center gap-1.5" data-testid="add-challenge-btn">
            <Plus size={14} /> New Challenge
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button onClick={() => setActiveTab("challenges")} className={`px-4 py-2 text-sm font-semibold border-b-2 ${activeTab === "challenges" ? "border-[#166534] text-[#166534]" : "border-transparent text-slate-500"}`} data-testid="tab-challenges">
          <span className="flex items-center gap-1.5"><Trophy size={14} /> Challenges</span>
        </button>
        <button onClick={() => setActiveTab("leaderboard")} className={`px-4 py-2 text-sm font-semibold border-b-2 ${activeTab === "leaderboard" ? "border-[#166534] text-[#166534]" : "border-transparent text-slate-500"}`} data-testid="tab-leaderboard">
          <span className="flex items-center gap-1.5"><Award size={14} /> Badges & Leaderboard</span>
        </button>
        <button onClick={() => setActiveTab("rewards")} className={`px-4 py-2 text-sm font-semibold border-b-2 ${activeTab === "rewards" ? "border-[#166534] text-[#166534]" : "border-transparent text-slate-500"}`} data-testid="tab-rewards">
          <span className="flex items-center gap-1.5"><ShoppingBag size={14} /> Reward Store</span>
        </button>
        {(user?.role === "admin" || user?.role === "manager") && (
          <button onClick={() => setActiveTab("review")} className={`px-4 py-2 text-sm font-semibold border-b-2 ${activeTab === "review" ? "border-[#166534] text-[#166534]" : "border-transparent text-slate-500"} relative`} data-testid="tab-review">
            <span className="flex items-center gap-1.5"><ListChecks size={14} /> Verification Queue</span>
            {pendingApprovals > 0 && <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-500 text-white font-mono text-[9px] flex items-center justify-center font-bold animate-pulse">{pendingApprovals}</span>}
          </button>
        )}
      </div>

      {activeTab === "challenges" && (
        <div className="card p-6">
          <div className="font-heading text-lg font-semibold mb-4">Available Sustainability Challenges</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {challenges.map((c) => {
              const part = getParticipation(c.id);
              return (
                <div key={c.id} className="border border-slate-200 rounded-xl p-5 hover:shadow-md transition-all flex flex-col justify-between" data-testid={`challenge-card-${c.id}`}>
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="pill text-[10px] bg-slate-100 text-slate-600">{c.category}</span>
                      <span className={`pill text-[10px] uppercase font-semibold ${c.status === "active" ? "bg-emerald-50 text-emerald-700" : c.status === "draft" ? "bg-slate-100 text-slate-500" : "bg-amber-50 text-amber-700"}`}>{c.status}</span>
                    </div>
                    <div className="font-heading text-lg font-semibold mb-1">{c.title}</div>
                    <p className="text-xs text-slate-500 mb-4">{c.description}</p>
                  </div>

                  <div className="border-t border-slate-100 pt-4 mt-4 space-y-4">
                    <div className="flex justify-between text-xs text-slate-500 font-mono">
                      <span>💰 {c.eco_coin_reward} Coins</span>
                      <span>⭐ {c.xp_reward} XP</span>
                    </div>

                    {part ? (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-600">Your Progress</span>
                          <span className="font-mono text-[#166534]">{part.progress}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-700 transition-all duration-300" style={{ width: `${part.progress}%` }} />
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                          <span>Status: {part.approval}</span>
                          {part.progress < 100 && (
                            <button onClick={() => { setProgressModal(c); setProgressVal(part.progress); setProofText(part.proof || ""); }} className="text-[#166534] hover:underline font-semibold" data-testid={`update-progress-${c.id}`}>Update Progress</button>
                          )}
                        </div>
                      </div>
                    ) : c.status === "active" ? (
                      <button onClick={() => handleJoinOrUpdate(c.id)} className="btn-primary w-full !py-1.5 !text-xs" data-testid={`join-challenge-${c.id}`}>Join Challenge</button>
                    ) : null}

                    {/* Manager actions */}
                    {(user?.role === "admin" || user?.role === "manager") && (
                      <div className="flex gap-1.5 border-t border-slate-100 pt-3 mt-3">
                        {c.status === "draft" && <button onClick={() => handleChallengeStatus(c.id, "active")} className="btn-outline !py-1 !text-[10px] flex-1">Activate</button>}
                        {c.status === "active" && <button onClick={() => handleChallengeStatus(c.id, "under_review")} className="btn-outline !py-1 !text-[10px] flex-1">Under Review</button>}
                        {c.status === "under_review" && <button onClick={() => handleChallengeStatus(c.id, "completed")} className="btn-outline !py-1 !text-[10px] flex-1">Complete</button>}
                        {c.status !== "archived" && <button onClick={() => handleChallengeStatus(c.id, "archived")} className="btn-outline hover:text-red-700 !py-1 !text-[10px]">Archive</button>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "leaderboard" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card p-6 lg:col-span-2 space-y-4">
            <div className="font-heading text-lg font-semibold">ESG Performance Leaderboard</div>
            <div className="space-y-2">
              {leaderboard.map((item, index) => (
                <div key={item.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50/50" data-testid={`leaderboard-item-${index}`}>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-semibold text-slate-400 w-5">#{index + 1}</span>
                    <span className="h-8 w-8 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center border border-slate-200">
                      {item.avatar ? <img src={item.avatar} alt="" className="object-cover h-full w-full" /> : <User size={14} className="text-slate-400" />}
                    </span>
                    <div>
                      <div className="font-medium text-sm">{item.name}</div>
                      <div className="text-[10px] text-slate-400">{item.department}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm font-bold text-emerald-800">{item.xp} XP</div>
                    <div className="text-[10px] text-slate-400 font-mono">Level {item.level}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6 space-y-4">
            <div className="font-heading text-lg font-semibold">Achievement Badges</div>
            <div className="grid grid-cols-2 gap-3">
              {badges.map((b) => {
                const key = b.name.toLowerCase().replace(" ", "_");
                const hasBadge = user.badges?.includes(key);
                return (
                  <div key={b.id} className={`border border-slate-200 rounded-xl p-3 flex flex-col items-center text-center transition-all ${hasBadge ? "bg-emerald-50/40 border-emerald-300 shadow-sm" : "opacity-50"}`} data-testid={`badge-card-${key}`}>
                    <span className={`h-10 w-10 rounded-full flex items-center justify-center ${hasBadge ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                      🏆
                    </span>
                    <div className="font-semibold text-xs mt-2 truncate max-w-full" title={b.name}>{b.name}</div>
                    <div className="text-[9px] text-slate-500 mt-1 max-w-full truncate" title={b.requirement}>{b.requirement}</div>
                    <div className="font-mono text-[9px] mt-2 font-bold text-purple-700">+{b.xp_value} XP</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === "rewards" && (
        <div className="card p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div className="font-heading text-lg font-semibold">Eco Reward Catalog</div>
            <div className="bg-[#166534] text-white px-3.5 py-1.5 rounded-lg font-mono text-sm font-semibold shadow-sm">
              Your Wallet: 🪙 {user.eco_coins} Coins
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rewards.map((r) => (
              <div key={r.id} className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between" data-testid={`reward-card-${r.id}`}>
                <div>
                  <div className="font-heading text-base font-semibold mb-1">{r.name}</div>
                  <p className="text-xs text-slate-500 mb-3">{r.description}</p>
                </div>
                <div className="border-t border-slate-100 pt-3 mt-3 flex items-center justify-between">
                  <div className="font-mono text-xs font-bold text-slate-700">🪙 {r.cost} Coins</div>
                  <button onClick={() => redeemReward(r.id)} disabled={user.eco_coins < r.cost} className="btn-primary !py-1 !px-3 !text-xs disabled:opacity-40" data-testid={`redeem-reward-${r.id}`}>
                    Redeem
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "review" && (
        <div className="card p-6">
          <div className="font-heading text-lg font-semibold mb-4">Pending Challenge Verification Queue</div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                  <th className="p-3.5">Employee</th>
                  <th className="p-3.5">Challenge Title</th>
                  <th className="p-3.5">Progress</th>
                  <th className="p-3.5">Verification / Proof</th>
                  <th className="p-3.5">Submitted At</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {participations.filter(p => p.approval === "pending").map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50" data-testid={`review-part-${p.id}`}>
                    <td className="p-3.5 font-medium">{p.employee_name}</td>
                    <td className="p-3.5">{p.challenge_title}</td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5 font-mono font-semibold text-[#166534]">
                        {p.progress}%
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-1 text-xs text-slate-600 max-w-xs truncate" title={p.proof}>
                        <FileText size={12} className="shrink-0" />
                        {p.proof || <span className="text-slate-400 italic">None</span>}
                      </div>
                    </td>
                    <td className="p-3.5 font-mono text-xs">{p.created_at?.split("T")[0]}</td>
                    <td className="p-3.5 text-right space-x-1.5">
                      <button onClick={() => handleApproveParticipation(p.id, "approved")} className="btn-primary !py-1 !px-2.5 !text-xs" data-testid={`approve-part-${p.id}`}><Check size={11} className="inline mr-1" /> Approve</button>
                      <button onClick={() => handleApproveParticipation(p.id, "rejected")} className="btn-outline !py-1 !px-2.5 !text-xs"><X size={11} className="inline mr-1" /> Reject</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Progress Reporting Modal */}
      {progressModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setProgressModal(null)}>
          <form onSubmit={handleUpdateProgress} onClick={(e) => e.stopPropagation()} className="card p-6 max-w-md w-full space-y-4" data-testid="progress-modal">
            <div className="font-heading text-xl font-semibold">Report Challenge Progress</div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Completion Progress</label>
                <div className="flex items-center gap-3">
                  <input type="range" min="0" max="100" value={progressVal} onChange={(e) => setProgressVal(e.target.value)} className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer" />
                  <span className="font-mono text-sm font-semibold">{progressVal}%</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Proof details / comments</label>
                <textarea placeholder="Write text description or paste links to files verifying your completion progress..." rows="3" value={proofText} onChange={(e) => setProofText(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => setProgressModal(null)} className="btn-outline">Cancel</button>
              <button type="submit" className="btn-primary" data-testid="save-progress-btn">Save Progress</button>
            </div>
          </form>
        </div>
      )}

      {/* Add Challenge Modal */}
      {showAddChallenge && (
        <AddChallengeModal categories={categories} onClose={() => setShowAddChallenge(false)} onSaved={() => { loadData(); setShowAddChallenge(false); }} />
      )}
    </div>
  );
}

function AddChallengeModal({ categories, onClose, onSaved }) {
  const [f, setF] = useState({ title: "", description: "", category: "environmental", xp_reward: 100, eco_coin_reward: 50, start_date: new Date().toISOString(), end_date: new Date().toISOString(), status: "draft", participants: [], icon: "leaf" });

  const save = async (e) => {
    e.preventDefault();
    try {
      await api.post("/gamification/challenges", f);
      toast.success("Challenge template draft created");
      onSaved();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={save} onClick={(e)=>e.stopPropagation()} className="card p-6 max-w-lg w-full space-y-3" data-testid="add-challenge-modal">
        <div className="font-heading text-xl font-semibold mb-4">Create Sustainability Challenge</div>
        <input required placeholder="Challenge Title" value={f.title} onChange={(e)=>setF({...f, title: e.target.value})} />
        <textarea required placeholder="Description" rows="3" value={f.description} onChange={(e)=>setF({...f, description: e.target.value})} />
        <select value={f.category} onChange={(e)=>setF({...f, category: e.target.value})}>
          {categories.length > 0 ? (
            categories.map(c=><option key={c.id} value={c.name}>{c.name}</option>)
          ) : (
            ["environmental","social","governance"].map(c=><option key={c} value={c}>{c}</option>)
          )}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input type="number" placeholder="XP Reward" value={f.xp_reward} onChange={(e)=>setF({...f, xp_reward: parseInt(e.target.value)})} />
          <input type="number" placeholder="Coins Reward" value={f.eco_coin_reward} onChange={(e)=>setF({...f, eco_coin_reward: parseInt(e.target.value)})} />
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
          <button type="submit" className="btn-primary" data-testid="save-challenge-btn">Create Draft</button>
        </div>
      </form>
    </div>
  );
}
