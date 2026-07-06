import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Sparkles, Camera, Upload, User, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

const GOALS = ["Hipertrofia", "Emagrecimento", "Condicionamento", "Saúde geral", "Força", "Resistência"];
const LEVELS = ["Iniciante", "Intermediário", "Avançado"] as const;
const GYM_TYPES = ["Academia completa", "Calistenia", "Em casa", "Musculação básica", "Funcional"];
const SEX_OPTIONS = ["Masculino", "Feminino", "Outro"] as const;

export default function Onboarding() {
  const [, navigate] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const saveProfile = trpc.profile.save.useMutation();
  const uploadPhoto = trpc.profile.uploadPhoto.useMutation();
  const generateWorkout = trpc.workout.generate.useMutation();

  const handlePhotoSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPhotoPreview(result);
      const base64 = result.split(",")[1];
      setPhotoBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async () => {
    if (!form.name || !form.age || !form.heightCm || !form.weightKg) {
      toast.error("Preencha os campos obrigatórios: nome, idade, altura e peso.");
      return;
    }

    setIsGenerating(true);
    try {
      let photoUrl: string | undefined;
      let photoKey: string | undefined;

      if (photoBase64) {
        const uploaded = await uploadPhoto.mutateAsync({ base64: photoBase64 });
        photoUrl = uploaded.url;
        photoKey = uploaded.key;
      }

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

      await generateWorkout.mutateAsync();
      toast.success("Treino gerado com sucesso!");
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar treino. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-white pb-8">
      {/* Header */}
      <div className="px-5 pt-10 pb-6">
        <h1 className="text-2xl font-bold text-gray-900">Vamos te conhecer</h1>
        <p className="text-gray-500 text-sm mt-1">Preencha seu perfil para a IA criar seu treino ideal</p>
      </div>

      <div className="px-5 space-y-5">
        {/* Photo upload */}
        <div className="flex flex-col items-center gap-3 py-4">
          <div
            className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            {photoPreview ? (
              <img src={photoPreview} alt="Foto" className="w-full h-full object-cover" />
            ) : (
              <User size={36} className="text-gray-400" />
            )}
          </div>
          <div className="flex gap-2">
            <button
              className="btn-secondary py-2 px-4 text-sm w-auto"
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera size={16} /> Câmera
            </button>
            <button
              className="btn-secondary py-2 px-4 text-sm w-auto"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={16} /> Álbum
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => e.target.files?.[0] && handlePhotoSelect(e.target.files[0])}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={e => e.target.files?.[0] && handlePhotoSelect(e.target.files[0])}
          />
        </div>

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

        {/* Submit */}
        <div className="pt-2 pb-6">
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <><Loader2 size={18} className="animate-spin" /> Gerando seu treino...</>
            ) : (
              <><Sparkles size={18} /> Gerar Meu Primeiro Treino</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
