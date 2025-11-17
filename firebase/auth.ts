// firebase/auth.ts
import { auth } from "./firebaseConfig";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User,
  UserCredential,
} from "firebase/auth";

const googleProvider = new GoogleAuthProvider();

/**
 * Inline-field error shape
 */
export interface AuthFieldError {
  field: "email" | "password" | "general";
  message: string;
}

/* -------------------------
   Basic client-side validators
   ------------------------- */
function validateEmail(email: string) {
  if (!email || email.trim() === "") {
    return { field: "email", message: "Email is required." } as AuthFieldError;
  }
  // simple email regex (not perfect, good for inline validation)
  const re = /\S+@\S+\.\S+/;
  if (!re.test(email)) {
    return { field: "email", message: "Enter a valid email address." } as AuthFieldError;
  }
  return null;
}

function validatePassword(password: string) {
  if (!password || password.trim() === "") {
    return { field: "password", message: "Password is required." } as AuthFieldError;
  }
  if (password.length < 6) {
    return { field: "password", message: "Password must be at least 6 characters." } as AuthFieldError;
  }
  return null;
}

/* -------------------------
   Map Firebase error codes to field-level messages
   ------------------------- */
function mapFirebaseAuthError(err: any): AuthFieldError {
  const code = err?.code || err?.message || "";

  switch (code) {
    case "auth/user-not-found":
      return { field: "email", message: "No account found with this email." };
    case "auth/wrong-password":
      return { field: "password", message: "Incorrect password. Try again." };
    case "auth/email-already-in-use":
      return { field: "email", message: "This email is already registered." };
    case "auth/weak-password":
      return { field: "password", message: "Password is too weak (min 6 characters)." };
    case "auth/invalid-email":
      return { field: "email", message: "Enter a valid email address." };
    case "auth/popup-closed-by-user":
      return { field: "general", message: "Sign-in was canceled. Try again." };
    case "auth/too-many-requests":
      return { field: "general", message: "Too many attempts. Try again later." };
    default:
      // fallback
      return { field: "general", message: "Something went wrong. Please try again." };
  }
}

/* -------------------------
   Low-level raw wrappers (unchanged)
   ------------------------- */
export function signUpWithEmailRaw(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export function signInWithEmailRaw(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function signInWithGoogleRaw() {
  return signInWithPopup(auth, googleProvider);
}

export function logoutRaw() {
  return signOut(auth);
}

export function onAuthState(cb: (user: User | null) => void) {
  return firebaseOnAuthStateChanged(auth, (user) => cb(user));
}

/* -------------------------
   Safe wrappers with validation + mapped errors
   Each throws AuthFieldError on validation / server error.
   ------------------------- */

/**
 * Sign up with validation and mapped errors.
 * Throws AuthFieldError on validation or server-side failure.
 */
export async function signUpWithEmail(
  email: string,
  password: string
): Promise<UserCredential> {
  // client-side validation
  const vEmail = validateEmail(email);
  if (vEmail) throw vEmail;

  const vPass = validatePassword(password);
  if (vPass) throw vPass;

  try {
    const res = await signUpWithEmailRaw(email, password);
    return res;
  } catch (err: any) {
    throw mapFirebaseAuthError(err);
  }
}

/**
 * Sign in with validation and mapped errors.
 * Throws AuthFieldError on validation or server-side failure.
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<UserCredential> {
  // client-side validation
  const vEmail = validateEmail(email);
  if (vEmail) throw vEmail;

  const vPass = validatePassword(password);
  if (vPass) throw vPass;

  try {
    const res = await signInWithEmailRaw(email, password);
    return res;
  } catch (err: any) {
    throw mapFirebaseAuthError(err);
  }
}

/**
 * Sign in with Google (popup).
 * Throws AuthFieldError on failure (field = general).
 */
export async function signInWithGoogle(): Promise<UserCredential> {
  try {
    const res = await signInWithGoogleRaw();
    return res;
  } catch (err: any) {
    throw mapFirebaseAuthError(err);
  }
}

/**
 * Sign out wrapper
 */
export async function logout() {
  return logoutRaw();
}
