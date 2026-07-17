import { useState, useRef } from "react";
import {
  Stamp, Send, PackageCheck, Truck, Globe, Plus, MapPin,
  Calendar as CalendarIcon, X, CheckCircle, Clock, AlertCircle,
  ChevronRight, FileText, DollarSign, Trash2, Pencil,
  Download, Loader2, Upload, File, UserCheck,
} from "lucide-react";
import {
  createApostilleRequest, updateApostilleRequest, deleteApostilleRequest,
  uploadDocument, daysSince,
} from "../lib/db";

const APOSTILLE_STAGES = [
  { key: "submitted", label: "Submitted", color: "slate" },
  { key: "with_state", label: "With Secretary of State", color: "amber" },
  { key: "processing", label: "Processing", color: "blue" },
  { key: "returned", label: "Returned", color: "violet" },
  { key: "shipped", label: "Shipped to Client", color: "emerald" },
];

function fmtFee(fee) {
  const n = parseFloat(fee);
  return isNaN(n) ? "$0.00" : `$${n.toFixed(2)}`;
}
function initialsOf(name) {
  return (name || "?").trim().split(/\s+/).map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}
function Avatar({ initials, size = "md" }) {
  const sizes = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm" };
  return (
    <div className={`${sizes[size]} bg-[#1e3a5f] text-[#7eb8f7] rounded-full flex items-center justify-center font-bold shrink-0`}>
      {initials}
    </div>
  );
}

