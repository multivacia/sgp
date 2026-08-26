import React, { useState, createContext, useContext } from "react";
import {
  LayoutGrid, GitBranch, ClipboardCheck, MonitorSmartphone,
  Search, ChevronRight, ChevronDown, ChevronUp, ChevronLeft, Play, Check, Clock,
  User, Package, Delete, ArrowLeft, X, Palette, Layers, CheckCircle2,
  Square, CheckSquare,
} from "lucide-react";

/* ============================================================
   TEMAS — extraídos de src/styles/semantic-tokens.css (real)
   Cada tema resolve os mesmos "papéis" semânticos:
   bg, surface, surfaceRaised, border/borderStrong, texto (3 níveis),
   accent (CTA dourado), e 4 status (info/success/warning/danger) + neutral.
   ============================================================ */
const THEMES = {
  "argos-dark": {
    label: "Argos Dark",
    swatch: "#c9a227",
    bg: "#050a12",
    surface: "#101824",
    surfaceRaised: "#152a3d",
    surfaceHi: "#1a2433",
    border: "rgba(255,255,255,0.08)",
    borderStrong: "rgba(255,255,255,0.14)",
    textPrimary: "#f8fafc",
    textSecondary: "#cbd5e1",
    textMuted: "#94a3b8",
    textSoft: "#64748b",
    accent: "#c9a227",
    accentStrong: "#e0c463",
    accentDeep: "#a88620",
    accentSoft: "rgba(201,162,39,0.14)",
    status: {
      info: { bg: "rgba(59,130,246,0.10)", border: "rgba(59,130,246,0.35)", text: "#bfdbfe" },
      success: { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.35)", text: "#a7f3d0" },
      warning: { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.40)", text: "#fde68a" },
      danger: { bg: "rgba(244,63,94,0.12)", border: "rgba(244,63,94,0.35)", text: "#fecdd3" },
      neutral: { bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.12)", text: "#94a3b8" },
    },
  },
  "slate-dark": {
    label: "Slate Dark",
    swatch: "#c9a227",
    bg: "#0b1120",
    surface: "#0f172a",
    surfaceRaised: "#1e293b",
    surfaceHi: "#182132",
    border: "rgba(255,255,255,0.08)",
    borderStrong: "rgba(255,255,255,0.13)",
    textPrimary: "#f8fafc",
    textSecondary: "#cbd5e1",
    textMuted: "#94a3b8",
    textSoft: "#64748b",
    accent: "#c9a227",
    accentStrong: "#e0c463",
    accentDeep: "#a88620",
    accentSoft: "rgba(201,162,39,0.13)",
    // Slate Dark não sobrescreve os tokens --semantic-ops-* no CSS de origem,
    // então herda exatamente as mesmas cores de status do Argos Dark.
    status: {
      info: { bg: "rgba(59,130,246,0.10)", border: "rgba(59,130,246,0.35)", text: "#bfdbfe" },
      success: { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.35)", text: "#a7f3d0" },
      warning: { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.40)", text: "#fde68a" },
      danger: { bg: "rgba(244,63,94,0.12)", border: "rgba(244,63,94,0.35)", text: "#fecdd3" },
      neutral: { bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.12)", text: "#94a3b8" },
    },
  },
  "light-executive": {
    label: "Light Executive",
    swatch: "#d97706",
    bg: "#f3f6fa",
    surface: "#ffffff",
    surfaceRaised: "#f8fafc",
    surfaceHi: "#eef3f8",
    border: "#b4c3d7",
    borderStrong: "#7f93ae",
    textPrimary: "#0f172a",
    textSecondary: "#334155",
    textMuted: "#64748b",
    textSoft: "#94a3b8",
    accent: "#d97706",
    accentStrong: "#b45309",
    accentDeep: "#92400e",
    accentSoft: "#fff7e6",
    status: {
      info: { bg: "#e8f1f8", border: "#7aa9c7", text: "#1e3a5f" },
      success: { bg: "#ecfdf5", border: "#10b981", text: "#065f46" },
      warning: { bg: "#fff7e6", border: "#f59e0b", text: "#92400e" },
      danger: { bg: "#fef2f2", border: "#e11d48", text: "#9f1239" },
      neutral: { bg: "#f3f4f6", border: "#d1d5db", text: "#374151" },
    },
  },
};

