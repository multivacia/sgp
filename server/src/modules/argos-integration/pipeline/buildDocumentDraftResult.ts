import { createHash, randomUUID } from 'node:crypto'
import type { ArgosDocumentIngestResult } from '../document-draft.schemas.js'
import type { ExtractDocumentTextResult } from './extractDocumentText.js'
import type { HeuristicInterpretation } from './interpretHeuristicBr.js'
import {
  isDocumentDraftCandidateLinesDebugEnabled,
  isDocumentDraftPipelineFlagsEnabled,
  isDocumentDraftResponseDebugEnabled,
} from './documentDraftPipelineDebug.js'
import type { BravoBasicFieldsDiagnostics } from './parseBravoBasicFields.js'
import {
  isForbiddenOperationalContent,
  sanitizeDocumentNumberCandidate,
  sanitizeOperationalText,
} from './bravoOperationalSanitize.js'
import { isCommercialNonOperationalBravoLine, isDocumentNoiseLine } from './bravoTextNormalization.js'

type Issue = ArgosDocumentIngestResult['warnings'][number]

function sha256(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex')
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

const FINANCIAL_TOKEN_RE =
  /\b(valor\s+unit[aá]rio|valor\s+total|subtotal|total|desconto|recebido|troco|pagamento)\b|R\$\s*[\d.,]+/i
/** Heurística só para linhas que são claramente insumo — não roubar serviços que citam tecido/courvin. */
const PART_TOKEN_RE =
  /\b(pe[cç]a|insumo|material|espuma|manta)\b/i

function looksFinancialText(value: string | undefined): boolean {
  if (!value) return false
  return (
    FINANCIAL_TOKEN_RE.test(value) ||
    isForbiddenOperationalContent(value) ||
    isCommercialNonOperationalBravoLine(value)
  )
}

/** Remove ou descarta texto que ainda contenha padrões financeiros/LGPD após sanitização. */
function defensiveCleanOptional(value: string | undefined): string | undefined {
  if (!value) return undefined
  const t = sanitizeOperationalText(value)
  if (!t || isForbiddenOperationalContent(t)) return undefined
  return t
}

/**
 * Placa completa só na aba Dados básicos (TD10.5) — fora de operações/ARGOS.
 * Reaproveita a mesma validação leve; normaliza Mercosul sem máscara.
 */
function bravoSuggestedLicensePlateForBasicTab(
  raw: string | undefined,
): string | undefined {
  if (!raw?.trim()) return undefined
  const compact = raw.replace(/\s/g, '').toUpperCase()
  if (/^[A-Z]{3}\d[A-Z]\d{2}$/.test(compact)) return compact
  if (/^[A-Z]{3}\d{4}$/.test(compact)) return compact
  if (/^[A-Z]{3}-\d{4}$/.test(compact)) return compact.replace('-', '')
  return defensiveCleanOptional(raw)
}

function sanitizeOperationalNote(value: string | undefined): string | undefined {
  if (!value) return undefined
  const sanitized = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !looksFinancialText(line))
    .join('\n')
    .trim()
  return sanitized || undefined
}

function parseBrDateDdMmYyyy(s: string | undefined): Date | null {
  if (!s) return null
  const m = String(s).trim().match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/)
  if (!m) return null
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]))
  return Number.isNaN(d.getTime()) ? null : d
}

function parseBravoDateToLocalDate(s: string | undefined): Date | null {
  if (!s) return null
  const t = String(s).trim()
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
    return Number.isNaN(d.getTime()) ? null : d
  }
  return parseBrDateDdMmYyyy(t)
}

/** Origem hipotética de prazo se existisse cálculo automático (debug TD10.2). */
export function resolveBravoEstimatedDeadlineSource(
  h: HeuristicInterpretation,
): 'entryAt' | 'issuedAt' | 'fallback' {
  if (parseBravoDateToLocalDate(h.entryAt)) return 'entryAt'
  if (parseBravoDateToLocalDate(h.receivedAt)) return 'entryAt'
  if (parseBravoDateToLocalDate(h.issuedAt)) return 'issuedAt'
  return 'fallback'
}

