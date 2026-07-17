import {
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot,
  query, orderBy, where, serverTimestamp, getDoc, getDocs, limit,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged,
} from "firebase/auth";
import { db, storage, auth } from "./firebase";

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

/* Live jobs feed scoped to a single notary — used by the Notary Portal
   so a logged-in notary only ever sees their own assigned jobs. */
export function subscribeNotaryJobsByUser(notaryId, cb) {
  const q = query(jobsCol, where("notaryAssignedId", "==", notaryId));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

/* Narrow status-only update for the portal's "advance job" action.
   Distinct from updateNotaryJob above, which stays as-is for the
   admin dashboard's fuller edit form. */
export async function updateJobStatus(id, status) {
  return updateDoc(doc(db, "notaryJobs", id), {
    status,
    statusChangedAt: serverTimestamp(),
  });
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

/* ─── Authentication (used by the Notary Portal) ────────────────────── */

export async function createUser(email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function loginUser(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function logoutUser() {
  return signOut(auth);
}

export function getCurrentUser() {
  // Resolves once Firebase Auth finishes its initial check, avoiding
  // the null-on-first-load race.
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => { unsubscribe(); resolve(user); },
      reject
    );
  });
}

export function onAuthChange(cb) {
  return onAuthStateChanged(auth, cb);
}

/* ─── Notary Portal account linking ──────────────────────────────────
   Notary roster docs (in `notaries`) aren't tied to a login. To link
   one without touching the existing roster UI, a notary signs up with
   their phone number (already stored on their roster entry) plus a
   new email/password. We look up the roster doc by phone and stamp an
   `authUid` field onto it — a plain data write, no schema change. */

export async function findNotaryByPhone(phone) {
  const q = query(notariesCol, where("phone", "==", phone), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

export async function getNotaryByAuthUid(uid) {
  const q = query(notariesCol, where("authUid", "==", uid), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

export async function signUpNotary(phone, email, password) {
  const notary = await findNotaryByPhone(phone);
  if (!notary) {
    throw new Error("No notary profile found with that phone number. Check with dispatch.");
  }
  const user = await createUser(email, password);
  await updateNotary(notary.id, { authUid: user.uid, email });
  return { user, notary: { ...notary, authUid: user.uid, email } };
}

/* ─── Notifications ──────────────────────────────────────────────────── */

const notificationsCol = collection(db, "notifications");

export async function createNotification(data) {
  return addDoc(notificationsCol, {
    userId: data.userId,
    message: data.message,
    read: false,
    createdAt: serverTimestamp(),
  });
}

export function subscribeNotifications(userId, cb) {
  const q = query(
    notificationsCol,
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

/* ─── Helpers ────────────────────────────────────────────────────────── */

export function daysSince(timestamp) {
  if (!timestamp) return 0;
  const ms = Date.now() - (timestamp.toMillis ? timestamp.toMillis() : new Date(timestamp).getTime());
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}