/* ─── Upload Zone (Firebase Storage) ────────────────────────────────── */
function UploadZone({ existing, onUpload, onRemove, requestId }) {
  const fileRef = useRef();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const processFile = async (file) => {
    if (!file) return;
    if (file.type !== "application/pdf") { setError("Only PDF files are accepted."); return; }
    if (file.size > 10 * 1024 * 1024) { setError("File must be under 10 MB."); return; }
    setError(""); setUploading(true);
    try {
      const { url, name } = await uploadDocument(file, `apostille/${requestId}`);
      onUpload({ url, name });
    } catch (e) {
      setError("Upload failed — check your connection and try again.");
    }
    setUploading(false);
  };

  if (existing?.url) {
    return (
      <div className="bg-emerald-500/8 border border-emerald-500/25 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/15 rounded-lg flex items-center justify-center shrink-0"><File size={18} className="text-emerald-400" /></div>
          <div className="flex-1 min-w-0">
            <div className="text-emerald-300 font-semibold text-sm truncate">{existing.name}</div>
          </div>
          <a href={existing.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-xs font-semibold bg-blue-500/10 px-2.5 py-1.5 rounded-lg">
            <Download size={12} /> View
          </a>
          <button onClick={onRemove} className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10"><Trash2 size={14} /></button>
        </div>
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-emerald-500/15">
          <CheckCircle size={13} className="text-emerald-400" />
          <span className="text-emerald-400 text-xs font-semibold">Document received — ready to process</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); processFile(e.dataTransfer.files[0]); }}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          dragging ? "border-blue-400 bg-blue-500/8" : "border-slate-700 hover:border-slate-500 bg-slate-800/30 hover:bg-slate-800/50"
        }`}
      >
        <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={(e) => processFile(e.target.files[0])} />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={24} className="text-blue-400 animate-spin" />
            <p className="text-slate-400 text-sm">Uploading…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 bg-slate-700/50 rounded-xl flex items-center justify-center"><Upload size={20} className="text-slate-400" /></div>
            <div>
              <p className="text-slate-300 text-sm font-medium">Drop notarized PDF here</p>
              <p className="text-slate-500 text-xs mt-1">or click to browse · PDF only · Max 10 MB</p>
            </div>
          </div>
        )}
      </div>
      {error && <div className="mt-2 flex items-center gap-1.5 text-red-400 text-xs"><AlertCircle size={12} /> {error}</div>}
    </div>
  );
}

/* ─── Detail Modal ──────────────────────────────────────────────────── */
function DetailModal({ req, onClose, onEdit }) {
  const [tab, setTab] = useState("details");
  const idx = APOSTILLE_STAGES.findIndex((s) => s.key === req.stage);
  const isFinal = idx === APOSTILLE_STAGES.length - 1;
  const hasDoc = !!req.uploadedDocUrl;

  const advance = async () => {
    const next = APOSTILLE_STAGES[idx + 1];
    if (next) await updateApostilleRequest(req.id, { stage: next.key }, true);
  };
  const handleUpload = async ({ url, name }) => {
    await updateApostilleRequest(req.id, { uploadedDocUrl: url, uploadedDocName: name });
  };
  const handleRemoveDoc = async () => {
    await updateApostilleRequest(req.id, { uploadedDocUrl: null, uploadedDocName: null });
  };

  const tabs = [
    { id: "details", label: "Details", icon: <FileText size={13} /> },
    { id: "document", label: "Document", icon: <Upload size={13} />, badge: !hasDoc },
    { id: "client", label: "Client Info", icon: <UserCheck size={13} /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-[640px] max-w-full bg-[#0f172a] rounded-2xl border border-slate-700/60 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/40 shrink-0">
          <div className="flex items-center gap-3">
            <Avatar initials={initialsOf(req.client)} size="sm" />
            <div><span className="font-mono text-xs text-slate-500">{req.id.slice(0, 6).toUpperCase()}</span>
              <h3 className="text-slate-100 font-bold text-base leading-tight">{req.client}</h3></div>
          </div>
          <div className="flex items-center gap-2">
            {hasDoc ? (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg"><CheckCircle size={11} /> Doc Received</span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg"><AlertCircle size={11} /> Awaiting Doc</span>
            )}
            <button onClick={() => onEdit(req)} className="text-slate-500 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800"><Pencil size={15} /></button>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-200"><X size={18} /></button>
          </div>
        </div>

        <div className="px-5 py-4 border-b border-slate-700/30 shrink-0">
          <div className="flex items-center">
            {APOSTILLE_STAGES.map((s, i) => (
              <div key={s.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1 flex-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 ${
                    i < idx ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                    : i === idx ? "bg-blue-500/15 border-blue-500/50 text-blue-400"
                    : "bg-slate-800 border-slate-700 text-slate-600"}`}>
                    {i < idx ? <CheckCircle size={12} /> : <span className="text-[10px] font-bold">{i + 1}</span>}
                  </div>
                  <span className={`text-[9px] text-center leading-tight px-0.5 ${i === idx ? "text-blue-400 font-bold" : "text-slate-600"}`}>{s.label}</span>
                </div>
                {i < APOSTILLE_STAGES.length - 1 && <div className={`h-0.5 flex-1 -mt-4 ${i < idx ? "bg-emerald-500/40" : "bg-slate-700"}`} />}
              </div>
            ))}
          </div>
        </div>

        <div className="flex border-b border-slate-700/40 shrink-0 px-5">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-3 py-3 text-xs font-semibold border-b-2 relative ${
              tab === t.id ? "border-blue-500 text-blue-400" : "border-transparent text-slate-500 hover:text-slate-300"}`}>
              {t.icon}{t.label}
              {t.badge && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 absolute top-2 right-1" />}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === "details" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Document", value: req.doc, icon: <FileText size={13} /> },
                  { label: "Destination Country", value: req.destCountry || "—", icon: <Globe size={13} /> },
                  { label: "Filed With", value: `${req.filedState || "—"} SOS`, icon: <MapPin size={13} /> },
                  { label: "Expected Return", value: req.expected || "—", icon: <CalendarIcon size={13} /> },
                  { label: "Facilitation Fee", value: fmtFee(req.fee), icon: <DollarSign size={13} /> },
                  { label: "Days in Stage", value: `${daysSince(req.stageChangedAt)} day(s)`, icon: <Clock size={13} /> },
                ].map((f) => (
                  <div key={f.label} className="bg-slate-800/40 border border-slate-700/40 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mb-1">{f.icon}{f.label}</div>
                    <div className="text-slate-200 text-sm font-medium">{f.value}</div>
                  </div>
                ))}
              </div>
              <div className="bg-slate-800/40 border border-slate-700/40 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mb-1"><Truck size={13} />Tracking Number</div>
                <div className="text-slate-300 text-sm font-mono">{req.tracking || "—"}</div>
              </div>
              {req.notes && (
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-blue-400 text-[11px] font-semibold mb-1"><AlertCircle size={13} />Notes</div>
                  <div className="text-slate-300 text-sm">{req.notes}</div>
                </div>
              )}
            </div>
          )}
          {tab === "document" && (
            <div className="space-y-4">
              <p className="text-slate-500 text-xs">The client must upload their notarized PDF before you can submit to the Secretary of State.</p>
              <UploadZone requestId={req.id} existing={hasDoc ? { url: req.uploadedDocUrl, name: req.uploadedDocName } : null} onUpload={handleUpload} onRemove={handleRemoveDoc} />
            </div>
          )}
          {tab === "client" && (
            <div className="space-y-3">
              <div className="bg-slate-800/40 border border-slate-700/40 rounded-lg p-4 flex items-center gap-3">
                <Avatar initials={initialsOf(req.client)} />
                <div><div className="text-slate-200 font-semibold text-sm">{req.client}</div>
                  <div className="text-slate-500 text-xs">{req.doc} → {req.destCountry || "Destination TBD"}</div></div>
              </div>
              {[{ label: "Email", value: req.clientEmail || "Not provided" }, { label: "Phone", value: req.clientPhone || "Not provided" }].map((f) => (
                <div key={f.label} className="bg-slate-800/40 border border-slate-700/40 rounded-lg p-3">
                  <div className="text-slate-500 text-[11px] mb-1">{f.label}</div>
                  <div className="text-slate-200 text-sm font-medium">{f.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-700/40 flex justify-between items-center shrink-0">
          <div className="text-xs text-slate-600">Request {req.id.slice(0, 8)}</div>
          <div className="flex gap-2">
            <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-sm font-medium px-4 py-2.5 rounded-xl">Close</button>
            {!isFinal && (
              <button onClick={advance} disabled={!hasDoc && idx === 0}
                className={`flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl ${!hasDoc && idx === 0 ? "bg-slate-700 text-slate-500 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500 text-white"}`}>
                {!hasDoc && idx === 0 ? <><AlertCircle size={13} /> Upload doc first</> : <>Advance to {APOSTILLE_STAGES[idx + 1].label} <ChevronRight size={14} /></>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── New/Edit Form ─────────────────────────────────────────────────── */
function FormModal({ initial, onClose }) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState(() => initial || {
    client: "", doc: "", destCountry: "", filedState: "New York", fee: "75.00",
    expected: "", tracking: "", notes: "", clientEmail: "", clientPhone: "", stage: "submitted",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const inputClass = "w-full bg-slate-800/60 border border-slate-700/60 text-slate-200 placeholder-slate-600 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500/60";
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.client?.trim() || !form.doc?.trim()) { setError("Client name and document type are required."); return; }
    setSaving(true);
    if (isEdit) await updateApostilleRequest(form.id, form);
    else await createApostilleRequest(form);
    setSaving(false);
    onClose();
  };
  const handleDelete = async () => { await deleteApostilleRequest(form.id); onClose(); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-[620px] max-w-full bg-[#0f172a] rounded-2xl border border-slate-700/60 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/40 shrink-0">
          <h3 className="text-slate-100 font-bold text-base">{isEdit ? "Edit Request" : "New Apostille Request"}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto">
          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2.5 flex items-center gap-2"><AlertCircle size={14} /> {error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-slate-400 font-medium mb-1.5 block">Client name *</label>
              <input className={inputClass} value={form.client} onChange={(e) => update("client", e.target.value)} /></div>
            <div><label className="text-xs text-slate-400 font-medium mb-1.5 block">Document type *</label>
              <input className={inputClass} value={form.doc} onChange={(e) => update("doc", e.target.value)} /></div>
            <div><label className="text-xs text-slate-400 font-medium mb-1.5 block">Client email</label>
              <input className={inputClass} value={form.clientEmail} onChange={(e) => update("clientEmail", e.target.value)} /></div>
            <div><label className="text-xs text-slate-400 font-medium mb-1.5 block">Client phone</label>
              <input className={inputClass} value={form.clientPhone} onChange={(e) => update("clientPhone", e.target.value)} /></div>
            <div><label className="text-xs text-slate-400 font-medium mb-1.5 block">Destination country</label>
              <input className={inputClass} value={form.destCountry} onChange={(e) => update("destCountry", e.target.value)} /></div>
            <div><label className="text-xs text-slate-400 font-medium mb-1.5 block">Filed with state</label>
              <input className={inputClass} value={form.filedState} onChange={(e) => update("filedState", e.target.value)} /></div>
            <div><label className="text-xs text-slate-400 font-medium mb-1.5 block">Facilitation fee (USD)</label>
              <input className={inputClass} type="number" step="0.01" value={form.fee} onChange={(e) => update("fee", e.target.value)} /></div>
            <div><label className="text-xs text-slate-400 font-medium mb-1.5 block">Expected return</label>
              <input className={inputClass} value={form.expected} onChange={(e) => update("expected", e.target.value)} /></div>
          </div>
          <div><label className="text-xs text-slate-400 font-medium mb-1.5 block">Tracking number</label>
            <input className={inputClass} value={form.tracking} onChange={(e) => update("tracking", e.target.value)} /></div>
          <div><label className="text-xs text-slate-400 font-medium mb-1.5 block">Stage</label>
            <select className={inputClass} value={form.stage} onChange={(e) => update("stage", e.target.value)}>
              {APOSTILLE_STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select></div>
          <div><label className="text-xs text-slate-400 font-medium mb-1.5 block">Notes</label>
            <textarea className={inputClass + " resize-none"} rows={2} value={form.notes} onChange={(e) => update("notes", e.target.value)} /></div>
        </div>
        <div className="px-5 py-4 border-t border-slate-700/40 flex justify-between items-center shrink-0">
          {isEdit ? (
            <button onClick={handleDelete} className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm font-medium px-3 py-2 rounded-lg hover:bg-red-500/10"><Trash2 size={14} /> Delete</button>
          ) : <div />}
          <div className="flex gap-2">
            <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-sm font-medium px-4 py-2.5 rounded-xl">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl disabled:opacity-60">
              {saving && <Loader2 size={14} className="animate-spin" />} {isEdit ? "Save Changes" : "Create Request"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Card ──────────────────────────────────────────────────────────── */
function ApostilleCard({ req, onClick }) {
  const isStuck = daysSince(req.stageChangedAt) >= 7;
  const hasDoc = !!req.uploadedDocUrl;
  return (
    <button onClick={() => onClick(req)} className={`w-full text-left bg-[#111827] border rounded-xl p-4 hover:border-slate-600/80 transition-all ${isStuck ? "border-red-500/30" : "border-slate-700/50"}`}>
      <div className="flex items-start justify-between mb-3">
        <span className="font-mono text-[11px] text-slate-500">{req.id.slice(0, 6).toUpperCase()}</span>
        <div className="flex items-center gap-1.5">
          {isStuck && <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-md"><AlertCircle size={10} /> STUCK</span>}
          {hasDoc ? <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">✓ Doc</span> : <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md">No Doc</span>}
        </div>
      </div>
      <div className="flex items-center gap-2.5 mb-3">
        <Avatar initials={initialsOf(req.client)} size="sm" />
        <div className="min-w-0"><div className="text-slate-200 text-sm font-semibold truncate">{req.client}</div>
          <div className="text-slate-500 text-xs truncate">{req.doc}</div></div>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
        <Globe size={11} className="text-slate-500" /> <span className="text-slate-300 font-medium">{req.destCountry || "—"}</span>
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-slate-700/40">
        <span className="text-[11px] text-slate-500">{daysSince(req.stageChangedAt)}d in stage</span>
        <span className="text-xs font-semibold text-slate-300">{fmtFee(req.fee)}</span>
      </div>
    </button>
  );
}