function normalizeRemovedCategories(
  categories: string[] | undefined,
): NonNullable<ArgosDocumentIngestResult['redaction']>['removedCategories'] {
  const allowed: NonNullable<ArgosDocumentIngestResult['redaction']>['removedCategories'] = [
    'cpf_cnpj',
    'rg_ie',
    'address',
    'phone',
    'email',
    'customer_name',
    'pricing',
    'payment_terms',
    'discount',
    'totals',
  ]
  const set = new Set(allowed)
  const filtered = (categories ?? []).filter(
    (value): value is (typeof allowed)[number] => set.has(value as (typeof allowed)[number]),
  )
  if (filtered.length > 0) return filtered
  return [...allowed]
}

function buildOptionsFromServiceItems(
  serviceItems: NonNullable<ArgosDocumentIngestResult['extractedItems']>['serviceItems'],
) {
  if (serviceItems.length === 0) return []
  const steps = serviceItems.map((item, idx) => ({
    orderIndex: idx + 1,
    title: item.description.slice(0, 500),
    plannedMinutes: undefined as number | undefined,
    confidence: item.confidence,
  }))
  return [
    {
      orderIndex: 1,
      title: 'Itens inferidos do documento',
      areas: [
        {
          orderIndex: 1,
          title: 'Serviço',
          steps,
        },
      ],
    },
  ]
}

/**
 * Monta o resultado oficial do ingest — draft de domínio v1 + warnings + confiança.
 */
