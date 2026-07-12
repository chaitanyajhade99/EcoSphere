import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, LineChart, Line, ReferenceLine,
} from "recharts";
import {
  TreePine, Leaf, Users, ShieldAlert, Trophy, TrendingDown, TrendingUp,
  ArrowUp, ArrowDown, Minus, Car, Plane, Home, Smartphone, Beef,
  Sliders, Sparkles, Award, Shield, Flame, Coins,
} from "lucide-react";

const EQ_ICONS = { "tree-pine": TreePine, car: Car, plane: Plane, home: Home, smartphone: Smartphone, beef: Beef };
const NUDGE_ICONS = { award: Award, shield: Shield, trophy: Trophy, flame: Flame, coins: Coins };
const fmt = (n) => new Intl.NumberFormat("en-IN").format(n);

function KPI({ label, value, unit, icon: Icon, color, trend }) {
  return (
    <div className="card p-5" data-testid={`kpi-${label.toLowerCase().replace(/ /g, "-")}`}>
      <div className="flex items-start justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</div>
        <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon size={16} color={color} />
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <div className="text-3xl font-heading font-semibold text-slate-900 tracking-tight">{value}</div>
        {unit && <div className="text-sm text-slate-500">{unit}</div>}
      </div>
      {trend && (
        <div className="mt-1 text-xs text-slate-500 flex items-center gap-1">
          {trend.dir === "up" ? <TrendingUp size={12} className="text-emerald-600" /> : <TrendingDown size={12} className="text-emerald-600" />}
          <span>{trend.label}</span>
        </div>
      )}
    </div>
  );
}

function GaugeChart({ score }) {
  const clamped = Math.max(0, Math.min(100, score || 0));
  const data = [{ value: clamped }, { value: 100 - clamped }];
  const color = clamped >= 75 ? "#059669" : clamped >= 50 ? "#F59E0B" : "#EF4444";
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} cx="50%" cy="100%" innerRadius={80} outerRadius={110}
               startAngle={180} endAngle={0} paddingAngle={0} dataKey="value" stroke="none">
            <Cell fill={color} />
            <Cell fill="#F1F5F9" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-x-0 bottom-8 text-center">
        <div className="font-heading font-semibold text-5xl tracking-tight" data-testid="esg-gauge-value">{clamped}</div>
        <div className="text-xs uppercase tracking-widest text-slate-500 mt-1">ESG Score</div>
      </div>
    </div>
  );
}

function RankDelta({ delta }) {
  if (delta > 0) return <span className="flex items-center text-emerald-600 text-xs font-semibold"><ArrowUp size={12} />{delta}</span>;
  if (delta < 0) return <span className="flex items-center text-red-600 text-xs font-semibold"><ArrowDown size={12} />{Math.abs(delta)}</span>;
  return <span className="flex items-center text-slate-400 text-xs"><Minus size={12} /></span>;
}

