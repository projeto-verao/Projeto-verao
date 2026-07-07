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
import { doc, getDoc, setDoc } from "firebase/firestore";

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
  createdAt: number;
  updatedAt: number;
  daysPerWeek?: number;
  minutesPerSession?: number;
  gymType?: string;
  physicalRestrictions?: string;
  preferredExercises?: string;
  avoidedExercises?: string;
}

export function useFirebaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      try {
        setUser(authUser);
        if (authUser) {
          const userDocRef = doc(db, "users", authUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            setProfile(userDocSnap.data() as UserProfile);
          } else {
            const initialProfile: UserProfile = {
              uid: authUser.uid,
              email: authUser.email || "",
              name: authUser.displayName || "",
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
            await setDoc(userDocRef, initialProfile);
            setProfile(initialProfile);
          }
        } else {
          setProfile(null);
        }
        setError(null);
      } catch (err) {
        console.error("Erro ao buscar perfil:", err);
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
      const newProfile: UserProfile = {
        uid: result.user.uid,
        email,
        name,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await setDoc(doc(db, "users", result.user.uid), newProfile);
      setProfile(newProfile);
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
      await signOut(auth);
      setUser(null);
      setProfile(null);
      setError(null);
    } catch (err) {
      const errorMsg = translateFirebaseError(err);
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      const errorMsg = translateFirebaseError(err);
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) throw new Error("Usuário não autenticado");
    try {
      console.log("Iniciando salvamento no Firestore para UID:", user.uid);
      const userDocRef = doc(db, "users", user.uid);
      const updatedData = {
        ...updates,
        updatedAt: Date.now(),
      };
      
      // Tentar setDoc com merge para garantir que o documento exista ou seja atualizado
      await setDoc(userDocRef, updatedData, { merge: true });
      console.log("Salvamento no Firestore concluído com sucesso!");
      
      setProfile((prev) => (prev ? { ...prev, ...updatedData } : (updatedData as UserProfile)));
    } catch (err) {
      console.error("ERRO CRÍTICO NO FIRESTORE:", err);
      const errorMsg = translateFirebaseError(err);
      setError(errorMsg);
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
  console.error("Firebase Error Object:", err);
  if (!(err instanceof Error)) return "Erro desconhecido";
  
  // Capturar erro de permissão do Firestore
  if (err.message?.includes("permission-denied") || (err as any).code === "permission-denied") {
    return "Erro de permissão no banco de dados. Contate o suporte.";
  }

  const code = (err as { code?: string }).code;
  switch (code) {
    case "auth/email-already-in-use": return "Este e-mail já está em uso.";
    case "auth/invalid-email": return "E-mail inválido.";
    case "auth/weak-password": return "Senha muito fraca.";
    case "auth/user-not-found": return "Usuário não encontrado.";
    case "auth/wrong-password": return "Senha incorreta.";
    case "auth/invalid-credential": return "Credenciais inválidas.";
    default: return err.message || "Erro inesperado. Tente novamente.";
  }
}
