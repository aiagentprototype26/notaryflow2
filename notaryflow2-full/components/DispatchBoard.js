import { useState } from "react";
import {
  MapPin, Clock, Phone, Mail, User, Plus, X, ChevronRight,
  CheckCircle, Navigation, CalendarClock, AlertCircle, Trash2,
  ArrowRightCircle, Star, Loader2,
} from "lucide-react";
import {
  createNotaryJob, updateNotaryJob, deleteNotaryJob, convertJobToApostille,
  createNotary, updateNotary, daysSince,
} from "../lib/db";

const JOB_STAGES = [
  { key: "requested", label: "Requested", color: "slate" },
  { key: "assigned", label: "Notary Assigned", color: "amber" },
  { key: "en_route", label: "En Route", color: "blue" },
  { key: "completed", label: "Completed", color: "emerald" },
];

function initialsOf(name) {
  return (name || "?").trim().split(/\s+/).map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function colorClasses(color) {
  return {
    slate: "text-slate-400 bg-slate-700/30",
    amber: "text-amber-400 bg-amber-500/10",
    blue: "text-blue-400 bg-blue-500/10",
    emerald: "text-emerald-400 bg-emerald-500/10",
  }[color];
}

/* ─── Job Card ──────────────────────────────────────────────────────── */
function JobCard({ job, notaries, onOpen }) {
  const isStuck = job.status !== "completed" && daysSince(job.createdAt) >= 2;
  return (
    <button
      onClick={() => onOpen(job)}
      className={`w-full text-left bg-[#111827] border rounded-xl p-4 hover:border-slate-600/80 transition-all ${
        isStuck ? "border-red-500/30" : "border-slate-700/50"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-mono text-slate-500">{job.id.slice(0, 6).toUpperCase()}</span>
        {isStuck && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-md">
            <AlertCircle size={10} /> STALLED
          </span>
        )}
        {job.convertedApostilleId && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded-md">
            <ArrowRightCircle size={10} /> Converted
          </span>
        )}
      </div>
      <div className="text-slate-200 text-sm font-semibold mb-1">{job.client}</div>
      <div className="text-slate-500 text-xs mb-2">{job.docType}</div>
      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1.5">
        <MapPin size={11} className="text-slate-500 shrink-0" />
        <span className="truncate">{job.address || "No address on file"}</span>
      </div>
      {job.appointmentTime && (
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1.5">
          <CalendarClock size={11} className="text-slate-500 shrink-0" /> {job.appointmentTime}
        </div>
      )}
      <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-700/40">
        <span className="text-[11px] text-slate-500">
          {job.notaryAssignedName ? `Assigned: ${job.notaryAssignedName}` : "Unassigned"}
        </span>
        <ChevronRight size={13} className="text-slate-600" />
      </div>
    </button>
  );
}

/* ─── Job Detail / Edit Modal ───────────────────────────────────────── */
function JobModal({ job, notaries, onClose }) {
  const [form, setForm] = useState(job);
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const isNew = !job.id;
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.client?.trim() || !form.docType?.trim()) return;
    setSaving(true);
    if (isNew) {
      await createNotaryJob({
        client: form.client, clientEmail: form.clientEmail || "", clientPhone: form.clientPhone || "",
        address: form.address || "", docType: form.docType, destCountry: form.destCountry || "",
        appointmentTime: form.appointmentTime || "", notes: form.notes || "",
      });
    } else {
      await updateNotaryJob(form.id, {
        client: form.client, clientEmail: form.clientEmail || "", clientPhone: form.clientPhone || "",
        address: form.address || "", docType: form.docType, destCountry: form.destCountry || "",
        appointmentTime: form.appointmentTime || "", notes: form.notes || "",
      });
    }
    setSaving(false);
    onClose();
  };

  const assignNotary = async (notaryId) => {
    const n = notaries.find((x) => x.id === notaryId);
    await updateNotaryJob(form.id, {
      notaryAssignedId: notaryId || null,
      notaryAssignedName: n ? n.name : null,
      status: notaryId ? "assigned" : "requested",
    });
    setForm((f) => ({ ...f, notaryAssignedId: notaryId, notaryAssignedName: n ? n.name : null, status: notaryId ? "assigned" : "requested" }));
  };

  const advanceStatus = async () => {
    const idx = JOB_STAGES.findIndex((s) => s.key === form.status);
    const next = JOB_STAGES[idx + 1];
    if (!next) return;
    await updateNotaryJob(form.id, { status: next.key });
    setForm((f) => ({ ...f, status: next.key }));
  };

  const handleConvert = async () => {
    setConverting(true);
    await convertJobToApostille(form);
    setConverting(false);
    onClose();
  };

  const handleDelete = async () => {
    await deleteNotaryJob(form.id);
    onClose();
  };

  const inputClass = "w-full bg-slate-800/60 border border-slate-700/60 text-slate-200 placeholder-slate-600 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500/60 transition-colors";
  const idx = JOB_STAGES.findIndex((s) => s.key === form.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-[600px] max-w-full bg-[#0f172a] rounded-2xl border border-slate-700/60 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/40 shrink-0">
          <h3 className="text-slate-100 font-bold text-base">{isNew ? "New Mobile Notary Job" : "Job Details"}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200"><X size={18} /></button>
        </div>

        {!isNew && (
          <div className="px-5 py-4 border-b border-slate-700/30 shrink-0">
            <div className="flex items-center">
              {JOB_STAGES.map((s, i) => (
                <div key={s.key} className="flex items-center flex-1">
                  <div className="flex flex-col items-center gap-1 flex-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 ${
                      i < idx ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                      : i === idx ? "bg-blue-500/15 border-blue-500/50 text-blue-400"
                      : "bg-slate-800 border-slate-700 text-slate-600"
                    }`}>
                      {i < idx ? <CheckCircle size={12} /> : <span className="text-[10px] font-bold">{i + 1}</span>}
                    </div>
                    <span className={`text-[9px] text-center leading-tight ${i === idx ? "text-blue-400 font-bold" : "text-slate-600"}`}>{s.label}</span>
                  </div>
                  {i < JOB_STAGES.length - 1 && <div className={`h-0.5 flex-1 -mt-4 ${i < idx ? "bg-emerald-500/40" : "bg-slate-700"}`} />}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-slate-400 font-medium mb-1.5 block">Client name *</label>
              <input className={inputClass} value={form.client || ""} onChange={(e) => update("client", e.target.value)} placeholder="Jane Doe" />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-medium mb-1.5 block">Document type *</label>
              <input className={inputClass} value={form.docType || ""} onChange={(e) => update("docType", e.target.value)} placeholder="Power of Attorney" />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-medium mb-1.5 block">Destination country</label>
              <input className={inputClass} value={form.destCountry || ""} onChange={(e) => update("destCountry", e.target.value)} placeholder="France" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-slate-400 font-medium mb-1.5 block">Client address</label>
              <input className={inputClass} value={form.address || ""} onChange={(e) => update("address", e.target.value)} placeholder="123 Main St, Brooklyn, NY" />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-medium mb-1.5 block">Appointment time</label>
              <input className={inputClass} value={form.appointmentTime || ""} onChange={(e) => update("appointmentTime", e.target.value)} placeholder="Thu, July 17 · 2:00 PM" />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-medium mb-1.5 block">Client phone</label>
              <input className={inputClass} value={form.clientPhone || ""} onChange={(e) => update("clientPhone", e.target.value)} placeholder="212-555-0100" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-slate-400 font-medium mb-1.5 block">Client email</label>
              <input className={inputClass} value={form.clientEmail || ""} onChange={(e) => update("clientEmail", e.target.value)} placeholder="jane@example.com" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-slate-400 font-medium mb-1.5 block">Notes</label>
              <textarea className={inputClass + " resize-none"} rows={2} value={form.notes || ""} onChange={(e) => update("notes", e.target.value)} />
            </div>
          </div>

          {!isNew && (
            <div>
              <label className="text-xs text-slate-400 font-medium mb-1.5 block">Assign notary</label>
              <select
                className={inputClass}
                value={form.notaryAssignedId || ""}
                onChange={(e) => assignNotary(e.target.value || null)}
              >
                <option value="">— Unassigned —</option>
                {notaries.map((n) => (
                  <option key={n.id} value={n.id} disabled={!n.available}>
                    {n.name}{!n.available ? " (unavailable)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!isNew && form.status === "completed" && !form.convertedApostilleId && (
            <div className="bg-violet-500/8 border border-violet-500/25 rounded-xl p-4">
              <div className="flex items-center gap-2 text-violet-300 font-semibold text-sm mb-1">
                <ArrowRightCircle size={15} /> Document notarized
              </div>
              <p className="text-slate-400 text-xs mb-3">Send this straight into the Apostille tracker — client info carries over, nothing to retype.</p>
              <button
                onClick={handleConvert}
                disabled={converting}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all disabled:opacity-60"
              >
                {converting ? <Loader2 size={14} className="animate-spin" /> : <ArrowRightCircle size={14} />}
                Create Apostille Request
              </button>
            </div>
          )}

          {!isNew && form.convertedApostilleId && (
            <div className="bg-emerald-500/8 border border-emerald-500/25 rounded-xl p-3 flex items-center gap-2 text-emerald-300 text-sm">
              <CheckCircle size={14} /> Converted to apostille request — check the Apostille tab.
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-700/40 flex justify-between items-center shrink-0">
          {!isNew ? (
            <button onClick={handleDelete} className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm font-medium px-3 py-2 rounded-lg hover:bg-red-500/10">
              <Trash2 size={14} /> Delete
            </button>
          ) : <div />}
          <div className="flex gap-2">
            <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-sm font-medium px-4 py-2.5 rounded-xl">Close</button>
            {!isNew && idx < JOB_STAGES.length - 1 && form.notaryAssignedId && (
              <button onClick={advanceStatus} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl">
                Advance to {JOB_STAGES[idx + 1].label} <ChevronRight size={14} />
              </button>
            )}
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl disabled:opacity-60">
              {saving && <Loader2 size={14} className="animate-spin" />} {isNew ? "Create Job" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Notary Roster Panel ───────────────────────────────────────────── */
function RosterModal({ notaries, onClose }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const inputClass = "flex-1 bg-slate-800/60 border border-slate-700/60 text-slate-200 placeholder-slate-600 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500/60";

  const add = async () => {
    if (!name.trim()) return;
    await createNotary({ name: name.trim(), phone: phone.trim() });
    setName(""); setPhone("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-[480px] max-w-full bg-[#0f172a] rounded-2xl border border-slate-700/60 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/40 shrink-0">
          <h3 className="text-slate-100 font-bold text-base">Notary Roster</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto flex-1">
          {notaries.length === 0 && <p className="text-slate-500 text-sm">No notaries added yet.</p>}
          {notaries.map((n) => (
            <div key={n.id} className="flex items-center justify-between bg-slate-800/40 border border-slate-700/40 rounded-lg p-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 bg-[#1e3a5f] text-[#7eb8f7] rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                  {initialsOf(n.name)}
                </div>
                <div className="min-w-0">
                  <div className="text-slate-200 text-sm font-semibold truncate">{n.name}</div>
                  <div className="text-slate-500 text-xs truncate">{n.phone || "No phone on file"}</div>
                </div>
              </div>
              <button
                onClick={() => updateNotary(n.id, { available: !n.available })}
                className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg shrink-0 ${
                  n.available ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-700 text-slate-500"
                }`}
              >
                {n.available ? "Available" : "Unavailable"}
              </button>
            </div>
          ))}
        </div>
        <div className="p-5 border-t border-slate-700/40 shrink-0 space-y-2">
          <div className="flex gap-2">
            <input className={inputClass} placeholder="Notary name" value={name} onChange={(e) => setName(e.target.value)} />
            <input className={inputClass} placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <button onClick={add} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl">
            <Plus size={14} /> Add Notary
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Dispatch Board ───────────────────────────────────────────── */
export default function DispatchBoard({ jobs, notaries }) {
  const [openJob, setOpenJob] = useState(null);
  const [rosterOpen, setRosterOpen] = useState(false);

  const stalled = jobs.filter((j) => j.status !== "completed" && daysSince(j.createdAt) >= 2).length;
  const availableNotaries = notaries.filter((n) => n.available).length;

  return (
    <div className="space-y-6">
      {openJob && <JobModal job={openJob} notaries={notaries} onClose={() => setOpenJob(null)} />}
      {rosterOpen && <RosterModal notaries={notaries} onClose={() => setRosterOpen(false)} />}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Mobile Notary Dispatch</h2>
          <p className="text-slate-400 text-sm mt-1">Assign notaries, track appointments, convert finished jobs into apostille requests</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setRosterOpen(true)} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold px-4 py-2.5 rounded-xl border border-slate-700/60">
            <User size={15} /> Roster ({availableNotaries} available)
          </button>
          <button onClick={() => setOpenJob({})} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl">
            <Plus size={15} /> New Job
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Open Jobs", value: jobs.filter((j) => j.status !== "completed").length, color: "slate" },
          { label: "En Route Now", value: jobs.filter((j) => j.status === "en_route").length, color: "blue" },
          { label: "Stalled 2+ Days", value: stalled, color: "red" },
          { label: "Available Notaries", value: availableNotaries, color: "emerald" },
        ].map((s) => (
          <div key={s.label} className={`bg-[#111827] border rounded-xl p-4 ${s.color === "red" ? "border-red-500/20" : "border-slate-700/50"}`}>
            <div className="text-xs text-slate-500 mb-1">{s.label}</div>
            <div className={`text-xl font-bold ${
              s.color === "emerald" ? "text-emerald-400" : s.color === "red" ? "text-red-400" : s.color === "blue" ? "text-blue-400" : "text-slate-100"
            }`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {JOB_STAGES.map((stage) => {
          const items = jobs.filter((j) => j.status === stage.key);
          return (
            <div key={stage.key} className="min-w-0">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-3 ${colorClasses(stage.color)}`}>
                {stage.key === "en_route" ? <Navigation size={13} /> : <Clock size={13} />}
                <span className="text-xs font-bold uppercase tracking-wide">{stage.label}</span>
                <span className="ml-auto text-xs font-bold opacity-70">{items.length}</span>
              </div>
              <div className="space-y-3 min-h-[120px]">
                {items.map((job) => (
                  <JobCard key={job.id} job={job} notaries={notaries} onOpen={setOpenJob} />
                ))}
                {items.length === 0 && (
                  <div className="text-center py-8 text-slate-600 text-xs border border-dashed border-slate-700/50 rounded-xl">No jobs</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
