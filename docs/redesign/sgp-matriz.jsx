import React, { useState, createContext, useContext } from "react";
import {
  Layers, Search, Plus, Trash2, ChevronDown, ChevronUp, ChevronRight,
  ChevronLeft, Check, Copy, Download, Archive, RotateCcw, Palette,
  FileSpreadsheet, X, GripVertical,
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
const uid = () => Math.random().toString(36).slice(2, 9);

/* ============================================================
   DADOS MOCK — lista de matrizes existentes
   ============================================================ */
const colaboradores = ["Val", "Bruno", "Edu", "Marli", "Sula"];

const MATRIZES_INICIAIS = [
  { id: "m1", nome: "Sedan Premium", codigo: "SED-PREM-01", ativo: true, tarefas: 4, atividades: 10, minutos: 450, atualizada: "20/08" },
  { id: "m2", nome: "Conversível Clássico", codigo: "CONV-CLS-01", ativo: true, tarefas: 3, atividades: 5, minutos: 280, atualizada: "14/08" },
  { id: "m3", nome: "SUV Executivo", codigo: "SUV-EXEC-01", ativo: true, tarefas: 3, atividades: 5, minutos: 335, atualizada: "02/08" },
  { id: "m4", nome: "Picape Trabalho", codigo: "PICK-TRB-01", ativo: false, tarefas: 2, atividades: 4, minutos: 210, atualizada: "30/05" },
];

function novaTarefaVazia() {
  return { key: uid(), nome: "", setores: [novoSetorVazio()] };
}
function novoSetorVazio() {
  return { key: uid(), nome: "", atividades: [novaAtividadeVazia()] };
}
function novaAtividadeVazia() {
  return { key: uid(), nome: "", minutos: 30, sequencia: [colaboradores[0]] };
}
function move(arr, i, dir) {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const copy = [...arr];
  [copy[i], copy[j]] = [copy[j], copy[i]];
  return copy;
}

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

function IconBtn({ icon: Icon, onClick, danger, title, size = 14 }) {
  const t = useTheme();
  return (
    <button title={title} onClick={onClick} className="p-1.5 rounded-sm" style={{ background: t.surfaceRaised, color: danger ? t.status.danger.text : t.textMuted }}>
      <Icon size={size} />
    </button>
  );
}

function formatMin(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0) return `${h}h${m > 0 ? String(m).padStart(2, "0") : ""}`;
  return `${m}min`;
}

/* ============================================================
   TELA — LISTA DE MATRIZES
   ============================================================ */
