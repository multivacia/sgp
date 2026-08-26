import React, { useState, createContext, useContext } from "react";
import {
  ClipboardList, CalendarDays, Search, Palette, ChevronLeft, ChevronRight,
  Clock, Printer, CheckCircle2, X, GripVertical, AlertTriangle, Sparkles, Check,
  ListOrdered, ChevronUp, ChevronDown,
} from "lucide-react";

/* ============================================================
   TEMAS — mesmos tokens reais de src/styles/semantic-tokens.css
   ============================================================ */
const THEMES = {
  "argos-dark": {
    label: "Argos Dark", swatch: "#c9a227",
    bg: "#050a12", surface: "#101824", surfaceRaised: "#152a3d", surfaceHi: "#1a2433",
    border: "rgba(255,255,255,0.08)", borderStrong: "rgba(255,255,255,0.14)",
    textPrimary: "#f8fafc", textSecondary: "#cbd5e1", textMuted: "#94a3b8", textSoft: "#64748b",
    accent: "#c9a227", accentStrong: "#e0c463", accentDeep: "#a88620", accentSoft: "rgba(201,162,39,0.14)",
    status: {
      info: { bg: "rgba(59,130,246,0.10)", border: "rgba(59,130,246,0.35)", text: "#bfdbfe" },
      success: { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.35)", text: "#a7f3d0" },
      warning: { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.40)", text: "#fde68a" },
      danger: { bg: "rgba(244,63,94,0.12)", border: "rgba(244,63,94,0.35)", text: "#fecdd3" },
      neutral: { bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.12)", text: "#94a3b8" },
    },
  },
  "slate-dark": {
    label: "Slate Dark", swatch: "#c9a227",
    bg: "#0b1120", surface: "#0f172a", surfaceRaised: "#1e293b", surfaceHi: "#182132",
    border: "rgba(255,255,255,0.08)", borderStrong: "rgba(255,255,255,0.13)",
    textPrimary: "#f8fafc", textSecondary: "#cbd5e1", textMuted: "#94a3b8", textSoft: "#64748b",
    accent: "#c9a227", accentStrong: "#e0c463", accentDeep: "#a88620", accentSoft: "rgba(201,162,39,0.13)",
    status: {
      info: { bg: "rgba(59,130,246,0.10)", border: "rgba(59,130,246,0.35)", text: "#bfdbfe" },
      success: { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.35)", text: "#a7f3d0" },
      warning: { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.40)", text: "#fde68a" },
      danger: { bg: "rgba(244,63,94,0.12)", border: "rgba(244,63,94,0.35)", text: "#fecdd3" },
      neutral: { bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.12)", text: "#94a3b8" },
    },
  },
  "light-executive": {
    label: "Light Executive", swatch: "#d97706",
    bg: "#f3f6fa", surface: "#ffffff", surfaceRaised: "#f8fafc", surfaceHi: "#eef3f8",
    border: "#b4c3d7", borderStrong: "#7f93ae",
    textPrimary: "#0f172a", textSecondary: "#334155", textMuted: "#64748b", textSoft: "#94a3b8",
    accent: "#d97706", accentStrong: "#b45309", accentDeep: "#92400e", accentSoft: "#fff7e6",
    status: {
      info: { bg: "#e8f1f8", border: "#7aa9c7", text: "#1e3a5f" },
      success: { bg: "#ecfdf5", border: "#10b981", text: "#065f46" },
      warning: { bg: "#fff7e6", border: "#f59e0b", text: "#92400e" },
      danger: { bg: "#fef2f2", border: "#e11d48", text: "#9f1239" },
      neutral: { bg: "#f3f4f6", border: "#d1d5db", text: "#374151" },
    },
  },
};

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
.font-display{font-family:'Oswald',sans-serif; letter-spacing:.02em;}
.font-body{font-family:'IBM Plex Sans',sans-serif;}
.font-mono{font-family:'IBM Plex Mono',monospace;}
::-webkit-scrollbar{width:8px;height:8px;}
::-webkit-scrollbar-track{background:transparent;}
button:focus-visible,[tabindex]:focus-visible{outline:2px solid var(--focus-ring,#c9a227);outline-offset:2px;}
`;

const ThemeCtx = createContext(THEMES["argos-dark"]);
const useTheme = () => useContext(ThemeCtx);

/* ============================================================
   PRIMITIVOS
   ============================================================ */
function ThemeSwitcher({ temaId, setTemaId }) {
  const t = useTheme();
  return (
    <div className="flex items-center gap-1.5 p-1 rounded-sm" style={{ background: t.surfaceRaised, border: `1px solid ${t.border}` }}>
      <Palette size={13} style={{ color: t.textSoft, marginLeft: 4 }} />
      {Object.entries(THEMES).map(([id, th]) => (
        <button key={id} onClick={() => setTemaId(id)} className="flex items-center gap-1.5 px-2 py-1 rounded-sm font-mono text-[10px] uppercase transition-colors" style={{ background: temaId === id ? t.accentSoft : "transparent", color: temaId === id ? t.accent : t.textMuted, border: temaId === id ? `1px solid ${t.accent}` : "1px solid transparent" }}>
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: th.swatch, border: `1px solid ${t.border}` }} />
          <span className="hidden md:inline">{th.label}</span>
        </button>
      ))}
    </div>
  );
}

function Avatar({ nome, size = 24 }) {
  const t = useTheme();
  const roleMap = { Val: "warning", Bruno: "info", Edu: "success", Marli: "warning", Sula: "danger" };
  const s = t.status[roleMap[nome] || "neutral"];
  return (
    <div className="rounded-full flex items-center justify-center font-display font-medium shrink-0" style={{ width: size, height: size, background: s.border, color: t.bg, fontSize: size * 0.42 }} title={nome}>
      {nome.slice(0, 2).toUpperCase()}
    </div>
  );
}

function Pill({ role, children }) {
  const t = useTheme();
  const s = t.status[role];
  return (
    <span className="font-mono text-[11px] uppercase tracking-wide px-2 py-1 rounded-sm inline-flex items-center gap-1.5 whitespace-nowrap" style={{ color: s.text, background: s.bg, border: `1px solid ${s.border}` }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.text }} />
      {children}
    </span>
  );
}

function formatMin(min) {
  const h = Math.floor(min / 60), m = min % 60;
  if (h > 0) return `${h}h${m > 0 ? String(m).padStart(2, "0") : ""}`;
  return `${m}min`;
}

/* ============================================================
   DADOS MOCK
   ============================================================ */
const BUCKETS = [
  { id: "em_elaboracao", label: "Em elaboração", role: "neutral" },
  { id: "aguardando_planejamento", label: "Aguardando planejamento", role: "warning" },
  { id: "em_planejamento", label: "Em planejamento", role: "warning" },
  { id: "em_execucao", label: "Em execução", role: "info" },
  { id: "em_atraso", label: "Em atraso", role: "danger" },
  { id: "finalizadas", label: "Finalizadas", role: "success" },
];

const PRIORIDADES = { BAIXA: "neutral", MEDIA: "info", ALTA: "warning", URGENTE: "danger" };

const BACKLOG_ROWS = [
  { id: "b1", ref: "OS-4471", nome: "Mercedes W113 Pagoda", origem: "manual", atividades: 10, responsavel: "Bruno", prioridade: "ALTA", bucket: "em_execucao", entrada: "12/08", prazo: "28/08" },
  { id: "b2", ref: "OS-4488", nome: "Porsche 911 SC", origem: "documento", atividades: 6, responsavel: "Edu", prioridade: "MEDIA", bucket: "em_planejamento", entrada: "18/08", prazo: "—" },
  { id: "b3", ref: "OS-4502", nome: "Fusca 1974", origem: "base", atividades: 0, responsavel: "—", prioridade: "BAIXA", bucket: "aguardando_planejamento", entrada: "20/08", prazo: "—" },
  { id: "b4", ref: "OS-4459", nome: "Jaguar E-Type", origem: "manual", atividades: 9, responsavel: "Val", prioridade: "MEDIA", bucket: "finalizadas", entrada: "02/08", prazo: "concluída 12/08" },
  { id: "b5", ref: "OS-4495", nome: "Opala SS", origem: "hybrid", atividades: 7, responsavel: "Marli", prioridade: "URGENTE", bucket: "em_atraso", entrada: "08/08", prazo: "22/08 (atraso)" },
  { id: "b6", ref: "OS-4510", nome: "Chevrolet Chevette", origem: "manual", atividades: 0, responsavel: "—", prioridade: "BAIXA", bucket: "em_elaboracao", entrada: "24/08", prazo: "—" },
];

const COLABORADORES = ["Val", "Bruno", "Edu", "Marli", "Sula"];
const CAPACIDADE_DIA_MIN = 480; // 8h
const DIAS = [
  { key: "seg", label: "Seg", data: "25/08" },
  { key: "ter", label: "Ter", data: "26/08" },
  { key: "qua", label: "Qua", data: "27/08" },
  { key: "qui", label: "Qui", data: "28/08" },
  { key: "sex", label: "Sex", data: "29/08" },
];

/* Sequência padrão por setor — peso do colaborador dentro da equipe (posição = prioridade).
   Um colaborador pode aparecer em mais de uma sequência (setores diferentes), com posições
   diferentes em cada uma — o peso é por par (setor, colaborador), não global à pessoa. */
const SETOR_SEQUENCIA_PADRAO = {
  Funilaria: ["Bruno", "Val", "Edu"],
  Marcenaria: ["Edu"],
  Costura: ["Marli", "Sula"],
  Montagem: ["Val", "Sula"],
};

function seq(setor) { return [...(SETOR_SEQUENCIA_PADRAO[setor] || [])]; }

const ITENS_INICIAIS = [
  { id: "i1", nome: "Costura banco dianteiro", esteira: "OS-4471", setor: "Costura", orderIndex: 3, min: 90, prioridade: "ALTA", assignedTo: "Marli", dia: "seg", sequencia: seq("Costura") },
  { id: "i2", nome: "Remover carpete", esteira: "OS-4471", setor: "Funilaria", orderIndex: 1, min: 25, prioridade: "MEDIA", assignedTo: "Bruno", dia: "seg", sequencia: seq("Funilaria") },
  { id: "i3", nome: "Reforço de espuma", esteira: "OS-4471", setor: "Marcenaria", orderIndex: 2, min: 50, prioridade: "MEDIA", assignedTo: "Edu", dia: "ter", sequencia: seq("Marcenaria") },
  { id: "i4", nome: "Costura painel de porta", esteira: "OS-4495", setor: "Costura", orderIndex: 3, min: 70, prioridade: "URGENTE", assignedTo: "Marli", dia: "seg", sequencia: seq("Costura") },
  { id: "i5", nome: "Corte de courino", esteira: "OS-4471", setor: "Costura", orderIndex: 4, min: 45, prioridade: "MEDIA", assignedTo: null, dia: null, sequencia: seq("Costura") },
  { id: "i6", nome: "Costura banco traseiro", esteira: "OS-4471", setor: "Costura", orderIndex: 5, min: 75, prioridade: "ALTA", assignedTo: null, dia: null, sequencia: seq("Costura") },
  { id: "i7", nome: "Instalar bancos", esteira: "OS-4495", setor: "Montagem", orderIndex: 6, min: 40, prioridade: "BAIXA", assignedTo: null, dia: null, sequencia: seq("Montagem") },
  { id: "i8", nome: "Ajuste de trilhos", esteira: "OS-4471", setor: "Marcenaria", orderIndex: 2, min: 30, prioridade: "MEDIA", assignedTo: "Val", dia: "qua", sequencia: seq("Marcenaria") },
  { id: "i9", nome: "Revisão de acabamento", esteira: "OS-4471", setor: "Montagem", orderIndex: 6, min: 35, prioridade: "BAIXA", assignedTo: null, dia: null, sequencia: seq("Montagem") },
  { id: "i10", nome: "Remover bancos", esteira: "OS-4495", setor: "Funilaria", orderIndex: 1, min: 55, prioridade: "URGENTE", assignedTo: null, dia: null, sequencia: seq("Funilaria") },
];

function move(arr, i, dir) {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const copy = [...arr];
  [copy[i], copy[j]] = [copy[j], copy[i]];
  return copy;
}

const PRIORIDADE_PESO = { URGENTE: 0, ALTA: 1, MEDIA: 2, BAIXA: 3 };

/**
 * Heurística gulosa de sugestão de planejamento — spec §4 + adendo §9 (sequência priorizada).
 * Não muta nada: recebe o estado atual e devolve propostas + itens que não couberam.
 * Nunca reconsidera itens já alocados (assignedTo preenchido é imutável pro algoritmo).
 * Candidato não é mais "pool plano do setor" — é a sequência específica da atividade,
 * herdada da esteira/matriz e revisável antes de sugerir.
 */
function gerarSugestoes(itens) {
  const alocados = itens.filter((it) => it.assignedTo);
  const backlog = itens.filter((it) => !it.assignedTo);

  // reserva de capacidade por colaborador/dia, começando do que já está confirmado
  const reservado = {};
  for (const it of alocados) {
    const k = `${it.assignedTo}-${it.dia}`;
    reservado[k] = (reservado[k] || 0) + it.min;
  }

  const ordenados = [...backlog].sort((a, b) => {
    const p = PRIORIDADE_PESO[a.prioridade] - PRIORIDADE_PESO[b.prioridade];
    if (p !== 0) return p;
    return (a.orderIndex ?? 99) - (b.orderIndex ?? 99);
  });

  const sugestoes = [];
  const naoCoube = [];

  for (const item of ordenados) {
    const sequencia = item.sequencia && item.sequencia.length > 0 ? item.sequencia : [];
    if (sequencia.length === 0) {
      naoCoube.push({ item, motivo: `Atividade sem sequência de colaboradores definida para ${item.setor}.` });
      continue;
    }

    let melhor = null; // { colaborador, dia, livre, posicao }
    for (let pos = 0; pos < sequencia.length; pos++) {
      const col = sequencia[pos];
      for (const dia of DIAS.map((d) => d.key)) {
        const usado = reservado[`${col}-${dia}`] || 0;
        const livre = CAPACIDADE_DIA_MIN - usado;
        if (livre >= item.min) { melhor = { colaborador: col, dia, livre, posicao: pos + 1 }; break; }
      }
      if (melhor) break; // já achou no colaborador de maior prioridade disponível — não desce mais
    }

    if (!melhor) {
      naoCoube.push({ item, motivo: `Ninguém da sequência de ${item.setor} (${sequencia.join(" > ")}) tem ${formatMin(item.min)} livres nesta semana.` });
      continue;
    }

    reservado[`${melhor.colaborador}-${melhor.dia}`] = (reservado[`${melhor.colaborador}-${melhor.dia}`] || 0) + item.min;
    const diaLabel = DIAS.find((d) => d.key === melhor.dia).label;
    const prioridadeTxt = (item.prioridade === "URGENTE" || item.prioridade === "ALTA") ? `, prioridade ${item.prioridade.toLowerCase()}` : "";
    const motivo = melhor.posicao === 1
      ? `${melhor.colaborador} — ${diaLabel}: ${formatMin(melhor.livre)} livres, 1ª opção de ${item.setor}${prioridadeTxt}.`
      : `${melhor.colaborador} — ${diaLabel}: ${formatMin(melhor.livre)} livres, ${melhor.posicao}ª opção de ${item.setor} (1ª sem capacidade esta semana)${prioridadeTxt}.`;
    sugestoes.push({ itemId: item.id, colaborador: melhor.colaborador, dia: melhor.dia, motivo });
  }

  return { sugestoes, naoCoube };
}

/* ============================================================
   TELA 1 — BACKLOG OPERACIONAL
   ============================================================ */
function TelaBacklog() {
  const t = useTheme();
  const [busca, setBusca] = useState("");
  const [bucketAtivo, setBucketAtivo] = useState(null);
  const [prioridadeAtiva, setPrioridadeAtiva] = useState(null);

  const contagem = BUCKETS.reduce((acc, b) => { acc[b.id] = BACKLOG_ROWS.filter((r) => r.bucket === b.id).length; return acc; }, {});

  const filtradas = BACKLOG_ROWS.filter((r) => {
    const okBusca = !busca || r.nome.toLowerCase().includes(busca.toLowerCase()) || r.ref.toLowerCase().includes(busca.toLowerCase());
    const okBucket = !bucketAtivo || r.bucket === bucketAtivo;
    const okPrioridade = !prioridadeAtiva || r.prioridade === prioridadeAtiva;
    return okBusca && okBucket && okPrioridade;
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl" style={{ color: t.textPrimary }}>Backlog operacional</h1>
        <p className="font-body text-sm mt-1" style={{ color: t.textMuted }}>{BACKLOG_ROWS.length} esteiras no radar · clique num indicador para filtrar</p>
      </div>

      <div className="grid gap-2.5 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
        {BUCKETS.map((b) => {
          const s = t.status[b.role];
          const ativo = bucketAtivo === b.id;
          return (
            <button key={b.id} onClick={() => setBucketAtivo(ativo ? null : b.id)} className="text-left px-3 py-2.5 rounded-sm transition-transform" style={{ background: s.bg, border: `1px solid ${ativo ? s.text : s.border}`, boxShadow: ativo ? `0 0 0 1px ${s.text}` : "none" }}>
              <div className="font-display text-2xl" style={{ color: s.text }}>{contagem[b.id]}</div>
              <div className="font-mono text-[10px] uppercase" style={{ color: s.text }}>{b.label}</div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-2 rounded-sm flex-1 min-w-[220px]" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <Search size={15} style={{ color: t.textSoft }} />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por OS ou veículo" className="bg-transparent font-body text-sm outline-none w-full" style={{ color: t.textPrimary }} />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {Object.keys(PRIORIDADES).map((p) => {
            const ativo = prioridadeAtiva === p;
            return (
              <button key={p} onClick={() => setPrioridadeAtiva(ativo ? null : p)} className="px-3 py-1.5 rounded-sm font-mono text-[11px] uppercase" style={{ background: ativo ? t.accentSoft : t.surface, color: ativo ? t.accent : t.textMuted, border: `1px solid ${ativo ? t.accent : t.border}` }}>
                {p}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-sm overflow-hidden" style={{ border: `1px solid ${t.border}` }}>
        {filtradas.map((r, i) => {
          const bucket = BUCKETS.find((b) => b.id === r.bucket);
          return (
            <div key={r.id} className="flex items-center gap-3 px-4 py-3 flex-wrap" style={{ background: t.surface, borderTop: i > 0 ? `1px solid ${t.border}` : "none" }}>
              <div className="min-w-[180px]">
                <div className="font-mono text-[11px]" style={{ color: t.textSoft }}>{r.ref}</div>
                <div className="font-display text-base" style={{ color: t.textPrimary }}>{r.nome}</div>
              </div>
              <span className="font-mono text-[11px]" style={{ color: t.textMuted }}>{r.atividades} ativ.</span>
              {r.responsavel !== "—" ? <Avatar nome={r.responsavel} size={22} /> : <span className="font-mono text-[11px]" style={{ color: t.textSoft }}>sem responsável</span>}
              <Pill role={PRIORIDADES[r.prioridade]}>{r.prioridade}</Pill>
              <Pill role={bucket.role}>{bucket.label}</Pill>
              <div className="ml-auto text-right">
                <div className="font-mono text-[11px]" style={{ color: t.textSoft }}>entrou {r.entrada}</div>
                <div className="font-mono text-[11px]" style={{ color: r.bucket === "em_atraso" ? t.status.danger.text : t.textSoft }}>{r.prazo}</div>
              </div>
            </div>
          );
        })}
        {filtradas.length === 0 && (
          <div className="p-8 text-center font-body text-sm" style={{ background: t.surface, color: t.textMuted }}>Nada por aqui com esses filtros.</div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   TELA 2 — AGENDA SEMANAL (grade colaborador × dia, drag-and-drop nativo)
   ============================================================ */
function CardItem({ item, draggable, onDragStart, onClick, onRemover, selecionado }) {
  const t = useTheme();
  const s = t.status[PRIORIDADES[item.prioridade]];
  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onClick}
      className="w-full text-left rounded-sm px-2.5 py-2 mb-1.5 transition-transform"
      style={{
        background: selecionado ? t.accentSoft : t.surfaceRaised,
        border: `1px solid ${selecionado ? t.accent : s.border}`,
        borderLeft: `3px solid ${s.text}`,
        boxShadow: selecionado ? `0 0 0 1px ${t.accent}` : "none",
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-body text-xs leading-tight" style={{ color: t.textPrimary }}>{item.nome}</span>
        {onRemover && (
          <span onClick={(e) => { e.stopPropagation(); onRemover(); }} className="shrink-0">
            <X size={12} style={{ color: t.textSoft }} />
          </span>
        )}
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="font-mono text-[10px]" style={{ color: t.textSoft }}>{item.esteira}</span>
        <span className="font-mono text-[10px]" style={{ color: t.textMuted }}>{formatMin(item.min)}</span>
      </div>
    </button>
  );
}

function SuggestionCard({ item, motivo, onAceitar, onRejeitar }) {
  const t = useTheme();
  return (
    <div className="rounded-sm px-2.5 py-2 mb-1.5" style={{ background: t.accentSoft, border: `1px dashed ${t.accent}` }}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="font-mono text-[9px] uppercase" style={{ color: t.accent }}>sugestão</span>
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); onAceitar(); }} title="Aceitar" className="p-0.5"><Check size={13} style={{ color: t.status.success.text }} /></button>
          <button onClick={(e) => { e.stopPropagation(); onRejeitar(); }} title="Rejeitar" className="p-0.5"><X size={13} style={{ color: t.textSoft }} /></button>
        </div>
      </div>
      <div className="font-body text-xs leading-tight mb-1" style={{ color: t.textPrimary }}>{item.nome}</div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-mono text-[10px]" style={{ color: t.textSoft }}>{item.esteira}</span>
        <span className="font-mono text-[10px]" style={{ color: t.textMuted }}>{formatMin(item.min)}</span>
      </div>
      <p className="font-body text-[11px] leading-snug" style={{ color: t.textSecondary }}>{motivo}</p>
    </div>
  );
}

function SequenciaEditor({ item, onMover, forcarAberto }) {
  const t = useTheme();
  const [aberto, setAberto] = useState(!!forcarAberto);
  React.useEffect(() => { if (forcarAberto) setAberto(true); }, [forcarAberto]);
  return (
    <div className="mb-1.5 -mt-1">
      <button onClick={() => setAberto((a) => !a)} className="flex items-center gap-1 font-mono text-[10px] px-1 py-0.5" style={{ color: forcarAberto ? t.accent : t.textSoft }}>
        <ListOrdered size={10} />
        {item.sequencia.join(" > ")}
        {aberto ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
      </button>
      {forcarAberto && (
        <p className="font-body text-[11px] px-1 mb-1" style={{ color: t.accent }}>
          Sugestão rejeitada — revise a sequência abaixo se quiser evitar a mesma sugestão da próxima vez.
        </p>
      )}
      {aberto && (
        <div className="rounded-sm p-2 mt-1" style={{ background: t.surfaceHi, border: `1px solid ${forcarAberto ? t.accent : t.border}` }}>
          {item.sequencia.map((nome, i) => (
            <div key={nome} className="flex items-center gap-2 py-0.5">
              <span className="font-mono text-[10px] w-4" style={{ color: t.textSoft }}>{i + 1}º</span>
              <Avatar nome={nome} size={18} />
              <span className="font-body text-xs flex-1" style={{ color: t.textSecondary }}>{nome}</span>
              <button onClick={() => onMover(i, -1)} disabled={i === 0} className="disabled:opacity-20"><ChevronUp size={13} style={{ color: t.textMuted }} /></button>
              <button onClick={() => onMover(i, 1)} disabled={i === item.sequencia.length - 1} className="disabled:opacity-20"><ChevronDown size={13} style={{ color: t.textMuted }} /></button>
            </div>
          ))}
          <p className="font-body text-[10px] mt-1.5" style={{ color: t.textSoft }}>Herdado da esteira — reordenar aqui vale só pra esta atividade.</p>
        </div>
      )}
    </div>
  );
}

function TelaAgenda() {
  const t = useTheme();
  const [itens, setItens] = useState(ITENS_INICIAIS);
  const [semana, setSemana] = useState("25 – 29 de agosto");
  const [dragId, setDragId] = useState(null);
  const [selecionadoId, setSelecionadoId] = useState(null);
  const [flashCelula, setFlashCelula] = useState(null);
  const [sugestoes, setSugestoes] = useState([]); // [{itemId, colaborador, dia, motivo}]
  const [naoCoube, setNaoCoube] = useState([]);   // [{item, motivo}]
  const [rejeitadoId, setRejeitadoId] = useState(null);

  const backlog = itens.filter((it) => !it.assignedTo && !sugestoes.some((s) => s.itemId === it.id));
  const itemSelecionado = itens.find((it) => it.id === selecionadoId) ?? null;

  function sugerirPlano() {
    const { sugestoes: novas, naoCoube: fora } = gerarSugestoes(itens);
    setSugestoes(novas);
    setNaoCoube(fora);
    setSelecionadoId(null);
    setRejeitadoId(null);
  }

  function aceitarSugestao(itemId) {
    const s = sugestoes.find((x) => x.itemId === itemId);
    if (!s) return;
    setItens((prev) => prev.map((it) => it.id === itemId ? { ...it, assignedTo: s.colaborador, dia: s.dia } : it));
    setSugestoes((prev) => prev.filter((x) => x.itemId !== itemId));
  }
  function rejeitarSugestao(itemId) {
    setSugestoes((prev) => prev.filter((x) => x.itemId !== itemId));
    setRejeitadoId(itemId);
  }
  function aceitarTodas() {
    setItens((prev) => prev.map((it) => {
      const s = sugestoes.find((x) => x.itemId === it.id);
      return s ? { ...it, assignedTo: s.colaborador, dia: s.dia } : it;
    }));
    setSugestoes([]);
  }
  function descartarSugestoes() {
    setSugestoes([]);
    setNaoCoube([]);
  }

  function selecionar(id) {
    setSelecionadoId((prev) => (prev === id ? null : id));
  }

  function alocarEm(colaborador, dia) {
    const id = dragId ?? selecionadoId;
    if (!id) return;
    setItens((prev) => prev.map((it) => it.id === id ? { ...it, assignedTo: colaborador, dia } : it));
    setDragId(null);
    setSelecionadoId(null);
    setFlashCelula(`${colaborador}-${dia}`);
    setTimeout(() => setFlashCelula(null), 500);
  }
  function devolverAoBacklog() {
    const id = dragId ?? selecionadoId;
    if (!id) return;
    setItens((prev) => prev.map((it) => it.id === id ? { ...it, assignedTo: null, dia: null } : it));
    setDragId(null);
    setSelecionadoId(null);
  }

  const minutosPorCelula = (colaborador, dia) => itens.filter((it) => it.assignedTo === colaborador && it.dia === dia).reduce((s, it) => s + it.min, 0);
  const minutosPorColaborador = (colaborador) => itens.filter((it) => it.assignedTo === colaborador).reduce((s, it) => s + it.min, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl" style={{ color: t.textPrimary }}>Agenda semanal</h1>
          <p className="font-body text-sm mt-1" style={{ color: t.textMuted }}>Toque numa atividade e depois no dia — a sugestão segue a sequência de colaboradores de cada atividade, revisável antes de gerar</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-sm" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <button><ChevronLeft size={15} style={{ color: t.textMuted }} /></button>
          <span className="font-mono text-xs" style={{ color: t.textPrimary }}>{semana}</span>
          <button><ChevronRight size={15} style={{ color: t.textMuted }} /></button>
        </div>
        <button onClick={sugerirPlano} className="flex items-center gap-1.5 px-4 py-2.5 rounded-sm font-display text-sm uppercase" style={{ background: t.accent, color: t.bg }}>
          <Sparkles size={15} /> Sugerir plano
        </button>
      </div>

      {sugestoes.length > 0 && (
        <div className="flex items-center justify-between gap-3 mb-5 px-4 py-2.5 rounded-sm flex-wrap" style={{ background: t.status.info.bg, border: `1px solid ${t.status.info.border}` }}>
          <span className="font-body text-sm" style={{ color: t.textPrimary }}>
            <b>{sugestoes.length}</b> {sugestoes.length === 1 ? "sugestão gerada" : "sugestões geradas"} — revise cada uma na grade antes de confirmar
          </span>
          <div className="flex items-center gap-2">
            <button onClick={aceitarTodas} className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm font-mono text-[11px] uppercase" style={{ background: t.status.success.bg, color: t.status.success.text, border: `1px solid ${t.status.success.border}` }}>
              <Check size={13} /> Aceitar todas
            </button>
            <button onClick={descartarSugestoes} className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm font-mono text-[11px] uppercase" style={{ background: "transparent", color: t.textMuted, border: `1px solid ${t.border}` }}>
              <X size={13} /> Descartar
            </button>
          </div>
        </div>
      )}

      {naoCoube.length > 0 && (
        <div className="mb-5 px-4 py-3 rounded-sm" style={{ background: t.status.warning.bg, border: `1px solid ${t.status.warning.border}` }}>
          <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase mb-1.5" style={{ color: t.status.warning.text }}>
            <AlertTriangle size={13} /> Não coube nesta semana ({naoCoube.length})
          </div>
          {naoCoube.map(({ item, motivo }) => (
            <div key={item.id} className="font-body text-xs mb-0.5" style={{ color: t.textSecondary }}>
              <b style={{ color: t.textPrimary }}>{item.nome}</b> ({item.esteira}) — {motivo}
            </div>
          ))}
        </div>
      )}

      {itemSelecionado && (
        <div className="flex items-center justify-between gap-3 mb-5 px-4 py-2.5 rounded-sm" style={{ background: t.accentSoft, border: `1px solid ${t.accent}` }}>
          <span className="font-body text-sm" style={{ color: t.textPrimary }}>
            Selecionado: <b>{itemSelecionado.nome}</b> — agora toque num dia da grade para posicionar
          </span>
          <button onClick={() => setSelecionadoId(null)} className="flex items-center gap-1 font-mono text-[11px] uppercase shrink-0" style={{ color: t.textMuted }}>
            <X size={13} /> Cancelar
          </button>
        </div>
      )}

      <div className="flex gap-5 items-start flex-wrap lg:flex-nowrap">
        {/* backlog lateral — clique/arraste para desalocar */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={devolverAoBacklog}
          onClick={() => { if (selecionadoId && itens.find((i) => i.id === selecionadoId)?.assignedTo) devolverAoBacklog(); }}
          className="w-full lg:w-56 shrink-0 rounded-sm p-3"
          style={{ background: t.surface, border: `1px dashed ${selecionadoId && itemSelecionado?.assignedTo ? t.accent : t.border}` }}
        >
          <div className="font-mono text-[11px] uppercase mb-2 flex items-center gap-1.5" style={{ color: t.textSoft }}>
            <GripVertical size={12} /> Backlog ({backlog.length})
          </div>
          {backlog.map((it) => (
            <div key={it.id}>
              <CardItem item={it} draggable onDragStart={() => setDragId(it.id)} onClick={() => selecionar(it.id)} selecionado={selecionadoId === it.id} />
              <SequenciaEditor item={it} forcarAberto={rejeitadoId === it.id} onMover={(i, dir) => setItens((prev) => prev.map((x) => x.id === it.id ? { ...x, sequencia: move(x.sequencia, i, dir) } : x))} />
            </div>
          ))}
          {backlog.length === 0 && <p className="font-body text-xs" style={{ color: t.textSoft }}>Tudo alocado.</p>}
        </div>

        {/* grade colaborador x dia */}
        <div className="flex-1 overflow-x-auto">
          <div style={{ display: "grid", gridTemplateColumns: `120px repeat(${DIAS.length}, minmax(140px,1fr))`, minWidth: 120 + DIAS.length * 140 }}>
            <div />
            {DIAS.map((d) => (
              <div key={d.key} className="px-2 pb-2 text-center">
                <div className="font-display text-sm" style={{ color: t.textPrimary }}>{d.label}</div>
                <div className="font-mono text-[10px]" style={{ color: t.textSoft }}>{d.data}</div>
              </div>
            ))}

            {COLABORADORES.map((col) => (
              <React.Fragment key={col}>
                <div className="flex items-center gap-2 pr-2 py-2">
                  <Avatar nome={col} size={26} />
                  <div>
                    <div className="font-body text-xs" style={{ color: t.textPrimary }}>{col}</div>
                    <div className="font-mono text-[10px]" style={{ color: t.textSoft }}>{formatMin(minutosPorColaborador(col))}/sem</div>
                  </div>
                </div>
                {DIAS.map((d) => {
                  const min = minutosPorCelula(col, d.key);
                  const excedido = min > CAPACIDADE_DIA_MIN;
                  const itensCelula = itens.filter((it) => it.assignedTo === col && it.dia === d.key);
                  const celulaKey = `${col}-${d.key}`;
                  const podeAlocarAqui = !!(dragId || selecionadoId);
                  return (
                    <div
                      key={d.key}
                      role="button"
                      tabIndex={0}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => alocarEm(col, d.key)}
                      onClick={() => alocarEm(col, d.key)}
                      onKeyDown={(e) => { if (e.key === "Enter") alocarEm(col, d.key); }}
                      className="text-left p-1.5 m-0.5 rounded-sm transition-colors"
                      style={{
                        background: flashCelula === celulaKey ? t.status.success.bg : t.surfaceHi,
                        border: `1px solid ${excedido ? t.status.danger.border : podeAlocarAqui ? t.accent : t.border}`,
                        minHeight: 64,
                        cursor: podeAlocarAqui ? "pointer" : "default",
                      }}
                    >
                      {itensCelula.map((it) => (
                        <CardItem key={it.id} item={it} draggable onDragStart={(e) => { e.stopPropagation(); setDragId(it.id); }} onClick={(e) => { e.stopPropagation(); selecionar(it.id); }} selecionado={selecionadoId === it.id} onRemover={() => setItens((prev) => prev.map((x) => x.id === it.id ? { ...x, assignedTo: null, dia: null } : x))} />
                      ))}
                      {sugestoes.filter((s) => s.colaborador === col && s.dia === d.key).map((s) => {
                        const item = itens.find((it) => it.id === s.itemId);
                        if (!item) return null;
                        return <SuggestionCard key={s.itemId} item={item} motivo={s.motivo} onAceitar={() => aceitarSugestao(s.itemId)} onRejeitar={() => rejeitarSugestao(s.itemId)} />;
                      })}
                      {itensCelula.length === 0 && podeAlocarAqui && (
                        <div className="font-mono text-[10px] text-center py-2" style={{ color: t.accent }}>toque para soltar aqui</div>
                      )}
                      <div className="flex items-center gap-1 justify-end">
                        {excedido && <AlertTriangle size={11} style={{ color: t.status.danger.text }} />}
                        <span className="font-mono text-[10px]" style={{ color: excedido ? t.status.danger.text : t.textSoft }}>{formatMin(min)}</span>
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   APP
   ============================================================ */
const TELAS = [
  { id: "backlog", label: "Backlog", icon: ClipboardList },
  { id: "agenda", label: "Agenda semanal", icon: CalendarDays },
];

export default function SGPPlanejamentoPrototipo() {
  const [temaId, setTemaId] = useState("argos-dark");
  const [tela, setTela] = useState("backlog");
  const t = THEMES[temaId];

  return (
    <ThemeCtx.Provider value={t}>
      <div className="min-h-screen font-body transition-colors duration-300" style={{ background: t.bg, "--focus-ring": t.accent }}>
        <style>{FONTS}</style>
        <div className="sticky top-0 z-10" style={{ background: t.bg, borderBottom: `1px solid ${t.border}` }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-sm flex items-center justify-center" style={{ background: t.accentDeep }}>
                <CalendarDays size={14} style={{ color: t.bg }} />
              </div>
              <span className="font-display text-base tracking-wide" style={{ color: t.textPrimary }}>SGP · Planejamento</span>
              <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded-sm" style={{ color: t.textSoft, background: t.surface }}>protótipo</span>
            </div>
            <div className="flex gap-1 p-1 rounded-sm" style={{ background: t.surface }}>
              {TELAS.map((tItem) => {
                const Icon = tItem.icon;
                const ativo = tela === tItem.id;
                return (
                  <button key={tItem.id} onClick={() => setTela(tItem.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm font-body text-xs transition-colors" style={{ background: ativo ? t.surfaceRaised : "transparent", color: ativo ? t.accent : t.textMuted }}>
                    <Icon size={13} />
                    <span className="hidden sm:inline">{tItem.label}</span>
                  </button>
                );
              })}
            </div>
            <ThemeSwitcher temaId={temaId} setTemaId={setTemaId} />
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          {tela === "backlog" && <TelaBacklog />}
          {tela === "agenda" && <TelaAgenda />}
        </div>
      </div>
    </ThemeCtx.Provider>
  );
}
