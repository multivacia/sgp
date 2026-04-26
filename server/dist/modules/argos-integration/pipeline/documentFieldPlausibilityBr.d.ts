/**
 * Validação mínima para promover cliente ao draft — evita label/fragmento de parsing.
 */
export declare function isPlausibleClientName(s: string): boolean;
/**
 * Validação mínima para descrição de veículo — evita "real.", só pontuação, etc.
 */
export declare function isPlausibleVehicleDescription(s: string): boolean;
/**
 * Só preenche modelVersion quando há rótulo explícito (modelo/versão) e texto plausível.
 */
export declare function extractModelVersionStrongSignal(text: string): string | undefined;
//# sourceMappingURL=documentFieldPlausibilityBr.d.ts.map