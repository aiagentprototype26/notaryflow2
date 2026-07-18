import { useEffect, useState } from "react";
import { Loader2, Truck, Stamp, Link as LinkIcon, Copy, Check, LogOut, AlertCircle } from "lucide-react";
import DispatchBoard from "../components/DispatchBoard";
import ApostilleTracker from "../components/ApostilleTracker";
import { subscribeNotaryJobs, subscribeNotaries, subscribeApostilleRequests, onAuthChange, loginUser, logoutUser } from "../lib/db";

const inputClass = "w-full bg-white border border-black/10 text-ink placeholder-charcoal/40 text-sm rounded-sm px-3 py-2.5 focus:outline-none focus:border-gold transition-colors";
const label = "text-xs text-charcoal/70 font-medium mb-1.5 block";

function SealBadge() {
  return (
    <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
      <circle cx="20" cy="20" r="18" fill="#1C2541"/>
      <circle cx="20" cy="20" r="18" stroke="#B8912F" strokeWidth="1.5"/>
      <circle cx="20" cy="20" r="13" stroke="#B8912F" strokeWidth="1"/>
      <text x="20" y="24" textAnchor="middle" fontFamily="Spectral, serif" fontSize="14" fill="#EFE7D3">N</text>
    </svg>
  );
}

/* ─── Admin login gate ───────────────────────────────────────────────
   Single shared admin login. Create the account once in Firebase
   Console → Authentication → Add user — there's no self-serve signup
   here on purpose, unlike the notary portal. */
function AdminAuthScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError(""); setBusy(true);
    try {
      await loginUser(email.trim(), password);
    } catch (e) {
      setError("Couldn't sign in — check your email and password.");
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4" style={{ fontFamily: "'Work Sans', sans-serif" }}>
      <div className="w-[380px] max-w-full">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <SealBadge />
          <span className="text-ink font-semibold text-base tracking-tight" style={{ fontFamily: "'Spectral', serif" }}>NotaryFlow — Admin</span>
        </div>
        <div className="bg-white border border-black/10 rounded p-6">
          {error && <div className="bg-seal/10 border border-seal/30 text-seal text-xs rounded-sm px-3 py-2.5 flex items-center gap-2 mb-4"><AlertCircle size={13} /> {error}</div>}
          <div className="mb-3">
            <label className={label}>Email</label>
            <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
          </div>
          <div className="mb-5">
            <label className={label}>Password</label>
            <input className={inputClass} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
          </div>
          <button onClick={handleLogin} disabled={busy} className="w-full flex items-center justify-center gap-2 bg-ink hover:bg-ink2 text-white text-sm font-semibold px-4 py-2.5 rounded disabled:opacity-60">
            {busy && <Loader2 size={14} className="animate-spin" />}
            Log in
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authUser, setAuthUser] = useState(null);
  const [tab, setTab] = useState("dispatch");
  const [jobs, setJobs] = useState([]);
  const [notaries, setNotaries] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loaded, setLoaded] = useState({ jobs: false, notaries: false, requests: false });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const unsub = onAuthChange((user) => { setAuthUser(user); setCheckingAuth(false); });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authUser) return;
    const u1 = subscribeNotaryJobs((data) => { setJobs(data); setLoaded((l) => ({ ...l, jobs: true })); });
    const u2 = subscribeNotaries((data) => { setNotaries(data); setLoaded((l) => ({ ...l, notaries: true })); });
    const u3 = subscribeApostilleRequests((data) => { setRequests(data); setLoaded((l) => ({ ...l, requests: true })); });
    return () => { u1(); u2(); u3(); };
  }, [authUser]);

  const allLoaded = loaded.jobs && loaded.notaries && loaded.requests;
  const intakeUrl = typeof window !== "undefined" ? `${window.location.origin}/intake` : "/intake";

  const copyLink = () => {
    navigator.clipboard.writeText(intakeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="flex items-center gap-3 text-charcoal/70">
          <Loader2 size={20} className="animate-spin" /><span className="text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  if (!authUser) return <AdminAuthScreen />;

  if (!allLoaded) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="flex items-center gap-3 text-charcoal/70">
          <Loader2 size={20} className="animate-spin" /><span className="text-sm">Loading NotaryFlow…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream" style={{ fontFamily: "'Work Sans', sans-serif" }}>
      <header className="h-16 bg-ink border-b border-gold/30 flex items-center justify-between px-6 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <SealBadge />
          <span className="text-cream font-semibold text-base tracking-tight" style={{ fontFamily: "'Spectral', serif" }}>NotaryFlow</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={copyLink} className="flex items-center gap-2 bg-cream2 hover:bg-[#ddd0ab] text-charcoal text-xs font-semibold px-3 py-2 rounded-sm border border-black/10">
            {copied ? <Check size={13} className="text-emerald-700" /> : <LinkIcon size={13} />}
            {copied ? "Copied" : "Copy client intake link"}
          </button>
          <button onClick={logoutUser} className="flex items-center gap-2 bg-cream2 hover:bg-[#ddd0ab] text-charcoal text-xs font-semibold px-3 py-2 rounded-sm border border-black/10">
            <LogOut size={13} /> Log out
          </button>
        </div>
      </header>

      <div className="border-b border-gold/30 bg-cream px-6">
        <div className="max-w-[1400px] mx-auto flex gap-1">
          <button onClick={() => setTab("dispatch")} className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${tab === "dispatch" ? "border-ink text-ink" : "border-transparent text-charcoal/60 hover:text-charcoal"}`}>
            <Truck size={15} /> Mobile Notary Dispatch
          </button>
          <button onClick={() => setTab("apostille")} className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${tab === "apostille" ? "border-ink text-ink" : "border-transparent text-charcoal/60 hover:text-charcoal"}`}>
            <Stamp size={15} /> Apostille Tracker
          </button>
        </div>
      </div>

      <main className="p-6 xl:p-8 max-w-[1400px] mx-auto">
        {tab === "dispatch" ? <DispatchBoard jobs={jobs} notaries={notaries} /> : <ApostilleTracker requests={requests} />}
      </main>
    </div>
  );
}
