import { NavLink, useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard, Leaf, Users, ShieldCheck, Trophy, FileText,
  Bot, Search, Bell, LogOut, Coins, Flame, Sliders, Menu, X,
} from "lucide-react";
import { useState, useEffect } from "react";
import api from "@/lib/api";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/environmental", label: "Environmental", icon: Leaf },
  { to: "/social", label: "Social", icon: Users },
  { to: "/governance", label: "Governance", icon: ShieldCheck },
  { to: "/gamification", label: "Gamification", icon: Trophy },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/ai-advisor", label: "AI Advisor", icon: Bot },
  { to: "/settings", label: "Settings", icon: Sliders },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const fetchNotifications = () => {
    api.get("/dashboard/notifications")
      .then(r => setNotifications(r.data))
      .catch(() => {});
  };

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    const t = setInterval(fetchNotifications, 10000);
    return () => clearInterval(t);
  }, [user]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setMobileMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const markRead = async (id) => {
    try {
      await api.post(`/dashboard/notifications/${id}/read`);
      fetchNotifications();
    } catch {}
  };

  const markAllRead = async () => {
    try {
      const unreads = notifications.filter(n => !n.read);
      await Promise.all(unreads.map(n => api.post(`/dashboard/notifications/${n.id}/read`)));
      fetchNotifications();
    } catch {}
  };

  const doSearch = async (v) => {
    setQ(v);
    if (v.length < 2) { setResults([]); return; }
    const { data } = await api.get(`/search?q=${encodeURIComponent(v)}`);
    setResults(data);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex bg-[#FAFAFA]">
      {mobileMenuOpen && (
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
          aria-label="Close navigation"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[260px] shrink-0 bg-white border-r border-slate-200 flex flex-col h-screen transition-transform duration-200 lg:static lg:translate-x-0 ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
        data-testid="sidebar"
      >
        <div className="h-16 px-5 flex items-center gap-2 border-b border-slate-200">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: "#166534" }}>
            <Leaf color="white" size={18} />
          </div>
          <div>
            <div className="font-heading font-semibold text-[15px] leading-tight">EcoSphere</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-400 leading-tight">ESG Platform</div>
          </div>
        </div>

        <nav className="p-3 flex-1 space-y-1">
          <div className="text-[10px] uppercase tracking-widest text-slate-400 px-3 pt-2 pb-1">Main</div>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}
                     data-testid={`nav-${n.label.toLowerCase().replace(/ /g, "-")}`}
                     className={({ isActive }) => `sidebar-item ${isActive ? "active" : ""}`}>
              <n.icon size={17} />
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-200">
          <div className="flex items-center gap-3 px-2 py-2">
            <img src={user.avatar || "https://images.pexels.com/photos/30692588/pexels-photo-30692588.jpeg"}
                 alt="avatar" className="h-9 w-9 rounded-full object-cover" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user.name}</div>
              <div className="text-[11px] text-slate-500 capitalize">{user.role} · {user.department}</div>
            </div>
            <button onClick={async () => { await logout(); nav("/login"); }}
                    data-testid="logout-btn"
                    className="btn-ghost !p-2" title="Log out">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 sticky top-0 z-30 bg-white/85 backdrop-blur-xl border-b border-slate-200 px-4 sm:px-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="lg:hidden btn-ghost !p-2"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          <div className="relative flex-1 max-w-xl">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input placeholder="Search policies, challenges, activities..."
                   value={q} onChange={(e) => doSearch(e.target.value)}
                   data-testid="global-search"
                   className="!pl-9 !py-2 !text-sm bg-slate-50 border-slate-200" />
            {results.length > 0 && (
              <div className="absolute top-full mt-1 left-0 right-0 card p-2 max-h-72 overflow-y-auto shadow-lg z-40">
                {results.map((r) => (
                  <div key={r.id} className="px-3 py-2 hover:bg-slate-50 rounded-md text-sm flex justify-between">
                    <span>{r.title}</span>
                    <span className="pill" style={{ background: "#F1F5F9", color: "#475569" }}>{r.type}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 pr-2 relative">
            <div className="hidden sm:flex items-center gap-1.5 pill" style={{ background: "#FEF3C7", color: "#B45309" }}>
              <Coins size={12} /> {user.eco_coins}
            </div>
            <div className="hidden sm:flex items-center gap-1.5 pill" style={{ background: "#EDE9FE", color: "#6D28D9" }}>
              <Trophy size={12} /> {user.xp} XP
            </div>
            <div className="hidden sm:flex items-center gap-1.5 pill" style={{ background: "#FEE2E2", color: "#B91C1C" }}>
              <Flame size={12} /> {user.streak}d
            </div>
            
            <div className="relative">
              <button onClick={() => setShowNotifs(!showNotifs)} className="btn-ghost !p-2 relative" data-testid="notifications-btn" title="Notifications">
                <Bell size={17} />
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                )}
              </button>

              {showNotifs && (
                <div className="absolute right-0 mt-2 w-80 card p-3 shadow-xl z-50 bg-white border border-slate-200 max-h-96 overflow-y-auto" data-testid="notifications-dropdown">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                    <span className="font-heading font-semibold text-xs text-slate-700">Notifications</span>
                    <button onClick={markAllRead} className="text-[10px] text-[#166534] hover:underline font-semibold">Mark all read</button>
                  </div>
                  <div className="space-y-2">
                    {notifications.length === 0 ? (
                      <div className="text-center py-6 text-xs text-slate-400">No notifications</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} onClick={() => markRead(n.id)} className={`p-2.5 rounded-lg text-xs cursor-pointer transition-all border ${n.read ? "bg-white border-transparent hover:bg-slate-50/50" : "bg-emerald-50/30 border-emerald-100 hover:bg-emerald-50/50"}`} data-testid={`notif-${n.id}`}>
                          <div className="flex items-center justify-between font-semibold text-slate-800">
                            <span>{n.title}</span>
                            {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />}
                          </div>
                          <div className="text-slate-500 mt-0.5 leading-normal">{n.message}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