export function buildDocumentDraftResult(params: {
  fileBuffer: Buffer
  fileName: string
  mimeType: string | undefined
  correlationId: string
  extract: ExtractDocumentTextResult
  interpretation: HeuristicInterpretation
  /** Opcional — alinha logs TD10.2 ao mesmo requestId do adapter. */
  requestId?: string
  /** Flags do parse (sem PII) — só entram em `draft.extensions` em dev + env. */
  basicParseDiagnostics?: BravoBasicFieldsDiagnostics
  /** Linhas candidatas já sanitizadas (TD10.3) — só em meta local + env triplo. */
  candidateDebugLines?: string[]
}): ArgosDocumentIngestResult {
  const requestId = params.requestId ?? randomUUID()
  const { extract, interpretation: h, fileBuffer, fileName, mimeType, correlationId } =
    params

  if (fileBuffer.length === 0) {
    return {
      requestId,
      correlationId,
      status: 'failed',
      specialist: 'sgp_argos_local_heuristic_v1',
      strategy: 'local_heuristic_pipeline_v1',
      document: {
        fileName,
        mimeType,
        contentSha256: sha256(fileBuffer),
      },
      extractedFacts: [],
      draft: null,
      warnings: [
        {
          category: 'fatal_error',
          code: 'file.empty_buffer',
          message: 'Ficheiro vazio; nada a interpretar.',
          fieldPath: 'file',
        },
      ],
      confidence: { overall: 0 },
    }
  }

  const issues: Issue[] = []

  for (const w of extract.extractWarnings) {
    issues.push({
      category: 'revisable_warning',
      code: w.code,
      message: w.message,
      fieldPath: 'document',
    })
  }

  const textEmpty = !extract.text.trim()
  if (textEmpty) {
    issues.push({
      category: 'revisable_warning',
      code: 'interpret.text_empty',
      message:
        'Texto vazio após extração; sugestões baseadas apenas no nome do ficheiro, se aplicável.',
      fieldPath: 'extract.text',
    })
  }

  const isBravoDeterministic = h.heuristicSource === 'bravo_deterministic'

  const fieldPathsRaw: Array<{
    path: string
    label: string
    present: boolean
    conf?: number
    skipForBravo?: boolean
  }> = [
    {
      path: 'suggestedDados.osNumber',
      label: 'Número da OS',
      present: Boolean(h.osNumber),
      conf: h.fieldConfidence.osNumber,
    },
    {
      path: 'suggestedDados.licensePlate',
      label: 'Placa',
      present: Boolean(h.licensePlate),
      conf: h.fieldConfidence.licensePlate,
      /** TD10.5: placa só para referência na UI — não exige campo nem expõe em fluxos operacionais. */
      skipForBravo: true,
    },
    {
      path: 'options.serviceLines',
      label: 'Linhas de serviço',
      present: h.serviceLines.length > 0,
      conf: h.serviceLines.length ? avg(h.serviceLines.map((s) => s.confidence)) : undefined,
    },
    {
      path: 'suggestedEsteiraTitle',
      label: 'Nome sugerido da esteira',
      present: Boolean(h.suggestedEsteiraTitle),
      conf: h.fieldConfidence.suggestedEsteiraTitle,
    },
    {
      path: 'suggestedEsteiraDescription',
      label: 'Descrição sugerida',
      present: Boolean(h.suggestedEsteiraDescription),
      conf: h.fieldConfidence.suggestedEsteiraDescription,
      skipForBravo: true,
    },
  ]
  const fieldPaths = fieldPathsRaw.filter(
    (f) => !(isBravoDeterministic && f.skipForBravo),
  )

  for (const f of fieldPaths) {
    if (!f.present) {
      issues.push({
        category: 'missing_field',
        code: `field.missing.${f.path.replace(/\./g, '_')}`,
        message: `${f.label} não identificado com confiança suficiente.`,
        fieldPath: f.path,
      })
    } else if (f.conf !== undefined && f.conf < 0.45) {
      issues.push({
        category: 'low_confidence_field',
        code: `field.low_confidence.${f.path.replace(/\./g, '_')}`,
        message: `${f.label} presente mas com confiança baixa.`,
        fieldPath: f.path,
        confidence: f.conf,
      })
    }
  }

  const byField: Record<string, number> = { ...h.fieldConfidence }
  const overall = avg(
    [
      ...Object.values(h.fieldConfidence),
      textEmpty ? 0.2 : 0.75,
      extract.source === 'pdf' ? 0.85 : extract.source === 'text' ? 0.9 : 0.55,
    ].filter((x) => typeof x === 'number'),
  )

  const extractedFacts: ArgosDocumentIngestResult['extractedFacts'] = []
  const osFact = sanitizeDocumentNumberCandidate(h.osNumber)
  if (osFact)
    extractedFacts.push({
      key: 'os.number',
      value: osFact,
      confidence: h.fieldConfidence.osNumber,
    })
  /** TD10: placa não entra em factos operacionais do ingest (permanece só no draft sugerido). */
  if (!isBravoDeterministic) {
    const plateFact = defensiveCleanOptional(h.licensePlate)
    if (plateFact)
      extractedFacts.push({
        key: 'vehicle.licensePlate',
        value: plateFact,
        confidence: h.fieldConfidence.licensePlate,
      })
  }
  const vehDescFact = defensiveCleanOptional(h.vehicleDescription)
  if (vehDescFact)
    extractedFacts.push({
      key: 'vehicle.description',
      value: vehDescFact,
      confidence: 0.5,
    })
  if (!isBravoDeterministic) {
    const modelFact = defensiveCleanOptional(h.modelVersion)
    if (modelFact)
      extractedFacts.push({
        key: 'vehicle.modelVersion',
        value: modelFact,
        confidence: h.fieldConfidence.modelVersion ?? 0.55,
      })
  }
  for (const sl of h.serviceLines.slice(0, 15)) {
    const tid = sanitizeOperationalText(sl.title)
    if (!tid || looksFinancialText(tid)) continue
    extractedFacts.push({
      key: `serviceLine.${sl.orderIndex}`,
      value: tid,
      confidence: sl.confidence,
    })
  }

  let sanitizationRemoved = 0

  const serviceItems: NonNullable<ArgosDocumentIngestResult['extractedItems']>['serviceItems'] = (
    h.serviceLines
      .filter(
        (sl) =>
          !looksFinancialText(sl.title) &&
          !PART_TOKEN_RE.test(sl.title) &&
          !isDocumentNoiseLine(sl.title),
      )
      .slice(0, 25)
      .map((sl) => ({
        id: `svc-${sl.orderIndex}`,
        description: sl.title,
        confidence: sl.confidence,
      }))
  )
    .map((item) => ({
      ...item,
      description: sanitizeOperationalText(item.description),
    }))
    .filter((item) => {
      if (
        !item.description ||
        item.description.length < 3 ||
        looksFinancialText(item.description) ||
        isDocumentNoiseLine(item.description)
      ) {
        sanitizationRemoved++
        return false
      }
      return true
    })

  const partItemsFromServices: NonNullable<ArgosDocumentIngestResult['extractedItems']>['partItems'] =
    h.serviceLines
      .map((sl) => ({
        ...sl,
        title: sanitizeOperationalText(sl.title),
      }))
      .filter((sl) => PART_TOKEN_RE.test(sl.title) && !looksFinancialText(sl.title))
      .slice(0, 25)
      .map((sl) => ({
        id: `part-${sl.orderIndex}`,
        description: sl.title,
        confidence: sl.confidence,
      }))

  const partItemsFromParser: NonNullable<ArgosDocumentIngestResult['extractedItems']>['partItems'] =
    (h.partLines ?? []).slice(0, 25).map((p) => ({
      id: `part-${p.orderIndex}`,
      description: sanitizeOperationalText(p.description),
      quantity: p.quantity,
      confidence: p.confidence,
    }))

  const partItems = [...partItemsFromParser, ...partItemsFromServices]
    .map((item) => ({
      ...item,
      description: sanitizeOperationalText(item.description),
    }))
    .filter((item) => {
      if (
        !item.description ||
        item.description.length < 3 ||
        looksFinancialText(item.description) ||
        isDocumentNoiseLine(item.description)
      ) {
        sanitizationRemoved++
        return false
      }
      return true
    })
    .slice(0, 25)

  const operationalNotes = isBravoDeterministic
    ? []
    : [
          ...((h.operationalNotes ?? [])
            .map((note) => sanitizeOperationalNote(note))
            .filter((n): n is string => Boolean(n))),
          sanitizeOperationalNote(h.notes),
        ]
          .filter((n): n is string => Boolean(n))
          .map((note) => sanitizeOperationalText(note))
          .filter((note): note is string => Boolean(note))
          .filter(
            (note) =>
              !isDocumentNoiseLine(note) &&
              !looksFinancialText(note) &&
              !isCommercialNonOperationalBravoLine(note),
          )
          .slice(0, 20)

  const safeTitleBase = fileName.replace(/\.[^.]+$/, '')
  const rawTitle = isBravoDeterministic
    ? (sanitizeDocumentNumberCandidate(h.osNumber) ?? h.osNumber ?? '').trim()
    : (h.suggestedEsteiraTitle ?? safeTitleBase)
  const titleClean = sanitizeOperationalText(rawTitle)
  const bravoOsTitleOk =
    isBravoDeterministic &&
    titleClean.trim().length > 0 &&
    /^\d{3,8}$/.test(titleClean.trim())
  const titleForDraft =
    titleClean &&
    (bravoOsTitleOk || !isForbiddenOperationalContent(titleClean))
      ? titleClean.slice(0, 500)
      : safeTitleBase.slice(0, 500)
  const draft: ArgosDocumentIngestResult['draft'] = {
        schemaVersion: '1.1.0',
        suggestedDados: {
          title: titleForDraft,
          clientName: isBravoDeterministic
            ? defensiveCleanOptional(h.clientName)
            : undefined,
          vehicleDescription: defensiveCleanOptional(h.vehicleDescription),
          modelVersion: isBravoDeterministic
            ? ''
            : defensiveCleanOptional(h.modelVersion),
          licensePlate: isBravoDeterministic
            ? bravoSuggestedLicensePlateForBasicTab(h.licensePlate)
            : defensiveCleanOptional(h.licensePlate),
          notes: isBravoDeterministic ? '' : operationalNotes.join('\n').slice(0, 8000),
          /** TD10.5: import Bravo não preenche prazo estimado automaticamente. */
          estimatedDeadline: undefined,
          priorityHint: h.priorityHint,
          osNumber: sanitizeDocumentNumberCandidate(h.osNumber) ?? undefined,
        },
        options: buildOptionsFromServiceItems(serviceItems),
        warnings: [],
        humanReviewRequired: true,
        extensions: {
          suggestedEsteiraTitle: h.suggestedEsteiraTitle,
          suggestedEsteiraDescription: h.suggestedEsteiraDescription,
          serviceLineCount: h.serviceLines.length,
          validServiceItemCount: serviceItems.length,
          pipeline: {
            extractSource: extract.source,
            interpretationVersion: 'heuristic_br_os_v1',
            documentLineClassifier: 'document_line_semantic_v2',
          },
        },
      }

  let extraRemovedFromFinalSweep = 0
  const finalServiceItems = serviceItems.filter((item) => {
    const ok =
      item.description.length >= 3 &&
      !looksFinancialText(item.description) &&
      !isDocumentNoiseLine(item.description)
    if (!ok) extraRemovedFromFinalSweep++
    return ok
  })
  const finalPartItems = partItems.filter((item) => {
    const ok =
      item.description.length >= 3 &&
      !looksFinancialText(item.description) &&
      !isDocumentNoiseLine(item.description)
    if (!ok) extraRemovedFromFinalSweep++
    return ok
  })
  const finalOperationalNotes = operationalNotes.filter((note) => {
    const ok =
      !looksFinancialText(note) &&
      !isDocumentNoiseLine(note) &&
      !isCommercialNonOperationalBravoLine(note)
    if (!ok) extraRemovedFromFinalSweep++
    return ok
  })

  const draftNotesJoined = finalOperationalNotes.join('\n').slice(0, 8000)
  const sweepTitle = draft.suggestedDados.title?.trim() ?? ''
  const sweepBravoOsOk =
    isBravoDeterministic &&
    sweepTitle.length > 0 &&
    /^\d{3,8}$/.test(sweepTitle)
  const titleAfterSweep =
    sweepTitle &&
    (sweepBravoOsOk || !isForbiddenOperationalContent(draft.suggestedDados.title ?? ''))
      ? draft.suggestedDados.title!
      : safeTitleBase.slice(0, 500)

  const suppressedPartItemCount = finalPartItems.length

  const draftFinal: ArgosDocumentIngestResult['draft'] = {
    ...draft,
    suggestedDados: {
      ...draft.suggestedDados,
      notes: draftNotesJoined,
      title: titleAfterSweep,
    },
    options: buildOptionsFromServiceItems(finalServiceItems),
    extensions: draft.extensions
      ? {
          ...draft.extensions,
          validServiceItemCount: finalServiceItems.length,
          documentPartsExcludedFromOperationalUi: suppressedPartItemCount,
        }
      : undefined,
  }

  let draftForReturn: ArgosDocumentIngestResult['draft'] = draftFinal

  const hasBasicDebug =
    isDocumentDraftResponseDebugEnabled() &&
    isBravoDeterministic &&
    params.basicParseDiagnostics

  const candidateLinesForDebug =
    isDocumentDraftCandidateLinesDebugEnabled() &&
    params.candidateDebugLines &&
    params.candidateDebugLines.length > 0
      ? params.candidateDebugLines
      : undefined

  const hasCandidateDebug = Boolean(candidateLinesForDebug?.length)

  if (hasBasicDebug || hasCandidateDebug) {
    const basic = params.basicParseDiagnostics
    draftForReturn = {
      ...draftFinal,
      extensions: {
        ...(draftFinal.extensions ?? {}),
        debugBasicFieldsFlags: {
          ...(hasBasicDebug && basic
            ? {
                basicFields: {
                  foundDocumentNumber: basic.foundDocumentNumber,
                  foundIssuedAt: basic.foundIssuedAt,
                  foundEntryAt: basic.foundEntryAt,
                  foundClientName: basic.foundClientName,
                  foundVehicleModel: basic.foundVehicleModel,
                  foundVehicleYear: basic.foundVehicleYear,
                  foundVehicleColor: basic.foundVehicleColor,
                  foundLicensePlate: basic.foundLicensePlate,
                },
                propagation: {
                  hasOperationalVehicle: Boolean(
                    defensiveCleanOptional(
                      isBravoDeterministic
                        ? h.vehicleDescription
                        : (h.modelVersion ?? h.vehicleDescription),
                    ) ||
                      h.vehicleYear !== undefined ||
                      defensiveCleanOptional(h.vehicleColor),
                  ),
                  hasMaskedIdentifiers: Boolean(h.licensePlate),
                  hasSuggestedDadosVehicleDescription: Boolean(
                    defensiveCleanOptional(h.vehicleDescription),
                  ),
                  hasSuggestedDadosClientName: Boolean(
                    isBravoDeterministic && defensiveCleanOptional(h.clientName),
                  ),
                  hasSuggestedDadosLicensePlate: Boolean(defensiveCleanOptional(h.licensePlate)),
                  estimatedDeadlineSource: resolveBravoEstimatedDeadlineSource(h),
                },
              }
            : {}),
          ...(hasCandidateDebug ? { candidateLines: candidateLinesForDebug! } : {}),
        },
      },
    }
  }

  if (isDocumentDraftPipelineFlagsEnabled()) {
    const opModel = defensiveCleanOptional(
      isBravoDeterministic ? h.vehicleDescription : (h.modelVersion ?? h.vehicleDescription),
    )
    const opColor = defensiveCleanOptional(h.vehicleColor)
    console.info({
      stage: 'document_draft.build_result.flags',
      requestId,
      correlationId,
      provider: isBravoDeterministic ? 'BRAVO' : 'HEURISTIC_IMPORT',
      schemaVersion: draftFinal.schemaVersion ?? null,
      hasSourceDocumentNumber: Boolean(
        sanitizeDocumentNumberCandidate(h.documentNumber ?? h.osNumber),
      ),
      hasSourceIssuedAt: Boolean(h.issuedAt),
      hasSourceEntryDate: Boolean(isBravoDeterministic && h.entryAt),
      hasOperationalVehicleModel: Boolean(opModel),
      hasOperationalVehicleYear: h.vehicleYear !== undefined,
      hasOperationalVehicleColor: Boolean(opColor),
      hasSuggestedVehicleDescription: Boolean(defensiveCleanOptional(h.vehicleDescription)),
      estimatedDeadlineSource: isBravoDeterministic
        ? resolveBravoEstimatedDeadlineSource(h)
        : 'fallback',
      warningCodes: issues.map((i) => i.code).slice(0, 80),
    })
  }

  if (sanitizationRemoved + extraRemovedFromFinalSweep > 0) {
    issues.push({
      category: 'revisable_warning',
      code: 'sanitization.removed_forbidden_operational_content',
      message:
        'Trechos financeiros, tabulares ou sensíveis foram removidos antes do rascunho operacional.',
      fieldPath: 'draft',
    })
  }

  if (finalServiceItems.length === 0) {
    issues.push({
      category: 'revisable_warning',
      code: 'interpret.no_valid_service_items',
      message:
        'Nenhum serviço operacional válido foi identificado após filtros de ruído documental.',
      fieldPath: 'extractedItems.serviceItems',
    })
  }

  let status: ArgosDocumentIngestResult['status'] = 'completed'
  if (textEmpty || issues.filter((i) => i.category === 'missing_field').length >= 3)
    status = 'partial'

  return {
    requestId,
    correlationId,
    status,
    specialist: 'sgp_argos_local_heuristic_v1',
    strategy: 'local_heuristic_pipeline_v1',
    document: {
      fileName,
      mimeType,
      pageCount: extract.pageCount,
      contentSha256: sha256(fileBuffer),
    },
    extractedFacts,
    sourceDocument: {
      provider: isBravoDeterministic ? 'BRAVO' : 'HEURISTIC_IMPORT',
      documentType: 'OS_OR_BUDGET',
      documentNumber:
        sanitizeDocumentNumberCandidate(h.documentNumber ?? h.osNumber) ??
        undefined,
      issuedAt: h.issuedAt,
      receivedAt: h.receivedAt,
      ...(isBravoDeterministic && h.entryAt
        ? { entryDate: h.entryAt }
        : {}),
    },
    operationalContext: {
      vehicle: {
        model: defensiveCleanOptional(
          isBravoDeterministic ? h.vehicleDescription : (h.modelVersion ?? h.vehicleDescription),
        ),
        year: h.vehicleYear,
        color: defensiveCleanOptional(h.vehicleColor),
      },
      maskedIdentifiers: {
        licensePlateMasked: h.licensePlate
          ? `${h.licensePlate.slice(0, 3)}****`
          : undefined,
      },
    },
    extractedItems: {
      serviceItems: finalServiceItems,
      /** TD7: peças não fazem parte do fluxo operacional do SGP — não enviar ao cliente. */
      partItems: [],
      operationalNotes: finalOperationalNotes,
    },
    redaction: {
      personalDataRemoved: h.personalDataDetected ?? true,
      financialDataRemoved: h.financialDataDetected ?? true,
      removedCategories: normalizeRemovedCategories(h.removedCategories),
    },
    matchingPlan: [],
    draft: draftForReturn,
    warnings: issues,
    confidence: {
      overall: Math.round(overall * 1000) / 1000,
      byField: Object.keys(byField).length ? byField : undefined,
    },
  }
}
