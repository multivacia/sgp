--*********************************************************************
--* 05_AGING_INADIMPLENCIA.sql                                         *
--* Aging simples de parcelas vencidas por faixa de atraso e por      *
--* classificacao de inadimplencia do contrato.                        *
--*                                                                    *
--* Faixas (parametros DIAS_INAD_*):                                   *
--*   0    : em dia                                                    *
--*   1-30 : leve   (L)                                                *
--*   31-60: medio  (M)                                                *
--*   61-90: gravE  (G)                                                *
--*   >90  : critica (R)                                               *
--*********************************************************************

SET CURRENT SCHEMA = SIGEC;

-- Aging por faixa de atraso (parcelas vencidas)
SELECT CASE
         WHEN DIAS_ATRASO BETWEEN 1  AND 30  THEN '1-30'
         WHEN DIAS_ATRASO BETWEEN 31 AND 60  THEN '31-60'
         WHEN DIAS_ATRASO BETWEEN 61 AND 90  THEN '61-90'
         WHEN DIAS_ATRASO > 90               THEN '>90'
         ELSE '0'
       END               AS FAIXA_ATRASO,
       COUNT(*)          AS QT_PARCELAS,
       SUM(VR_SALDO)     AS VR_SALDO_TOTAL
  FROM SIGEC.SG_PARCELA
 WHERE ST_PARCELA = 'VC'
 GROUP BY CASE
            WHEN DIAS_ATRASO BETWEEN 1  AND 30  THEN '1-30'
            WHEN DIAS_ATRASO BETWEEN 31 AND 60  THEN '31-60'
            WHEN DIAS_ATRASO BETWEEN 61 AND 90  THEN '61-90'
            WHEN DIAS_ATRASO > 90               THEN '>90'
            ELSE '0'
          END
 ORDER BY 1;

-- Consolidado por contrato inadimplente
SELECT C.ID_CONTRATO,
       C.CLASSIFICACAO_INAD,
       C.DIAS_ATRASO_MAX,
       COUNT(P.NR_PARCELA)             AS QT_PARC_VENCIDAS,
       SUM(P.VR_SALDO)                 AS VR_TOTAL_VENCIDO,
       SUM(P.VR_JUROS + P.VR_MULTA)    AS VR_ENCARGOS
  FROM SIGEC.SG_CONTRATO C
  JOIN SIGEC.SG_PARCELA  P
    ON P.ID_CONTRATO = C.ID_CONTRATO
   AND P.ST_PARCELA = 'VC'
 WHERE C.ST_CONTRATO IN ('IN','RN')
 GROUP BY C.ID_CONTRATO, C.CLASSIFICACAO_INAD, C.DIAS_ATRASO_MAX
 ORDER BY C.DIAS_ATRASO_MAX DESC;

-- Contratos IN com CLASSIFICACAO_INAD divergente da regra
--   (usa parametros DIAS_INAD_* como referencia estatica).
SELECT C.ID_CONTRATO,
       C.CLASSIFICACAO_INAD,
       C.DIAS_ATRASO_MAX,
       CASE
         WHEN C.DIAS_ATRASO_MAX = 0                   THEN 'N'
         WHEN C.DIAS_ATRASO_MAX BETWEEN 1  AND 30     THEN 'L'
         WHEN C.DIAS_ATRASO_MAX BETWEEN 31 AND 60     THEN 'M'
         WHEN C.DIAS_ATRASO_MAX BETWEEN 61 AND 90     THEN 'G'
         WHEN C.DIAS_ATRASO_MAX > 90                  THEN 'R'
       END AS CLASSIF_ESPERADA
  FROM SIGEC.SG_CONTRATO C
 WHERE C.ST_CONTRATO = 'IN'
   AND COALESCE(C.CLASSIFICACAO_INAD, 'N') <>
       CASE
         WHEN C.DIAS_ATRASO_MAX = 0                   THEN 'N'
         WHEN C.DIAS_ATRASO_MAX BETWEEN 1  AND 30     THEN 'L'
         WHEN C.DIAS_ATRASO_MAX BETWEEN 31 AND 60     THEN 'M'
         WHEN C.DIAS_ATRASO_MAX BETWEEN 61 AND 90     THEN 'G'
         WHEN C.DIAS_ATRASO_MAX > 90                  THEN 'R'
       END;