export default function Dashboard() {
  const { refreshUser } = useAuth();
  const [overview, setOverview] = useState(null);
  const [depts, setDepts] = useState([]);
  const [activities, setActivities] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [trend, setTrend] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [nudges, setNudges] = useState([]);
  const [equiv, setEquiv] = useState(null);

  // Simulator sliders
  const [wE, setWE] = useState(40);
  const [wS, setWS] = useState(30);
  const [wG, setWG] = useState(30);
  const [sim, setSim] = useState(null);

  useEffect(() => {
    refreshUser();
    Promise.all([
      api.get("/dashboard/overview").then((r) => setOverview(r.data)),
      api.get("/dashboard/departments").then((r) => setDepts(r.data)),
      api.get("/dashboard/activities").then((r) => setActivities(r.data)),
      api.get("/dashboard/notifications").then((r) => setNotifs(r.data)),
      api.get("/dashboard/carbon-trend").then((r) => setTrend(r.data)),
      api.get("/dashboard/predictions").then((r) => setPredictions(r.data)),
      api.get("/dashboard/smart-nudges").then((r) => setNudges(r.data)),
      api.get("/dashboard/equivalences").then((r) => setEquiv(r.data)),
    ]);
  }, []);

  // Live recompute of what-if simulator
  useEffect(() => {
    const timer = setTimeout(() => {
      api.post("/dashboard/simulate-score", { weight_e: wE, weight_s: wS, weight_g: wG })
        .then((r) => setSim(r.data));
    }, 200);
    return () => clearTimeout(timer);
  }, [wE, wS, wG]);

  if (!overview) return <div className="text-slate-500">Loading dashboard...</div>;

  return (
    <div className="space-y-6 fade-in" data-testid="dashboard-page">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time overview of your organisation&apos;s ESG performance.</p>
        </div>
        <div className="text-xs text-slate-500 font-mono">Updated · {new Date().toLocaleString()}</div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="Total CO₂e" value={fmt(overview.total_co2e_kg)} unit="kg" icon={Leaf} color="#166534" trend={{ dir: "down", label: "vs last quarter" }} />
        <KPI label="Trees Equivalent" value={fmt(overview.trees_equivalent)} unit="trees/yr" icon={TreePine} color="#10B981" />
        <KPI label="CSR Hours" value={fmt(overview.csr_hours)} unit="hrs" icon={Users} color="#3B82F6" />
        <KPI label="Open Issues" value={overview.open_compliance_issues} icon={ShieldAlert} color="#EF4444" />
      </div>

      {/* Smart Nudges */}
      {nudges.length > 0 && (
        <div className="card p-6" style={{ background: "linear-gradient(135deg, #fefce8 0%, #ffffff 60%)" }} data-testid="smart-nudges">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={16} className="text-amber-600" />
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Smart Nudges · Just for you</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {nudges.map((n, i) => {
              const Icon = NUDGE_ICONS[n.icon] || Sparkles;
              const priorityColor = n.priority === "high" ? "#EF4444" : n.priority === "medium" ? "#F59E0B" : "#3B82F6";
              return (
                <div key={i} className="border border-slate-200 rounded-lg p-3 bg-white hover:shadow-md transition-shadow" data-testid={`nudge-${n.type}`}>
                  <div className="flex items-start gap-2">
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${priorityColor}15` }}>
                      <Icon size={14} color={priorityColor} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900">{n.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{n.message}</div>
                      <div className="text-xs font-semibold mt-1" style={{ color: priorityColor }}>→ {n.action}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main grid: ESG gauge + Carbon trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Overall ESG</div>
              <div className="text-sm text-slate-800 font-medium mt-1">Weighted average across pillars</div>
            </div>
            <span className="pill" style={{ background: "#DCFCE7", color: "#166534" }}>GRI · SASB</span>
          </div>
          <GaugeChart score={overview.esg_score} />
          <div className="grid grid-cols-3 gap-2 mt-2 text-center">
            <div><div className="text-[10px] uppercase tracking-widest text-slate-500">Env</div><div className="font-heading font-semibold text-lg">{overview.e_score}</div></div>
            <div><div className="text-[10px] uppercase tracking-widest text-slate-500">Social</div><div className="font-heading font-semibold text-lg">{overview.s_score}</div></div>
            <div><div className="text-[10px] uppercase tracking-widest text-slate-500">Gov</div><div className="font-heading font-semibold text-lg">{overview.g_score}</div></div>
          </div>
        </div>

        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Carbon Footprint Trend</div>
              <div className="text-sm text-slate-800 font-medium mt-1">Monthly Scope 1+2+3 emissions (kg CO₂e)</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
              <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="co2e_kg" stroke="#166534" strokeWidth={2.5} dot={{ r: 4, fill: "#166534" }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Predictive Trendlines */}
      <div className="card p-6" data-testid="predictions-card">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} className="text-emerald-700" />
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Predictive ESG Trendline · Next 3 months</div>
          <span className="pill" style={{ background: "#F1F5F9", color: "#475569" }}>Linear regression · 6 mo history</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {predictions.map((p) => {
            const bg = p.status === "at_risk" ? "#FEE2E2" : p.status === "flat" ? "#FEF3C7" : p.status === "slow" ? "#FEF9C3" : "#DCFCE7";
            const txt = p.status === "at_risk" ? "#B91C1C" : p.status === "flat" ? "#B45309" : p.status === "slow" ? "#854D0E" : "#166534";
            const chartData = [
              { m: "-2mo", v: p.current - p.slope * 2 },
              { m: "-1mo", v: p.current - p.slope },
              { m: "now", v: p.current },
              { m: "+1mo", v: p.projected_3m[0] },
              { m: "+2mo", v: p.projected_3m[1] },
              { m: "+3mo", v: p.projected_3m[2] },
            ];
            return (
              <div key={p.department} className="border border-slate-200 rounded-xl p-4" data-testid={`prediction-${p.department}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="font-heading font-semibold text-sm">{p.department}</div>
                  <span className="pill" style={{ background: bg, color: txt }}>{p.status.replace("_", " ")}</span>
                </div>
                <div className="text-xs text-slate-600 mb-2 leading-relaxed h-8">{p.narrative}</div>
                <ResponsiveContainer width="100%" height={70}>
                  <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                    <ReferenceLine y={80} stroke="#94A3B8" strokeDasharray="2 2" />
                    <Line type="monotone" dataKey="v" stroke={p.color} strokeWidth={2} dot={{ r: 2 }} />
                    <XAxis dataKey="m" hide />
                    <YAxis hide domain={[Math.min(...chartData.map(x=>x.v))-3, Math.max(...chartData.map(x=>x.v))+3]} />
                  </LineChart>
                </ResponsiveContainer>
                <div className="flex justify-between text-[11px] text-slate-500 mt-1 font-mono">
                  <span>Now: <b className="text-slate-800">{p.current}</b></span>
                  <span>In 3mo: <b style={{ color: txt }}>{p.projected_3m[2]}</b></span>
                  <span>Δ/mo: <b className="text-slate-800">{p.slope > 0 ? "+" : ""}{p.slope}</b></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Enhanced Leaderboard with Rank Deltas + What-if Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6" data-testid="dept-leaderboard">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Department Leaderboard · Rank Changes</div>
            <span className="text-xs text-slate-400">vs last period</span>
          </div>
          <div className="space-y-2">
            {depts.map((d, i) => (
              <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100"
                   style={{ animation: `fadeIn 500ms ease-out ${i * 60}ms both` }}>
                <div className="h-9 w-9 rounded-lg flex items-center justify-center text-sm font-heading font-semibold font-mono"
                     style={{ background: `${d.color}20`, color: d.color }}>
                  #{d.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium">{d.name}</div>
                    <RankDelta delta={d.rank_delta} />
                  </div>
                  <div className="text-xs text-slate-500">{d.head} · {d.employee_count} employees</div>
                </div>
                <div className="text-right">
                  <div className="font-heading text-xl font-semibold" style={{ color: d.color }}>{d.esg_score}</div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-400">ESG</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* What-if simulator */}
        <div className="card p-6" data-testid="what-if-simulator">
          <div className="flex items-center gap-2 mb-4">
            <Sliders size={16} className="text-emerald-700" />
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">What-if Weight Simulator</div>
            <span className="pill" style={{ background: "#F1F5F9", color: "#475569" }}>Admin</span>
          </div>
          <p className="text-xs text-slate-500 mb-4">Drag sliders to see how re-weighting E/S/G affects the overall score in real time. Default 40/30/30.</p>

          <div className="space-y-3 mb-4">
            {[["Environmental", wE, setWE, "#166534", "E"], ["Social", wS, setWS, "#3B82F6", "S"], ["Governance", wG, setWG, "#8B5CF6", "G"]].map(([label, val, setter, color, key]) => (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium">{label}</span>
                  <span className="font-mono font-semibold" style={{ color }}>{val}%</span>
                </div>
                <input type="range" min="0" max="100" value={val}
                       onChange={(e) => setter(parseInt(e.target.value))}
                       data-testid={`slider-${key}`}
                       style={{ accentColor: color }} className="w-full" />
              </div>
            ))}
          </div>

          {sim && (
            <div className="border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-xs uppercase tracking-widest text-slate-500">New Overall Score</div>
                  <div className="font-heading text-4xl font-semibold" data-testid="simulated-score" style={{ color: sim.overall_esg_score >= 75 ? "#059669" : sim.overall_esg_score >= 50 ? "#F59E0B" : "#EF4444" }}>
                    {sim.overall_esg_score}
                  </div>
                </div>
                <div className="text-xs text-slate-500 text-right">
                  Normalised weights<br />
                  <span className="font-mono">E {sim.weights_applied.E}% · S {sim.weights_applied.S}% · G {sim.weights_applied.G}%</span>
                </div>
              </div>
              <div className="space-y-1.5">
                {sim.departments.map((d) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <div className="w-24 truncate text-slate-600">{d.name}</div>
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div style={{ width: `${d.score}%`, background: d.color, transition: "width 400ms" }} className="h-full" />
                    </div>
                    <div className="w-10 text-right font-mono text-slate-700">{d.score}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Carbon equivalences */}
      {equiv && (
        <div className="card p-6" data-testid="equivalences-card">
          <div className="flex items-center gap-2 mb-4">
            <TreePine size={16} className="text-emerald-700" />
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Your Carbon in Real-World Terms</div>
            <span className="text-xs text-slate-400 ml-1">{fmt(equiv.total_co2e_kg)} kg CO₂e =</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {equiv.equivalents.map((e, i) => {
              const Icon = EQ_ICONS[e.icon] || Leaf;
              return (
                <div key={i} className="border border-slate-200 rounded-xl p-4 text-center bg-emerald-50/30" data-testid={`equiv-${e.icon}`}>
                  <div className="mx-auto h-10 w-10 rounded-full bg-white flex items-center justify-center border border-emerald-100 mb-2">
                    <Icon size={18} color="#166534" />
                  </div>
                  <div className="font-heading font-semibold text-lg leading-none">{fmt(e.value)}</div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 mt-1">{e.unit}</div>
                  <div className="text-[11px] text-slate-600 mt-1 leading-tight">{e.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Activities & Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-6 lg:col-span-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">Recent Activity</div>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {activities.slice(0, 8).map((a) => (
              <div key={a.id} className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                  <Trophy size={13} color="#166534" />
                </div>
                <div className="text-sm">
                  <div className="text-slate-800"><b>{a.user_name}</b> {a.action}</div>
                  <div className="text-xs text-slate-400 mt-0.5 capitalize">{a.module}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">Notifications</div>
          <div className="space-y-3">
            {notifs.slice(0, 4).map((n) => {
              const colorMap = { info: "#3B82F6", success: "#22C55E", warning: "#F59E0B", error: "#EF4444" };
              const c = colorMap[n.type] || "#3B82F6";
              return (
                <div key={n.id} className="border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="h-2 w-2 rounded-full pulse-ring" style={{ background: c }} />
                    <div className="text-sm font-medium text-slate-900 truncate">{n.title}</div>
                  </div>
                  <div className="text-xs text-slate-500 line-clamp-2">{n.message}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
