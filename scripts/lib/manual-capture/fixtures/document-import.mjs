/** Resultado fictício de POST /conveyors/document-draft (schema draft v1.1.0, sem dados reais). */

function alt(id, activity, sector, minutes, confidence, reason) {
  return { matrixNodeId: id, nodeType: 'ACTIVITY', kind: 'MATRIX_ACTIVITY', activity, sector, plannedMinutes: minutes, confidence, matchReason: reason }
}

export const DOCUMENT_INGEST_RESULT = {
  requestId: 'req-demo-0001',
  correlationId: 'corr-demo-0001',
  status: 'completed',
  specialist: 'sgp_local_pipeline',
  strategy: 'bravo_deterministic_v1',
  document: { fileName: 'OS-EXEMPLO-0001.pdf', mimeType: 'application/pdf', pageCount: 1, contentSha256: '9f2c4b7a1d3e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8' },
  extractedFacts: [{ key: 'document.number', value: 'OS-EXEMPLO-0001', confidence: 0.98 }],
  sourceDocument: { provider: 'BRAVO', documentType: 'OS_OR_BUDGET', documentNumber: 'OS-EXEMPLO-0001', issuedAt: '2026-06-30' },
  operationalContext: {
    vehicle: { model: 'Veículo Exemplo', year: 2022, color: 'Prata' },
    maskedIdentifiers: { customerNameMasked: 'Cliente E***', licensePlateMasked: 'ABC1***' },
  },
  extractedItems: {
    serviceItems: [
      { id: 'svc-1', description: 'Reforma completa dos bancos dianteiros', confidence: 0.93 },
      { id: 'svc-2', description: 'Troca do revestimento do teto', confidence: 0.9 },
      { id: 'svc-3', description: 'Revestimento couro volante', confidence: 0.81 },
      { id: 'svc-4', description: 'Bordado do logotipo no encosto', confidence: 0.77 },
    ],
    partItems: [{ id: 'prt-1', description: 'Couro sintético preto', quantity: 4, confidence: 0.88 }],
    operationalNotes: ['Cliente solicitou pesponto cinza.'],
  },
  redaction: {
    personalDataRemoved: true,
    financialDataRemoved: true,
    removedCategories: ['customer_name', 'phone', 'email', 'pricing', 'totals'],
  },
  matchingPlan: [
    {
      extractedServiceDescription: 'Reforma completa dos bancos dianteiros',
      suggestedAction: 'REUSE_EXISTING',
      confidence: 0.94,
      matchReason: 'Correspondência com a base "Reforma de bancos".',
      matchedMatrixNodeId: 'mx-bancos-t1',
      matchedMatrixNodeType: 'TASK',
      reusedStructure: { kind: 'MATRIX_SUBTREE', option: 'Bancos dianteiros', plannedMinutes: 690 },
      subtreeSummary: { rootNodeType: 'TASK', totalAreas: 2, totalActivities: 6, totalPlannedMinutes: 690, previewActivities: ['Desmontar bancos', 'Recuperar espuma', 'Costurar capas'] },
    },
    {
      extractedServiceDescription: 'Troca do revestimento do teto',
      suggestedAction: 'REUSE_EXISTING',
      confidence: 0.91,
      matchReason: 'Correspondência com a base "Revestimento de teto".',
      matchedMatrixNodeId: 'mx-teto-t1',
      matchedMatrixNodeType: 'TASK',
      reusedStructure: { kind: 'MATRIX_SUBTREE', option: 'Teto', plannedMinutes: 180 },
      subtreeSummary: { rootNodeType: 'TASK', totalAreas: 1, totalActivities: 2, totalPlannedMinutes: 180, previewActivities: ['Remover forro', 'Aplicar tecido'] },
    },
    {
      extractedServiceDescription: 'Revestimento couro volante',
      suggestedAction: 'REVIEW_SIMILAR',
      confidence: 0.62,
      matchReason: 'Semelhante a "Revestir painéis" (Painéis de porta); confirme a escolha.',
      matchedMatrixNodeId: 'mx-portas-t1-s1-a2',
      matchedMatrixNodeType: 'ACTIVITY',
      reusedStructure: { kind: 'MATRIX_ACTIVITY', sector: 'Tapeçaria', activity: 'Revestir painéis', plannedMinutes: 120 },
      alternativeCandidates: [
        alt('mx-bancos-t1-s1-a4', 'Revestir assentos', 'Tapeçaria', 180, 0.55, 'Termo "revestimento" e material couro.'),
        alt('mx-teto-t1-s1-a2', 'Aplicar tecido', 'Tapeçaria', 120, 0.41, 'Atividade de revestimento genérica.'),
      ],
    },
    {
      extractedServiceDescription: 'Bordado do logotipo no encosto',
      suggestedAction: 'CREATE_NEW',
      confidence: 0.3,
      matchReason: 'Nenhuma atividade semelhante na matriz.',
    },
  ],
  draft: {
    schemaVersion: '1.1.0',
    suggestedDados: {
      title: 'OS-EXEMPLO-0001 — Veículo Exemplo',
      clientName: 'Cliente Exemplo',
      vehicleDescription: 'Veículo Exemplo',
      modelVersion: '2022 · Prata',
      licensePlate: 'ABC1D23',
      notes: 'Cliente solicitou pesponto cinza.',
      priorityHint: 'media',
    },
    options: [],
    warnings: [],
    humanReviewRequired: true,
  },
  warnings: [],
  confidence: { overall: 0.86 },
}
