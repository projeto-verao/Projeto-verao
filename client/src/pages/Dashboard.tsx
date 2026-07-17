import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { isOnboardingComplete } from "@/hooks/useFirebaseAuth";
import AppLayout from "@/components/AppLayout";
import { geminiService } from "@/lib/gemini";
import { firestoreService, dateHelpers, StoredWorkout, ExerciseLoadEntry, WorkoutCompletionEntry, ExerciseWeightEntry } from "@/hooks/useFirebaseFirestore";
import {
  Utensils, Target, RefreshCw, Loader2, ChevronRight, Timer, X, Sparkles, Activity, CheckCircle2, Play, Trophy, Info, Weight, AlertTriangle, TrendingDown, Award, AlertCircle, Home
} from "lucide-react";
import { toast } from "sonner";
import { Timestamp, collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import VideoModal from "@/components/VideoModal";

/** Extrai o valor numérico (kg) de uma string de peso gerada pela IA.
 *  Ex: "30-50kg" → 30  |  "20kg" → 20  |  "Corporal" → null */
function parseWeightSuggestion(weightStr: string): number | null {
  if (!weightStr) return null;
  const lower = weightStr.toLowerCase();
  if (lower.includes("corporal") || lower.includes("livre") || lower.includes("bw")) return null;
  // Faixa de valores → pega o menor (mais conservador para iniciantes)
  const rangeMatch = weightStr.match(/(\d+(?:[.,]\d+)?)\s*[-–]\s*\d+(?:[.,]\d+)?\s*kg?/i);
  if (rangeMatch) return parseFloat(rangeMatch[1].replace(",", "."));
  // Valor único
  const singleMatch = weightStr.match(/(\d+(?:[.,]\d+)?)\s*kg?/i);
  if (singleMatch) return parseFloat(singleMatch[1].replace(",", "."));
  return null;
}

export default function Dashboard() {
  const { user, profile, isAuthenticated, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  // Redireciona para login se não autenticado
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, authLoading, navigate]);

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [completedSets, setCompletedSets] = useState<Record<string, boolean>>({});
  const [exerciseLoads, setExerciseLoads] = useState<Record<string, string>>({});
  const [restTimer, setRestTimer] = useState<{ seconds: number; isActive: boolean } | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [activeWorkout, setActiveWorkout] = useState<StoredWorkout | null>(null);
  const [workoutLoading, setWorkoutLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [weekCompleted, setWeekCompleted] = useState(0);
  // Rastreamento interno dos dias concluídos no ciclo atual (conjunto de dayNumbers)
  const [completedDaysSet, setCompletedDaysSet] = useState<Set<number>>(new Set());
  // Completions da semana para calcular próximo treino pendente
  const [weekCompletions, setWeekCompletions] = useState<WorkoutCompletionEntry[]>([]);
  // userWeekNumber: semana individual do usuário (calculada pela data do primeiro treino)
  const [userWeekNumber, setUserWeekNumber] = useState<number>(1);
  
  // ── Estados do Cronômetro de Treino ────────────────────────────────────────
  const [isTraining, setIsTraining] = useState(false);
  const [workoutStartTime, setWorkoutStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const workoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionSummary, setCompletionSummary] = useState<{
    duration: string;
    nextWorkout: string;
    nextTiming: string;
    percentCompleted: number;
    completedExercisesList: string[];
    pendingExercisesList: string[];
    lessStimulatedMuscles: string[];
    messageTier: "none" | "partial" | "almost" | "full";
  } | null>(null);

  // ── Estado do Modal de Vídeo ──────────────────────────────────────────────
  const [selectedVideoExercise, setSelectedVideoExercise] = useState<string | null>(null);

  // ── Estado do Treino em Casa ───────────────────────────────────────────────
  const [homeWorkoutDays, setHomeWorkoutDays] = useState<Record<number, import("@/hooks/useFirebaseFirestore").StoredExercise[]>>({});
  const [showHomeConfirm, setShowHomeConfirm] = useState(false);
  const [pendingHomeDayNumber, setPendingHomeDayNumber] = useState<number | null>(null);

  // Efeito para rolar até o dia selecionado ao expandir
  useEffect(() => {
    if (selectedDay !== null) {
      setTimeout(() => {
        const el = document.getElementById(`workout-day-${selectedDay}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 50);
    }
  }, [selectedDay]);

  // ── Biblioteca de exercícios em casa por grupo muscular ────────────────────
  const HOME_EXERCISES_BY_GROUP: Record<string, import("@/hooks/useFirebaseFirestore").StoredExercise[]> = {
    chest: [
      { name: "Flexão de braço", sets: 4, reps: "12-15", weight: "Corporal", rest: "60", notes: "Mãos na largura dos ombros, desça o peito até quase tocar o chão" },
      { name: "Flexão inclinada", sets: 3, reps: "10-12", weight: "Corporal", rest: "60", notes: "Mãos em superfície elevada (banco/sofá), foco no peitoral inferior" },
      { name: "Flexão declinada", sets: 3, reps: "10-12", weight: "Corporal", rest: "60", notes: "Pés elevados no banco/sofá, foco no peitoral superior" },
      { name: "Tríceps no banco", sets: 3, reps: "12-15", weight: "Corporal", rest: "60", notes: "Mãos na borda do banco atrás do corpo, desça dobrando os cotovelos" },
    ],
    back: [
      { name: "Remada na mesa", sets: 4, reps: "12-15", weight: "Corporal", rest: "60", notes: "Deitado sob mesa resistente, puxe o peito até a borda" },
      { name: "Superman", sets: 3, reps: "15-20", weight: "Corporal", rest: "45", notes: "Deitado de bruços, eleve braços e pernas simultaneamente, segure 2s" },
      { name: "Remada com mochila", sets: 3, reps: "12-15", weight: "Corporal", rest: "60", notes: "Incline o tronco 45°, puxe a mochila com peso para o abdômen" },
      { name: "Good morning", sets: 3, reps: "15", weight: "Corporal", rest: "45", notes: "Em pé, joelhos semi-flexionados, incline o tronco mantendo costas retas" },
    ],
    shoulders: [
      { name: "Pike push-up", sets: 4, reps: "10-12", weight: "Corporal", rest: "60", notes: "Corpo em V invertido, desça a cabeça em direção ao chão" },
      { name: "Elevação lateral com garrafas", sets: 3, reps: "15-20", weight: "Corporal", rest: "45", notes: "Use garrafas d'água como halteres, eleve os braços até a altura dos ombros" },
      { name: "Flexão de pique (handstand parcial)", sets: 3, reps: "8-10", weight: "Corporal", rest: "60", notes: "Pés apoiados na parede, corpo quase vertical, flexione os cotovelos" },
    ],
    biceps: [
      { name: "Chin-up (pegada supinada)", sets: 3, reps: "6-10", weight: "Corporal", rest: "60", notes: "Palmas voltadas para você, puxe até o queixo passar a barra" },
      { name: "Rosca com toalha na porta", sets: 3, reps: "12-15", weight: "Corporal", rest: "45", notes: "Amarre toalha na maçaneta, recline o corpo e faça o movimento de rosca" },
      { name: "Rosca com mochila", sets: 3, reps: "12-15", weight: "Corporal", rest: "45", notes: "Segure mochila com peso com uma mão, faça o movimento de rosca" },
    ],
    triceps: [
      { name: "Tríceps no banco/cadeira", sets: 4, reps: "12-15", weight: "Corporal", rest: "60", notes: "Mãos na borda atrás do corpo, desça dobrando os cotovelos a 90°" },
      { name: "Flexão com pegada fechada (diamante)", sets: 3, reps: "10-12", weight: "Corporal", rest: "60", notes: "Polegares e indicadores se tocam formando um diamante" },
      { name: "Extensão de tríceps com mochila", sets: 3, reps: "12-15", weight: "Corporal", rest: "45", notes: "Segure mochila atrás da cabeça com ambas as mãos, estenda os braços" },
    ],
    legs: [
      { name: "Agachamento livre", sets: 4, reps: "15-20", weight: "Corporal", rest: "60", notes: "Desça até a coxa ficar paralela ao solo, joelhos alinhados com os pés" },
      { name: "Afundo (lunges)", sets: 3, reps: "12 cada perna", weight: "Corporal", rest: "60", notes: "Avance um passo largo, desça o joelho traseiro quase ao chão" },
      { name: "Agachamento búlgaro", sets: 3, reps: "10-12 cada", weight: "Corporal", rest: "60", notes: "Pé traseiro elevado no banco/sofá, desça o joelho da frente a 90°" },
      { name: "Agachamento sumô", sets: 3, reps: "15-20", weight: "Corporal", rest: "60", notes: "Pés bem afastados, pontas voltadas para fora, desça devagar" },
    ],
    hamstrings: [
      { name: "Elevação pélvica (hip thrust)", sets: 4, reps: "15-20", weight: "Corporal", rest: "45", notes: "Deitado, pés no chão, eleve o quadril e contraia os glúteos no topo" },
      { name: "Stiff peso corporal", sets: 3, reps: "15", weight: "Corporal", rest: "45", notes: "Em pé, incline o tronco com pernas semi-estendidas, sinta a tensão na parte posterior" },
      { name: "Cadeira nórdica assistida", sets: 3, reps: "8-10", weight: "Corporal", rest: "60", notes: "Joelhos no chão com pés fixos, desça controlando com as mãos para se apoiar" },
    ],
    glutes: [
      { name: "Elevação pélvica (hip thrust)", sets: 4, reps: "20", weight: "Corporal", rest: "45", notes: "Deitado, pés no chão, eleve o quadril e contraia os glúteos no topo por 1s" },
      { name: "Afundo lateral", sets: 3, reps: "12 cada lado", weight: "Corporal", rest: "60", notes: "Dê um passo lateral amplo, dobre o joelho lateral, mantenha o outro esticado" },
      { name: "Extensão de quadril de 4 apoios", sets: 3, reps: "15 cada", weight: "Corporal", rest: "45", notes: "De joelhos e mãos, eleve a perna para trás e para cima, contraia no topo" },
      { name: "Agachamento sumô com pulso", sets: 3, reps: "20", weight: "Corporal", rest: "45", notes: "No ponto mais baixo do agachamento sumô, faça pequenos pulsos de 5 cm" },
    ],
    calves: [
      { name: "Elevação de panturrilha em pé", sets: 4, reps: "20-25", weight: "Corporal", rest: "30", notes: "Em pé, suba lentamente na ponta dos pés e desça controlando" },
      { name: "Elevação de panturrilha unilateral", sets: 3, reps: "15-20 cada", weight: "Corporal", rest: "30", notes: "Em um pé só, apoie-se levemente na parede para equilíbrio" },
    ],
    abs: [
      { name: "Prancha abdominal", sets: 3, reps: "30-45 seg", weight: "Corporal", rest: "30", notes: "Corpo reto como tábua, não deixe o quadril afundar" },
      { name: "Crunch abdominal", sets: 3, reps: "20-25", weight: "Corporal", rest: "30", notes: "Deitado, eleve apenas os ombros do chão, não puxe pelo pescoço" },
      { name: "Elevação de pernas", sets: 3, reps: "15-20", weight: "Corporal", rest: "30", notes: "Deitado, eleve as pernas esticadas até 90° e desça controlando" },
      { name: "Mountain climber", sets: 3, reps: "20 cada lado", weight: "Corporal", rest: "30", notes: "Em posição de prancha, alterne as pernas em ritmo controlado" },
    ],
  };

  // ── Gerar exercícios em casa baseado no grupo muscular do treino ────────────
  const generateHomeWorkout = (day: import("@/hooks/useFirebaseFirestore").StoredWorkoutDay): import("@/hooks/useFirebaseFirestore").StoredExercise[] => {
    const allText = [day.title, ...day.exercises.map(e => e.name)].join(' ').toLowerCase();
    const result: import("@/hooks/useFirebaseFirestore").StoredExercise[] = [];

    if (/peit|supino|chest|fly|crucif|cross|bench/.test(allText)) result.push(...HOME_EXERCISES_BY_GROUP.chest);
    if (/cost|remad|puxad|barra fixa|costas|back|pull|lat/.test(allText)) result.push(...HOME_EXERCISES_BY_GROUP.back);
    if (/ombro|delt|develop|lateral|frontal|press ombro/.test(allText)) result.push(...HOME_EXERCISES_BY_GROUP.shoulders);
    if (/bícep|bicep|rosca|curl/.test(allText)) result.push(...HOME_EXERCISES_BY_GROUP.biceps);
    if (/trícep|tricep|franc|coice|pushdown|corda/.test(allText)) result.push(...HOME_EXERCISES_BY_GROUP.triceps);
    if (/perna|leg|agach|quadrícep|hack|extens|lunge|afundo/.test(allText)) result.push(...HOME_EXERCISES_BY_GROUP.legs);
    if (/posterior|isquio|stiff|terra|femoral|hamstring/.test(allText)) result.push(...HOME_EXERCISES_BY_GROUP.hamstrings);
    if (/glút|gluteo|hip thrust|bulgari/.test(allText)) result.push(...HOME_EXERCISES_BY_GROUP.glutes);
    if (/panturr|gêmeo|soleo|calf/.test(allText)) result.push(...HOME_EXERCISES_BY_GROUP.calves);
    if (/abdôm|abdomi|prancha|obliq|crunch|core|abdo/.test(allText)) result.push(...HOME_EXERCISES_BY_GROUP.abs);

    // Fallback: treino full body se nenhum grupo for identificado
    if (result.length === 0) {
      result.push(
        ...HOME_EXERCISES_BY_GROUP.chest.slice(0, 2),
        ...HOME_EXERCISES_BY_GROUP.legs.slice(0, 2),
        ...HOME_EXERCISES_BY_GROUP.back.slice(0, 1),
        ...HOME_EXERCISES_BY_GROUP.abs.slice(0, 2),
      );
    }

    return result;
  };

  // ── Helper: retorna exercícios efetivos (casa ou academia) ─────────────────
  const getEffectiveExercises = (dayNumber: number, originalExercises: import("@/hooks/useFirebaseFirestore").StoredExercise[]) => {
    return homeWorkoutDays[dayNumber] ?? originalExercises;
  };

  // ── Confirmar troca para treino em casa ────────────────────────────────────
  const handleConfirmHomeWorkout = () => {
    if (pendingHomeDayNumber === null || !activeWorkout) return;
    const day = activeWorkout.days.find(d => d.dayNumber === pendingHomeDayNumber);
    if (!day) return;
    const homeExercises = generateHomeWorkout(day);
    setHomeWorkoutDays(prev => ({ ...prev, [pendingHomeDayNumber]: homeExercises }));
    // Limpar séries completadas do dia atual (exercícios novos, índices reiniciam)
    setCompletedSets(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(key => {
        if (key.startsWith(`${pendingHomeDayNumber}-`)) delete updated[key];
      });
      return updated;
    });
    setShowHomeConfirm(false);
    setPendingHomeDayNumber(null);
    toast.success("Treino em casa carregado! Os exercícios foram adaptados para peso corporal.");
  };

  const target = profile?.daysPerWeek || 4;

  // ── Carregar treino ativo e persistência do cronômetro ─────────────────────
  // ── Função para calcular a semana individual do usuário ────────────────────
  const calculateUserWeekNumber = async (userId: string): Promise<number> => {
    // Buscar a primeira completion do usuário (todas, não só da semana atual)
    const q = query(
      collection(db, "users", userId, "completions"),
      orderBy("createdAt", "asc"),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return 1; // Sem completions → semana 1

    const firstCompletion = snap.docs[0].data() as WorkoutCompletionEntry;
    const firstDate = firstCompletion.createdAt.toMillis();

    // Calcular diferença em semanas a partir da primeira completion
    const now = Date.now();
    const diffMs = now - firstDate;
    const diffDays = Math.floor(diffMs / 86400000);
    const diffWeeks = Math.floor(diffDays / 7);

    return diffWeeks + 1; // Semana 1 é a semana de início
  };

  const loadData = useCallback(async () => {
    if (!user) return;
    console.log("[Dashboard] loadData iniciado — uid:", user.uid);
    setWorkoutLoading(true);
    try {
      // getExerciseWeights usa a subcoleção exerciseWeights — separado para não
      // bloquear o carregamento do treino caso a permissão falhe.
      const [workout, completions, lastLoads] = await Promise.all([
        firestoreService.getActiveWorkout(user.uid),
        firestoreService.getWeekCompletions(user.uid),
        firestoreService.getLastExerciseLoads(user.uid),
      ]);
      console.log("[Dashboard] dados principais OK — treino ativo:", workout?.id ?? "nenhum", "| completions:", completions.length);

      let exerciseWeightMap: Record<string, import("@/hooks/useFirebaseFirestore").ExerciseWeightEntry> = {};
      try {
        exerciseWeightMap = await firestoreService.getExerciseWeights(user.uid);
        console.log("[Dashboard] exerciseWeights OK — entradas:", Object.keys(exerciseWeightMap).length);
      } catch (weightErr) {
        console.warn("[Dashboard] getExerciseWeights falhou (permissão Firestore?) — seguindo sem cargas salvas:", weightErr);
      }

      setActiveWorkout(workout);
      setWeekCompleted(completions.length);
      setWeekCompletions(completions);

      // Calcular semana individual do usuário
      const weekNum = await calculateUserWeekNumber(user.uid);
      setUserWeekNumber(weekNum);

      // Construir conjunto de dias concluídos no ciclo atual (deduplicados por dayNumber)
      const daysSet = new Set<number>();
      completions.forEach((c: WorkoutCompletionEntry) => daysSet.add(c.day));
      setCompletedDaysSet(daysSet);

      // ── Construir cargas iniciais por prioridade ────────────────────────────
      // 1. Sugestão da IA (menor — só para exercícios sem nenhum histórico)
      // 2. Histórico de conclusões anteriores (getLastExerciseLoads)
      // 3. Coleção dedicada exerciseWeights (maior — valor explicitamente salvo)
      const initialLoads: Record<string, string> = {};

      // 1. Sugestão da IA: parsear o campo weight de cada exercício do treino ativo
      if (workout) {
        workout.days.forEach(day => {
          day.exercises.forEach(ex => {
            const suggested = parseWeightSuggestion(ex.weight);
            if (suggested !== null && suggested > 0) {
              initialLoads[ex.name.toLowerCase()] = suggested.toString();
            }
          });
        });
      }

      // 2. Histórico de completions (sobrepõe sugestão da IA)
      Object.entries(lastLoads).forEach(([name, load]) => {
        initialLoads[name] = load.toString();
      });

      // 3. Pesos salvos explicitamente pelo usuário (sempre prevalece)
      Object.values(exerciseWeightMap).forEach((entry: ExerciseWeightEntry) => {
        initialLoads[entry.exerciseName.toLowerCase()] = entry.loadKg.toString();
      });

      setExerciseLoads(initialLoads);

      // Recuperar estado do cronômetro do localStorage
      const savedStartTime = localStorage.getItem(`workout_start_${user.uid}`);
      const savedIsTraining = localStorage.getItem(`workout_active_${user.uid}`);
      const savedSelectedDay = localStorage.getItem(`workout_day_${user.uid}`);

      if (savedIsTraining === "true" && savedStartTime) {
        const start = parseInt(savedStartTime);
        setWorkoutStartTime(start);
        setIsTraining(true);
        setElapsedSeconds(Math.floor((Date.now() - start) / 1000));
        if (savedSelectedDay) setSelectedDay(parseInt(savedSelectedDay));
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setWorkoutLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  // Efeito para atualizar o cronômetro em tempo real
  useEffect(() => {
    if (isTraining && workoutStartTime) {
      workoutTimerRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - workoutStartTime) / 1000));
      }, 1000);
    } else {
      if (workoutTimerRef.current) clearInterval(workoutTimerRef.current);
    }
    return () => { if (workoutTimerRef.current) clearInterval(workoutTimerRef.current); };
  }, [isTraining, workoutStartTime]);

  const formatDuration = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes === 0) return `${seconds} segundos`;
    return `${minutes} minutos e ${seconds.toString().padStart(2, '0')} segundos`;
  };

  // ── Iniciar Treino ─────────────────────────────────────────────────────────
  const handleStartWorkout = (dayNumber: number) => {
    if (!user) return;
    const now = Date.now();
    setIsTraining(true);
    setWorkoutStartTime(now);
    setElapsedSeconds(0);
    setSelectedDay(dayNumber);

    // Persistir no localStorage
    localStorage.setItem(`workout_active_${user.uid}`, "true");
    localStorage.setItem(`workout_start_${user.uid}`, now.toString());
    localStorage.setItem(`workout_day_${user.uid}`, dayNumber.toString());

    toast.success("Treino iniciado! O cronômetro está rodando.");
  };

  // ── Gerar treino com IA ────────────────────────────────────────────────────
  const handleGenerateWorkout = async () => {
    if (!user) return;
    if (!isOnboardingComplete(profile)) {
      toast.error("Complete seu perfil primeiro para gerar o treino.");
      navigate("/onboarding");
      return;
    }
    setGenerating(true);
    const toastId = toast.loading("A IA está montando seu treino personalizado...");
    try {
      const generated = await geminiService.generateWorkout(profile as any);
      await firestoreService.createWorkout(user.uid, {
        title: generated.title,
        days: generated.days as any,
        changeDescription: "Treino gerado pela IA",
      });
      toast.success("Novo treino gerado com sucesso!", { id: toastId });
      setCompletedSets({});
      setSelectedDay(null);
      await loadData();
    } catch (err) {
      console.error("Erro ao gerar treino:", err);
      const msg = err instanceof Error ? err.message : "Erro ao gerar treino. Tente novamente.";
      toast.error(msg, { id: toastId });
    } finally {
      setGenerating(false);
    }
  };


  // ── Mapeamento de exercícios para grupos musculares ────────────────────────
  const getExerciseMuscleGroup = (exerciseName: string): string => {
    const name = exerciseName.toLowerCase().trim();
    if (name.includes("supino") || name.includes("peitoral") || name.includes("fly") || name.includes("crossover") || name.includes("crucifixo") || name.includes("pullover") || name.includes("puxada") || name.includes("remada") || name.includes("barra fixa") || name.includes("flexão")) return "Peitoral/Costas";
    if (name.includes("ombro") || name.includes("desenvolvimento") || name.includes("eleva") || name.includes("lateral") || name.includes("frontal") || name.includes("deltóide") || name.includes("delta") || name.includes("shrug") || name.includes("trapézio")) return "Ombros/Trapézio";
    if (name.includes("rosca") || name.includes("bíceps") || name.includes("martelo") || name.includes("concentrada") || name.includes("scott") || name.includes("preacher")) return "Bíceps";
    if (name.includes("tríceps") || name.includes("frances") || name.includes("francês") || name.includes("coice") || name.includes("corda") || name.includes("testa")) return "Tríceps";
    if (name.includes("agachamento") || name.includes("leg press") || name.includes("hack") || name.includes("extensão") || name.includes("cadeira extensor") || name.includes("quadríceps")) return "Quadríceps";
    if (name.includes("terra") || name.includes("stiff") || name.includes("mesa flexora") || name.includes("cad") || name.includes("nórdico") || name.includes("isquiotibial") || name.includes("posterior")) return "Isquiotibiais/Posterior";
    if (name.includes("panturrilha") || name.includes("gêmeo") || name.includes("soleo") || name.includes("sóleo")) return "Panturrilha";
    if (name.includes("abdômen") || name.includes("abdominal") || name.includes("prancha") || name.includes("obliquo") || name.includes("oblíquo") || name.includes("elevação") || name.includes("leg raise") || name.includes("crunch")) return "Abdômen";
    if (name.includes("glúteo") || name.includes("gluteo") || name.includes("elevação") || name.includes("eleva") || name.includes("bulgarian") || name.includes("afundo") || name.includes("passada")) return "Glúteos";
    return "Geral";
  };

  // ── Calcular percentual de conclusão baseado em séries completas ───────────
  const calculateCompletionPercent = (dayNumber: number): { 
    percent: number; 
    totalSets: number; 
    completedSets: number;
    completedExercises: string[];
    pendingExercises: string[];
    muscleStimulation: Record<string, number>;
  } => {
    if (!activeWorkout) return { percent: 0, totalSets: 0, completedSets: 0, completedExercises: [], pendingExercises: [], muscleStimulation: {} };
    
    const day = activeWorkout.days.find(d => d.dayNumber === dayNumber);
    if (!day) return { percent: 0, totalSets: 0, completedSets: 0, completedExercises: [], pendingExercises: [], muscleStimulation: {} };

    let totalSets = 0;
    let completedSetCount = 0;
    const completedExercises: string[] = [];
    const pendingExercises: string[] = [];
    const muscleStimulation: Record<string, { total: number; done: number }> = {};

    getEffectiveExercises(dayNumber, day.exercises).forEach((ex, idx) => {
      totalSets += ex.sets;
      let exerciseDone = false;
      for (let sIdx = 0; sIdx < ex.sets; sIdx++) {
        const key = `${dayNumber}-${idx}-${sIdx}`;
        if (completedSets[key]) {
          completedSetCount++;
          exerciseDone = true;
        }
      }
      if (exerciseDone) {
        completedExercises.push(ex.name);
      } else {
        pendingExercises.push(ex.name);
      }

      const muscleGroup = getExerciseMuscleGroup(ex.name);
      if (!muscleStimulation[muscleGroup]) {
        muscleStimulation[muscleGroup] = { total: 0, done: 0 };
      }
      muscleStimulation[muscleGroup].total += ex.sets;
      if (exerciseDone) {
        muscleStimulation[muscleGroup].done += ex.sets;
      }
    });

    const percent = totalSets > 0 ? Math.round((completedSetCount / totalSets) * 100) : 0;
    
    const musclePercent: Record<string, number> = {};
    Object.entries(muscleStimulation).forEach(([muscle, data]) => {
      musclePercent[muscle] = data.total > 0 ? Math.round((data.done / data.total) * 100) : 0;
    });

    return { percent, totalSets, completedSets: completedSetCount, completedExercises, pendingExercises, muscleStimulation: musclePercent };
  };

  // ── Gerar mensagem automática por faixa (SEM IA) ──────────────────────────
  const getCompletionMessage = (percent: number): { 
    tier: "none" | "partial" | "almost" | "full";
    title: string;
    message: string;
    icon: "trophy" | "award" | "alert" | "target";
  } => {
    if (percent === 0) {
      return {
        tier: "none",
        title: "Treino Não Concluído",
        message: "Nenhum exercício foi concluído. Seu treino continua pendente. Quando estiver pronto, você pode continuar de onde parou.",
        icon: "alert"
      };
    } else if (percent <= 50) {
      return {
        tier: "partial",
        title: "Parte do Treino Concluída",
        message: "Você completou uma parte do treino. Sabemos que nem sempre temos tempo suficiente. Se precisar, use o IA Trainer para adaptar o treino ao tempo disponível.",
        icon: "target"
      };
    } else if (percent < 100) {
      return {
        tier: "almost",
        title: "Ótimo Trabalho!",
        message: "Você completou a maior parte do treino. Alguns exercícios ficaram pendentes.",
        icon: "award"
      };
    } else {
      return {
        tier: "full",
        title: "Treino Completo!",
        message: "Treino completo concluído! Excelente evolução.",
        icon: "trophy"
      };
    }
  };

  // ── Concluir dia de treino ─────────────────────────────────────────────────
  const handleCompleteDay = async (dayNumber: number) => {
    if (!user || !activeWorkout || !workoutStartTime) return;
    
    const day = activeWorkout.days.find(d => d.dayNumber === dayNumber);
    if (!day) return;

    const endTime = Date.now();
    const durationSeconds = Math.floor((endTime - workoutStartTime) / 1000);
    const durationText = formatDuration(durationSeconds);

    // Calcular percentual real de conclusão
    const completionData = calculateCompletionPercent(dayNumber);
    const percentCompleted = completionData.percent;
    const messageInfo = getCompletionMessage(percentCompleted);

    // Se nenhum exercício foi concluído, NÃO registrar como concluído
    if (percentCompleted === 0) {
      // Apenas limpar o cronômetro sem registrar conclusão
      setIsTraining(false);
      setWorkoutStartTime(null);
      setElapsedSeconds(0);
      localStorage.removeItem(`workout_active_${user.uid}`);
      localStorage.removeItem(`workout_start_${user.uid}`);
      localStorage.removeItem(`workout_day_${user.uid}`);
      setSelectedDay(null);
      setCompletedSets({});
      setRestTimer(null);

      setCompletionSummary({
        duration: durationText,
        nextWorkout: day.title || `Dia ${day.dayNumber}`,
        nextTiming: "Treino pendente",
        percentCompleted: 0,
        completedExercisesList: [],
        pendingExercisesList: getEffectiveExercises(dayNumber, day.exercises).map(ex => ex.name),
        lessStimulatedMuscles: [],
        messageTier: "none"
      });
      setShowCompletionModal(true);
      return;
    }

    // Coletar cargas dos exercícios deste dia
    const loads: ExerciseLoadEntry[] = getEffectiveExercises(dayNumber, day.exercises).map(ex => ({
      exerciseName: ex.name,
      loadKg: parseFloat(exerciseLoads[ex.name.toLowerCase()] || "0")
    })).filter(l => l.loadKg > 0);

    // Identificar músculos com menor estímulo (menor percentual)
    const muscleStimPercent = completionData.muscleStimulation;
    const lessStimulatedMuscles: string[] = Object.entries(muscleStimPercent)
      .sort((a, b) => a[1] - b[1])
      .filter(([_, percent]) => percent < 100)
      .slice(0, 3)
      .map(([muscle]) => muscle);

    try {
      // Registrar conclusão no Firestore (operação principal — obrigatória)
      await firestoreService.addWorkoutCompletion(user.uid, {
        workoutId: activeWorkout.id,
        day: dayNumber,
        completedExercises: completionData.completedSets,
        totalExercises: completionData.totalSets,
        duration: durationSeconds,
        startTime: Timestamp.fromMillis(workoutStartTime),
        endTime: Timestamp.fromMillis(endTime),
        workoutTitle: day.title || "Treino",
        exerciseLoads: loads
      });

      // Persistir cargas individuais — secundário, não bloqueia o modal de conclusão
      firestoreService.saveAllExerciseWeights(user.uid, loads).catch(err => {
        console.warn("[Dashboard] saveAllExerciseWeights falhou (não crítico):", err);
      });

      // Limpar estado do cronômetro
      setIsTraining(false);
      setWorkoutStartTime(null);
      setElapsedSeconds(0);
      localStorage.removeItem(`workout_active_${user.uid}`);
      localStorage.removeItem(`workout_start_${user.uid}`);
      localStorage.removeItem(`workout_day_${user.uid}`);

      // Fechar automaticamente a tela do treino e limpar estado
      setSelectedDay(null);
      setCompletedSets({});
      setRestTimer(null);

      await loadData();

      // Identificar próximo treino: primeiro pendente na sequência A→B→C→D
      const days = activeWorkout.days || [];
      const allDaysInWorkout = days.map(d => d.dayNumber).sort((a, b) => a - b);
      
      // Dias concluídos após loadData (que atualiza weekCompletions)
      // Precisamos verificar quais dias estão concluídos no ciclo
      const completedSet = new Set<number>();
      weekCompletions.forEach((c: WorkoutCompletionEntry) => completedSet.add(c.day));
      
      // Encontrar o primeiro dia na sequência que NÃO foi concluído
      const pendingDayNumber = allDaysInWorkout.find(d => !completedSet.has(d));
      const isCycleComplete = allDaysInWorkout.every(d => completedSet.has(d));
      
      let nextTitle = "";
      let nextTiming = "";

      if (isCycleComplete) {
        // Ciclo concluído — novo ciclo começa
        nextTitle = days[0]?.title || "Dia 1 (Treino A)";
        nextTiming = "Novo ciclo iniciado! 🎉";
      } else if (pendingDayNumber !== undefined) {
        const pendingDay = days.find(d => d.dayNumber === pendingDayNumber);
        nextTitle = pendingDay?.title || `Treino do dia ${pendingDayNumber}`;
        const remainingCount = allDaysInWorkout.filter(d => !completedSet.has(d)).length - 1; // -1 pois o atual já está pendente
        nextTiming = `${remainingCount} treino${remainingCount !== 1 ? 's' : ''} pendente${remainingCount !== 1 ? 's' : ''} no ciclo`;
      }

      setCompletionSummary({
        duration: durationText,
        nextWorkout: nextTitle,
        nextTiming: nextTiming,
        percentCompleted,
        completedExercisesList: completionData.completedExercises,
        pendingExercisesList: completionData.pendingExercises,
        lessStimulatedMuscles,
        messageTier: messageInfo.tier
      });
      setShowCompletionModal(true);

    } catch (err) {
      console.error("Erro ao registrar conclusão:", err);
      toast.error("Erro ao registrar conclusão do treino.");
    }
  };

  const handleMarkAllSetsOfExercise = (dayNumber: number, exerciseIdx: number, totalSets: number) => {
    const newCompleted = { ...completedSets };
    for (let sIdx = 0; sIdx < totalSets; sIdx++) {
      const key = `${dayNumber}-${exerciseIdx}-${sIdx}`;
      newCompleted[key] = true;
    }
    setCompletedSets(newCompleted);
    toast.success("Todas as séries marcadas como concluídas!");
  };

  // ── Timer de descanso ──────────────────────────────────────────────────────
  useEffect(() => {
    if (restTimer?.isActive && restTimer.seconds > 0) {
      timerIntervalRef.current = setInterval(() => {
        setRestTimer(prev => prev ? { ...prev, seconds: prev.seconds - 1 } : null);
      }, 1000);
    } else if (restTimer?.seconds === 0) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      toast.info("Descanso finalizado! Próxima série.");
      setRestTimer(null);
    }
    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  }, [restTimer]);

  // ── Selecionar/colapsar dia de treino ──────────────────────────────────────
  const handleSelectDay = (dayNumber: number) => {
    const newSelectedDay = selectedDay === dayNumber ? null : dayNumber;
    setSelectedDay(newSelectedDay);
  };

  const toggleSet = (dayNumber: number, exerciseIdx: number, setIdx: number, restTime: string) => {
    const key = `${dayNumber}-${exerciseIdx}-${setIdx}`;
    const isNowCompleted = !completedSets[key];
    setCompletedSets(prev => ({ ...prev, [key]: isNowCompleted }));
    if (isNowCompleted) {
      const seconds = parseInt(restTime) || 60;
      setRestTimer({ seconds, isActive: true });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const days = activeWorkout?.days || [];

  return (
    <AppLayout>
      {/* Rest Timer Overlay */}
      {restTimer && (
        <div className="fixed inset-x-0 top-0 z-[100] p-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-black text-white rounded-2xl p-4 shadow-2xl flex items-center justify-between border border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <Timer size={20} className="text-orange-400 animate-pulse" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Descanso Ativo</p>
                <p className="text-xl font-mono font-bold">{Math.floor(restTimer.seconds / 60)}:{(restTimer.seconds % 60).toString().padStart(2, '0')}</p>
              </div>
            </div>
            <button onClick={() => setRestTimer(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Video Modal Overlay */}
      {selectedVideoExercise && user && (
        <VideoModal 
          exerciseName={selectedVideoExercise} 
          userId={user.uid} 
          onClose={() => setSelectedVideoExercise(null)} 
        />
      )}

      {/* Workout Timer Floating Bar */}
      {isTraining && !selectedDay && (
        <div className="fixed inset-x-0 bottom-24 z-[90] px-5 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-orange-500 text-white rounded-2xl p-4 shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity size={20} className="animate-pulse" />
              <div>
                <p className="text-[10px] font-bold uppercase">Treino em Andamento</p>
                <p className="text-lg font-mono font-bold">
                  {Math.floor(elapsedSeconds / 3600).toString().padStart(2, '0')}:
                  {Math.floor((elapsedSeconds % 3600) / 60).toString().padStart(2, '0')}:
                  {(elapsedSeconds % 60).toString().padStart(2, '0')}
                </p>
              </div>
            </div>
            <button 
              onClick={() => {
                const savedDay = localStorage.getItem(`workout_day_${user?.uid}`);
                if (savedDay) setSelectedDay(parseInt(savedDay));
              }}
              className="bg-white text-orange-500 px-4 py-2 rounded-xl text-xs font-bold uppercase"
            >
              Voltar
            </button>
          </div>
        </div>
      )}

      {/* Completion Modal */}
      {showCompletionModal && completionSummary && (() => {
        const msgInfo = getCompletionMessage(completionSummary.percentCompleted);
        return (
          <div className="fixed inset-0 z-[120] bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm">
            <div className="bg-white rounded-[40px] p-6 w-full max-w-sm animate-in zoom-in-95 duration-300 max-h-[85vh] overflow-y-auto">
              {/* Ícone e Título */}
              <div className="text-center mb-4">
                {msgInfo.icon === "trophy" && (
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trophy size={40} className="text-green-500" />
                  </div>
                )}
                {msgInfo.icon === "award" && (
                  <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Award size={40} className="text-orange-500" />
                  </div>
                )}
                {msgInfo.icon === "target" && (
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Target size={40} className="text-blue-500" />
                  </div>
                )}
                {msgInfo.icon === "alert" && (
                  <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle size={40} className="text-yellow-500" />
                  </div>
                )}
                <h3 className="font-black text-gray-900 text-xl mb-2">{msgInfo.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{msgInfo.message}</p>
              </div>

              {/* Barra de progresso e percentual */}
              {completionSummary.percentCompleted > 0 && (
                <div className="bg-gray-50 rounded-2xl p-4 mb-4 border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Progresso do Treino</span>
                    <span className="text-lg font-black text-gray-900">{completionSummary.percentCompleted}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        completionSummary.percentCompleted === 100 ? "bg-green-500" :
                        completionSummary.percentCompleted >= 51 ? "bg-orange-500" :
                        "bg-blue-500"
                      }`}
                      style={{ width: `${completionSummary.percentCompleted}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-widest">
                    Tempo: {completionSummary.duration}
                  </p>
                </div>
              )}

              {/* Exercícios realizados */}
              {completionSummary.completedExercisesList.length > 0 && (
                <div className="mb-4">
                  <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <CheckCircle2 size={12} />
                    Exercícios Realizados ({completionSummary.completedExercisesList.length})
                  </p>
                  <div className="space-y-1.5 max-h-24 overflow-y-auto">
                    {completionSummary.completedExercisesList.map((ex, i) => (
                      <div key={i} className="text-xs text-gray-700 font-medium bg-green-50 px-3 py-1.5 rounded-xl border border-green-100">
                        {ex}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Exercícios pendentes */}
              {completionSummary.pendingExercisesList.length > 0 && (
                <div className="mb-4">
                  <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <AlertCircle size={12} />
                    Exercícios Pendentes ({completionSummary.pendingExercisesList.length})
                  </p>
                  <div className="space-y-1.5 max-h-24 overflow-y-auto">
                    {completionSummary.pendingExercisesList.map((ex, i) => (
                      <div key={i} className="text-xs text-gray-700 font-medium bg-red-50 px-3 py-1.5 rounded-xl border border-red-100">
                        {ex}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Músculos com menor estímulo */}
              {completionSummary.lessStimulatedMuscles.length > 0 && completionSummary.percentCompleted < 100 && (
                <div className="mb-4">
                  <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <TrendingDown size={12} />
                    Menor Estímulo Muscular
                  </p>
                  <div className="space-y-1.5">
                    {completionSummary.lessStimulatedMuscles.map((muscle, i) => (
                      <div key={i} className="text-xs text-gray-700 font-medium bg-orange-50 px-3 py-1.5 rounded-xl border border-orange-100 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-400" />
                        {muscle}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Próximo Desafio */}
              <div className="bg-gray-50 rounded-2xl p-4 mb-4 text-left border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Próximo Desafio</p>
                <p className="font-black text-gray-900 text-sm">{completionSummary.nextWorkout}</p>
                <p className="text-xs text-orange-500 font-bold">{completionSummary.nextTiming}</p>
              </div>

              <button
                onClick={() => setShowCompletionModal(false)}
                className="w-full bg-black text-white py-4 rounded-3xl font-bold shadow-xl active:scale-95 transition-all"
              >
                FECHAR
              </button>
            </div>
          </div>
        );
      })()}


      {/* Home Workout Confirmation Modal */}
      {showHomeConfirm && pendingHomeDayNumber !== null && (
        <div className="fixed inset-0 z-[120] bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-white rounded-[40px] p-8 w-full max-w-sm text-center animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Home size={32} className="text-blue-500" />
            </div>
            <h3 className="font-black text-gray-900 text-xl mb-2">TREINO EM CASA</h3>
            <p className="text-gray-500 text-sm mb-2 leading-relaxed">
              Os exercícios serão substituídos por versões com <span className="font-bold text-blue-600">peso corporal</span>, adaptadas para o mesmo grupo muscular do treino original.
            </p>
            <p className="text-gray-400 text-xs mb-8 leading-relaxed">
              O treino conta normalmente para o seu progresso e histórico semanal.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowHomeConfirm(false); setPendingHomeDayNumber(null); }}
                className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl font-bold active:scale-95 transition-all"
              >
                CANCELAR
              </button>
              <button
                onClick={handleConfirmHomeWorkout}
                className="flex-1 bg-blue-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-all"
              >
                CONFIRMAR
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 pb-24">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8 px-2">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900">DASHBOARD</h1>
            <p className="text-sm text-gray-500 font-medium">Bem-vindo, {profile?.name || "Atleta"}! 👋</p>
          </div>
          <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-black shadow-sm">
            <Target size={24} />
          </div>
        </div>

        {/* Weekly Progress Card */}
        <div className="bg-black rounded-[32px] p-6 mb-8 text-white relative overflow-hidden shadow-2xl shadow-black/20">
          <div className="relative z-10">
            <div className="flex justify-between items-end mb-4">
              <div>
                <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-1">Progresso Semanal</h3>
                <p className="text-2xl font-black">{userWeekNumber === 1 && weekCompleted === 0 ? "SEMANA 1" : `SEMANA ${userWeekNumber}`}</p>
              </div>
              <span className="text-orange-500 font-black text-xl">{completedDaysSet.size}/{days.length}</span>
            </div>

            {/* Sequência compacta A-B-C-... com indicadores ✓/○ — suporta qualquer número de dias */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
              {days.map((day, index) => {
                const letter = String.fromCharCode(65 + index); // A, B, C, D, E, F, G…
                const isCompleted = completedDaysSet.has(day.dayNumber);
                const isNextPending = !completedDaysSet.has(day.dayNumber) && days.slice(0, index).every(d => completedDaysSet.has(d.dayNumber));
                return (
                  <div key={day.dayNumber} className="flex items-center gap-1.5">
                    <span className={`text-sm font-black transition-colors ${isCompleted ? 'text-green-400' : isNextPending ? 'text-orange-400' : 'text-white/30'}`}>
                      {isCompleted ? '✓' : '○'}
                    </span>
                    <span className={`text-base font-black tracking-wide transition-colors ${isCompleted ? 'text-green-400' : isNextPending ? 'text-orange-400' : 'text-white/60'}`}>
                      {letter}
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="text-[10px] text-white/40 font-medium">
              {(() => {
                const allCompleted = days.every(d => completedDaysSet.has(d.dayNumber));
                if (allCompleted) return "Ciclo completo! Novo ciclo iniciado. 🎉";
                const firstPendingIndex = days.findIndex(d => !completedDaysSet.has(d.dayNumber));
                if (firstPendingIndex === -1) return "Inicie seu treino para começar o ciclo!";
                const letter = String.fromCharCode(65 + firstPendingIndex);
                return `Próximo: ${letter}`;
              })()}
            </p>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <Activity size={120} />
          </div>
        </div>

        {/* Workout Content */}
        {workoutLoading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[32px] border border-gray-100">
            <Loader2 size={40} className="animate-spin text-orange-500 mb-4" />
            <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Carregando Rotina...</p>
          </div>
        ) : days.length === 0 ? (
          <div className="bg-white rounded-[32px] p-10 flex flex-col items-center text-center border border-gray-100 shadow-sm">
            <div className="w-20 h-20 bg-gray-50 rounded-[28px] flex items-center justify-center mb-6">
              <Sparkles className="text-gray-200" size={32} />
            </div>
            <h3 className="font-black text-gray-900 text-lg">VAMOS COMEÇAR?</h3>
            <p className="text-sm text-gray-500 mt-2 max-w-[240px]">Sua IA ainda não gerou seu treino personalizado baseado no seu perfil.</p>
            <button
              onClick={handleGenerateWorkout}
              disabled={generating}
              className="mt-8 w-full bg-black text-white py-5 rounded-3xl font-bold shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-60"
            >
              {generating ? <Loader2 size={20} className="animate-spin" /> : <RefreshCw size={20} />}
              {generating ? "GERANDO TREINO..." : "GERAR TREINO COM IA"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <div>
                <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sua Planilha</h2>
                <p className="text-sm font-black text-gray-900">{activeWorkout?.title}</p>
              </div>
            </div>

            {days.map((day) => (
              <div id={`workout-day-${day.dayNumber}`} key={day.dayNumber} className={`bg-white border transition-all duration-300 rounded-[32px] p-5 shadow-sm ${selectedDay === day.dayNumber ? "border-black ring-1 ring-black" : "border-gray-100"}`}>
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => handleSelectDay(day.dayNumber)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center text-3xl shadow-inner">
                      {day.emoji || "💪"}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Dia {day.dayNumber}</span>
                      <h4 className="font-black text-gray-900 leading-tight text-lg">{day.title?.toUpperCase()}</h4>
                    </div>
                  </div>
                  <div className={`w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center transition-transform ${selectedDay === day.dayNumber ? "rotate-90 bg-black" : ""}`}>
                    <ChevronRight size={18} className={selectedDay === day.dayNumber ? "text-white" : "text-gray-400"} />
                  </div>
                </div>

                {selectedDay === day.dayNumber && (
                  <div className="mt-8 space-y-5 animate-in fade-in slide-in-from-top-4 duration-500">
                    
                    {/* Botão de Iniciar Treino (Cronômetro) + Treino em casa */}
                    <div className="space-y-3 mb-6">
                      {!isTraining && (
                        <button
                          onClick={() => handleStartWorkout(day.dayNumber)}
                          className="w-full bg-black text-white py-4 rounded-3xl font-bold shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                          <Play size={18} fill="white" />
                          INICIAR TREINO AGORA
                        </button>
                      )}
                      {/* Opção de treino em casa — visível sempre que o dia estiver aberto */}
                      <button
                        onClick={() => { setPendingHomeDayNumber(day.dayNumber); setShowHomeConfirm(true); }}
                        className="w-full bg-blue-50 text-blue-600 border border-blue-100 py-3.5 rounded-3xl font-bold active:scale-95 transition-all flex items-center justify-center gap-2 text-sm"
                      >
                        <Home size={16} />
                        Treino em casa
                      </button>
                      {!isTraining && (
                        <div className="flex items-center justify-center gap-2 text-gray-400 py-1">
                          <Info size={14} />
                          <p className="text-xs font-bold uppercase tracking-widest">Inicie o treino para registrar sua execução.</p>
                        </div>
                      )}
                    </div>

                    {/* Cronômetro Ativo na tela do treino */}
                    {isTraining && (
                      <div className="bg-orange-50 rounded-3xl p-5 border border-orange-100 flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Timer size={20} className="text-orange-500 animate-pulse" />
                          <div>
                            <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Tempo de Treino</p>
                            <p className="text-xl font-mono font-bold text-orange-600">
                              {Math.floor(elapsedSeconds / 3600).toString().padStart(2, '0')}:
                              {Math.floor((elapsedSeconds % 3600) / 60).toString().padStart(2, '0')}:
                              {(elapsedSeconds % 60).toString().padStart(2, '0')}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {getEffectiveExercises(day.dayNumber, day.exercises).map((ex, idx) => (
                      <div key={idx} className="bg-gray-50 rounded-3xl p-5 border border-gray-100">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <h5 className="font-black text-gray-900 text-sm leading-tight mb-1">{ex.name?.toUpperCase()}</h5>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                              {ex.reps} reps · {ex.rest} de descanso
                            </p>
                            {ex.notes && <p className="text-[11px] text-gray-500 mt-1 italic">{ex.notes}</p>}
                          </div>
                          <div className="flex flex-col gap-2 items-end">
                            <button
                              onClick={() => setSelectedVideoExercise(ex.name)}
                              className="flex items-center gap-1.5 text-[10px] font-black text-orange-500 uppercase tracking-widest bg-orange-50 px-3 py-1.5 rounded-full hover:bg-orange-100 transition-colors"
                            >
                              <Play size={10} fill="currentColor" />
                              Como Fazer
                            </button>
                            <button
                              onClick={() => handleMarkAllSetsOfExercise(day.dayNumber, idx, ex.sets)}
                              disabled={!isTraining}
                              className={`text-[10px] px-3 py-1.5 rounded-full font-bold uppercase tracking-tighter shrink-0 transition-all ${
                                isTraining 
                                  ? "bg-black text-white hover:bg-gray-800 active:scale-95 cursor-pointer" 
                                  : "bg-gray-100 text-gray-300 cursor-not-allowed"
                              }`}
                            >
                              {ex.sets} séries
                            </button>
                          </div>
                        </div>

                        {/* Campo de Carga */}
                        <div className="mb-4 flex items-center gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                          <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500">
                            <Weight size={16} />
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Carga Utilizada</p>
                            <div className="flex items-center gap-2">
                              <input 
                                type="number" 
                                placeholder="0"
                                value={exerciseLoads[ex.name.toLowerCase()] || ""}
                                onChange={(e) => setExerciseLoads(prev => ({ ...prev, [ex.name.toLowerCase()]: e.target.value }))}
                                onBlur={(e) => {
                                  const val = parseFloat(e.target.value);
                                  if (user && !isNaN(val) && val > 0) {
                                    firestoreService.saveExerciseWeight(user.uid, ex.name, val);
                                  }
                                }}
                                disabled={!isTraining}
                                className="bg-transparent border-none p-0 text-sm font-black text-gray-900 focus:ring-0 w-16"
                              />
                              <span className="text-xs font-bold text-gray-400">kg</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {Array.from({ length: ex.sets }).map((_, sIdx) => {
                            const isDone = completedSets[`${day.dayNumber}-${idx}-${sIdx}`];
                            return (
                              <button
                                key={sIdx}
                                onClick={() => toggleSet(day.dayNumber, idx, sIdx, ex.rest)}
                                disabled={!isTraining}
                                className={`w-11 h-11 rounded-2xl border-2 flex items-center justify-center text-xs font-black transition-all ${
                                  isDone 
                                    ? "bg-green-500 border-green-500 text-white shadow-lg shadow-green-200" 
                                    : isTraining 
                                      ? "bg-white border-gray-100 text-gray-300 hover:border-black hover:text-black cursor-pointer"
                                      : "bg-gray-50 border-gray-50 text-gray-200 cursor-not-allowed"
                                }`}
                              >
                                {isDone ? "✓" : sIdx + 1}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {/* Botão de concluir treino do dia */}
                    {isTraining && (
                      <button
                        onClick={() => handleCompleteDay(day.dayNumber)}
                        className="w-full bg-green-500 text-white py-4 rounded-3xl font-bold shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 size={18} />
                        CONCLUIR TREINO DO DIA {day.dayNumber}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