const STATUS_ROLE = {
  EM_ELABORACAO: { role: "neutral", label: "Em elaboração" },
  AGUARDANDO_PLANEJAMENTO: { role: "warning", label: "Aguardando planejamento" },
  EM_PLANEJAMENTO: { role: "warning", label: "Em planejamento" },
  A_INICIAR: { role: "neutral", label: "A iniciar" },
  EM_ANDAMENTO: { role: "info", label: "Em andamento" },
  FINALIZADA: { role: "success", label: "Finalizada" },
  ATRASADA: { role: "danger", label: "Atrasada" },
};

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
.font-display{font-family:'Oswald',sans-serif; letter-spacing:.02em;}
.font-body{font-family:'IBM Plex Sans',sans-serif;}
.font-mono{font-family:'IBM Plex Mono',monospace;}
::-webkit-scrollbar{width:8px;height:8px;}
::-webkit-scrollbar-track{background:transparent;}
button:focus-visible, [tabindex]:focus-visible{outline:2px solid var(--focus-ring, #c9a227);outline-offset:2px;}
`;

const ThemeCtx = createContext(THEMES["argos-dark"]);
const useTheme = () => useContext(ThemeCtx);

/* ============================================================
   DADOS MOCK (mesmo conteúdo da rodada anterior)
   ============================================================ */
const initialEsteiras = [
  {
    id: 1, os: "OS-4471", veiculo: "Mercedes W113 Pagoda", ano: "1969", cliente: "R. Andrade",
    status: "EM_ANDAMENTO", progresso: 62, previsao: "28/08",
    tarefas: [
      { nome: "Desmontagem", setor: "Funilaria", atividades: [
        { nome: "Remover bancos", status: "FINALIZADA", colaborador: "Val" },
        { nome: "Remover forração de portas", status: "FINALIZADA", colaborador: "Val" },
        { nome: "Remover carpete", status: "EM_ANDAMENTO", colaborador: "Bruno" },
      ]},
      { nome: "Reparo de estrutura", setor: "Marcenaria", atividades: [
        { nome: "Reforço de espuma — banco dianteiro", status: "A_INICIAR", colaborador: "Edu" },
        { nome: "Ajuste de trilhos", status: "A_INICIAR", colaborador: null },
      ]},
      { nome: "Corte e costura", setor: "Costura", atividades: [
        { nome: "Corte de courino", status: "A_INICIAR", colaborador: null },
        { nome: "Costura banco dianteiro", status: "A_INICIAR", colaborador: null },
        { nome: "Costura banco traseiro", status: "A_INICIAR", colaborador: null },
      ]},
      { nome: "Montagem final", setor: "Montagem", atividades: [
        { nome: "Instalar bancos", status: "A_INICIAR", colaborador: null },
        { nome: "Revisão de acabamento", status: "A_INICIAR", colaborador: null },
      ]},
    ],
  },
  { id: 2, os: "OS-4488", veiculo: "Porsche 911 SC", ano: "1981", cliente: "T. Wexler", status: "EM_PLANEJAMENTO", progresso: 8, previsao: "—", tarefas: [] },
  { id: 3, os: "OS-4502", veiculo: "Fusca 1974", ano: "1974", cliente: "M. Lopes", status: "AGUARDANDO_PLANEJAMENTO", progresso: 0, previsao: "—", tarefas: [] },
  { id: 4, os: "OS-4459", veiculo: "Jaguar E-Type", ano: "1966", cliente: "C. Bittencourt", status: "FINALIZADA", progresso: 100, previsao: "concluída 12/08", tarefas: [] },
  { id: 5, os: "OS-4495", veiculo: "Opala SS", ano: "1977", cliente: "F. Nogueira", status: "ATRASADA", progresso: 34, previsao: "22/08 (atraso 4d)", tarefas: [] },
];

const colaboradorCorRole = { Val: "warning", Bruno: "info", Edu: "success", Marli: "warning", Sula: "danger" };
const colaboradores = ["Val", "Bruno", "Edu", "Marli", "Sula"];

/* Matrizes de operação — moldes reutilizáveis (Tarefa → Setor → Atividade) */
const MATRIZES = [
  {
    id: "m1", nome: "Sedan Premium", descricao: "Reforma completa de bancos em couro — sedãs de luxo",
    tarefas: [
      { key: "t1", nome: "Desmontagem", setor: "Funilaria", atividades: [
        { key: "a1", nome: "Remover bancos", min: 40, sequenciaPadrao: ["Val", "Bruno", "Edu"] },
        { key: "a2", nome: "Remover forração de portas", min: 35, sequenciaPadrao: ["Val", "Bruno", "Edu"] },
        { key: "a3", nome: "Remover carpete", min: 25, sequenciaPadrao: ["Bruno", "Val", "Edu"] },
      ]},
      { key: "t2", nome: "Reparo de estrutura", setor: "Marcenaria", atividades: [
        { key: "a4", nome: "Reforço de espuma — banco dianteiro", min: 50, sequenciaPadrao: ["Edu", "Bruno", "Val"] },
        { key: "a5", nome: "Ajuste de trilhos", min: 30, sequenciaPadrao: ["Edu", "Bruno", "Val"] },
      ]},
      { key: "t3", nome: "Corte e costura", setor: "Costura", atividades: [
        { key: "a6", nome: "Corte de courino", min: 45, sequenciaPadrao: ["Marli", "Sula"] },
        { key: "a7", nome: "Costura banco dianteiro", min: 90, sequenciaPadrao: ["Marli", "Sula"] },
        { key: "a8", nome: "Costura banco traseiro", min: 75, sequenciaPadrao: ["Marli", "Sula"] },
      ]},
      { key: "t4", nome: "Montagem final", setor: "Montagem", atividades: [
        { key: "a9", nome: "Instalar bancos", min: 40, sequenciaPadrao: ["Val", "Sula"] },
        { key: "a10", nome: "Revisão de acabamento", min: 20, sequenciaPadrao: ["Sula", "Val"] },
      ]},
    ],
  },
  {
    id: "m2", nome: "Conversível Clássico", descricao: "Capota de lona + estofamento interno completo",
    tarefas: [
      { key: "t5", nome: "Desmontagem da capota", setor: "Funilaria", atividades: [
        { key: "a11", nome: "Remover lona antiga", min: 30, sequenciaPadrao: ["Bruno", "Val", "Edu"] },
        { key: "a12", nome: "Inspecionar armação", min: 20, sequenciaPadrao: ["Edu", "Bruno", "Val"] },
      ]},
      { key: "t6", nome: "Costura da capota", setor: "Costura", atividades: [
        { key: "a13", nome: "Corte de lona nova", min: 40, sequenciaPadrao: ["Marli", "Sula"] },
        { key: "a14", nome: "Costura e vedação", min: 100, sequenciaPadrao: ["Marli", "Sula"] },
      ]},
      { key: "t7", nome: "Estofamento interno", setor: "Costura", atividades: [
        { key: "a15", nome: "Costura banco dianteiro", min: 90, sequenciaPadrao: ["Sula", "Marli"] },
      ]},
    ],
  },
  {
    id: "m3", nome: "SUV Executivo", descricao: "Bancos, portas e carpete — linha executiva",
    tarefas: [
      { key: "t8", nome: "Desmontagem", setor: "Funilaria", atividades: [
        { key: "a16", nome: "Remover bancos (3 fileiras)", min: 55, sequenciaPadrao: ["Val", "Bruno", "Edu"] },
        { key: "a17", nome: "Remover carpete", min: 30, sequenciaPadrao: ["Bruno", "Val", "Edu"] },
      ]},
      { key: "t9", nome: "Corte e costura", setor: "Costura", atividades: [
        { key: "a18", nome: "Costura bancos dianteiros", min: 95, sequenciaPadrao: ["Marli", "Sula"] },
        { key: "a19", nome: "Costura bancos traseiros", min: 110, sequenciaPadrao: ["Marli", "Sula"] },
      ]},
      { key: "t10", nome: "Montagem final", setor: "Montagem", atividades: [
        { key: "a20", nome: "Instalar bancos", min: 45, sequenciaPadrao: ["Sula", "Val"] },
      ]},
    ],
  },
];

function formatMin(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0) return `${h}h${m > 0 ? String(m).padStart(2, "0") : ""}`;
  return `${m}min`;
}

const minhasAtividadesBase = [
  { id: "a1", esteira: "OS-4471", peca: "Mercedes W113 Pagoda", nome: "Remover carpete", setor: "Funilaria", status: "EM_ANDAMENTO", tempo: "00:34:12" },
  { id: "a2", esteira: "OS-4495", peca: "Opala SS", nome: "Costura painel de porta", setor: "Costura", status: "A_INICIAR", tempo: null },
  { id: "a3", esteira: "OS-4471", peca: "Mercedes W113 Pagoda", nome: "Preparar forração de teto", setor: "Costura", status: "A_INICIAR", tempo: null },
];

/* ============================================================
   PRIMITIVOS
   ============================================================ */
function StatusPill({ status }) {
  const t = useTheme();
  const meta = STATUS_ROLE[status] || STATUS_ROLE.A_INICIAR;
  const s = t.status[meta.role];
  return (
    <span
      className="font-mono text-[11px] uppercase tracking-wide px-2 py-1 rounded-sm inline-flex items-center gap-1.5"
      style={{ color: s.text, background: s.bg, border: `1px solid ${s.border}` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.text }} />
      {meta.label}
    </span>
  );
}

function Avatar({ nome, size = 28 }) {
  const t = useTheme();
  if (!nome) {
    return (
      <div
        className="rounded-full flex items-center justify-center border border-dashed shrink-0"
        style={{ width: size, height: size, borderColor: t.border, color: t.textSoft }}
      >
        <User size={size * 0.5} />
      </div>
    );
  }
  const role = colaboradorCorRole[nome] || "neutral";
  const s = t.status[role];
  return (
    <div
      className="rounded-full flex items-center justify-center font-display font-medium shrink-0"
      style={{ width: size, height: size, background: s.border, color: t.bg, fontSize: size * 0.42 }}
      title={nome}
    >
      {nome.slice(0, 2).toUpperCase()}
    </div>
  );
}

function StitchProgress({ value, role = "info" }) {
  const t = useTheme();
  const s = t.status[role];
  return (
    <div className="relative h-2 rounded-full overflow-hidden" style={{ background: t.surfaceHi }}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${value}%`, background: s.text }} />
    </div>
  );
}

