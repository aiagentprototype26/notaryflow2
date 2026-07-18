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
    slate: "text-charcoal/70 bg-charcoal/10",
    amber: "text-gold bg-gold/10",
    blue: "text-ink bg-ink/10",
    emerald: "text-emerald-700 bg-emerald-600/10",
  }[color];
}

/* ─── Job Card ──────────────────────────────────────────────────────── */
function JobCard({ job, notaries, onOpen }) {
  const isStuck = job.status !== "completed" && daysSince(job.createdAt) >= 2;
  return (
    <button
      onClick={() => onOpen(job)}
      className={`w-full text-left bg-white border rounded p-4 hover:border-gold/40 transition-all ${
        isStuck ? "border-seal/30" : "border-black/10"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-mono text-charcoal/60">{job.id.slice(0, 6).toUpperCase()}</span>
        {isStuck && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-seal bg-seal/10 px-1.5 py-0.5 rounded-sm">
            <AlertCircle size={10} /> STALLED
          </span>
        )}
        {job.convertedApostilleId && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-seal bg-seal/10 px-1.5 py-0.5 rounded-sm">
            <ArrowRightCircle size={10} /> Converted
          </span>
        )}
      </div>
      <div className="text-ink text-sm font-semibold mb-1">{job.client}</div>
      <div className="text-charcoal/60 text-xs mb-2">{job.docType}</div>
      <div className="flex items-center gap-1.5 text-xs text-charcoal/70 mb-1.5">
        <MapPin size={11} className="text-charcoal/60 shrink-0" />
        <span className="truncate">{job.address || "No address on file"}</span>
      </div>
      {job.appointmentTime && (
        <div className="flex items-center gap-1.5 text-xs text-charcoal/70 mb-1.5">
          <CalendarClock size={11} className="text-charcoal/60 shrink-0" /> {job.appointmentTime}
        </div>
      )}
      <div className="flex items-center justify-between pt-2 mt-2 border-t border-black/10">
        <span className="text-[11px] text-charcoal/60">
          {job.notaryAssignedName ? `Assigned: ${job.notaryAssignedName}` : "Unassigned"}
        </span>
        <ChevronRight size={13} className="text-charcoal/50" />
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

  const inputClass = "w-full bg-white border border-black/10 text-ink placeholder-charcoal/40 text-sm rounded-sm px-3 py-2.5 focus:outline-none focus:border-gold transition-colors";
  const idx = JOB_STAGES.findIndex((s) => s.key === form.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-[600px] max-w-full bg-white rounded border border-black/10 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/10 shrink-0">
          <h3 className="text-ink font-bold text-base">{isNew ? "New Mobile Notary Job" : "Job Details"}</h3>
          <button onClick={onClose} className="text-charcoal/60 hover:text-ink2"><X size={18} /></button>
        </div>

        {!isNew && (
          <div className="px-5 py-4 border-b border-black/10 shrink-0">
            <div className="flex items-center">
              {JOB_STAGES.map((s, i) => (
                <div key={s.key} className="flex items-center flex-1">
                  <div className="flex flex-col items-center gap-1 flex-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 ${
                      i < idx ? "bg-emerald-600/15 border-emerald-600/40 text-emerald-700"
                      : i === idx ? "bg-ink/15 border-ink/50 text-ink"
                      : "bg-cream2 border-black/15 text-charcoal/50"
                    }`}>
                      {i < idx ? <CheckCircle size={12} /> : <span className="text-[10px] font-bold">{i + 1}</span>}
                    </div>
                    <span className={`text-[9px] text-center leading-tight ${i === idx ? "text-ink font-bold" : "text-charcoal/50"}`}>{s.label}</span>
                  </div>
                  {i < JOB_STAGES.length - 1 && <div className={`h-0.5 flex-1 -mt-4 ${i < idx ? "bg-emerald-600/40" : "bg-charcoal/10"}`} />}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-charcoal/70 font-medium mb-1.5 block">Client name *</label>
              <input className={inputClass} value={form.client || ""} onChange={(e) => update("client", e.target.value)} placeholder="Jane Doe" />
            </div>
            <div>
              <label className="text-xs text-charcoal/70 font-medium mb-1.5 block">Document type *</label>
              <input className={inputClass} value={form.docType || ""} onChange={(e) => update("docType", e.target.value)} placeholder="Power of Attorney" />
            </div>
            <div>
              <label className="text-xs text-charcoal/70 font-medium mb-1.5 block">Destination country</label>
              <input className={inputClass} value={form.destCountry || ""} onChange={(e) => update("destCountry", e.target.value)} placeholder="France" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-charcoal/70 font-medium mb-1.5 block">Client address</label>
              <input className={inputClass} value={form.address || ""} onChange={(e) => update("address", e.target.value)} placeholder="123 Main St, Brooklyn, NY" />
            </div>
            <div>
              <label className="text-xs text-charcoal/70 font-medium mb-1.5 block">Appointment time</label>
              <input className={inputClass} value={form.appointmentTime || ""} onChange={(e) => update("appointmentTime", e.target.value)} placeholder="Thu, July 17 · 2:00 PM" />
            </div>
            <div>
              <label className="text-xs text-charcoal/70 font-medium mb-1.5 block">Client phone</label>
              <input className={inputClass} value={form.clientPhone || ""} onChange={(e) => update("clientPhone", e.target.value)} placeholder="212-555-0100" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-charcoal/70 font-medium mb-1.5 block">Client email</label>
              <input className={inputClass} value={form.clientEmail || ""} onChange={(e) => update("clientEmail", e.target.value)} placeholder="jane@example.com" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-charcoal/70 font-medium mb-1.5 block">Notes</label>
              <textarea className={inputClass + " resize-none"} rows={2} value={form.notes || ""} onChange={(e) => update("notes", e.target.value)} />
            </div>
          </div>

          {!isNew && (
            <div>
              <label className="text-xs text-charcoal/70 font-medium mb-1.5 block">Assign notary</label>
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
            <div className="bg-seal/10 border border-seal/25 rounded p-4">
              <div className="flex items-center gap-2 text-seal font-semibold text-sm mb-1">
                <ArrowRightCircle size={15} /> Document notarized
              </div>
              <p className="text-charcoal/70 text-xs mb-3">Send this straight into the Apostille tracker — client info carries over, nothing to retype.</p>
              <button
                onClick={handleConvert}
                disabled={converting}
                className="flex items-center gap-2 bg-seal hover:bg-seal2 text-white text-sm font-semibold px-4 py-2.5 rounded transition-all disabled:opacity-60"
              >
                {converting ? <Loader2 size={14} className="animate-spin" /> : <ArrowRightCircle size={14} />}
                Create Apostille Request
              </button>
            </div>
          )}

          {!isNew && form.convertedApostilleId && (
            <div className="bg-emerald-600/10 border border-emerald-600/25 rounded p-3 flex items-center gap-2 text-emerald-700 text-sm">
              <CheckCircle size={14} /> Converted to apostille request — check the Apostille tab.
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-black/10 flex justify-between items-center shrink-0">
          {!isNew ? (
            <button onClick={handleDelete} className="flex items-center gap-2 text-seal hover:text-seal2 text-sm font-medium px-3 py-2 rounded-sm hover:bg-seal/10">
              <Trash2 size={14} /> Delete
            </button>
          ) : <div />}
          <div className="flex gap-2">
            <button onClick={onClose} className="text-charcoal/70 hover:text-ink2 text-sm font-medium px-4 py-2.5 rounded">Close</button>
            {!isNew && idx < JOB_STAGES.length - 1 && form.notaryAssignedId && (
              <button onClick={advanceStatus} className="flex items-center gap-2 bg-ink hover:bg-ink2 text-white text-sm font-semibold px-4 py-2.5 rounded">
                Advance to {JOB_STAGES[idx + 1].label} <ChevronRight size={14} />
              </button>
            )}
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-cream2 hover:bg-[#ddd0ab] text-charcoal text-sm font-semibold px-4 py-2.5 rounded border border-black/10 disabled:opacity-60">
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
  const inputClass = "flex-1 bg-white border border-black/10 text-ink placeholder-charcoal/40 text-sm rounded-sm px-3 py-2 focus:outline-none focus:border-gold";

  const add = async () => {
    if (!name.trim()) return;
    await createNotary({ name: name.trim(), phone: phone.trim() });
    setName(""); setPhone("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-[480px] max-w-full bg-white rounded border border-black/10 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/10 shrink-0">
          <h3 className="text-ink font-bold text-base">Notary Roster</h3>
          <button onClick={onClose} className="text-charcoal/60 hover:text-ink2"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto flex-1">
          {notaries.length === 0 && <p className="text-charcoal/60 text-sm">No notaries added yet.</p>}
          {notaries.map((n) => (
            <div key={n.id} className="flex items-center justify-between bg-cream2/60 border border-black/10 rounded-sm p-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 bg-gold/20 text-ink rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                  {initialsOf(n.name)}
                </div>
                <div className="min-w-0">
                  <div className="text-ink text-sm font-semibold truncate">{n.name}</div>
                  <div className="text-charcoal/60 text-xs truncate">{n.phone || "No phone on file"}</div>
                </div>
              </div>
              <button
                onClick={() => updateNotary(n.id, { available: !n.available })}
                className={`text-[11px] font-bold px-2.5 py-1.5 rounded-sm shrink-0 ${
                  n.available ? "bg-emerald-600/10 text-emerald-700" : "bg-charcoal/10 text-charcoal/60"
                }`}
              >
                {n.available ? "Available" : "Unavailable"}
              </button>
            </div>
          ))}
        </div>
        <div className="p-5 border-t border-black/10 shrink-0 space-y-2">
          <div className="flex gap-2">
            <input className={inputClass} placeholder="Notary name" value={name} onChange={(e) => setName(e.target.value)} />
            <input className={inputClass} placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <button onClick={add} className="w-full flex items-center justify-center gap-2 bg-ink hover:bg-ink2 text-white text-sm font-semibold px-4 py-2.5 rounded">
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
          <h2 className="text-xl font-bold text-ink">Mobile Notary Dispatch</h2>
          <p className="text-charcoal/70 text-sm mt-1">Assign notaries, track appointments, convert finished jobs into apostille requests</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setRosterOpen(true)} className="flex items-center gap-2 bg-cream2 hover:bg-[#ddd0ab] text-charcoal text-sm font-semibold px-4 py-2.5 rounded border border-black/10">
            <User size={15} /> Roster ({availableNotaries} available)
          </button>
          <button onClick={() => setOpenJob({})} className="flex items-center gap-2 bg-ink hover:bg-ink2 text-white text-sm font-semibold px-4 py-2.5 rounded">
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
          <div key={s.label} className={`bg-white border rounded p-4 ${s.color === "red" ? "border-seal/20" : "border-black/10"}`}>
            <div className="text-xs text-charcoal/60 mb-1">{s.label}</div>
            <div className={`text-xl font-bold ${
              s.color === "emerald" ? "text-emerald-700" : s.color === "red" ? "text-seal" : s.color === "blue" ? "text-ink" : "text-ink"
            }`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {JOB_STAGES.map((stage) => {
          const items = jobs.filter((j) => j.status === stage.key);
          return (
            <div key={stage.key} className="min-w-0">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-sm mb-3 ${colorClasses(stage.color)}`}>
                {stage.key === "en_route" ? <Navigation size={13} /> : <Clock size={13} />}
                <span className="text-xs font-bold uppercase tracking-wide">{stage.label}</span>
                <span className="ml-auto text-xs font-bold opacity-70">{items.length}</span>
              </div>
              <div className="space-y-3 min-h-[120px]">
                {items.map((job) => (
                  <JobCard key={job.id} job={job} notaries={notaries} onOpen={setOpenJob} />
                ))}
                {items.length === 0 && (
                  <div className="text-center py-8 text-charcoal/50 text-xs border border-dashed border-black/10 rounded">No jobs</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
