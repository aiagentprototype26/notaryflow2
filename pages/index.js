import { useEffect, useState } from "react";
import { Lock, Loader2, Truck, Stamp, Link as LinkIcon, Copy, Check } from "lucide-react";
import DispatchBoard from "../components/DispatchBoard";
import ApostilleTracker from "../components/ApostilleTracker";
import { subscribeNotaryJobs, subscribeNotaries, subscribeApostilleRequests } from "../lib/db";

export default function Home() {
  const [tab, setTab] = useState("dispatch");
  const [jobs, setJobs] = useState([]);
  const [notaries, setNotaries] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loaded, setLoaded] = useState({ jobs: false, notaries: false, requests: false });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const u1 = subscribeNotaryJobs((data) => { setJobs(data); setLoaded((l) => ({ ...l, jobs: true })); });
    const u2 = subscribeNotaries((data) => { setNotaries(data); setLoaded((l) => ({ ...l, notaries: true })); });
    const u3 = subscribeApostilleRequests((data) => { setRequests(data); setLoaded((l) => ({ ...l, requests: true })); });
    return () => { u1(); u2(); u3(); };
  }, []);

  const allLoaded = loaded.jobs && loaded.notaries && loaded.requests;
  const intakeUrl = typeof window !== "undefined" ? `${window.location.origin}/intake` : "/intake";

  const copyLink = () => {
    navigator.clipboard.writeText(intakeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!allLoaded) {
    return (
      <div className="min-h-screen bg-[#0b1120] flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 size={20} className="animate-spin" /><span className="text-sm">Loading NotaryFlow…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1120]" style={{ fontFamily: "'DM Sans','Outfit',system-ui,sans-serif" }}>
      <header className="h-16 bg-[#080e1d] border-b border-slate-800/60 flex items-center justify-between px-6 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center shrink-0"><Lock size={15} className="text-white" /></div>
          <span className="text-slate-100 font-bold text-base tracking-tight">NotaryFlow</span>
        </div>
        <button onClick={copyLink} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-700/60">
          {copied ? <Check size={13} className="text-emerald-400" /> : <LinkIcon size={13} />}
          {copied ? "Copied" : "Copy client intake link"}
        </button>
      </header>

      <div className="border-b border-slate-800/60 bg-[#0b1120] px-6">
        <div className="max-w-[1400px] mx-auto flex gap-1">
          <button onClick={() => setTab("dispatch")} className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${tab === "dispatch" ? "border-blue-500 text-blue-400" : "border-transparent text-slate-500 hover:text-slate-300"}`}>
            <Truck size={15} /> Mobile Notary Dispatch
          </button>
          <button onClick={() => setTab("apostille")} className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${tab === "apostille" ? "border-blue-500 text-blue-400" : "border-transparent text-slate-500 hover:text-slate-300"}`}>
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
