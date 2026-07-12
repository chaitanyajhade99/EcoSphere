import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Leaf } from "lucide-react";

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", department: "Engineering", role: "employee" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr("");
    const res = await register(form);
    setBusy(false);
    if (res.ok) nav("/"); else setErr(res.error);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8" data-testid="register-page">
      <div className="max-w-md w-full card p-8">
        <div className="flex items-center gap-2 mb-6">
          <Leaf color="#166534" />
          <div className="font-heading font-semibold text-lg">EcoSphere</div>
        </div>
        <h2 className="font-heading text-2xl font-semibold">Create your account</h2>
        <form onSubmit={submit} className="mt-6 space-y-4" data-testid="register-form">
          <input required placeholder="Full name" data-testid="register-name"
                 value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input required type="email" placeholder="Email" data-testid="register-email"
                 value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input required type="password" placeholder="Password" data-testid="register-password"
                 value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <input placeholder="Department" data-testid="register-department"
                 value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} data-testid="register-role">
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
          {err && <div className="text-sm text-red-600" data-testid="register-error">{err}</div>}
          <button className="btn-primary w-full" disabled={busy} data-testid="register-submit">
            {busy ? "Creating..." : "Create account"}
          </button>
        </form>
        <div className="mt-4 text-sm text-slate-500 text-center">
          Already have an account? <Link to="/login" className="text-emerald-700 font-medium">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
