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
          console.log("Usuário autenticado no Firebase:", authUser.uid);
          const userDocRef = doc(db, "users", authUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists()) {
            setProfile(userDocSnap.data() as UserProfile);
          } else {
            console.log("Criando perfil inicial no Firestore...");
            const initialProfile = {
              uid: authUser.uid,
              email: authUser.email || "",
              name: authUser.displayName || "",
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };
            // Tenta criar o documento. Se falhar aqui, é erro de permissão no Firebase Console.
            await setDoc(userDocRef, initialProfile, { merge: true });
            setProfile(initialProfile as any);
          }
        } else {
          setProfile(null);
        }
        setError(null);
      } catch (err) {
        console.error("Erro ao carregar/criar perfil no Firestore:", err);
        // Não bloqueia o loading se for erro de permissão, para permitir que o usuário veja a tela
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const register = async (email: string, password: string, name: string) => {
    try {
      setLoading(true);
      console.log("[register] Iniciando com email:", email);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      console.log("[register] Usuario criado com uid:", result.user.uid);
      await updateFirebaseProfile(result.user, { displayName: name });
      console.log("[register] Perfil atualizado");
      
      const newProfile = {
        uid: result.user.uid,
        email,
        name,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      console.log("[register] Salvando no Firestore...");
      await setDoc(doc(db, "users", result.user.uid), newProfile, { merge: true });
      console.log("[register] Firestore salvo");
      setProfile(newProfile as any);
      console.log("[register] Perfil setado");
      
      // Criar sessao de backend
      const idToken = await result.user.getIdToken();
      console.log("[useFirebaseAuth] Chamando /api/auth/firebase com uid:", result.user.uid);
      const authResponse = await fetch("/api/auth/firebase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          idToken,
          uid: result.user.uid,
          email: result.user.email,
          name: result.user.displayName,
        }),
      });
      console.log("[useFirebaseAuth] Response status:", authResponse.status);
      if (!authResponse.ok) {
        const errorData = await authResponse.json();
        console.error("[useFirebaseAuth] Erro na autenticação:", errorData);
      } else {
        const data = await authResponse.json();
        console.log("[useFirebaseAuth] Autenticação bem-sucedida:", data);
        console.log("[useFirebaseAuth] data.token existe?", !!data.token);
        if (data.token) {
          localStorage.setItem("auth_token", data.token);
          console.log("[useFirebaseAuth] Token armazenado no localStorage");
          console.log("[useFirebaseAuth] Token verificado:", localStorage.getItem("auth_token")?.substring(0, 20));
        } else {
          console.error("[useFirebaseAuth] data.token não existe! Chaves:", Object.keys(data));
        }
      }
      
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
      
      // Criar sessao de backend
      const idToken = await result.user.getIdToken();
      console.log("[useFirebaseAuth] Chamando /api/auth/firebase com uid:", result.user.uid);
      const authResponse = await fetch("/api/auth/firebase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          idToken,
          uid: result.user.uid,
          email: result.user.email,
          name: result.user.displayName,
        }),
      });
      console.log("[useFirebaseAuth] Response status:", authResponse.status);
      if (!authResponse.ok) {
        const errorData = await authResponse.json();
        console.error("[useFirebaseAuth] Erro na autenticação:", errorData);
      } else {
        const data = await authResponse.json();
        console.log("[useFirebaseAuth] Autenticação bem-sucedida:", data);
        console.log("[useFirebaseAuth] data.token existe?", !!data.token);
        if (data.token) {
          localStorage.setItem("auth_token", data.token);
          console.log("[useFirebaseAuth] Token armazenado no localStorage");
          console.log("[useFirebaseAuth] Token verificado:", localStorage.getItem("auth_token")?.substring(0, 20));
        } else {
          console.error("[useFirebaseAuth] data.token não existe! Chaves:", Object.keys(data));
        }
      }
      
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
      console.log("Atualizando perfil no Firestore para UID:", auth.currentUser.uid);
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      
      // Remove campos nulos ou indefinidos para evitar erros no Firestore
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, v]) => v !== undefined)
      );

      const finalData = {
        ...cleanUpdates,
        updatedAt: serverTimestamp(),
      };

      await setDoc(userDocRef, finalData, { merge: true });
      console.log("Firestore Update Success!");
      
      setProfile((prev) => (prev ? { ...prev, ...finalData } : (finalData as any)));
    } catch (err: any) {
      console.error("ERRO CRÍTICO NO UPDATEPROFILE:", err);
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
    case "auth/weak-password": return "Senha muito fraca.";
    case "auth/user-not-found": return "Usuário não encontrado.";
    case "auth/wrong-password": return "Senha incorreta.";
    default: return err.message || "Erro ao processar solicitação.";
  }
}
