import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Camera, Upload, User, ChevronDown, Loader2, ShieldCheck, ScanFace, Check } from "lucide-react";
import { toast } from "sonner";

const GOALS = ["Hipertrofia", "Emagrecimento", "Condicionamento", "Saúde geral", "Força", "Resistência"];
const LEVELS = ["Iniciante", "Intermediário", "Avançado"] as const;
const GYM_TYPES = ["Academia completa", "Calistenia", "Em casa", "Musculação básica", "Funcional"];
const SEX_OPTIONS = ["Masculino", "Feminino", "Outro"] as const;

/** Redimensiona uma imagem via canvas antes do upload */
function resizeImage(file: File, maxSize: number, quality: number): Promise<string> {
  return new Promise((resolve) => {
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
        canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function Onboarding() {
  const [, navigate] = useLocation();
  const { isAuthenticated, loading, updateProfile, profile } = useAuth();

  // Redireciona para login se não autenticado
  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, loading, navigate]);

  // ── Refs para inputs de arquivo ───────────────────────────────────────────
  const profileFileRef    = useRef<HTMLInputElement>(null);
  const profileCameraRef  = useRef<HTMLInputElement>(null);
  const evalFileRef       = useRef<HTMLInputElement>(null);
  const evalCameraRef     = useRef<HTMLInputElement>(null);

  // ── Estado do formulário ──────────────────────────────────────────────────
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

  // ── Foto de Perfil ────────────────────────────────────────────────────────
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);

  // ── Foto de Avaliação Física ──────────────────────────────────────────────
  const [evalPhotoPreview, setEvalPhotoPreview] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  // ── Handlers de seleção de foto ───────────────────────────────────────────
  const handleProfilePhotoSelect = async (file: File) => {
    try {
      const dataUrl = await resizeImage(file, 512, 0.7);
      setProfilePhotoPreview(dataUrl);
      toast.success("Foto de perfil selecionada!");
    } catch (err) {
      console.error("Erro ao processar foto de perfil:", err);
      toast.error("Erro ao processar imagem.");
    }
  };

  const handleEvalPhotoSelect = async (file: File) => {
    try {
      const dataUrl = await resizeImage(file, 800, 0.6); // Menor qualidade para caber no Firestore se necessário
      setEvalPhotoPreview(dataUrl);
      toast.success("Foto de avaliação selecionada!");
    } catch (err) {
      console.error("Erro ao processar foto de avaliação:", err);
      toast.error("Erro ao processar imagem.");
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    console.log("Iniciando handleSubmit no Onboarding...");
    
    if (!form.name || !form.age || !form.heightCm || !form.weightKg) {
      toast.error("Preencha os campos obrigatórios: nome, idade, altura e peso.");
      return;
    }

    setIsSubmitting(true);
    try {
      console.log("Preparando objeto de salvamento...");
      
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

      console.log("Enviando para updateProfile no AuthContext...");
      await updateProfile(updateData);
      
      console.log("Salvamento concluído com sucesso!");
      toast.success("Perfil salvo com sucesso!");
      
      // Redirecionar para o dashboard
      navigate("/dashboard");
    } catch (err) {
      console.error("ERRO CRÍTICO NO SUBMIT DO ONBOARDING:", err);
      toast.error(err instanceof Error ? err.message : "Erro ao salvar perfil. Tente novamente.");
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
        } bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden cursor-pointer`}
        style={{ maxWidth: shape === "rect" ? "100%" : undefined }}
        onClick={onGallery}
      >
        {preview ? (
          <img src={preview} alt="Foto" className="w-full h-full object-cover" />
        ) : (
          <User size={shape === "circle" ? 36 : 48} className="text-gray-300" />
        )}
      </div>
      <div className="flex gap-2 w-full">
        <button className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-200 py-2.5 rounded-xl text-sm font-medium text-gray-700 shadow-sm active:bg-gray-50" onClick={onCamera}>
          <Camera size={15} /> Tirar foto
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-200 py-2.5 rounded-xl text-sm font-medium text-gray-700 shadow-sm active:bg-gray-50" onClick={onGallery}>
          <Upload size={15} /> Galeria
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white pb-8">
      <div className="px-5 pt-10 pb-6">
        <h1 className="text-2xl font-bold text-gray-900">Vamos te conhecer</h1>
        <p className="text-gray-500 text-sm mt-1">Preencha seu perfil para a IA criar seu treino ideal</p>
      </div>

      <div className="px-5 space-y-5">
        <div className="bg-gray-50/50 p-5 rounded-3xl space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-black rounded-xl flex items-center justify-center shadow-sm">
              <User size={16} color="white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Foto de Perfil</h2>
              <p className="text-[11px] text-gray-500">Opcional</p>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-2xl border border-gray-100">
            <PhotoButtons
              preview={profilePhotoPreview}
              onCamera={() => profileCameraRef.current?.click()}
              onGallery={() => profileFileRef.current?.click()}
              shape="circle"
            />
          </div>
        </div>

        <input ref={profileFileRef}   type="file" accept="image/*"                className="hidden" onChange={e => e.target.files?.[0] && handleProfilePhotoSelect(e.target.files[0])} />
        <input ref={profileCameraRef} type="file" accept="image/*" capture="user" className="hidden" onChange={e => e.target.files?.[0] && handleProfilePhotoSelect(e.target.files[0])} />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome *</label>
          <input className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black/5 transition-all" placeholder="Seu nome" value={form.name} onChange={e => set("name", e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Idade *</label>
            <input className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black/5 transition-all" type="number" placeholder="25" value={form.age} onChange={e => set("age", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Sexo</label>
            <div className="relative">
              <select className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-gray-900 appearance-none focus:outline-none focus:ring-2 focus:ring-black/5 transition-all" value={form.sex} onChange={e => set("sex", e.target.value as typeof SEX_OPTIONS[number])}>
                {SEX_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Altura (cm) *</label>
            <input className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black/5 transition-all" type="number" placeholder="175" value={form.heightCm} onChange={e => set("heightCm", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Peso atual (kg) *</label>
            <input className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black/5 transition-all" type="number" placeholder="75" value={form.weightKg} onChange={e => set("weightKg", e.target.value)} />
          </div>
        </div>

        <div className="bg-orange-50/50 p-5 rounded-3xl space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-orange-500 rounded-xl flex items-center justify-center shadow-sm">
              <ScanFace size={16} color="white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Foto para Avaliação</h2>
              <p className="text-[11px] text-orange-600 font-medium">Recomendado para IA</p>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-2xl border border-orange-100">
            <PhotoButtons
              preview={evalPhotoPreview}
              onCamera={() => evalCameraRef.current?.click()}
              onGallery={() => evalFileRef.current?.click()}
              shape="rect"
            />
          </div>
        </div>

        <input ref={evalFileRef}   type="file" accept="image/*"                className="hidden" onChange={e => e.target.files?.[0] && handleEvalPhotoSelect(e.target.files[0])} />
        <input ref={evalCameraRef} type="file" accept="image/*" capture="user" className="hidden" onChange={e => e.target.files?.[0] && handleEvalPhotoSelect(e.target.files[0])} />

        <button 
          className="w-full bg-black text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-black/10 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <><Loader2 className="animate-spin" size={20} /> Salvando...</>
          ) : (
            <><Check size={20} /> Finalizar Cadastro</>
          )}
        </button>
      </div>
    </div>
  );
}
