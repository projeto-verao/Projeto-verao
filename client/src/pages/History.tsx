import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { firestoreService, BodyProgressEntry } from "@/hooks/useFirebaseFirestore";
import { ArrowLeft, Loader2, TrendingUp, Scale, Percent, Ruler, Calendar, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function History() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, loading } = useAuth();

  // Redireciona para login se não autenticado
  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, loading, navigate]);

  const [history, setHistory] = useState<BodyProgressEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const list = await firestoreService.getBodyProgressHistory(user.uid, 50);
      setHistory(list);
    } catch (err) {
      console.error("Erro ao carregar histórico:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { if (user) loadHistory(); }, [user, loadHistory]);

  // Prepara dados para o gráfico (ordem cronológica)
  const chartData = [...history]
    .reverse()
    .filter(h => h.weightKg || h.bodyFatPercent)
    .map(h => ({
      date: new Date(h.createdAt.toMillis()).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      peso: h.weightKg,
      bf: h.bodyFatPercent
    }));

  // Calcula a diferença entre o primeiro e o último registro
  const latest = history[0];
  const oldest = history[history.length - 1];
  
  const weightDiff = latest && oldest && latest.weightKg && oldest.weightKg ? (latest.weightKg - oldest.weightKg).toFixed(1) : null;
  const bfDiff = latest && oldest && latest.bodyFatPercent && oldest.bodyFatPercent ? (latest.bodyFatPercent - oldest.bodyFatPercent).toFixed(1) : null;

  return (
    <AppLayout title="Evolução">
      {/* Header */}
      <div className="px-5 pt-6 pb-2">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")} className="p-2 bg-gray-100 rounded-xl">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight">Sua Evolução</h1>
            <p className="text-xs text-gray-500 font-medium">Acompanhe seus resultados ao longo do tempo.</p>
          </div>
        </div>
      </div>

      <div className="px-5 py-4 space-y-6 pb-24">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        ) : history.length === 0 ? (
          <div className="bg-white rounded-[32px] p-10 flex flex-col items-center text-center border border-gray-100 shadow-sm">
            <div className="w-20 h-20 bg-gray-50 rounded-[28px] flex items-center justify-center mb-6 text-gray-300">
              <TrendingUp size={40} />
            </div>
            <h3 className="font-black text-gray-900 text-lg uppercase">Nenhum registro</h3>
            <p className="text-sm text-gray-500 mt-2">
              Adicione fotos e medidas na tela do Coach IA para ver seu progresso aqui.
            </p>
            <button
              onClick={() => navigate("/trainer")}
              className="mt-8 w-full bg-black text-white py-4 rounded-2xl font-bold shadow-xl active:scale-95 transition-all"
            >
              IR PARA O COACH IA
            </button>
          </div>
        ) : (
          <>
            {/* Cards de Comparação */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-black rounded-3xl p-5 text-white shadow-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Scale size={16} className="text-orange-500" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Peso Total</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black">{latest?.weightKg || "--"}</span>
                  <span className="text-xs font-bold text-gray-400">kg</span>
                </div>
                {weightDiff && (
                  <div className={`text-[10px] font-bold mt-2 flex items-center gap-1 ${parseFloat(weightDiff) <= 0 ? "text-green-400" : "text-red-400"}`}>
                    {parseFloat(weightDiff) > 0 ? "+" : ""}{weightDiff}kg desde o início
                  </div>
                )}
              </div>

              <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Percent size={16} className="text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Gordura (BF)</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-gray-900">{latest?.bodyFatPercent || "--"}</span>
                  <span className="text-xs font-bold text-gray-500">%</span>
                </div>
                {bfDiff && (
                  <div className={`text-[10px] font-bold mt-2 flex items-center gap-1 ${parseFloat(bfDiff) <= 0 ? "text-green-500" : "text-red-500"}`}>
                    {parseFloat(bfDiff) > 0 ? "+" : ""}{bfDiff}% desde o início
                  </div>
                )}
              </div>
            </div>

            {/* Gráfico de Peso */}
            <div className="bg-white border border-gray-100 rounded-[32px] p-6 shadow-sm">
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-6">Variação de Peso</h3>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#999'}} />
                    <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                    />
                    <Line type="monotone" dataKey="peso" stroke="#f97316" strokeWidth={4} dot={{ r: 4, fill: '#f97316', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Histórico Detalhado */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest px-2">Registros Anteriores</h3>
              <div className="space-y-3">
                {history.map((entry) => (
                  <div key={entry.id} className="bg-white border border-gray-100 rounded-3xl p-4 flex items-center gap-4 shadow-sm">
                    <div className="w-16 h-16 rounded-2xl bg-gray-50 overflow-hidden flex-shrink-0 border border-gray-100">
                      {entry.photoUrl ? (
                        <img src={entry.photoUrl} alt="Evolução" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <Calendar size={20} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <p className="text-xs font-bold text-gray-900">
                          {new Date(entry.createdAt.toMillis()).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                        </p>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">{new Date(entry.createdAt.toMillis()).getFullYear()}</span>
                      </div>
                      <div className="flex gap-3 mt-1">
                        {entry.weightKg && (
                          <div className="flex items-center gap-1 text-[11px] font-bold text-gray-600">
                            <Scale size={10} className="text-orange-500" /> {entry.weightKg}kg
                          </div>
                        )}
                        {entry.bodyFatPercent && (
                          <div className="flex items-center gap-1 text-[11px] font-bold text-gray-600">
                            <Percent size={10} className="text-primary" /> {entry.bodyFatPercent}% BF
                          </div>
                        )}
                      </div>
                      {entry.notes && <p className="text-[10px] text-gray-400 mt-1 line-clamp-1 italic">"{entry.notes}"</p>}
                    </div>
                    <button className="p-2 text-gray-300">
                      <ArrowRight size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
