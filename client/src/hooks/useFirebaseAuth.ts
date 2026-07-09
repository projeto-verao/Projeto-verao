import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  onAuthStateChanged,
  signOut,
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile as updateFirebaseProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  age?: number;
  sex?: string;
  heightCm?: number;
  weightKg?: number;
  targetWeightKg?: number;
  goal?: string;
  experienceLevel?: string;
  photoUrl?: string;
  evalPhotoUrl?: string;
  onboardingCompleted?: boolean;
  createdAt: any;
  updatedAt: any;
  daysPerWeek?: number;
  minutesPerSession?: number;
  gymType?: string;
  physicalRestrictions?: string;
  preferredExercises?: string;
  avoidedExercises?: string;
  /** Indica se o usuário completou o fluxo de onboarding */
  onboardingCompleted?: boolean;
}

/**
 * Sincronização opcional com backend próprio (apenas quando existir).
 * No Firebase Hosting não há backend; esta chamada falha silenciosamente
 * e não bloqueia o fluxo de autenticação.
 */
async function tryBackendSession(firebaseUser: User): Promise<void> {
  try {
    const idToken = await firebaseUser.getIdToken();
    const res = await fetch("/api/auth/firebase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        idToken,
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.token) {
        localStorage.setItem("auth_token", data.token);
      }
    }
  } catch {
    // Backend indisponível (ex.: Firebase Hosting estático) — ignorar.
    console.info("[auth] Backend opcional indisponível; usando apenas Firebase.");
  }
}

export function useFirebaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      try {
        setLoading(true);
        setUser(authUser);
        if (authUser) {
          const userDocRef = doc(db, "users", authUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            setProfile(userDocSnap.data() as UserProfile);
          } else {
            const initialProfile = {
              uid: authUser.uid,
              email: authUser.email || "",
              name: authUser.displayName || "",
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };
            await setDoc(userDocRef, initialProfile, { merge: true });
            setProfile(initialProfile as any);
          }
        } else {
          setProfile(null);
        }
        setError(null);
      } catch (err) {
        console.error("Erro ao carregar/criar perfil no Firestore:", err);
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const register = async (email: string, password: string, name: string) => {
    try {
      setLoading(true);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateFirebaseProfile(result.user, { displayName: name });

      const newProfile = {
        uid: result.user.uid,
        email,
        name,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, "users", result.user.uid), newProfile, { merge: true });
      setProfile(newProfile as any);

      // Sessão de backend é opcional — não bloqueia o cadastro
      void tryBackendSession(result.user);

      return result.user;
    } catch (err) {
      const errorMsg = translateFirebaseError(err);
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const result = await signInWithEmailAndPassword(auth, email, password);

      // Sessão de backend é opcional — não bloqueia o login
      void tryBackendSession(result.user);

      return result.user;
    } catch (err) {
      const errorMsg = translateFirebaseError(err);
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      localStorage.removeItem("auth_token");
      await signOut(auth);
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!auth.currentUser) throw new Error("Usuário não autenticado no Firebase");

    try {
      const userDocRef = doc(db, "users", auth.currentUser.uid);

      // Remove campos indefinidos para evitar erros no Firestore
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, v]) => v !== undefined)
      );

      const finalData = {
        ...cleanUpdates,
        updatedAt: serverTimestamp(),
      };

      await setDoc(userDocRef, finalData, { merge: true });

      setProfile((prev) => (prev ? { ...prev, ...finalData } : (finalData as any)));
    } catch (err: any) {
      console.error("Erro no updateProfile:", err);
      const errorMsg = translateFirebaseError(err);
      throw new Error(errorMsg);
    }
  };

  return {
    user,
    profile,
    loading,
    error,
    register,
    login,
    logout,
    resetPassword,
    updateProfile,
    isAuthenticated: !!user,
  };
}

function translateFirebaseError(err: unknown): string {
  if (!(err instanceof Error)) return "Erro desconhecido";

  const msg = err.message.toLowerCase();
  const code = (err as any).code;

  if (code === "permission-denied" || msg.includes("permission")) {
    return "Acesso negado ao banco de dados. Por favor, verifique se as Regras do Firestore foram publicadas no Firebase Console.";
  }

  if (msg.includes("too large") || msg.includes("limit")) {
    return "Os dados (ou fotos) são muito grandes para o banco de dados.";
  }

  switch (code) {
    case "auth/email-already-in-use": return "Este e-mail já está em uso.";
    case "auth/invalid-email": return "E-mail inválido.";
    case "auth/weak-password": return "Senha muito fraca. Use pelo menos 6 caracteres.";
    case "auth/user-not-found": return "Usuário não encontrado.";
    case "auth/wrong-password": return "Senha incorreta.";
    case "auth/invalid-credential": return "E-mail ou senha incorretos.";
    case "auth/too-many-requests": return "Muitas tentativas. Aguarde alguns minutos.";
    case "auth/network-request-failed": return "Falha de conexão. Verifique sua internet.";
    default: return err.message || "Erro ao processar solicitação.";
  }
}
