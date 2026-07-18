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
    <div className={`${sizes[size]} bg-gold/20 text-ink rounded-full flex items-center justify-center font-bold shrink-0`}>
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
      <div className="bg-emerald-600/10 border border-emerald-600/25 rounded p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600/15 rounded-sm flex items-center justify-center shrink-0"><File size={18} className="text-emerald-700" /></div>
          <div className="flex-1 min-w-0">
            <div className="text-emerald-700 font-semibold text-sm truncate">{existing.name}</div>
          </div>
          <a href={existing.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-ink hover:text-ink2 text-xs font-semibold bg-ink/10 px-2.5 py-1.5 rounded-sm">
            <Download size={12} /> View
          </a>
          <button onClick={onRemove} className="text-charcoal/60 hover:text-seal2 p-1.5 rounded-sm hover:bg-seal/10"><Trash2 size={14} /></button>
        </div>
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-emerald-600/15">
          <CheckCircle size={13} className="text-emerald-700" />
          <span className="text-emerald-700 text-xs font-semibold">Document received — ready to process</span>
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
        className={`border-2 border-dashed rounded p-8 text-center cursor-pointer transition-all ${
          dragging ? "border-gold bg-gold/10" : "border-black/15 hover:border-gold/50 bg-cream2/50 hover:bg-cream2/70"
        }`}
      >
        <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={(e) => processFile(e.target.files[0])} />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={24} className="text-ink animate-spin" />
            <p className="text-charcoal/70 text-sm">Uploading…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 bg-charcoal/10 rounded flex items-center justify-center"><Upload size={20} className="text-charcoal/70" /></div>
            <div>
              <p className="text-charcoal text-sm font-medium">Drop notarized PDF here</p>
              <p className="text-charcoal/60 text-xs mt-1">or click to browse · PDF only · Max 10 MB</p>
            </div>
          </div>
        )}
      </div>
      {error && <div className="mt-2 flex items-center gap-1.5 text-seal text-xs"><AlertCircle size={12} /> {error}</div>}
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
      <div className="w-[640px] max-w-full bg-white rounded border border-black/10 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/10 shrink-0">
          <div className="flex items-center gap-3">
            <Avatar initials={initialsOf(req.client)} size="sm" />
            <div><span className="font-mono text-xs text-charcoal/60">{req.id.slice(0, 6).toUpperCase()}</span>
              <h3 className="text-ink font-bold text-base leading-tight">{req.client}</h3></div>
          </div>
          <div className="flex items-center gap-2">
            {hasDoc ? (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-600/10 border border-emerald-600/20 px-2 py-1 rounded-sm"><CheckCircle size={11} /> Doc Received</span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-gold bg-gold/10 border border-gold/20 px-2 py-1 rounded-sm"><AlertCircle size={11} /> Awaiting Doc</span>
            )}
            <button onClick={() => onEdit(req)} className="text-charcoal/60 hover:text-ink2 p-1.5 rounded-sm hover:bg-cream2"><Pencil size={15} /></button>
            <button onClick={onClose} className="text-charcoal/60 hover:text-ink2"><X size={18} /></button>
          </div>
        </div>

        <div className="px-5 py-4 border-b border-black/10 shrink-0">
          <div className="flex items-center">
            {APOSTILLE_STAGES.map((s, i) => (
              <div key={s.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1 flex-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 ${
                    i < idx ? "bg-emerald-600/15 border-emerald-600/40 text-emerald-700"
                    : i === idx ? "bg-ink/15 border-ink/50 text-ink"
                    : "bg-cream2 border-black/15 text-charcoal/50"}`}>
                    {i < idx ? <CheckCircle size={12} /> : <span className="text-[10px] font-bold">{i + 1}</span>}
                  </div>
                  <span className={`text-[9px] text-center leading-tight px-0.5 ${i === idx ? "text-ink font-bold" : "text-charcoal/50"}`}>{s.label}</span>
                </div>
                {i < APOSTILLE_STAGES.length - 1 && <div className={`h-0.5 flex-1 -mt-4 ${i < idx ? "bg-emerald-600/40" : "bg-charcoal/10"}`} />}
              </div>
            ))}
          </div>
        </div>

        <div className="flex border-b border-black/10 shrink-0 px-5">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-3 py-3 text-xs font-semibold border-b-2 relative ${
              tab === t.id ? "border-ink text-ink" : "border-transparent text-charcoal/60 hover:text-charcoal"}`}>
              {t.icon}{t.label}
              {t.badge && <span className="w-1.5 h-1.5 rounded-full bg-gold absolute top-2 right-1" />}
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
                  <div key={f.label} className="bg-cream2/60 border border-black/10 rounded-sm p-3">
                    <div className="flex items-center gap-1.5 text-charcoal/60 text-[11px] mb-1">{f.icon}{f.label}</div>
                    <div className="text-ink text-sm font-medium">{f.value}</div>
                  </div>
                ))}
              </div>
              <div className="bg-cream2/60 border border-black/10 rounded-sm p-3">
                <div className="flex items-center gap-1.5 text-charcoal/60 text-[11px] mb-1"><Truck size={13} />Tracking Number</div>
                <div className="text-charcoal text-sm font-mono">{req.tracking || "—"}</div>
              </div>
              {req.notes && (
                <div className="bg-ink/5 border border-ink/20 rounded-sm p-3">
                  <div className="flex items-center gap-1.5 text-ink text-[11px] font-semibold mb-1"><AlertCircle size={13} />Notes</div>
                  <div className="text-charcoal text-sm">{req.notes}</div>
                </div>
              )}
            </div>
          )}
          {tab === "document" && (
            <div className="space-y-4">
              <p className="text-charcoal/60 text-xs">The client must upload their notarized PDF before you can submit to the Secretary of State.</p>
              <UploadZone requestId={req.id} existing={hasDoc ? { url: req.uploadedDocUrl, name: req.uploadedDocName } : null} onUpload={handleUpload} onRemove={handleRemoveDoc} />
            </div>
          )}
          {tab === "client" && (
            <div className="space-y-3">
              <div className="bg-cream2/60 border border-black/10 rounded-sm p-4 flex items-center gap-3">
                <Avatar initials={initialsOf(req.client)} />
                <div><div className="text-ink font-semibold text-sm">{req.client}</div>
                  <div className="text-charcoal/60 text-xs">{req.doc} → {req.destCountry || "Destination TBD"}</div></div>
              </div>
              {[{ label: "Email", value: req.clientEmail || "Not provided" }, { label: "Phone", value: req.clientPhone || "Not provided" }].map((f) => (
                <div key={f.label} className="bg-cream2/60 border border-black/10 rounded-sm p-3">
                  <div className="text-charcoal/60 text-[11px] mb-1">{f.label}</div>
                  <div className="text-ink text-sm font-medium">{f.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-black/10 flex justify-between items-center shrink-0">
          <div className="text-xs text-charcoal/50">Request {req.id.slice(0, 8)}</div>
          <div className="flex gap-2">
            <button onClick={onClose} className="text-charcoal/70 hover:text-ink2 text-sm font-medium px-4 py-2.5 rounded">Close</button>
            {!isFinal && (
              <button onClick={advance} disabled={!hasDoc && idx === 0}
                className={`flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded ${!hasDoc && idx === 0 ? "bg-charcoal/10 text-charcoal/60 cursor-not-allowed" : "bg-ink hover:bg-ink2 text-white"}`}>
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
  const inputClass = "w-full bg-white border border-black/10 text-ink placeholder-charcoal/40 text-sm rounded-sm px-3 py-2.5 focus:outline-none focus:border-gold";
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
      <div className="w-[620px] max-w-full bg-white rounded border border-black/10 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/10 shrink-0">
          <h3 className="text-ink font-bold text-base">{isEdit ? "Edit Request" : "New Apostille Request"}</h3>
          <button onClick={onClose} className="text-charcoal/60 hover:text-ink2"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto">
          {error && <div className="bg-seal/10 border border-seal/30 text-seal text-sm rounded-sm px-3 py-2.5 flex items-center gap-2"><AlertCircle size={14} /> {error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-charcoal/70 font-medium mb-1.5 block">Client name *</label>
              <input className={inputClass} value={form.client} onChange={(e) => update("client", e.target.value)} /></div>
            <div><label className="text-xs text-charcoal/70 font-medium mb-1.5 block">Document type *</label>
              <input className={inputClass} value={form.doc} onChange={(e) => update("doc", e.target.value)} /></div>
            <div><label className="text-xs text-charcoal/70 font-medium mb-1.5 block">Client email</label>
              <input className={inputClass} value={form.clientEmail} onChange={(e) => update("clientEmail", e.target.value)} /></div>
            <div><label className="text-xs text-charcoal/70 font-medium mb-1.5 block">Client phone</label>
              <input className={inputClass} value={form.clientPhone} onChange={(e) => update("clientPhone", e.target.value)} /></div>
            <div><label className="text-xs text-charcoal/70 font-medium mb-1.5 block">Destination country</label>
              <input className={inputClass} value={form.destCountry} onChange={(e) => update("destCountry", e.target.value)} /></div>
            <div><label className="text-xs text-charcoal/70 font-medium mb-1.5 block">Filed with state</label>
              <input className={inputClass} value={form.filedState} onChange={(e) => update("filedState", e.target.value)} /></div>
            <div><label className="text-xs text-charcoal/70 font-medium mb-1.5 block">Facilitation fee (USD)</label>
              <input className={inputClass} type="number" step="0.01" value={form.fee} onChange={(e) => update("fee", e.target.value)} /></div>
            <div><label className="text-xs text-charcoal/70 font-medium mb-1.5 block">Expected return</label>
              <input className={inputClass} value={form.expected} onChange={(e) => update("expected", e.target.value)} /></div>
          </div>
          <div><label className="text-xs text-charcoal/70 font-medium mb-1.5 block">Tracking number</label>
            <input className={inputClass} value={form.tracking} onChange={(e) => update("tracking", e.target.value)} /></div>
          <div><label className="text-xs text-charcoal/70 font-medium mb-1.5 block">Stage</label>
            <select className={inputClass} value={form.stage} onChange={(e) => update("stage", e.target.value)}>
              {APOSTILLE_STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select></div>
          <div><label className="text-xs text-charcoal/70 font-medium mb-1.5 block">Notes</label>
            <textarea className={inputClass + " resize-none"} rows={2} value={form.notes} onChange={(e) => update("notes", e.target.value)} /></div>
        </div>
        <div className="px-5 py-4 border-t border-black/10 flex justify-between items-center shrink-0">
          {isEdit ? (
            <button onClick={handleDelete} className="flex items-center gap-2 text-seal hover:text-seal2 text-sm font-medium px-3 py-2 rounded-sm hover:bg-seal/10"><Trash2 size={14} /> Delete</button>
          ) : <div />}
          <div className="flex gap-2">
            <button onClick={onClose} className="text-charcoal/70 hover:text-ink2 text-sm font-medium px-4 py-2.5 rounded">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-ink hover:bg-ink2 text-white text-sm font-semibold px-4 py-2.5 rounded disabled:opacity-60">
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
    <button onClick={() => onClick(req)} className={`w-full text-left bg-white border rounded p-4 hover:border-gold/40 transition-all ${isStuck ? "border-seal/30" : "border-black/10"}`}>
      <div className="flex items-start justify-between mb-3">
        <span className="font-mono text-[11px] text-charcoal/60">{req.id.slice(0, 6).toUpperCase()}</span>
        <div className="flex items-center gap-1.5">
          {isStuck && <span className="flex items-center gap-1 text-[10px] font-bold text-seal bg-seal/10 px-1.5 py-0.5 rounded-sm"><AlertCircle size={10} /> STUCK</span>}
          {hasDoc ? <span className="text-[10px] font-bold text-emerald-700 bg-emerald-600/10 px-1.5 py-0.5 rounded-sm">✓ Doc</span> : <span className="text-[10px] font-bold text-gold bg-gold/10 px-1.5 py-0.5 rounded-sm">No Doc</span>}
        </div>
      </div>
      <div className="flex items-center gap-2.5 mb-3">
        <Avatar initials={initialsOf(req.client)} size="sm" />
        <div className="min-w-0"><div className="text-ink text-sm font-semibold truncate">{req.client}</div>
          <div className="text-charcoal/60 text-xs truncate">{req.doc}</div></div>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-charcoal/70 mb-2">
        <Globe size={11} className="text-charcoal/60" /> <span className="text-charcoal font-medium">{req.destCountry || "—"}</span>
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-black/10">
        <span className="text-[11px] text-charcoal/60">{daysSince(req.stageChangedAt)}d in stage</span>
        <span className="text-xs font-semibold text-charcoal">{fmtFee(req.fee)}</span>
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
          <h2 className="text-xl font-bold text-ink">Apostille Tracker</h2>
          <p className="text-charcoal/70 text-sm mt-1">Track document authentication requests end-to-end</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportCSV} className="flex items-center gap-2 bg-cream2 hover:bg-[#ddd0ab] text-charcoal text-sm font-semibold px-4 py-2.5 rounded border border-black/10"><Download size={15} /> Export CSV</button>
          <button onClick={() => setFormOpen({})} className="flex items-center gap-2 bg-ink hover:bg-ink2 text-white text-sm font-semibold px-4 py-2.5 rounded"><Plus size={15} /> New Request</button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Active Requests", value: requests.filter((r) => r.stage !== "shipped").length, color: "slate" },
          { label: "Facilitation Revenue", value: `$${totalFees.toFixed(2)}`, color: "emerald" },
          { label: "Stuck 7+ Days", value: stuckCount, color: "red" },
          { label: "Awaiting Document", value: awaitingDoc, color: "amber" },
        ].map((s) => (
          <div key={s.label} className={`bg-white border rounded p-4 ${s.color === "red" ? "border-seal/20" : s.color === "amber" ? "border-gold/20" : "border-black/10"}`}>
            <div className="text-xs text-charcoal/60 mb-1">{s.label}</div>
            <div className={`text-xl font-bold ${s.color === "emerald" ? "text-emerald-700" : s.color === "red" ? "text-seal" : s.color === "amber" ? "text-gold" : "text-ink"}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {APOSTILLE_STAGES.map((stage) => {
          const items = requests.filter((r) => r.stage === stage.key);
          const colorMap = { slate: "text-charcoal/70 bg-charcoal/10", amber: "text-gold bg-gold/10", blue: "text-ink bg-ink/10", violet: "text-seal bg-seal/10", emerald: "text-emerald-700 bg-emerald-600/10" };
          return (
            <div key={stage.key} className="min-w-0">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-sm mb-3 ${colorMap[stage.color]}`}>
                <Stamp size={13} /><span className="text-xs font-bold uppercase tracking-wide">{stage.label}</span>
                <span className="ml-auto text-xs font-bold opacity-70">{items.length}</span>
              </div>
              <div className="space-y-3 min-h-[120px]">
                {items.map((req) => <ApostilleCard key={req.id} req={req} onClick={setSelected} />)}
                {items.length === 0 && <div className="text-center py-8 text-charcoal/50 text-xs border border-dashed border-black/10 rounded">No requests</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
