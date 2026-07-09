import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import {
  Loader2, ChevronRight, Camera, ImageIcon, UserCircle2, ScanLine, CheckCircle2, X
} from "lucide-react";
import { toast } from "sonner";

/**
 * Redimensiona uma imagem para caber no Firestore (limite ~1MB por doc)
 * e para envio eficiente à IA.
 */
function resizeImage(file: File, maxSize = 720, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > height && width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        } else if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas não suportado"));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("Imagem inválida"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
    reader.readAsDataURL(file);
  });
}

interface PhotoSectionProps {
  title: string;
  description: string;
  note?: string;
  photo: string | null;
  onPhoto: (dataUrl: string) => void;
  onClear: () => void;
  icon: React.ReactNode;
  inputIdPrefix: string;
}

function PhotoSection({ title, description, note, photo, onPhoto, onClear, icon, inputIdPrefix }: PhotoSectionProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const dataUrl = await resizeImage(file);
      onPhoto(dataUrl);
    } catch {
      toast.error("Não foi possível processar a imagem. Tente outra foto.");
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-orange-500">
          {icon}
        </div>
        <div>
          <h3 className="font-black text-gray-900 text-sm uppercase tracking-wide">{title}</h3>
        </div>
      </div>
      <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
      {note && <p className="text-[10px] text-gray-400 italic">{note}</p>}

      {photo ? (
        <div className="relative">
          <img src={photo} alt={title} className="w-full h-48 object-cover rounded-2xl" />
          <button
            onClick={onClear}
            className="absolute top-2 right-2 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white"
          >
            <X size={16} />
          </button>
          <div className="absolute bottom-2 left-2 bg-green-500 text-white text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1">
            <CheckCircle2 size={12} /> Foto adicionada
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="flex flex-col items-center gap-2 py-5 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 text-gray-500 hover:border-black hover:text-black transition-all"
          >
            <Camera size={22} />
            <span className="text-xs font-bold">Tirar foto</span>
          </button>
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            className="flex flex-col items-center gap-2 py-5 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 text-gray-500 hover:border-black hover:text-black transition-all"
          >
            <ImageIcon size={22} />
            <span className="text-xs font-bold">Escolher da galeria</span>
          </button>
        </div>
      )}

      <input
        ref={cameraRef}
        id={`${inputIdPrefix}-camera`}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <input
        ref={galleryRef}
        id={`${inputIdPrefix}-gallery`}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}

