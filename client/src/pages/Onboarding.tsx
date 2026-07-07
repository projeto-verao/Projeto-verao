import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Camera, Upload, User, ChevronDown, Loader2, ShieldCheck, ScanFace, Check } from "lucide-react";
import { toast } from "sonner";

/** Redimensiona uma imagem via canvas antes do upload */
function resizeImage(file: File, maxSize: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width;
        let h = img.height;
        if (w > h) {
          if (w > maxSize) { h = Math.round(h * maxSize / w); w = maxSize; }
        } else {
          if (h > maxSize) { w = Math.round(w * maxSize / h); h = maxSize; }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Erro ao criar contexto 2D"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("Erro ao carregar imagem"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
    reader.readAsDataURL(file);
  });
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { isAuthenticated, loading, updateProfile, profile } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, loading, navigate]);

  const [form, setForm] = useState({
    name: profile?.name || "",
    age: "25",
    heightCm: "175",
    weightKg: "75",
  });

  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    console.log("DEBUG: Iniciando handleSubmit...");
    
    if (!form.name || !form.age || !form.heightCm || !form.weightKg) {
      toast.error("Preencha os campos obrigatórios.");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Tentando salvar perfil...");

    try {
      // Simplificação máxima para teste: apenas dados básicos
      const testData = {
        name: form.name,
        age: parseInt(form.age),
        heightCm: parseFloat(form.heightCm),
        weightKg: parseFloat(form.weightKg),
        updatedAt: Date.now(),
        onboardingCompleted: true
      };

      console.log("DEBUG: Enviando dados simplificados:", testData);
      
      // Chamada direta ao updateProfile do AuthContext
      await updateProfile(testData);
      
      console.log("DEBUG: Sucesso no salvamento!");
      toast.success("Perfil salvo!", { id: toastId });
      
      // Forçar navegação via window.location se o navigate falhar
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1000);

    } catch (err: any) {
      console.error("DEBUG: ERRO CAPTURADO:", err);
      
      // Alerta visual para o usuário ver o erro real no celular
      const errorDetail = err.message || JSON.stringify(err);
      alert("ERRO DO FIREBASE: " + errorDetail);
      
      toast.error("Erro técnico: " + errorDetail, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="space-y-6 max-w-md mx-auto">
        <h1 className="text-2xl font-bold">Cadastro Rápido</h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome</label>
            <input className="w-full border p-3 rounded-xl" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Idade</label>
            <input className="w-full border p-3 rounded-xl" type="number" value={form.age} onChange={e => setForm({...form, age: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Altura (cm)</label>
            <input className="w-full border p-3 rounded-xl" type="number" value={form.heightCm} onChange={e => setForm({...form, heightCm: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Peso (kg)</label>
            <input className="w-full border p-3 rounded-xl" type="number" value={form.weightKg} onChange={e => setForm({...form, weightKg: e.target.value})} />
          </div>
        </div>

        <button 
          className="w-full bg-black text-white py-4 rounded-2xl font-bold disabled:opacity-50"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Salvando..." : "Finalizar Cadastro"}
        </button>

        <p className="text-[10px] text-gray-400 text-center">
          Se aparecer um erro na tela, por favor, tire um print e me envie.
        </p>
      </div>
    </div>
  );
}