/* ─── Main Tracker ──────────────────────────────────────────────────── */
export default function ApostilleTracker({ requests }) {
  const [selected, setSelected] = useState(null);
  const [formOpen, setFormOpen] = useState(null);

  const stuckCount = requests.filter((r) => daysSince(r.stageChangedAt) >= 7).length;
  const awaitingDoc = requests.filter((r) => !r.uploadedDocUrl && r.stage === "submitted").length;
  const totalFees = requests.reduce((s, r) => s + (parseFloat(r.fee) || 0), 0);

  const handleExportCSV = () => {
    const headers = ["ID", "Client", "Email", "Phone", "Document", "Destination", "Stage", "Fee", "Doc Received", "Notes"];
    const rows = requests.map((r) => [r.id, r.client, r.clientEmail || "", r.clientPhone || "", r.doc, r.destCountry, r.stage, fmtFee(r.fee), r.uploadedDocUrl ? "Yes" : "No", r.notes || ""]);
    const csv = [headers, ...rows].map((row) => row.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })), download: `apostille-${new Date().toISOString().slice(0, 10)}.csv` });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      {selected && <DetailModal req={selected} onClose={() => setSelected(null)} onEdit={(r) => { setSelected(null); setFormOpen(r); }} />}
      {formOpen !== null && <FormModal initial={formOpen?.id ? formOpen : null} onClose={() => setFormOpen(null)} />}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Apostille Tracker</h2>
          <p className="text-slate-400 text-sm mt-1">Track document authentication requests end-to-end</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportCSV} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold px-4 py-2.5 rounded-xl border border-slate-700/60"><Download size={15} /> Export CSV</button>
          <button onClick={() => setFormOpen({})} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl"><Plus size={15} /> New Request</button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Active Requests", value: requests.filter((r) => r.stage !== "shipped").length, color: "slate" },
          { label: "Facilitation Revenue", value: `$${totalFees.toFixed(2)}`, color: "emerald" },
          { label: "Stuck 7+ Days", value: stuckCount, color: "red" },
          { label: "Awaiting Document", value: awaitingDoc, color: "amber" },
        ].map((s) => (
          <div key={s.label} className={`bg-[#111827] border rounded-xl p-4 ${s.color === "red" ? "border-red-500/20" : s.color === "amber" ? "border-amber-500/20" : "border-slate-700/50"}`}>
            <div className="text-xs text-slate-500 mb-1">{s.label}</div>
            <div className={`text-xl font-bold ${s.color === "emerald" ? "text-emerald-400" : s.color === "red" ? "text-red-400" : s.color === "amber" ? "text-amber-400" : "text-slate-100"}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {APOSTILLE_STAGES.map((stage) => {
          const items = requests.filter((r) => r.stage === stage.key);
          const colorMap = { slate: "text-slate-400 bg-slate-700/30", amber: "text-amber-400 bg-amber-500/10", blue: "text-blue-400 bg-blue-500/10", violet: "text-violet-400 bg-violet-500/10", emerald: "text-emerald-400 bg-emerald-500/10" };
          return (
            <div key={stage.key} className="min-w-0">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-3 ${colorMap[stage.color]}`}>
                <Stamp size={13} /><span className="text-xs font-bold uppercase tracking-wide">{stage.label}</span>
                <span className="ml-auto text-xs font-bold opacity-70">{items.length}</span>
              </div>
              <div className="space-y-3 min-h-[120px]">
                {items.map((req) => <ApostilleCard key={req.id} req={req} onClick={setSelected} />)}
                {items.length === 0 && <div className="text-center py-8 text-slate-600 text-xs border border-dashed border-slate-700/50 rounded-xl">No requests</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