function TelaLista({ matrizes, onNova, onEditar, onDuplicar, onArquivar }) {
  const t = useTheme();
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");

  const filtradas = matrizes.filter((m) => {
    const okBusca = !busca || m.nome.toLowerCase().includes(busca.toLowerCase()) || m.codigo.toLowerCase().includes(busca.toLowerCase());
    const okFiltro = filtro === "todos" || (filtro === "ativos" ? m.ativo : !m.ativo);
    return okBusca && okFiltro;
  });

  return (
    <div>
      <div className="flex items-baseline justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl" style={{ color: t.textPrimary }}>Matrizes de operação</h1>
          <p className="font-body text-sm mt-1" style={{ color: t.textMuted }}>Moldes reutilizáveis para montar esteiras · {matrizes.filter((m) => m.ativo).length} ativas</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-sm font-display text-sm uppercase" style={{ background: "transparent", border: `1px solid ${t.border}`, color: t.textMuted }}>
            <FileSpreadsheet size={15} /> Importar Excel
          </button>
          <button onClick={onNova} className="flex items-center gap-1.5 px-4 py-2.5 rounded-sm font-display text-sm uppercase" style={{ background: t.accent, color: t.bg }}>
            <Plus size={15} /> Nova matriz
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-2 rounded-sm flex-1 min-w-[220px]" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <Search size={15} style={{ color: t.textSoft }} />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou código" className="bg-transparent font-body text-sm outline-none w-full" style={{ color: t.textPrimary }} />
        </div>
        <div className="flex gap-1.5">
          {[["todos", "Todas"], ["ativos", "Ativas"], ["inativos", "Inativas"]].map(([id, label]) => (
            <button key={id} onClick={() => setFiltro(id)} className="px-3 py-1.5 rounded-sm font-mono text-[11px] uppercase" style={{ background: filtro === id ? t.accentSoft : t.surface, color: filtro === id ? t.accent : t.textMuted, border: `1px solid ${filtro === id ? t.accent : t.border}` }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
        {filtradas.map((m) => (
          <div key={m.id} className="p-4 rounded-sm" style={{ background: t.surface, border: `1px solid ${t.border}`, opacity: m.ativo ? 1 : 0.55 }}>
            <div className="flex items-start justify-between mb-2">
              <Layers size={17} style={{ color: t.accent }} />
              {!m.ativo && <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded-sm" style={{ color: t.textSoft, background: t.surfaceHi }}>Inativa</span>}
            </div>
            <button onClick={() => onEditar(m)} className="text-left w-full">
              <div className="font-display text-lg leading-tight" style={{ color: t.textPrimary }}>{m.nome}</div>
              <div className="font-mono text-[11px] mt-0.5" style={{ color: t.textSoft }}>{m.codigo}</div>
            </button>
            <div className="font-mono text-[11px] mt-3 mb-3" style={{ color: t.textMuted }}>
              {m.tarefas} tarefas · {m.atividades} atividades · {formatMin(m.minutos)}
            </div>
            <div className="flex items-center justify-between" style={{ borderTop: `1px solid ${t.border}`, paddingTop: 10 }}>
              <span className="font-mono text-[10px]" style={{ color: t.textSoft }}>Atualizada {m.atualizada}</span>
              <div className="flex gap-1">
                <IconBtn icon={Copy} title="Duplicar" onClick={() => onDuplicar(m)} />
                <IconBtn icon={Download} title="Exportar Excel" onClick={() => {}} />
                <IconBtn icon={m.ativo ? Archive : RotateCcw} title={m.ativo ? "Arquivar" : "Restaurar"} onClick={() => onArquivar(m)} danger={m.ativo} />
              </div>
            </div>
          </div>
        ))}
        {filtradas.length === 0 && (
          <div className="col-span-full p-8 text-center rounded-sm font-body text-sm" style={{ background: t.surface, border: `1px dashed ${t.border}`, color: t.textMuted }}>Nenhuma matriz encontrada.</div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   WIZARD — CRIAR / EDITAR MATRIZ (3 passos)
   ============================================================ */
const PASSOS = ["Dados básicos", "Estrutura", "Revisão"];

function Stepper({ passo }) {
  const t = useTheme();
  return (
    <div className="flex items-center mb-8">
      {PASSOS.map((label, i) => {
        const n = i + 1;
        const feito = n < passo, atual = n === passo;
        return (
          <React.Fragment key={label}>
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs shrink-0" style={{ background: feito || atual ? t.accent : "transparent", color: feito || atual ? t.bg : t.textSoft, border: feito || atual ? "none" : `1px solid ${t.border}` }}>
                {feito ? <Check size={13} /> : n}
              </div>
              <span className="font-body text-xs hidden sm:inline" style={{ color: atual ? t.textPrimary : t.textMuted }}>{label}</span>
            </div>
            {i < PASSOS.length - 1 && <div className="flex-1 h-px mx-3" style={{ background: n < passo ? t.accent : t.border }} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function Input({ label, ...props }) {
  const t = useTheme();
  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-[11px] uppercase" style={{ color: t.textSoft }}>{label}</span>
      <input {...props} className="px-3 py-2 rounded-sm font-body text-sm outline-none" style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.textPrimary }} />
    </label>
  );
}

function SequenciaAtividade({ atividade, onChange }) {
  const t = useTheme();
  const [aberto, setAberto] = useState(false);
  const fora = colaboradores.filter((c) => !atividade.sequencia.includes(c));

  function mover(i, dir) { onChange({ sequencia: move(atividade.sequencia, i, dir) }); }
  function remover(i) {
    if (atividade.sequencia.length <= 1) return;
    onChange({ sequencia: atividade.sequencia.filter((_, idx) => idx !== i) });
  }
  function adicionar(nome) { onChange({ sequencia: [...atividade.sequencia, nome] }); }

  return (
    <div className="w-full">
      <button onClick={() => setAberto((a) => !a)} className="flex items-center gap-1.5 font-mono text-[10px] py-1" style={{ color: t.textSoft }}>
        <span style={{ color: t.accent }}>sequência</span>
        {atividade.sequencia.map((n, i) => `${i + 1}º ${n}`).join("  >  ")}
        {aberto ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      </button>
      {aberto && (
        <div className="rounded-sm p-2.5 mb-1" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          {atividade.sequencia.map((nome, i) => (
            <div key={nome} className="flex items-center gap-2 py-0.5">
              <span className="font-mono text-[10px] w-4" style={{ color: t.textSoft }}>{i + 1}º</span>
              <Avatar nome={nome} size={18} />
              <span className="font-body text-xs flex-1" style={{ color: t.textSecondary }}>{nome}</span>
              <IconBtn icon={ChevronUp} onClick={() => mover(i, -1)} size={12} title="Subir prioridade" />
              <IconBtn icon={ChevronDown} onClick={() => mover(i, 1)} size={12} title="Descer prioridade" />
              {atividade.sequencia.length > 1 && <IconBtn icon={X} onClick={() => remover(i)} size={12} title="Remover da sequência" danger />}
            </div>
          ))}
          {fora.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 pt-2 flex-wrap" style={{ borderTop: `1px solid ${t.border}` }}>
              <span className="font-mono text-[10px]" style={{ color: t.textSoft }}>adicionar:</span>
              {fora.map((nome) => (
                <button key={nome} onClick={() => adicionar(nome)}><Avatar nome={nome} size={20} /></button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TelaWizard({ inicial, onCancelar, onSalvar }) {
  const t = useTheme();
  const [passo, setPasso] = useState(1);
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [codigo, setCodigo] = useState(inicial?.codigo ?? "");
  const [descricao, setDescricao] = useState(inicial?.descricao ?? "");
  const [tarefas, setTarefas] = useState(inicial?.tarefasDraft ?? [novaTarefaVazia()]);

  const totalAtividades = tarefas.reduce((s, tr) => s + tr.setores.reduce((s2, se) => s2 + se.atividades.length, 0), 0);
  const totalMin = tarefas.reduce((s, tr) => s + tr.setores.reduce((s2, se) => s2 + se.atividades.reduce((s3, a) => s3 + Number(a.minutos || 0), 0), 0), 0);

  function updTarefa(ti, patch) { setTarefas((prev) => prev.map((tr, i) => i === ti ? { ...tr, ...patch } : tr)); }
  function updSetor(ti, si, patch) { setTarefas((prev) => prev.map((tr, i) => i !== ti ? tr : { ...tr, setores: tr.setores.map((se, j) => j === si ? { ...se, ...patch } : se) })); }
  function updAtividade(ti, si, ai, patch) {
    setTarefas((prev) => prev.map((tr, i) => i !== ti ? tr : {
      ...tr, setores: tr.setores.map((se, j) => j !== si ? se : { ...se, atividades: se.atividades.map((a, k) => k === ai ? { ...a, ...patch } : a) })
    }));
  }
  function addTarefa() { setTarefas((prev) => [...prev, novaTarefaVazia()]); }
  function removeTarefa(ti) { setTarefas((prev) => prev.filter((_, i) => i !== ti)); }
  function addSetor(ti) { setTarefas((prev) => prev.map((tr, i) => i === ti ? { ...tr, setores: [...tr.setores, novoSetorVazio()] } : tr)); }
  function removeSetor(ti, si) { setTarefas((prev) => prev.map((tr, i) => i !== ti ? tr : { ...tr, setores: tr.setores.filter((_, j) => j !== si) })); }
  function addAtividade(ti, si) { setTarefas((prev) => prev.map((tr, i) => i !== ti ? tr : { ...tr, setores: tr.setores.map((se, j) => j !== si ? se : { ...se, atividades: [...se.atividades, novaAtividadeVazia()] }) })); }
  function removeAtividade(ti, si, ai) { setTarefas((prev) => prev.map((tr, i) => i !== ti ? tr : { ...tr, setores: tr.setores.map((se, j) => j !== si ? se : { ...se, atividades: se.atividades.filter((_, k) => k !== ai) }) })); }
  function moveTarefa(ti, dir) { setTarefas((prev) => move(prev, ti, dir)); }

  const passo1Ok = nome.trim().length > 0;
  const passo2Ok = tarefas.length > 0 && tarefas.every((tr) => tr.nome.trim() && tr.setores.every((se) => se.nome.trim() && se.atividades.every((a) => a.nome.trim())));

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={onCancelar} className="flex items-center gap-1.5 mb-4 font-body text-sm" style={{ color: t.textMuted }}>
        <ChevronLeft size={15} /> Matrizes de operação
      </button>
      <h1 className="font-display text-3xl mb-1" style={{ color: t.textPrimary }}>{inicial ? "Editar matriz" : "Nova matriz"}</h1>
      <p className="font-body text-sm mb-6" style={{ color: t.textMuted }}>Monte o molde uma vez — reaproveite em toda esteira do mesmo tipo de veículo.</p>
      <Stepper passo={passo} />

      {/* PASSO 1 */}
      {passo === 1 && (
        <div className="flex flex-col gap-4 max-w-md">
          <Input label="Nome *" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Sedan Premium" />
          <Input label="Código (opcional)" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Ex.: SED-PREM-01" />
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[11px] uppercase" style={{ color: t.textSoft }}>Descrição (opcional)</span>
            <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} placeholder="O que esse molde cobre..." className="px-3 py-2 rounded-sm font-body text-sm outline-none resize-none" style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.textPrimary }} />
          </label>
        </div>
      )}

      {/* PASSO 2 — estrutura: Tarefa > Setor > Atividade */}
      {passo === 2 && (
        <div className="flex flex-col gap-3">
          {tarefas.map((tr, ti) => (
            <div key={tr.key} className="rounded-sm p-4" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
              <div className="flex items-center gap-2 mb-3">
                <GripVertical size={14} style={{ color: t.textSoft }} />
                <input value={tr.nome} onChange={(e) => updTarefa(ti, { nome: e.target.value })} placeholder="Nome da tarefa (ex.: Desmontagem)" className="flex-1 bg-transparent font-display text-base outline-none border-b" style={{ color: t.textPrimary, borderColor: "transparent" }} onFocus={(e) => e.target.style.borderColor = t.accent} onBlur={(e) => e.target.style.borderColor = "transparent"} />
                <IconBtn icon={ChevronUp} title="Mover para cima" onClick={() => moveTarefa(ti, -1)} />
                <IconBtn icon={ChevronDown} title="Mover para baixo" onClick={() => moveTarefa(ti, 1)} />
                <IconBtn icon={Trash2} title="Remover tarefa" danger onClick={() => removeTarefa(ti)} />
              </div>

              <div className="flex flex-col gap-3 pl-5" style={{ borderLeft: `2px solid ${t.border}` }}>
                {tr.setores.map((se, si) => (
                  <div key={se.key} className="rounded-sm p-3" style={{ background: t.surfaceRaised }}>
                    <div className="flex items-center gap-2 mb-2">
                      <input value={se.nome} onChange={(e) => updSetor(ti, si, { nome: e.target.value })} placeholder="Setor (ex.: Funilaria)" className="flex-1 bg-transparent font-mono text-[11px] uppercase outline-none" style={{ color: t.accent }} />
                      <IconBtn icon={Trash2} title="Remover setor" danger onClick={() => removeSetor(ti, si)} size={12} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {se.atividades.map((a, ai) => (
                        <div key={a.key} className="flex flex-col gap-1 pb-1.5" style={{ borderBottom: `1px solid ${t.border}` }}>
                          <div className="flex items-center gap-2 flex-wrap">
                            <input value={a.nome} onChange={(e) => updAtividade(ti, si, ai, { nome: e.target.value })} placeholder="Nome da atividade" className="flex-1 min-w-[140px] px-2 py-1.5 rounded-sm font-body text-sm outline-none" style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.textPrimary }} />
                            <input type="number" value={a.minutos} onChange={(e) => updAtividade(ti, si, ai, { minutos: e.target.value })} className="w-20 px-2 py-1.5 rounded-sm font-mono text-xs outline-none text-right" style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.textSecondary }} />
                            <span className="font-mono text-[10px]" style={{ color: t.textSoft }}>min</span>
                            <IconBtn icon={X} title="Remover atividade" danger onClick={() => removeAtividade(ti, si, ai)} size={12} />
                          </div>
                          <SequenciaAtividade atividade={a} onChange={(patch) => updAtividade(ti, si, ai, patch)} />
                        </div>
                      ))}
                      <button onClick={() => addAtividade(ti, si)} className="flex items-center gap-1 font-mono text-[11px] mt-1 self-start" style={{ color: t.accent }}>
                        <Plus size={12} /> Atividade
                      </button>
                    </div>
                  </div>
                ))}
                <button onClick={() => addSetor(ti)} className="flex items-center gap-1 font-mono text-[11px] self-start" style={{ color: t.textMuted }}>
                  <Plus size={12} /> Setor
                </button>
              </div>
            </div>
          ))}
          <button onClick={addTarefa} className="flex items-center justify-center gap-1.5 py-3 rounded-sm font-display text-sm uppercase" style={{ border: `1px dashed ${t.border}`, color: t.textMuted }}>
            <Plus size={15} /> Adicionar tarefa
          </button>
        </div>
      )}

      {/* PASSO 3 — revisão */}
      {passo === 3 && (
        <div>
          <div className="rounded-sm p-4 mb-4" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
            <div className="font-display text-lg mb-1" style={{ color: t.textPrimary }}>{nome || "Sem nome"}</div>
            {codigo && <div className="font-mono text-xs mb-1" style={{ color: t.textSoft }}>{codigo}</div>}
            {descricao && <p className="font-body text-sm mb-3" style={{ color: t.textMuted }}>{descricao}</p>}
            <div className="font-mono text-[11px]" style={{ color: t.textMuted }}>
              {tarefas.length} tarefas · {totalAtividades} atividades · {formatMin(totalMin)} no total
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {tarefas.map((tr) => (
              <div key={tr.key} className="rounded-sm p-3.5" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
                <div className="font-display text-sm mb-2" style={{ color: t.textPrimary }}>{tr.nome || "(sem nome)"}</div>
                {tr.setores.map((se) => (
                  <div key={se.key} className="pl-3 mb-1.5">
                    <span className="font-mono text-[10px] uppercase" style={{ color: t.accent }}>{se.nome || "(setor)"}</span>
                    <div className="flex flex-col gap-1 mt-1">
                      {se.atividades.map((a) => (
                        <div key={a.key} className="flex items-center justify-between font-body text-sm gap-2 flex-wrap" style={{ color: t.textSecondary }}>
                          <span className="flex items-center gap-2">
                            <div className="flex -space-x-1.5">
                              {a.sequencia.map((n) => <Avatar key={n} nome={n} size={18} />)}
                            </div>
                            {a.nome || "(atividade)"}
                          </span>
                          <span className="font-mono text-[11px]" style={{ color: t.textSoft }}>{formatMin(Number(a.minutos || 0))}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-8">
        <button onClick={() => setPasso((p) => Math.max(1, p - 1))} disabled={passo === 1} className="flex items-center gap-1.5 px-4 py-2.5 rounded-sm font-display text-sm uppercase disabled:opacity-30" style={{ background: "transparent", border: `1px solid ${t.border}`, color: t.textMuted }}>
          <ChevronLeft size={15} /> Voltar
        </button>
        {passo < 3 ? (
          <button onClick={() => setPasso((p) => p + 1)} disabled={(passo === 1 && !passo1Ok) || (passo === 2 && !passo2Ok)} className="flex items-center gap-1.5 px-5 py-2.5 rounded-sm font-display text-sm uppercase disabled:opacity-30" style={{ background: t.accent, color: t.bg }}>
            Avançar <ChevronRight size={15} />
          </button>
        ) : (
          <button
            onClick={() => onSalvar({ id: inicial?.id ?? uid(), nome, codigo: codigo || "—", ativo: true, tarefas: tarefas.length, atividades: totalAtividades, minutos: totalMin, atualizada: "hoje", tarefasDraft: tarefas })}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-sm font-display text-sm uppercase"
            style={{ background: t.accent, color: t.bg }}
          >
            <Check size={15} /> {inicial ? "Salvar alterações" : "Criar matriz"}
          </button>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   APP
   ============================================================ */
export default function SGPMatrizPrototipo() {
  const [temaId, setTemaId] = useState("argos-dark");
  const [matrizes, setMatrizes] = useState(MATRIZES_INICIAIS);
  const [modo, setModo] = useState("lista"); // lista | wizard
  const [editando, setEditando] = useState(null);
  const t = THEMES[temaId];

  function salvar(m) {
    setMatrizes((prev) => {
      const existe = prev.some((x) => x.id === m.id);
      return existe ? prev.map((x) => x.id === m.id ? m : x) : [m, ...prev];
    });
    setModo("lista");
    setEditando(null);
  }

  return (
    <ThemeCtx.Provider value={t}>
      <div className="min-h-screen font-body transition-colors duration-300" style={{ background: t.bg, "--focus-ring": t.accent }}>
        <style>{FONTS}</style>
        <div className="sticky top-0 z-10" style={{ background: t.bg, borderBottom: `1px solid ${t.border}` }}>
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-sm flex items-center justify-center" style={{ background: t.accentDeep }}>
                <Layers size={14} style={{ color: t.bg }} />
              </div>
              <span className="font-display text-base tracking-wide" style={{ color: t.textPrimary }}>SGP · Matriz</span>
              <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded-sm" style={{ color: t.textSoft, background: t.surface }}>protótipo</span>
            </div>
            <ThemeSwitcher temaId={temaId} setTemaId={setTemaId} />
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          {modo === "lista" && (
            <TelaLista
              matrizes={matrizes}
              onNova={() => { setEditando(null); setModo("wizard"); }}
              onEditar={(m) => { setEditando(m); setModo("wizard"); }}
              onDuplicar={(m) => setMatrizes((prev) => [{ ...m, id: uid(), nome: m.nome + " (cópia)", atualizada: "hoje" }, ...prev])}
              onArquivar={(m) => setMatrizes((prev) => prev.map((x) => x.id === m.id ? { ...x, ativo: !x.ativo } : x))}
            />
          )}
          {modo === "wizard" && (
            <TelaWizard inicial={editando} onCancelar={() => { setModo("lista"); setEditando(null); }} onSalvar={salvar} />
          )}
        </div>
      </div>
    </ThemeCtx.Provider>
  );
}