export default function Onboarding() {
  const [, navigate] = useLocation();
  const { isAuthenticated, loading, updateProfile, profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [evalPhoto, setEvalPhoto] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    age: "25",
    gender: "Masculino",
    heightCm: "175",
    weightKg: "75",
    targetWeightKg: "",
    goal: "Hipertrofia",
    experience: "Iniciante",
    daysPerWeek: "4",
    minutesPerWorkout: "60",
    gymType: "Academia completa",
    restrictions: "",
    likes: "",
    dislikes: ""
  });

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      navigate("/login");
    } else if (profile?.name && !form.name) {
      setForm(prev => ({ ...prev, name: profile.name }));
    }
  }, [isAuthenticated, loading, navigate, profile]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const toastId = toast.loading("Salvando suas informações...");

    try {
      await updateProfile({
        name: form.name,
        age: parseInt(form.age),
        sex: form.gender,
        heightCm: parseFloat(form.heightCm),
        weightKg: parseFloat(form.weightKg),
        targetWeightKg: form.targetWeightKg ? parseFloat(form.targetWeightKg) : undefined,
        goal: form.goal,
        experienceLevel: form.experience,
        daysPerWeek: parseInt(form.daysPerWeek),
        minutesPerSession: parseInt(form.minutesPerWorkout),
        gymType: form.gymType,
        physicalRestrictions: form.restrictions,
        preferredExercises: form.likes,
        avoidedExercises: form.dislikes,
        photoUrl: profilePhoto || undefined,
        onboardingCompleted: true,
      } as any);

      // Foto de avaliação vai para o Processing via sessionStorage (base64)
      if (evalPhoto) {
        sessionStorage.setItem("evalPhotoBase64", evalPhoto);
      } else {
        sessionStorage.removeItem("evalPhotoBase64");
      }

      toast.success("Cadastro finalizado!", { id: toastId });
      navigate("/processing");
    } catch (err) {
      console.error("Erro ao salvar cadastro:", err);
      const msg = err instanceof Error ? err.message : "Erro ao salvar. Tente novamente.";
      toast.error(msg, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="fixed top-0 left-0 w-full h-1 bg-gray-100 z-50">
        <div className="h-full bg-black transition-all duration-500" style={{ width: `${(step / 3) * 100}%` }} />
      </div>

      <div className="max-w-md mx-auto p-6 pt-10">
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">DADOS BÁSICOS</h1>
              <p className="text-gray-500 text-sm">Precisamos dessas informações para sua IA.</p>
            </div>

            {/* Foto de Perfil */}
            <PhotoSection
              title="Foto de Perfil"
              description="Esta foto será utilizada apenas como sua imagem de perfil dentro do aplicativo."
              note="Essa foto não será utilizada para análise da IA."
              photo={profilePhoto}
              onPhoto={setProfilePhoto}
              onClear={() => setProfilePhoto(null)}
              icon={<UserCircle2 size={20} />}
              inputIdPrefix="profile-photo"
            />

            <div className="bg-white rounded-3xl p-6 shadow-sm space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Nome</label>
                <input
                  className="w-full bg-gray-50 border-none rounded-2xl py-4 px-4 text-gray-900 focus:ring-2 focus:ring-black"
                  placeholder="Seu nome"
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Idade</label>
                  <input type="number" className="w-full bg-gray-50 border-none rounded-2xl p-4" value={form.age} onChange={e => setForm({...form, age: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Sexo</label>
                  <select className="w-full bg-gray-50 border-none rounded-2xl p-4 appearance-none" value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}>
                    <option>Masculino</option><option>Feminino</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Altura (cm)</label>
                  <input type="number" className="w-full bg-gray-50 border-none rounded-2xl p-4" value={form.heightCm} onChange={e => setForm({...form, heightCm: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Peso (kg)</label>
                  <input type="number" className="w-full bg-gray-50 border-none rounded-2xl p-4" value={form.weightKg} onChange={e => setForm({...form, weightKg: e.target.value})} />
                </div>
              </div>
            </div>

            <button className="w-full bg-black text-white py-5 rounded-3xl font-bold shadow-xl flex items-center justify-center gap-2" onClick={() => { setStep(2); window.scrollTo(0, 0); }}>
              PRÓXIMO PASSO <ChevronRight size={18} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">OBJETIVO</h1>
              <p className="text-gray-500 text-sm">Qual seu foco principal?</p>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Meta</label>
                <div className="grid grid-cols-1 gap-2">
                  {["Hipertrofia", "Emagrecimento", "Saúde"].map((g) => (
                    <button key={g} onClick={() => setForm({...form, goal: g})} className={`p-4 rounded-2xl text-left text-sm font-bold ${form.goal === g ? "bg-black text-white" : "bg-gray-50 text-gray-500"}`}>{g}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Peso alvo (kg) — opcional</label>
                <input type="number" className="w-full bg-gray-50 border-none rounded-2xl p-4" placeholder="Ex: 70" value={form.targetWeightKg} onChange={e => setForm({...form, targetWeightKg: e.target.value})} />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Nível de experiência</label>
                <div className="grid grid-cols-3 gap-2">
                  {["Iniciante", "Intermediário", "Avançado"].map((lvl) => (
                    <button key={lvl} onClick={() => setForm({...form, experience: lvl})} className={`p-3 rounded-2xl text-center text-xs font-bold ${form.experience === lvl ? "bg-black text-white" : "bg-gray-50 text-gray-500"}`}>{lvl}</button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Dias/semana</label>
                  <select className="w-full bg-gray-50 border-none rounded-2xl p-4 appearance-none" value={form.daysPerWeek} onChange={e => setForm({...form, daysPerWeek: e.target.value})}>
                    {[2,3,4,5,6].map(d => <option key={d} value={d}>{d} dias</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Minutos/treino</label>
                  <select className="w-full bg-gray-50 border-none rounded-2xl p-4 appearance-none" value={form.minutesPerWorkout} onChange={e => setForm({...form, minutesPerWorkout: e.target.value})}>
                    {[30,45,60,75,90].map(m => <option key={m} value={m}>{m} min</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Dores ou limitações</label>
                <input className="w-full bg-gray-50 border-none rounded-2xl p-4" placeholder="Ex: dor no joelho, hérnia..." value={form.restrictions} onChange={e => setForm({...form, restrictions: e.target.value})} />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Exercícios que gosta</label>
                <input className="w-full bg-gray-50 border-none rounded-2xl p-4" placeholder="Ex: agachamento, supino..." value={form.likes} onChange={e => setForm({...form, likes: e.target.value})} />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Exercícios que evita</label>
                <input className="w-full bg-gray-50 border-none rounded-2xl p-4" placeholder="Ex: burpee, corrida..." value={form.dislikes} onChange={e => setForm({...form, dislikes: e.target.value})} />
              </div>
            </div>

            <div className="flex gap-4">
              <button className="flex-1 bg-gray-200 text-gray-600 py-5 rounded-3xl font-bold" onClick={() => { setStep(1); window.scrollTo(0, 0); }}>VOLTAR</button>
              <button className="flex-[2] bg-black text-white py-5 rounded-3xl font-bold shadow-xl flex items-center justify-center gap-2" onClick={() => { setStep(3); window.scrollTo(0, 0); }}>
                PRÓXIMO PASSO <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">AVALIAÇÃO FÍSICA</h1>
              <p className="text-gray-500 text-sm">Última etapa antes da IA criar seu treino.</p>
            </div>

            {/* Foto para Avaliação Física */}
            <PhotoSection
              title="Foto para Avaliação Física"
              description="Envie uma foto de corpo inteiro, de frente, em um ambiente bem iluminado. Essa imagem será utilizada exclusivamente pela IA para analisar sua composição corporal e criar um treino personalizado com base na sua estrutura física e nas informações preenchidas neste cadastro."
              photo={evalPhoto}
              onPhoto={setEvalPhoto}
              onClear={() => setEvalPhoto(null)}
              icon={<ScanLine size={20} />}
              inputIdPrefix="eval-photo"
            />

            <p className="text-[11px] text-gray-400 text-center px-4">
              A foto é opcional, mas melhora muito a personalização do seu treino. Você também poderá enviá-la depois.
            </p>

            <div className="flex gap-4">
              <button className="flex-1 bg-gray-200 text-gray-600 py-5 rounded-3xl font-bold" onClick={() => { setStep(2); window.scrollTo(0, 0); }}>VOLTAR</button>
              <button className="flex-[2] bg-black text-white py-5 rounded-3xl font-bold shadow-xl flex items-center justify-center gap-2" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : "FINALIZAR CADASTRO"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
