import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Sparkles, Camera, Upload, User, ChevronDown, Loader2, ShieldCheck, ScanFace } from "lucide-react";
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
        resolve(canvas.toDataURL("image/jpeg", quality).split(",")[1]);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function Onboarding() {
  const [, navigate] = useLocation();

  // ── Refs para inputs de arquivo ───────────────────────────────────────────
  const profileFileRef    = useRef<HTMLInputElement>(null);
  const profileCameraRef  = useRef<HTMLInputElement>(null);
  const evalFileRef       = useRef<HTMLInputElement>(null);
  const evalCameraRef     = useRef<HTMLInputElement>(null);

  // ── Estado do formulário ──────────────────────────────────────────────────
  const [form, setForm] = useState({
    name: "",
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
  const [profilePhotoBase64, setProfilePhotoBase64]   = useState<string | null>(null);

  // ── Foto de Avaliação Física ──────────────────────────────────────────────
  const [evalPhotoPreview, setEvalPhotoPreview] = useState<string | null>(null);
  const [evalPhotoBase64, setEvalPhotoBase64]   = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);

  const saveProfile    = trpc.profile.save.useMutation();
  const uploadPhoto    = trpc.profile.uploadPhoto.useMutation();
  const generateWorkout = trpc.workout.generateWithPhoto.useMutation();

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  // ── Handlers de seleção de foto ───────────────────────────────────────────
  const handleProfilePhotoSelect = async (file: File) => {
    const base64 = await resizeImage(file, 512, 0.85);
    setProfilePhotoPreview(`data:image/jpeg;base64,${base64}`);
    setProfilePhotoBase64(base64);
  };

  const handleEvalPhotoSelect = async (file: File) => {
    const base64 = await resizeImage(file, 1024, 0.85);
    setEvalPhotoPreview(`data:image/jpeg;base64,${base64}`);
    setEvalPhotoBase64(base64);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.name || !form.age || !form.heightCm || !form.weightKg) {
      toast.error("Preencha os campos obrigatórios: nome, idade, altura e peso.");
      return;
    }

    setIsGenerating(true);
    try {
      // 1. Upload da foto de perfil (opcional)
      let photoUrl: string | undefined;
      let photoKey: string | undefined;
      if (profilePhotoBase64) {
        const uploaded = await uploadPhoto.mutateAsync({ base64: profilePhotoBase64 });
        photoUrl = uploaded.url;
        photoKey = uploaded.key;
      }

      // 2. Upload da foto de avaliação (opcional)
      let evalPhotoUrl: string | undefined;
      if (evalPhotoBase64) {
        const uploadedEval = await uploadPhoto.mutateAsync({ base64: evalPhotoBase64 });
        evalPhotoUrl = uploadedEval.url;
      }

      // 3. Salvar perfil
      await saveProfile.mutateAsync({
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
        photoUrl,
        photoKey,
      });

      // 4. Ir para tela de processamento passando a foto de avaliação
      navigate(`/processing${evalPhotoUrl ? `?evalPhoto=${encodeURIComponent(evalPhotoUrl)}` : ""}`);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar perfil. Tente novamente.");
      setIsGenerating(false);
    }
  };

  // ── Componente de botões de foto ──────────────────────────────────────────
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
        <button className="btn-secondary py-2.5 px-4 text-sm" onClick={onCamera}>
          <Camera size={15} /> Tirar foto
        </button>
        <button className="btn-secondary py-2.5 px-4 text-sm" onClick={onGallery}>
          <Upload size={15} /> Escolher da galeria
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white pb-8">
      {/* Header */}
      <div className="px-5 pt-10 pb-6">
        <h1 className="text-2xl font-bold text-gray-900">Vamos te conhecer</h1>
        <p className="text-gray-500 text-sm mt-1">Preencha seu perfil para a IA criar seu treino ideal</p>
      </div>

      <div className="px-5 space-y-5">

        {/* ── SEÇÃO: FOTO DE PERFIL ─────────────────────────────────────────── */}
        <div className="app-card space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 bg-black rounded-lg flex items-center justify-center">
              <User size={14} color="white" />
            </div>
            <h2 className="text-base font-bold text-gray-900">Foto de Perfil</h2>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            Esta foto será utilizada apenas como sua imagem de perfil dentro do aplicativo.
            <span className="font-medium text-gray-600"> Essa foto não será utilizada para análise da IA.</span>
          </p>
          <PhotoButtons
            preview={profilePhotoPreview}
            onCamera={() => profileCameraRef.current?.click()}
            onGallery={() => profileFileRef.current?.click()}
            shape="circle"
          />
          <div className="flex items-center gap-1.5 mt-1">
            <ShieldCheck size={13} className="text-green-500 flex-shrink-0" />
            <p className="text-[11px] text-gray-400">Uso exclusivo como foto de identificação</p>
          </div>
        </div>

        {/* Inputs ocultos — foto de perfil */}
        <input ref={profileFileRef}   type="file" accept="image/*"                className="hidden" onChange={e => e.target.files?.[0] && handleProfilePhotoSelect(e.target.files[0])} />
        <input ref={profileCameraRef} type="file" accept="image/*" capture="user" className="hidden" onChange={e => e.target.files?.[0] && handleProfilePhotoSelect(e.target.files[0])} />

        {/* ── CAMPOS DO FORMULÁRIO ──────────────────────────────────────────── */}

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome *</label>
          <input className="app-input" placeholder="Seu nome" value={form.name} onChange={e => set("name", e.target.value)} />
        </div>

        {/* Age + Sex */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Idade *</label>
            <input className="app-input" type="number" placeholder="25" value={form.age} onChange={e => set("age", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Sexo</label>
            <div className="relative">
              <select className="app-input appearance-none pr-8" value={form.sex} onChange={e => set("sex", e.target.value)}>
                {SEX_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Height + Weight */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Altura (cm) *</label>
            <input className="app-input" type="number" placeholder="175" value={form.heightCm} onChange={e => set("heightCm", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Peso atual (kg) *</label>
            <input className="app-input" type="number" placeholder="75" value={form.weightKg} onChange={e => set("weightKg", e.target.value)} />
          </div>
        </div>

        {/* Target weight */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Peso desejado (kg)</label>
          <input className="app-input" type="number" placeholder="70 (opcional)" value={form.targetWeightKg} onChange={e => set("targetWeightKg", e.target.value)} />
        </div>

        {/* Goal */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Objetivo principal</label>
          <div className="relative">
            <select className="app-input appearance-none pr-8" value={form.goal} onChange={e => set("goal", e.target.value)}>
              {GOALS.map(g => <option key={g}>{g}</option>)}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Level */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Nível de experiência</label>
          <div className="relative">
            <select className="app-input appearance-none pr-8" value={form.experienceLevel} onChange={e => set("experienceLevel", e.target.value as typeof LEVELS[number])}>
              {LEVELS.map(l => <option key={l}>{l}</option>)}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Days + Minutes */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Dias/semana</label>
            <input className="app-input" type="number" min="1" max="7" value={form.daysPerWeek} onChange={e => set("daysPerWeek", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tempo/treino (min)</label>
            <input className="app-input" type="number" min="20" max="180" value={form.minutesPerSession} onChange={e => set("minutesPerSession", e.target.value)} />
          </div>
        </div>

        {/* Gym type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo de academia</label>
          <div className="relative">
            <select className="app-input appearance-none pr-8" value={form.gymType} onChange={e => set("gymType", e.target.value)}>
              {GYM_TYPES.map(g => <option key={g}>{g}</option>)}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Restrictions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Restrições físicas, dores ou lesões</label>
          <textarea
            className="app-input resize-none"
            rows={3}
            placeholder="Ex: dor no joelho, hérnia de disco... (opcional)"
            value={form.physicalRestrictions}
            onChange={e => set("physicalRestrictions", e.target.value)}
          />
        </div>

        {/* Preferred exercises */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Exercícios que gosta (opcional)</label>
          <textarea
            className="app-input resize-none"
            rows={2}
            placeholder="Ex: agachamento, supino..."
            value={form.preferredExercises}
            onChange={e => set("preferredExercises", e.target.value)}
          />
        </div>

        {/* Avoided exercises */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Exercícios que prefere evitar (opcional)</label>
          <textarea
            className="app-input resize-none"
            rows={2}
            placeholder="Ex: leg press, rosca direta..."
            value={form.avoidedExercises}
            onChange={e => set("avoidedExercises", e.target.value)}
          />
        </div>

        {/* ── SEÇÃO: FOTO PARA AVALIAÇÃO FÍSICA ────────────────────────────── */}
        <div className="app-card space-y-3 border-2" style={{ borderColor: "#FF5F6D22", background: "#fff9f9" }}>
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #FF5F6D 0%, #FFC371 100%)" }}
            >
              <ScanFace size={14} color="white" />
            </div>
            <h2 className="text-base font-bold text-gray-900">Foto para Avaliação Física</h2>
            <span className="ml-auto text-[10px] font-semibold text-orange-400 bg-orange-50 px-2 py-0.5 rounded-full">Opcional</span>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            Envie uma foto de corpo inteiro, de frente, em um ambiente bem iluminado. Essa imagem será utilizada
            <span className="font-medium text-gray-700"> exclusivamente pela IA</span> para analisar sua composição
            corporal e criar um treino personalizado com base na sua estrutura física e nas informações preenchidas
            neste cadastro.
          </p>
          <PhotoButtons
            preview={evalPhotoPreview}
            onCamera={() => evalCameraRef.current?.click()}
            onGallery={() => evalFileRef.current?.click()}
            shape="rect"
          />
          <div className="flex items-start gap-1.5 mt-1">
            <ShieldCheck size={13} className="text-orange-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Usada exclusivamente para gerar seu primeiro treino e servir como base para futuras comparações de evolução física.
            </p>
          </div>
        </div>

        {/* Inputs ocultos — foto de avaliação */}
        <input ref={evalFileRef}   type="file" accept="image/*"                  className="hidden" onChange={e => e.target.files?.[0] && handleEvalPhotoSelect(e.target.files[0])} />
        <input ref={evalCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => e.target.files?.[0] && handleEvalPhotoSelect(e.target.files[0])} />

        {/* ── SUBMIT ────────────────────────────────────────────────────────── */}
        <div className="pt-2 pb-6">
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <><Loader2 size={18} className="animate-spin" /> Salvando informações...</>
            ) : (
              <><Sparkles size={18} /> Finalizar Cadastro</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
