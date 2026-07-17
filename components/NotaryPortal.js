import { useEffect, useState } from "react";
import {
  Lock, Loader2, LogOut, MapPin, CalendarClock, Phone, ChevronRight,
  CheckCircle, Navigation, Clock, AlertCircle, ArrowRightCircle,
} from "lucide-react";
import {
  onAuthChange, loginUser, logoutUser, signUpNotary,
  getNotaryByAuthUid, subscribeNotaryJobsByUser, updateJobStatus,
  createNotification, daysSince,
} from "../lib/db";

const JOB_STAGES = [
  { key: "requested", label: "Requested", color: "slate" },
  { key: "assigned", label: "Notary Assigned", color: "amber" },
  { key: "en_route", label: "En Route", color: "blue" },
  { key: "completed", label: "Completed", color: "emerald" },
];

const inputClass = "w-full bg-slate-800/60 border border-slate-700/60 text-slate-200 placeholder-slate-600 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500/60 transition-colors";
const label = "text-xs text-slate-400 font-medium mb-1.5 block";

/* ─── Auth screen ─────────────────────────────────────────────────────
   Sign up links a new login to an existing roster entry by phone
   number — nothing in the admin roster UI needs to change for this. */
function AuthScreen() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
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

  const handleSignup = async () => {
    setError("");
    if (!phone.trim() || !email.trim() || !password) {
      setError("Fill in your phone, email, and a password."); return;
    }
    setBusy(true);
    try {
      await signUpNotary(phone.trim(), email.trim(), password);
    } catch (e) {
      setError(e.message || "Couldn't create your login. Check your phone number matches what dispatch has on file.");
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-[#0b1120] flex items-center justify-center p-4" style={{ fontFamily: "'DM Sans','Outfit',system-ui,sans-serif" }}>
      <div className="w-[380px] max-w-full">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center shrink-0"><Lock size={15} className="text-white" /></div>
          <span className="text-slate-100 font-bold text-base tracking-tight">NotaryFlow — Notary Portal</span>
        </div>

        <div className="bg-[#111827] border border-slate-700/50 rounded-2xl p-6">
          <div className="flex gap-1 mb-5 bg-slate-800/50 rounded-lg p-1">
            <button onClick={() => { setMode("login"); setError(""); }} className={`flex-1 text-xs font-semibold py-2 rounded-md transition-all ${mode === "login" ? "bg-blue-600 text-white" : "text-slate-400"}`}>Log in</button>
            <button onClick={() => { setMode("signup"); setError(""); }} className={`flex-1 text-xs font-semibold py-2 rounded-md transition-all ${mode === "signup" ? "bg-blue-600 text-white" : "text-slate-400"}`}>First time setup</button>
          </div>

          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg px-3 py-2.5 flex items-center gap-2 mb-4"><AlertCircle size={13} /> {error}</div>}

          {mode === "signup" && (
            <div className="mb-3">
              <label className={label}>Phone number on file with dispatch</label>
              <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="212-555-0100" />
            </div>
          )}
          <div className="mb-3">
            <label className={label}>Email</label>
            <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="mb-5">
            <label className={label}>Password</label>
            <input className={inputClass} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>

          <button
            onClick={mode === "login" ? handleLogin : handleSignup}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl disabled:opacity-60"
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            {mode === "login" ? "Log in" : "Create login"}
          </button>

          {mode === "signup" && (
            <p className="text-slate-500 text-[11px] mt-3 leading-relaxed">
              Use the same phone number dispatch has for you on the roster. This links your new login to your existing profile.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Job card (notary view) ─────────────────────────────────────────── */
function PortalJobCard({ job, notaryName }) {
  const [busy, setBusy] = useState(false);
  const idx = JOB_STAGES.findIndex((s) => s.key === job.status);
  const next = JOB_STAGES[idx + 1];
  const isStuck = job.status !== "completed" && daysSince(job.createdAt) >= 2;

  const advance = async () => {
    if (!next) return;
    setBusy(true);
    await updateJobStatus(job.id, next.key);
    if (next.key === "completed") {
      await createNotification({
        userId: "admin",
        message: `${notaryName || "A notary"} marked the job for ${job.client} as completed.`,
      });
    }
    setBusy(false);
  };

  return (
    <div className={`bg-[#111827] border rounded-xl p-4 ${isStuck ? "border-red-500/30" : "border-slate-700/50"}`}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-mono text-slate-500">{job.id.slice(0, 6).toUpperCase()}</span>
        <div className="flex items-center gap-1.5">
          {isStuck && <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-md"><AlertCircle size={10} /> STALLED</span>}
          {job.convertedApostilleId && <span className="flex items-center gap-1 text-[10px] font-bold text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded-md"><ArrowRightCircle size={10} /> Converted</span>}
        </div>
      </div>
      <div className="text-slate-200 text-sm font-semibold mb-1">{job.client}</div>
      <div className="text-slate-500 text-xs mb-2">{job.docType}</div>
      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1.5">
        <MapPin size={11} className="text-slate-500 shrink-0" /> <span>{job.address || "No address on file"}</span>
      </div>
      {job.appointmentTime && (
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1.5">
          <CalendarClock size={11} className="text-slate-500 shrink-0" /> {job.appointmentTime}
        </div>
      )}
      {job.clientPhone && (
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1.5">
          <Phone size={11} className="text-slate-500 shrink-0" /> {job.clientPhone}
        </div>
      )}
      {job.notes && <div className="text-xs text-slate-500 italic mt-2 pt-2 border-t border-slate-700/40">{job.notes}</div>}

      <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-700/40">
        <span className={`text-[11px] font-bold px-2 py-1 rounded-md ${
          job.status === "completed" ? "text-emerald-400 bg-emerald-500/10"
          : job.status === "en_route" ? "text-blue-400 bg-blue-500/10"
          : "text-amber-400 bg-amber-500/10"
        }`}>
          {JOB_STAGES.find((s) => s.key === job.status)?.label || job.status}
        </span>
        {next && (
          <button onClick={advance} disabled={busy} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-2 rounded-lg disabled:opacity-60">
            {busy ? <Loader2 size={12} className="animate-spin" /> : next.key === "en_route" ? <Navigation size={12} /> : <CheckCircle size={12} />}
            Mark {next.label} <ChevronRight size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Main Portal ─────────────────────────────────────────────────────── */
export default function NotaryPortal() {
  const [checking, setChecking] = useState(true);
  const [authUser, setAuthUser] = useState(null);
  const [notary, setNotary] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [jobsLoaded, setJobsLoaded] = useState(false);

  useEffect(() => {
    const unsub = onAuthChange(async (user) => {
      setAuthUser(user);
      if (user) {
        const profile = await getNotaryByAuthUid(user.uid);
        setNotary(profile);
      } else {
        setNotary(null);
      }
      setChecking(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!notary?.id) { setJobs([]); setJobsLoaded(false); return; }
    setJobsLoaded(false);
    const unsub = subscribeNotaryJobsByUser(notary.id, (data) => {
      setJobs(data); setJobsLoaded(true);
    });
    return () => unsub();
  }, [notary?.id]);

  if (checking) {
    return (
      <div className="min-h-screen bg-[#0b1120] flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400"><Loader2 size={20} className="animate-spin" /><span className="text-sm">Loading…</span></div>
      </div>
    );
  }

  if (!authUser) return <AuthScreen />;

  if (!notary) {
    return (
      <div className="min-h-screen bg-[#0b1120] flex items-center justify-center p-4" style={{ fontFamily: "'DM Sans','Outfit',system-ui,sans-serif" }}>
        <div className="w-[420px] max-w-full bg-[#111827] border border-slate-700/50 rounded-2xl p-6 text-center">
          <AlertCircle size={22} className="text-amber-400 mx-auto mb-3" />
          <h3 className="text-slate-100 font-bold text-base mb-2">Login not linked yet</h3>
          <p className="text-slate-400 text-sm mb-4">We couldn't find a notary profile linked to this login. Contact dispatch to confirm your roster entry.</p>
          <button onClick={logoutUser} className="text-slate-400 hover:text-slate-200 text-sm font-medium px-4 py-2 rounded-lg border border-slate-700/60">Log out</button>
        </div>
      </div>
    );
  }

  const active = jobs.filter((j) => j.status !== "completed");
  const completed = jobs.filter((j) => j.status === "completed");

  return (
    <div className="min-h-screen bg-[#0b1120]" style={{ fontFamily: "'DM Sans','Outfit',system-ui,sans-serif" }}>
      <header className="h-16 bg-[#080e1d] border-b border-slate-800/60 flex items-center justify-between px-6 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center shrink-0"><Lock size={15} className="text-white" /></div>
          <div>
            <span className="text-slate-100 font-bold text-base tracking-tight block leading-tight">NotaryFlow</span>
            <span className="text-slate-500 text-[11px]">Notary Portal — {notary.name}</span>
          </div>
        </div>
        <button onClick={logoutUser} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-700/60">
          <LogOut size={13} /> Log out
        </button>
      </header>

      <main className="p-6 xl:p-8 max-w-3xl mx-auto space-y-6">
        {!jobsLoaded ? (
          <div className="flex items-center gap-3 text-slate-400 py-8 justify-center"><Loader2 size={18} className="animate-spin" /><span className="text-sm">Loading your jobs…</span></div>
        ) : (
          <>
            <div>
              <h2 className="text-lg font-bold text-slate-100 mb-1">Your Active Jobs</h2>
              <p className="text-slate-400 text-sm mb-4">{active.length} job{active.length === 1 ? "" : "s"} needing action</p>
              <div className="space-y-3">
                {active.map((job) => <PortalJobCard key={job.id} job={job} notaryName={notary.name} />)}
                {active.length === 0 && (
                  <div className="text-center py-10 text-slate-600 text-sm border border-dashed border-slate-700/50 rounded-xl flex flex-col items-center gap-2">
                    <Clock size={18} className="text-slate-700" /> Nothing assigned to you right now.
                  </div>
                )}
              </div>
            </div>

            {completed.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-slate-400 mb-3">Completed</h2>
                <div className="space-y-3">
                  {completed.map((job) => <PortalJobCard key={job.id} job={job} notaryName={notary.name} />)}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
