import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Camera, Upload, User, ChevronDown, Loader2, ShieldCheck, ScanFace, Check } from "lucide-react";
import { toast } from "sonner";

const GOALS = ["Hipertrofia", "Emagrecimento", "Condicionamento", "Saúde geral", "Força", "Resistência"];
const LEVELS = ["Iniciante", "Intermediário", "Avançado"] as const;
const GYM_TYPES = ["Academia completa", "Calistenia", "Em casa", "Musculação básica", "Funcional"];
const SEX_OPTIONS = ["Masculino", "Feminino", "Outro"] as const;

/** Redimensiona uma imagem via canvas antes do upload para garantir que caiba no Firestore (limite 1MB) */
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
  const [, navigate] = useLocation();
  const { isAuthenticated, loading, updateProfile, profile } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, loading, navigate]);

  const profileFileRef    = useRef<HTMLInputElement>(null);
  const profileCameraRef  = useRef<HTMLInputElement>(null);
  const evalFileRef       = useRef<HTMLInputElement>(null);
  const evalCameraRef     = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: profile?.name || "",
    age: "",
    sex: "Masculino" as typeof SEX_OPTIONS[number],
    heightCm: "",
    weightKg: "",
    targetWeightKg: "",
    goal: "Hipertrofia",
    experienceLevel: "Iniciante" as typeof LEVELS[number],
    daysPerWeek: "4",
    minutesPerSession: "60",
    gymType: "Academia completa",
    physicalRestrictions: "",
    preferredExercises: "",
    avoidedExercises: "",
  });

  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const [evalPhotoPreview, setEvalPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  const handlePhotoSelect = async (file: File, type: "profile" | "eval") => {
    try {
      toast.loading("Processando imagem...", { id: "photo-process" });
      // Redimensionamento agressivo para garantir que o documento Firestore não exceda 1MB
      // Perfil: 200px, Avaliação: 600px
      const maxSize = type === "profile" ? 200 : 600;
      const dataUrl = await resizeImage(file, maxSize, 0.6);
      
      if (type === "profile") setProfilePhotoPreview(dataUrl);
      else setEvalPhotoPreview(dataUrl);
      
      toast.success("Imagem carregada!", { id: "photo-process" });
    } catch (err) {
      console.error("Erro ao processar imagem:", err);
      toast.error("Erro ao carregar imagem.", { id: "photo-process" });
    }
  };

  const handleSubmit = async () => {
    if (!form.name || !form.age || !form.heightCm || !form.weightKg) {
      toast.error("Por favor, preencha os campos obrigatórios (*)");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Salvando seu perfil...");

    try {
      console.log("Iniciando salvamento do perfil...");
      
      const updateData = {
        name: form.name,
        age: parseInt(form.age),
        sex: form.sex,
        heightCm: parseFloat(form.heightCm),
        weightKg: parseFloat(form.weightKg),
        targetWeightKg: form.targetWeightKg ? parseFloat(form.targetWeightKg) : undefined,
        goal: form.goal,
        experienceLevel: form.experienceLevel,
        daysPerWeek: parseInt(form.daysPerWeek),
        minutesPerSession: parseInt(form.minutesPerSession),
        gymType: form.gymType,
        physicalRestrictions: form.physicalRestrictions || undefined,
        preferredExercises: form.preferredExercises || undefined,
        avoidedExercises: form.avoidedExercises || undefined,
        photoUrl: profilePhotoPreview || undefined,
        evalPhotoUrl: evalPhotoPreview || undefined,
      };

      // Tentar salvar no Firebase
      await updateProfile(updateData);
      
      console.log("Perfil salvo com sucesso no Firestore!");
      toast.success("Perfil configurado!", { id: toastId });
      
      // Pequeno delay para garantir que o estado do AuthContext seja atualizado
      setTimeout(() => {
        navigate("/dashboard");
      }, 500);

    } catch (err: any) {
      console.error("ERRO NO ONBOARDING:", err);
      let errorMsg = "Erro ao salvar. Tente novamente.";
      
      if (err.message?.includes("permission-denied")) {
        errorMsg = "Erro de permissão no Firebase. Verifique as regras de segurança.";
      } else if (err.message?.includes("too large")) {
        errorMsg = "A foto é muito grande para o banco de dados. Tente uma menor.";
      }

      toast.error(errorMsg, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const PhotoButtons = ({
    preview,
    onCamera,
    onGallery,
    shape = "circle",
  }: {
    preview: string | null;
    onCamera: () => void;
    onGallery: () => void;
    shape?: "circle" | "rect";
  }) => (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`${
          shape === "circle"
            ? "w-24 h-24 rounded-full"
            : "w-full h-44 rounded-2xl"
        } bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden cursor-pointer shadow-inner`}
        onClick={onGallery}
      >
        {preview ? (
          <img src={preview} alt="Foto" className="w-full h-full object-cover" />
        ) : (
          <User size={shape === "circle" ? 36 : 48} className="text-gray-300" />
        )}
      </div>
      <div className="flex gap-2 w-full">
        <button className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-200 py-2.5 rounded-xl text-xs font-bold text-gray-700 shadow-sm active:bg-gray-50" onClick={onCamera}>
          <Camera size={14} /> Tirar foto
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-200 py-2.5 rounded-xl text-xs font-bold text-gray-700 shadow-sm active:bg-gray-50" onClick={onGallery}>
          <Upload size={14} /> Galeria
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white pb-10">
      <div className="px-5 pt-10 pb-6">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Vamos te conhecer</h1>
        <p className="text-gray-500 text-sm mt-1">Configure seu perfil para começar os treinos</p>
      </div>

      <div className="px-5 space-y-6">
        {/* Foto de Perfil */}
        <div className="bg-gray-50/50 p-5 rounded-3xl border border-gray-100/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-black rounded-xl flex items-center justify-center">
              <User size={18} color="white" />
            </div>
            <h2 className="text-base font-bold text-gray-900">Foto de Perfil</h2>
          </div>
          <PhotoButtons
            preview={profilePhotoPreview}
            onCamera={() => profileCameraRef.current?.click()}
            onGallery={() => profileFileRef.current?.click()}
            shape="circle"
          />
        </div>

        <input ref={profileFileRef}   type="file" accept="image/*"                className="hidden" onChange={e => e.target.files?.[0] && handlePhotoSelect(e.target.files[0], "profile")} />
        <input ref={profileCameraRef} type="file" accept="image/*" capture="user" className="hidden" onChange={e => e.target.files?.[0] && handlePhotoSelect(e.target.files[0], "profile")} />

        {/* Dados Pessoais */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Nome Completo *</label>
            <input className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-gray-900 font-medium focus:ring-2 focus:ring-black/5 transition-all" placeholder="Seu nome" value={form.name} onChange={e => set("name", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Idade *</label>
              <input className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-gray-900 font-medium" type="number" placeholder="25" value={form.age} onChange={e => set("age", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Sexo</label>
              <div className="relative">
                <select className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-gray-900 font-medium appearance-none" value={form.sex} onChange={e => set("sex", e.target.value as any)}>
                  {SEX_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Altura (cm) *</label>
              <input className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-gray-900 font-medium" type="number" placeholder="175" value={form.heightCm} onChange={e => set("heightCm", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Peso Atual (kg) *</label>
              <input className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-gray-900 font-medium" type="number" placeholder="75" value={form.weightKg} onChange={e => set("weightKg", e.target.value)} />
            </div>
          </div>
        </div>

        {/* Avaliação Física */}
        <div className="bg-orange-50/50 p-5 rounded-3xl border border-orange-100/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center shadow-sm">
              <ScanFace size={18} color="white" />
            </div>
            <h2 className="text-base font-bold text-gray-900">Avaliação Física</h2>
          </div>
          <p className="text-[11px] text-orange-600 font-medium mb-4 ml-1">Envie uma foto de corpo inteiro para análise da IA</p>
          
          <PhotoButtons
            preview={evalPhotoPreview}
            onCamera={() => evalCameraRef.current?.click()}
            onGallery={() => evalFileRef.current?.click()}
            shape="rect"
          />
        </div>

        <input ref={evalFileRef}   type="file" accept="image/*"                className="hidden" onChange={e => e.target.files?.[0] && handlePhotoSelect(e.target.files[0], "eval")} />
        <input ref={evalCameraRef} type="file" accept="image/*" capture="user" className="hidden" onChange={e => e.target.files?.[0] && handlePhotoSelect(e.target.files[0], "eval")} />

        <button 
          className="w-full bg-black text-white py-5 rounded-2xl font-black text-base shadow-xl shadow-black/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <><Loader2 className="animate-spin" size={22} /> Processando...</>
          ) : (
            <><Check size={22} /> Finalizar Cadastro</>
          )}
        </button>
      </div>
    </div>
  );
}
