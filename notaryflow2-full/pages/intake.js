import { useState } from "react";
import {
  Lock, FileCheck2, Stamp, Upload, File, Loader2, CheckCircle,
  AlertCircle, ArrowLeft, Send,
} from "lucide-react";
import { createNotaryJob, createApostilleRequest, uploadDocument } from "../lib/db";

const inputClass = "w-full bg-slate-800/60 border border-slate-700/60 text-slate-200 placeholder-slate-600 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500/60 transition-colors";
const label = "text-xs text-slate-400 font-medium mb-1.5 block";

function PathChoice({ onChoose }) {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <button onClick={() => onChoose("notarize")} className="text-left bg-[#111827] border border-slate-700/50 hover:border-blue-500/50 rounded-2xl p-6 transition-all group">
        <div className="w-11 h-11 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4"><Stamp size={20} className="text-blue-400" /></div>
        <h3 className="text-slate-100 font-bold text-base mb-1.5">I need my document notarized</h3>
        <p className="text-slate-500 text-sm">We'll send a mobile notary to you, then handle the apostille after.</p>
      </button>
      <button onClick={() => onChoose("apostille")} className="text-left bg-[#111827] border border-slate-700/50 hover:border-blue-500/50 rounded-2xl p-6 transition-all group">
        <div className="w-11 h-11 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4"><FileCheck2 size={20} className="text-emerald-400" /></div>
        <h3 className="text-slate-100 font-bold text-base mb-1.5">My document is already notarized</h3>
        <p className="text-slate-500 text-sm">Upload it now and we'll take it straight to the apostille process.</p>
      </button>
    </div>
  );
}

