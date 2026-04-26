/**
 * Comparação em tempo constante para segredos em string UTF-8.
 * Comprimentos diferentes → false (sem timingSafeEqual entre buffers de tamanhos distintos).
 */
export declare function secureTokenCompare(a: string, b: string): boolean;
//# sourceMappingURL=secureTokenCompare.d.ts.map