import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Leaf, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@ecosphere.com");
  const [password, setPassword] = useState("Admin@123");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    const res = await login(email, password);
    setBusy(false);
    if (res.ok) {
      toast.success("Welcome back to EcoSphere");
      navigate("/");
    } else {
      setErr(res.error);
    }
  };

  const quickLogin = (em, pw) => { setEmail(em); setPassword(pw); };

  return (
    <div className="min-h-screen grid md:grid-cols-2" data-testid="login-page">
      {/* Left brand panel */}
      <div className="hidden md:flex flex-col justify-between p-12 relative overflow-hidden"
           style={{ background: "linear-gradient(135deg, #052e16 0%, #14532d 50%, #166534 100%)" }}>
        <div>
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center">
              <Leaf className="text-white" size={22} />
            </div>
            <div>
              <div className="text-white font-heading font-semibold text-xl">EcoSphere</div>
              <div className="text-emerald-100/70 text-xs uppercase tracking-widest">ESG Management</div>
            </div>
          </div>
        </div>

        <div className="text-white z-10 relative">
          <h1 className="font-heading text-4xl leading-tight font-semibold mb-4">
            Turn sustainability into your <span className="text-emerald-300">competitive edge</span>.
          </h1>
          <p className="text-emerald-100/80 text-sm max-w-md">
            Track emissions, engage employees with gamified CSR, run audits and generate investor-ready ESG reports
            — all in one enterprise platform inspired by GHG Protocol, GRI and ISO standards.
          </p>
          <div className="mt-8 flex gap-6 text-emerald-100/80 text-xs">
            <div className="flex items-center gap-2"><ShieldCheck size={16} /> GHG Protocol · ISO 14064</div>
            <div className="flex items-center gap-2"><Sparkles size={16} /> AI-Powered</div>
          </div>
        </div>

        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-emerald-300/10 blur-3xl" />
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="md:hidden mb-8 flex items-center gap-2">
            <Leaf color="#166534" />
            <div className="font-heading font-semibold text-lg">EcoSphere</div>
          </div>
          <h2 className="font-heading text-3xl font-semibold text-slate-900">Sign in</h2>
          <p className="text-slate-500 text-sm mt-2">Use one of the demo accounts to explore the platform.</p>

          <form onSubmit={submit} className="mt-8 space-y-4" data-testid="login-form">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">Email</label>
              <input data-testid="login-email" type="email" value={email}
                     onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">Password</label>
              <input data-testid="login-password" type="password" value={password}
                     onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {err && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2" data-testid="login-error">{err}</div>}
            <button data-testid="login-submit" type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? "Signing in..." : "Sign in to EcoSphere"}
            </button>
          </form>

          <div className="mt-8 border-t border-slate-200 pt-6">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Quick demo accounts</div>
            <div className="grid grid-cols-1 gap-2">
              {[
                { label: "Admin — Aarav Sharma", email: "admin@ecosphere.com", pw: "Admin@123", role: "admin" },
                { label: "Manager — Priya Patel", email: "manager@ecosphere.com", pw: "Manager@123", role: "manager" },
                { label: "Employee — Rohan Verma", email: "employee@ecosphere.com", pw: "Employee@123", role: "employee" },
              ].map((a) => (
                <button key={a.email} type="button"
                        data-testid={`quick-login-${a.role}`}
                        onClick={() => quickLogin(a.email, a.pw)}
                        className="btn-outline flex items-center justify-between text-left">
                  <span>{a.label}</span>
                  <span className="text-xs text-slate-400 font-mono">{a.email}</span>
                </button>
              ))}
            </div>
            <div className="mt-4 text-xs text-slate-500">
              Don't have an account? <Link to="/register" className="text-emerald-700 font-medium hover:underline" data-testid="register-link">Register</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