function IntakeForm({ path, onBack, onDone }) {
  const [form, setForm] = useState({
    client: "", clientEmail: "", clientPhone: "", address: "", docType: "",
    destCountry: "", appointmentTime: "", notes: "",
  });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleFile = (f) => {
    if (!f) return;
    if (f.type !== "application/pdf") { setError("Only PDF files are accepted."); return; }
    if (f.size > 10 * 1024 * 1024) { setError("File must be under 10 MB."); return; }
    setError(""); setFile(f);
  };

  const handleSubmit = async () => {
    if (!form.client.trim() || !form.docType.trim()) { setError("Please fill in your name and document type."); return; }
    if (path === "apostille" && !file) { setError("Please upload your notarized PDF."); return; }
    setError(""); setSubmitting(true);
    try {
      if (path === "notarize") {
        await createNotaryJob({
          client: form.client, clientEmail: form.clientEmail, clientPhone: form.clientPhone,
          address: form.address, docType: form.docType, destCountry: form.destCountry,
          appointmentTime: form.appointmentTime, notes: form.notes,
        });
      } else {
        setUploading(true);
        const { url, name } = await uploadDocument(file, "apostille/intake");
        setUploading(false);
        await createApostilleRequest({
          client: form.client, clientEmail: form.clientEmail, clientPhone: form.clientPhone,
          doc: form.docType, destCountry: form.destCountry, filedState: "New York",
          fee: "75.00", expected: "", tracking: "", notes: form.notes,
          stage: "submitted", uploadedDocUrl: url, uploadedDocName: name,
        });
      }
      onDone();
    } catch (e) {
      setError("Something went wrong submitting your request. Please try again.");
    }
    setSubmitting(false); setUploading(false);
  };

  return (
    <div className="max-w-xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm mb-6"><ArrowLeft size={14} /> Back</button>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2.5 flex items-center gap-2 mb-4"><AlertCircle size={14} /> {error}</div>}

      <div className="space-y-4">
        <div>
          <label className={label}>Your full name *</label>
          <input className={inputClass} value={form.client} onChange={(e) => update("client", e.target.value)} placeholder="Jane Doe" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={label}>Email</label>
            <input className={inputClass} type="email" value={form.clientEmail} onChange={(e) => update("clientEmail", e.target.value)} placeholder="jane@example.com" /></div>
          <div><label className={label}>Phone</label>
            <input className={inputClass} value={form.clientPhone} onChange={(e) => update("clientPhone", e.target.value)} placeholder="212-555-0100" /></div>
        </div>
        <div><label className={label}>Document type *</label>
          <input className={inputClass} value={form.docType} onChange={(e) => update("docType", e.target.value)} placeholder="Power of Attorney" /></div>
        <div><label className={label}>Destination country</label>
          <input className={inputClass} value={form.destCountry} onChange={(e) => update("destCountry", e.target.value)} placeholder="France" /></div>

        {path === "notarize" && (
          <>
            <div><label className={label}>Address for the notary visit *</label>
              <input className={inputClass} value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="123 Main St, Brooklyn, NY" /></div>
            <div><label className={label}>Preferred appointment time</label>
              <input className={inputClass} value={form.appointmentTime} onChange={(e) => update("appointmentTime", e.target.value)} placeholder="Thu, July 17 · 2:00 PM" /></div>
          </>
        )}

        {path === "apostille" && (
          <div>
            <label className={label}>Upload your notarized PDF *</label>
            {file ? (
              <div className="bg-emerald-500/8 border border-emerald-500/25 rounded-xl p-4 flex items-center gap-3">
                <File size={18} className="text-emerald-400 shrink-0" />
                <span className="text-emerald-300 text-sm font-semibold truncate flex-1">{file.name}</span>
                <button onClick={() => setFile(null)} className="text-slate-500 hover:text-red-400 text-xs">Remove</button>
              </div>
            ) : (
              <label className="border-2 border-dashed border-slate-700 hover:border-slate-500 bg-slate-800/30 rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer">
                <input type="file" accept=".pdf" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
                <Upload size={20} className="text-slate-400" />
                <span className="text-slate-300 text-sm font-medium">Click to upload PDF</span>
                <span className="text-slate-500 text-xs">PDF only · Max 10 MB</span>
              </label>
            )}
          </div>
        )}

        <div><label className={label}>Anything else we should know?</label>
          <textarea className={inputClass + " resize-none"} rows={2} value={form.notes} onChange={(e) => update("notes", e.target.value)} /></div>

        <button onClick={handleSubmit} disabled={submitting}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-3 rounded-xl transition-all disabled:opacity-60">
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {uploading ? "Uploading document…" : submitting ? "Submitting…" : "Submit Request"}
        </button>
      </div>
    </div>
  );
}

export default function Intake() {
  const [path, setPath] = useState(null);
  const [done, setDone] = useState(false);

  return (
    <div className="min-h-screen bg-[#0b1120]" style={{ fontFamily: "'DM Sans','Outfit',system-ui,sans-serif" }}>
      <header className="h-16 bg-[#080e1d] border-b border-slate-800/60 flex items-center px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center shrink-0"><Lock size={15} className="text-white" /></div>
          <span className="text-slate-100 font-bold text-base tracking-tight">NotaryFlow</span>
        </div>
      </header>

      <main className="px-6 py-12">
        {done ? (
          <div className="max-w-xl mx-auto text-center">
            <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5"><CheckCircle size={26} className="text-emerald-400" /></div>
            <h2 className="text-slate-100 font-bold text-xl mb-2">Request received</h2>
            <p className="text-slate-400 text-sm">We've got your information and will be in touch shortly to confirm next steps.</p>
          </div>
        ) : path ? (
          <IntakeForm path={path} onBack={() => setPath(null)} onDone={() => setDone(true)} />
        ) : (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-slate-100 mb-2">Document Authentication Request</h1>
              <p className="text-slate-400 text-sm">Tell us where you're starting from and we'll take it from there.</p>
            </div>
            <PathChoice onChoose={setPath} />
          </div>
        )}
      </main>
    </div>
  );
}