function PunchCard({ children, style, className = "", ...props }) {
  const t = useTheme();
  return (
    <div
      className={`relative ${className}`}
      style={{ background: t.surface, border: `1px solid ${t.border}`, ...style }}
      {...props}
    >
      <span
        className="absolute rounded-full"
        style={{ top: 10, left: 10, width: 7, height: 7, background: t.bg, boxShadow: "inset 0 1px 2px rgba(0,0,0,.35)" }}
      />
      {children}
    </div>
  );
}

/* ============================================================
   SELETOR DE TEMA
   ============================================================ */
function ThemeSwitcher({ temaId, setTemaId }) {
  const t = useTheme();
  return (
    <div className="flex items-center gap-1.5 p-1 rounded-sm" style={{ background: t.surfaceRaised, border: `1px solid ${t.border}` }}>
      <Palette size={13} style={{ color: t.textSoft, marginLeft: 4 }} />
      {Object.entries(THEMES).map(([id, th]) => (
        <button
          key={id}
          onClick={() => setTemaId(id)}
          className="flex items-center gap-1.5 px-2 py-1 rounded-sm font-mono text-[10px] uppercase transition-colors"
          style={{
            background: temaId === id ? t.accentSoft : "transparent",
            color: temaId === id ? t.accent : t.textMuted,
            border: temaId === id ? `1px solid ${t.accent}` : "1px solid transparent",
          }}
        >
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: th.swatch, border: `1px solid ${t.border}` }} />
          <span className="hidden md:inline">{th.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ============================================================
   TELA 1 — VISÃO DA FÁBRICA
   ============================================================ */
function TelaDashboard({ esteiras, onAbrirEsteira }) {
  const t = useTheme();
  const contagem = esteiras.reduce((acc, e) => { acc[e.status] = (acc[e.status] || 0) + 1; return acc; }, {});

  return (
    <div>
      <div className="flex items-baseline justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl" style={{ color: t.textPrimary }}>Chão de fábrica</h1>
          <p className="font-body text-sm mt-1" style={{ color: t.textMuted }}>5 esteiras ativas · atualizado às 14:32</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-sm" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <Search size={15} style={{ color: t.textSoft }} />
          <input placeholder="Buscar por OS, veículo ou cliente" className="bg-transparent font-body text-sm outline-none w-64" style={{ color: t.textPrimary }} />
        </div>
      </div>

      <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
        {Object.entries(STATUS_ROLE).filter(([k]) => contagem[k]).map(([k, meta]) => {
          const s = t.status[meta.role];
          return (
            <div key={k} className="flex items-center gap-2 px-3 py-2 rounded-sm shrink-0" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
              <span className="font-display text-xl" style={{ color: s.text }}>{contagem[k]}</span>
              <span className="font-mono text-[11px] uppercase" style={{ color: s.text }}>{meta.label}</span>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
        {esteiras.map((e) => {
          const meta = STATUS_ROLE[e.status];
          const s = t.status[meta.role];
          return (
            <PunchCard
              key={e.id}
              onClick={() => onAbrirEsteira(e)}
              role="button"
              tabIndex={0}
              onKeyDown={(ev) => { if (ev.key === "Enter") onAbrirEsteira(e); }}
              className="text-left p-4 pt-5 rounded-sm transition-transform hover:-translate-y-0.5 cursor-pointer"
              style={{ borderLeft: `3px solid ${s.text}` }}
            >
              <div className="flex items-start justify-between mb-3 pl-3">
                <div>
                  <div className="font-mono text-xs" style={{ color: t.textSoft }}>{e.os}</div>
                  <div className="font-display text-lg leading-tight" style={{ color: t.textPrimary }}>{e.veiculo}</div>
                  <div className="font-body text-xs mt-0.5" style={{ color: t.textMuted }}>{e.ano} · {e.cliente}</div>
                </div>
                <ChevronRight size={16} style={{ color: t.textSoft }} />
              </div>
              <div className="pl-3">
                <StatusPill status={e.status} />
                <div className="mt-3">
                  <StitchProgress value={e.progresso} role={meta.role === "neutral" ? "info" : meta.role} />
                  <div className="flex justify-between mt-1.5 font-mono text-[11px]" style={{ color: t.textSoft }}>
                    <span>{e.progresso}% concluído</span>
                    <span>{e.previsao}</span>
                  </div>
                </div>
              </div>
            </PunchCard>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   TELA 2 — TRILHO DA ESTEIRA
   ============================================================ */
function TelaEsteira({ esteira, onVoltar }) {
  const t = useTheme();
  const [aberta, setAberta] = useState(esteira.tarefas[0]?.nome ?? null);
  const meta = STATUS_ROLE[esteira.status];

  return (
    <div>
      <button onClick={onVoltar} className="flex items-center gap-1.5 mb-4 font-body text-sm" style={{ color: t.textMuted }}>
        <ArrowLeft size={15} /> Chão de fábrica
      </button>

      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="font-mono text-xs mb-1" style={{ color: t.textSoft }}>{esteira.os}</div>
          <h1 className="font-display text-3xl" style={{ color: t.textPrimary }}>{esteira.veiculo}</h1>
          <p className="font-body text-sm mt-1" style={{ color: t.textMuted }}>{esteira.ano} · {esteira.cliente}</p>
        </div>
        <div className="text-right">
          <StatusPill status={esteira.status} />
          <div className="font-display text-2xl mt-2" style={{ color: t.accent }}>{esteira.progresso}%</div>
        </div>
      </div>

      {esteira.tarefas.length === 0 ? (
        <div className="rounded-sm p-8 text-center" style={{ background: t.surface, border: `1px dashed ${t.border}` }}>
          <p className="font-body text-sm" style={{ color: t.textMuted }}>Esta esteira ainda não tem tarefas montadas no trilho.</p>
        </div>
      ) : (
        <div className="relative pl-8">
          <div className="absolute left-3 top-2 bottom-2 w-[3px] rounded-full" style={{ background: t.border }} />
          <div className="flex flex-col gap-3">
            {esteira.tarefas.map((tarefa) => {
              const total = tarefa.atividades.length;
              const feitas = tarefa.atividades.filter((a) => a.status === "FINALIZADA").length;
              const isOpen = aberta === tarefa.nome;
              return (
                <div key={tarefa.nome} className="relative">
                  <div
                    className="absolute rounded-full border-2"
                    style={{ left: -29, top: 14, width: 14, height: 14, background: feitas === total ? t.accent : t.bg, borderColor: feitas === total ? t.accent : t.border }}
                  />
                  <div className="rounded-sm overflow-hidden" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
                    <button onClick={() => setAberta(isOpen ? null : tarefa.nome)} className="w-full flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="font-display text-base" style={{ color: t.textPrimary }}>{tarefa.nome}</span>
                        <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded-sm" style={{ color: t.accent, background: t.accentSoft }}>{tarefa.setor}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs" style={{ color: t.textSoft }}>{feitas}/{total}</span>
                        <ChevronDown size={16} style={{ color: t.textSoft, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
                      </div>
                    </button>
                    {isOpen && (
                      <div style={{ borderTop: `1px solid ${t.border}` }}>
                        {tarefa.atividades.map((a, i) => (
                          <div key={a.nome} className="flex items-center justify-between px-4 py-2.5" style={{ borderTop: i > 0 ? `1px solid ${t.border}` : "none" }}>
                            <div className="flex items-center gap-3">
                              <Avatar nome={a.colaborador} size={24} />
                              <span className="font-body text-sm" style={{ color: t.textPrimary }}>{a.nome}</span>
                            </div>
                            <StatusPill status={a.status} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   TELA 3 — MINHAS ATIVIDADES
   ============================================================ */
function TelaApontamento({ atividades, setAtividades }) {
  const t = useTheme();
  function avancar(id) {
    setAtividades((prev) => prev.map((a) => {
      if (a.id !== id) return a;
      if (a.status === "A_INICIAR") return { ...a, status: "EM_ANDAMENTO", tempo: "00:00:00" };
      if (a.status === "EM_ANDAMENTO") return { ...a, status: "FINALIZADA" };
      return a;
    }));
  }
  const pendentes = atividades.filter((a) => a.status !== "FINALIZADA");
  const feitas = atividades.filter((a) => a.status === "FINALIZADA");

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Avatar nome="Bruno" size={40} />
        <div>
          <h1 className="font-display text-2xl" style={{ color: t.textPrimary }}>Bruno</h1>
          <p className="font-body text-xs" style={{ color: t.textMuted }}>Funilaria · Costura</p>
        </div>
      </div>

      <div className="font-mono text-xs uppercase tracking-wide mb-2" style={{ color: t.textSoft }}>Fila de trabalho</div>
      <div className="flex flex-col gap-3 mb-8">
        {pendentes.map((a) => {
          const emAndamento = a.status === "EM_ANDAMENTO";
          const s = t.status[emAndamento ? "info" : "neutral"];
          return (
            <div key={a.id} className="rounded-sm p-4" style={{ background: t.surface, border: `1px solid ${emAndamento ? s.border : t.border}` }}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="font-mono text-[11px]" style={{ color: t.textSoft }}>{a.esteira} · {a.peca}</div>
                  <div className="font-display text-lg" style={{ color: t.textPrimary }}>{a.nome}</div>
                  <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded-sm inline-block mt-1" style={{ color: t.accent, background: t.accentSoft }}>{a.setor}</span>
                </div>
                {emAndamento && <div className="font-mono text-sm flex items-center gap-1.5" style={{ color: s.text }}><Clock size={14} /> {a.tempo}</div>}
              </div>
              <button
                onClick={() => avancar(a.id)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-sm font-display text-sm uppercase tracking-wide transition-opacity hover:opacity-90"
                style={{ background: emAndamento ? t.status.success.text : t.accent, color: t.bg }}
              >
                {emAndamento ? <><Check size={16} /> Concluir atividade</> : <><Play size={16} /> Iniciar atividade</>}
              </button>
            </div>
          );
        })}
        {pendentes.length === 0 && (
          <div className="rounded-sm p-6 text-center" style={{ background: t.surface, border: `1px dashed ${t.border}` }}>
            <p className="font-body text-sm" style={{ color: t.textMuted }}>Fila vazia. Bom trabalho.</p>
          </div>
        )}
      </div>

      {feitas.length > 0 && (
        <>
          <div className="font-mono text-xs uppercase tracking-wide mb-2" style={{ color: t.textSoft }}>Concluídas hoje</div>
          <div className="flex flex-col gap-2">
            {feitas.map((a) => (
              <div key={a.id} className="flex items-center gap-2 px-3 py-2 rounded-sm" style={{ background: t.status.success.bg }}>
                <Check size={14} style={{ color: t.status.success.text }} />
                <span className="font-body text-sm" style={{ color: t.textSecondary }}>{a.nome}</span>
                <span className="font-mono text-[11px] ml-auto" style={{ color: t.textSoft }}>{a.esteira}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ============================================================
   TELA 4 — TOTEM / KIOSK
   ============================================================ */
function TelaKiosk() {
  const t = useTheme();
  const [colaborador, setColaborador] = useState(null);
  const [pin, setPin] = useState("");

  if (!colaborador) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="font-display text-3xl mb-1" style={{ color: t.textPrimary }}>Quem está no posto?</h1>
        <p className="font-body text-sm mb-8" style={{ color: t.textMuted }}>Toque no seu avatar para registrar apontamento</p>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
          {colaboradores.map((nome) => (
            <button key={nome} onClick={() => setColaborador(nome)} className="flex flex-col items-center gap-2 p-4 rounded-sm transition-transform hover:-translate-y-0.5" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
              <Avatar nome={nome} size={56} />
              <span className="font-display text-sm" style={{ color: t.textPrimary }}>{nome}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (pin.length < 4) {
    return (
      <div className="max-w-xs mx-auto text-center">
        <button onClick={() => { setColaborador(null); setPin(""); }} className="flex items-center gap-1.5 mb-6 font-body text-sm" style={{ color: t.textMuted }}>
          <ArrowLeft size={15} /> Trocar colaborador
        </button>
        <Avatar nome={colaborador} size={64} />
        <h2 className="font-display text-2xl mt-3 mb-6" style={{ color: t.textPrimary }}>{colaborador}</h2>
        <div className="flex justify-center gap-2 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="w-10 h-12 rounded-sm flex items-center justify-center font-mono text-xl" style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.textPrimary }}>
              {pin[i] ? "•" : ""}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3,4,5,6,7,8,9,null,0,"del"].map((n, i) => n === null ? <div key={i} /> : (
            <button
              key={i}
              onClick={() => { if (n === "del") setPin((p) => p.slice(0, -1)); else if (pin.length < 4) setPin((p) => p + n); }}
              className="aspect-square rounded-sm flex items-center justify-center font-display text-xl"
              style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.textPrimary }}
            >
              {n === "del" ? <Delete size={18} /> : n}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const minhas = minhasAtividadesBase.filter((a) => a.status !== "FINALIZADA").slice(0, 3);
  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Avatar nome={colaborador} size={40} />
          <span className="font-display text-xl" style={{ color: t.textPrimary }}>{colaborador}</span>
        </div>
        <button onClick={() => { setColaborador(null); setPin(""); }} className="p-2 rounded-sm" style={{ background: t.surface }}>
          <X size={16} style={{ color: t.textMuted }} />
        </button>
      </div>
      <p className="font-mono text-xs uppercase tracking-wide mb-3" style={{ color: t.textSoft }}>Suas atividades no posto</p>
      <div className="flex flex-col gap-3">
        {minhas.map((a) => (
          <div key={a.id} className="p-4 rounded-sm flex items-center justify-between gap-3" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
            <div>
              <div className="font-mono text-[11px]" style={{ color: t.textSoft }}>{a.esteira}</div>
              <div className="font-display text-base" style={{ color: t.textPrimary }}>{a.nome}</div>
            </div>
            <button className="px-4 py-2.5 rounded-sm font-display text-sm uppercase" style={{ background: t.accent, color: t.bg }}>Iniciar</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SequenciaEditorEsteira({ atividadeKey, sequencia, onChange }) {
  const t = useTheme();
  const [aberto, setAberto] = useState(false);
  const fora = colaboradores.filter((c) => !sequencia.includes(c));

  function mover(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= sequencia.length) return;
    const copy = [...sequencia];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    onChange(copy);
  }
  function remover(i) {
    if (sequencia.length <= 1) return;
    onChange(sequencia.filter((_, idx) => idx !== i));
  }
  function adicionar(nome) { onChange([...sequencia, nome]); }

  return (
    <div className="w-full sm:w-auto">
      <button onClick={() => setAberto((a) => !a)} className="flex items-center gap-1.5 font-mono text-[10px]" style={{ color: t.textSoft }}>
        {sequencia.map((n, i) => `${i + 1}º ${n}`).join("  >  ")}
        {aberto ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      </button>
      {aberto && (
        <div className="rounded-sm p-2.5 mt-1.5" style={{ background: t.surfaceHi, border: `1px solid ${t.border}` }}>
          {sequencia.map((nome, i) => (
            <div key={nome} className="flex items-center gap-2 py-0.5">
              <span className="font-mono text-[10px] w-4" style={{ color: t.textSoft }}>{i + 1}º</span>
              <Avatar nome={nome} size={18} />
              <span className="font-body text-xs flex-1" style={{ color: t.textSecondary }}>{nome}</span>
              <button onClick={() => mover(i, -1)} disabled={i === 0} className="disabled:opacity-20"><ChevronUp size={13} style={{ color: t.textMuted }} /></button>
              <button onClick={() => mover(i, 1)} disabled={i === sequencia.length - 1} className="disabled:opacity-20"><ChevronDown size={13} style={{ color: t.textMuted }} /></button>
              {sequencia.length > 1 && <button onClick={() => remover(i)}><X size={13} style={{ color: t.status.danger.text }} /></button>}
            </div>
          ))}
          {fora.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 pt-2 flex-wrap" style={{ borderTop: `1px solid ${t.border}` }}>
              <span className="font-mono text-[10px]" style={{ color: t.textSoft }}>+</span>
              {fora.map((nome) => <button key={nome} onClick={() => adicionar(nome)}><Avatar nome={nome} size={18} /></button>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   TELA 5 — NOVA ESTEIRA A PARTIR DA MATRIZ (wizard, 4 passos)
   "estampar o molde" em vez de mesa de montagem com drag-and-drop
   ============================================================ */
const PASSOS = ["Escolher o molde", "Selecionar tarefas", "Ajustar responsáveis", "Confirmar"];

function Stepper({ passo }) {
  const t = useTheme();
  return (
    <div className="flex items-center mb-8">
      {PASSOS.map((label, i) => {
        const n = i + 1;
        const feito = n < passo;
        const atual = n === passo;
        return (
          <React.Fragment key={label}>
            <div className="flex items-center gap-2 shrink-0">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs shrink-0"
                style={{
                  background: feito || atual ? t.accent : "transparent",
                  color: feito || atual ? t.bg : t.textSoft,
                  border: feito || atual ? "none" : `1px solid ${t.border}`,
                }}
              >
                {feito ? <Check size={13} /> : n}
              </div>
              <span className="font-body text-xs hidden sm:inline" style={{ color: atual ? t.textPrimary : t.textMuted }}>{label}</span>
            </div>
            {i < PASSOS.length - 1 && (
              <div className="flex-1 h-px mx-3" style={{ background: n < passo ? t.accent : t.border }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function TelaNovaEsteira({ onEsteiraCriada }) {
  const t = useTheme();
  const [passo, setPasso] = useState(1);
  const [matrizId, setMatrizId] = useState(null);
  const [tarefasOn, setTarefasOn] = useState({});
  const [sequencias, setSequencias] = useState({});
  const [form, setForm] = useState({ veiculo: "", os: "", cliente: "" });
  const [criado, setCriado] = useState(false);

  const matriz = MATRIZES.find((m) => m.id === matrizId) ?? null;

  function escolherMatriz(m) {
    setMatrizId(m.id);
    const on = {};
    const seqs = {};
    m.tarefas.forEach((tar) => {
      on[tar.key] = true;
      tar.atividades.forEach((a) => { seqs[a.key] = [...a.sequenciaPadrao]; });
    });
    setTarefasOn(on);
    setSequencias(seqs);
  }

  const tarefasSelecionadas = matriz ? matriz.tarefas.filter((tar) => tarefasOn[tar.key]) : [];
  const totalAtividades = tarefasSelecionadas.reduce((s, tar) => s + tar.atividades.length, 0);
  const totalMin = tarefasSelecionadas.reduce((s, tar) => s + tar.atividades.reduce((s2, a) => s2 + a.min, 0), 0);

  function resetar() {
    setPasso(1); setMatrizId(null); setTarefasOn({}); setSequencias({});
    setForm({ veiculo: "", os: "", cliente: "" }); setCriado(false);
  }

  const podeAvancar = (passo === 1 && matrizId) || passo === 2 || passo === 3;

  if (criado) {
    const novaEsteira = {
      id: Date.now(), os: form.os || "OS-novo", veiculo: form.veiculo || "Veículo sem nome",
      ano: "—", cliente: form.cliente || "—", status: "A_INICIAR", progresso: 0, previsao: "—",
      tarefas: tarefasSelecionadas.map((tar) => ({
        nome: tar.nome, setor: tar.setor,
        atividades: tar.atividades.map((a) => ({ nome: a.nome, status: "A_INICIAR", colaborador: (sequencias[a.key] || [])[0] })),
      })),
    };
    return (
      <div className="max-w-md mx-auto text-center py-8">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: t.status.success.bg }}>
          <CheckCircle2 size={28} style={{ color: t.status.success.text }} />
        </div>
        <h1 className="font-display text-2xl mb-1" style={{ color: t.textPrimary }}>Esteira criada</h1>
        <p className="font-body text-sm mb-6" style={{ color: t.textMuted }}>
          {novaEsteira.veiculo} · {tarefasSelecionadas.length} tarefas · {totalAtividades} atividades no trilho
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={resetar} className="px-4 py-2.5 rounded-sm font-display text-sm uppercase" style={{ background: "transparent", border: `1px solid ${t.border}`, color: t.textMuted }}>
            Criar outra
          </button>
          <button onClick={() => onEsteiraCriada(novaEsteira)} className="px-4 py-2.5 rounded-sm font-display text-sm uppercase" style={{ background: t.accent, color: t.bg }}>
            Ver no trilho
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="font-display text-3xl mb-1" style={{ color: t.textPrimary }}>Nova esteira a partir da matriz</h1>
      <p className="font-body text-sm mb-6" style={{ color: t.textMuted }}>Estampe um molde consolidado direto numa OS real.</p>
      <Stepper passo={passo} />

      {/* PASSO 1 — escolher o molde */}
      {passo === 1 && (
        <div className="grid gap-4 sm:grid-cols-3">
          {MATRIZES.map((m) => {
            const totalM = m.tarefas.reduce((s, tar) => s + tar.atividades.reduce((s2, a) => s2 + a.min, 0), 0);
            const ativo = matrizId === m.id;
            return (
              <button
                key={m.id}
                onClick={() => escolherMatriz(m)}
                className="text-left p-4 rounded-sm transition-all"
                style={{ background: t.surface, border: `1px solid ${ativo ? t.accent : t.border}`, boxShadow: ativo ? `0 0 0 1px ${t.accent}` : "none" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <Layers size={18} style={{ color: ativo ? t.accent : t.textSoft }} />
                  {ativo && <CheckCircle2 size={16} style={{ color: t.accent }} />}
                </div>
                <div className="font-display text-lg" style={{ color: t.textPrimary }}>{m.nome}</div>
                <p className="font-body text-xs mt-1 mb-3" style={{ color: t.textMuted }}>{m.descricao}</p>
                <div className="font-mono text-[11px]" style={{ color: t.textSoft }}>
                  {m.tarefas.length} tarefas · {formatMin(totalM)}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* PASSO 2 — selecionar tarefas (preview do trilho com toggle) */}
      {passo === 2 && matriz && (
        <div className="flex flex-col gap-3">
          {matriz.tarefas.map((tar) => {
            const on = !!tarefasOn[tar.key];
            const min = tar.atividades.reduce((s, a) => s + a.min, 0);
            return (
              <div key={tar.key} className="rounded-sm p-4" style={{ background: t.surface, border: `1px solid ${on ? t.border : t.border}`, opacity: on ? 1 : 0.5 }}>
                <button
                  onClick={() => setTarefasOn((prev) => ({ ...prev, [tar.key]: !prev[tar.key] }))}
                  className="w-full flex items-center justify-between gap-3 mb-2"
                >
                  <div className="flex items-center gap-3">
                    {on ? <CheckSquare size={18} style={{ color: t.accent }} /> : <Square size={18} style={{ color: t.textSoft }} />}
                    <span className="font-display text-base" style={{ color: t.textPrimary }}>{tar.nome}</span>
                    <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded-sm" style={{ color: t.accent, background: t.accentSoft }}>{tar.setor}</span>
                  </div>
                  <span className="font-mono text-xs" style={{ color: t.textSoft }}>{tar.atividades.length} ativ. · {formatMin(min)}</span>
                </button>
                <div className="pl-7 flex flex-col gap-1">
                  {tar.atividades.map((a) => (
                    <div key={a.key} className="font-body text-xs flex items-center justify-between" style={{ color: t.textMuted }}>
                      <span>{a.nome}</span>
                      <span className="font-mono" style={{ color: t.textSoft }}>{formatMin(a.min)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PASSO 3 — ajustar responsáveis (herdados da matriz, editáveis) */}
      {passo === 3 && (
        <div className="flex flex-col gap-3">
          {tarefasSelecionadas.map((tar) => (
            <div key={tar.key} className="rounded-sm p-4" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="font-display text-base" style={{ color: t.textPrimary }}>{tar.nome}</span>
                <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded-sm" style={{ color: t.accent, background: t.accentSoft }}>{tar.setor}</span>
              </div>
              <div className="flex flex-col gap-3">
                {tar.atividades.map((a) => (
                  <div key={a.key} className="flex items-center justify-between gap-3 flex-wrap">
                    <span className="font-body text-sm" style={{ color: t.textSecondary }}>{a.nome}</span>
                    <SequenciaEditorEsteira
                      atividadeKey={a.key}
                      sequencia={sequencias[a.key] || []}
                      onChange={(nova) => setSequencias((prev) => ({ ...prev, [a.key]: nova }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PASSO 4 — confirmar */}
      {passo === 4 && (
        <div>
          <div className="grid sm:grid-cols-3 gap-3 mb-6">
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[11px] uppercase" style={{ color: t.textSoft }}>Veículo</span>
              <input value={form.veiculo} onChange={(e) => setForm((f) => ({ ...f, veiculo: e.target.value }))} placeholder="Ex.: Mercedes W113 Pagoda" className="px-3 py-2 rounded-sm font-body text-sm outline-none" style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.textPrimary }} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[11px] uppercase" style={{ color: t.textSoft }}>Nº da OS</span>
              <input value={form.os} onChange={(e) => setForm((f) => ({ ...f, os: e.target.value }))} placeholder="Ex.: OS-4512" className="px-3 py-2 rounded-sm font-body text-sm outline-none font-mono" style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.textPrimary }} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[11px] uppercase" style={{ color: t.textSoft }}>Cliente</span>
              <input value={form.cliente} onChange={(e) => setForm((f) => ({ ...f, cliente: e.target.value }))} placeholder="Ex.: R. Andrade" className="px-3 py-2 rounded-sm font-body text-sm outline-none" style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.textPrimary }} />
            </label>
          </div>

          <div className="rounded-sm p-4 mb-2" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-[11px] uppercase" style={{ color: t.textSoft }}>Resumo do trilho</span>
              <span className="font-mono text-xs" style={{ color: t.textMuted }}>{tarefasSelecionadas.length} tarefas · {totalAtividades} atividades · {formatMin(totalMin)}</span>
            </div>
            <div className="flex flex-col gap-2">
              {tarefasSelecionadas.map((tar) => (
                <div key={tar.key} className="flex items-center justify-between font-body text-sm" style={{ color: t.textSecondary }}>
                  <span>{tar.nome}</span>
                  <div className="flex -space-x-1.5">
                    {tar.atividades.map((a) => (
                      <div key={a.key} className="flex -space-x-1.5" title={(sequencias[a.key] || []).join(" > ")}>
                        {(sequencias[a.key] || []).map((n) => <Avatar key={n} nome={n} size={20} />)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* navegação */}
      <div className="flex items-center justify-between mt-8">
        <button
          onClick={() => setPasso((p) => Math.max(1, p - 1))}
          disabled={passo === 1}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-sm font-display text-sm uppercase disabled:opacity-30"
          style={{ background: "transparent", border: `1px solid ${t.border}`, color: t.textMuted }}
        >
          <ChevronLeft size={15} /> Voltar
        </button>
        {passo < 4 ? (
          <button
            onClick={() => setPasso((p) => p + 1)}
            disabled={!podeAvancar}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-sm font-display text-sm uppercase disabled:opacity-30"
            style={{ background: t.accent, color: t.bg }}
          >
            Avançar <ChevronRight size={15} />
          </button>
        ) : (
          <button
            onClick={() => setCriado(true)}
            disabled={!form.veiculo || !form.os}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-sm font-display text-sm uppercase disabled:opacity-30"
            style={{ background: t.accent, color: t.bg }}
          >
            <Check size={15} /> Criar esteira
          </button>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   APP — casca com seletor de tela + seletor de tema
   ============================================================ */
const TELAS = [
  { id: "dashboard", label: "Chão de fábrica", icon: LayoutGrid },
  { id: "nova-esteira", label: "Nova esteira", icon: Layers },
  { id: "esteira", label: "Trilho da esteira", icon: GitBranch },
  { id: "apontamento", label: "Minhas atividades", icon: ClipboardCheck },
  { id: "kiosk", label: "Totem", icon: MonitorSmartphone },
];

export default function SGPPrototipo() {
  const [temaId, setTemaId] = useState("argos-dark");
  const [tela, setTela] = useState("dashboard");
  const [esteiras, setEsteiras] = useState(initialEsteiras);
  const [esteiraAtiva, setEsteiraAtiva] = useState(null);
  const [atividades, setAtividades] = useState(minhasAtividadesBase);
  const t = THEMES[temaId];

  return (
    <ThemeCtx.Provider value={t}>
      <div className="min-h-screen font-body transition-colors duration-300" style={{ background: t.bg, "--focus-ring": t.accent }}>
        <style>{FONTS}</style>

        <div className="sticky top-0 z-10" style={{ background: t.bg, borderBottom: `1px solid ${t.border}` }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-sm flex items-center justify-center" style={{ background: t.accentDeep }}>
                <Package size={14} style={{ color: t.bg }} />
              </div>
              <span className="font-display text-base tracking-wide" style={{ color: t.textPrimary }}>SGP</span>
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
          {tela === "dashboard" && <TelaDashboard esteiras={esteiras} onAbrirEsteira={(e) => { setEsteiraAtiva(e); setTela("esteira"); }} />}
          {tela === "nova-esteira" && (
            <TelaNovaEsteira onEsteiraCriada={(nova) => { setEsteiras((prev) => [nova, ...prev]); setEsteiraAtiva(nova); setTela("esteira"); }} />
          )}
          {tela === "esteira" && <TelaEsteira esteira={esteiraAtiva ?? esteiras[0]} onVoltar={() => setTela("dashboard")} />}
          {tela === "apontamento" && <TelaApontamento atividades={atividades} setAtividades={setAtividades} />}
          {tela === "kiosk" && <TelaKiosk />}
        </div>
      </div>
    </ThemeCtx.Provider>
  );
}
