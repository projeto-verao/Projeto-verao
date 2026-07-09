/**
 * useAuth — wrapper de compatibilidade que delega ao AuthContext (Firebase).
 *
 * Este hook existe para manter compatibilidade com código legado que importava
 * diretamente de "@/_core/hooks/useAuth". Internamente ele usa o AuthContext
 * baseado em Firebase Auth, sem qualquer dependência da plataforma Manus/Base44.
 */
export { useAuth } from "@/contexts/AuthContext";
