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
  createdAt: number;
  updatedAt: number;
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
          // Buscar perfil do usuário no Firestore
          const userDocRef = doc(db, "users", authUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            setProfile(userDocSnap.data() as UserProfile);
          } else {
            // Criar perfil inicial se não existir
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
        console.error("Erro ao buscar perfil do usuário:", err);
        setError(err instanceof Error ? err.message : "Erro desconhecido");
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
      // Atualizar displayName no Firebase Auth
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
      const userDocRef = doc(db, "users", user.uid);
      const updatedData = {
        ...updates,
        updatedAt: Date.now(),
      };
      await setDoc(userDocRef, updatedData, { merge: true });
      setProfile((prev) => (prev ? { ...prev, ...updatedData } : null));
    } catch (err) {
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
  if (!(err instanceof Error)) return "Erro desconhecido";
  const code = (err as { code?: string }).code;
  switch (code) {
    case "auth/email-already-in-use":
      return "Este e-mail já está em uso. Tente fazer login.";
    case "auth/invalid-email":
      return "E-mail inválido. Verifique e tente novamente.";
    case "auth/weak-password":
      return "Senha muito fraca. Use pelo menos 6 caracteres.";
    case "auth/user-not-found":
      return "Usuário não encontrado. Verifique o e-mail.";
    case "auth/wrong-password":
      return "Senha incorreta. Tente novamente.";
    case "auth/invalid-credential":
      return "E-mail ou senha incorretos. Tente novamente.";
    case "auth/too-many-requests":
      return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
    case "auth/network-request-failed":
      return "Erro de conexão. Verifique sua internet.";
    case "auth/user-disabled":
      return "Esta conta foi desativada. Entre em contato com o suporte.";
    default:
      return err.message || "Erro de autenticação. Tente novamente.";
  }
}
