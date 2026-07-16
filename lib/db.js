import {
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot,
  query, orderBy, serverTimestamp, getDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";

/* ─── Mobile Notary Jobs ────────────────────────────────────────────── */

const jobsCol = collection(db, "notaryJobs");

export function subscribeNotaryJobs(cb) {
  const q = query(jobsCol, orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function createNotaryJob(data) {
  return addDoc(jobsCol, {
    ...data,
    status: "requested",
    notaryAssignedId: null,
    notaryAssignedName: null,
    convertedApostilleId: null,
    createdAt: serverTimestamp(),
    statusChangedAt: serverTimestamp(),
  });
}

export async function updateNotaryJob(id, data) {
  return updateDoc(doc(db, "notaryJobs", id), {
    ...data,
    statusChangedAt: serverTimestamp(),
  });
}

export async function deleteNotaryJob(id) {
  return deleteDoc(doc(db, "notaryJobs", id));
}

/* Convert a completed notary job straight into an apostille request,
   carrying over client info so nothing has to be re-typed. */
export async function convertJobToApostille(job) {
  const newDoc = await addDoc(collection(db, "apostilleRequests"), {
    client: job.client,
    clientEmail: job.clientEmail || "",
    clientPhone: job.clientPhone || "",
    doc: job.docType,
    destCountry: job.destCountry || "",
    filedState: job.filedState || "New York",
    fee: job.fee || "75.00",
    expected: "",
    tracking: "",
    notes: `Notarized in person by ${job.notaryAssignedName || "mobile notary"} on ${new Date().toLocaleDateString(
      "en-US", { month: "short", day: "numeric", year: "numeric" }
    )}.${job.notes ? " " + job.notes : ""}`,
    stage: "submitted",
    uploadedDocUrl: job.notarizedDocUrl || null,
    uploadedDocName: job.notarizedDocName || null,
    sourceJobId: job.id,
    createdAt: serverTimestamp(),
    stageChangedAt: serverTimestamp(),
  });
  await updateNotaryJob(job.id, { convertedApostilleId: newDoc.id });
  return newDoc.id;
}

/* ─── Notary Roster ─────────────────────────────────────────────────── */

const notariesCol = collection(db, "notaries");

export function subscribeNotaries(cb) {
  const q = query(notariesCol, orderBy("name"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function createNotary(data) {
  return addDoc(notariesCol, { available: true, ...data });
}

export async function updateNotary(id, data) {
  return updateDoc(doc(db, "notaries", id), data);
}

export async function deleteNotary(id) {
  return deleteDoc(doc(db, "notaries", id));
}

/* ─── Apostille Requests ────────────────────────────────────────────── */

const apostilleCol = collection(db, "apostilleRequests");

export function subscribeApostilleRequests(cb) {
  const q = query(apostilleCol, orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function createApostilleRequest(data) {
  return addDoc(apostilleCol, {
    ...data,
    stage: data.stage || "submitted",
    createdAt: serverTimestamp(),
    stageChangedAt: serverTimestamp(),
  });
}

export async function updateApostilleRequest(id, data, resetStageClock = false) {
  return updateDoc(doc(db, "apostilleRequests", id), {
    ...data,
    ...(resetStageClock ? { stageChangedAt: serverTimestamp() } : {}),
  });
}

export async function deleteApostilleRequest(id) {
  return deleteDoc(doc(db, "apostilleRequests", id));
}

export async function getApostilleRequest(id) {
  const snap = await getDoc(doc(db, "apostilleRequests", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/* ─── File uploads (Firebase Storage) ───────────────────────────────── */

export async function uploadDocument(file, pathPrefix) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${pathPrefix}/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  return { url, name: file.name, path };
}

/* ─── Helpers ────────────────────────────────────────────────────────── */

export function daysSince(timestamp) {
  if (!timestamp) return 0;
  const ms = Date.now() - (timestamp.toMillis ? timestamp.toMillis() : new Date(timestamp).getTime());
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}
