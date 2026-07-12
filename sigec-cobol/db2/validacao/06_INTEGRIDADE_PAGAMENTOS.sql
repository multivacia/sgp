--*********************************************************************
--* 06_INTEGRIDADE_PAGAMENTOS.sql                                      *
--* Consistencia de pagamentos vs parcelas.                            *
--*********************************************************************

SET CURRENT SCHEMA = SIGEC;

-- Total pago por parcela vs valor original
SELECT G.ID_CONTRATO,
       G.NR_PARCELA,
       P.VR_PARCELA,
       SUM(CASE WHEN G.ST_PAGAMENTO = 'CF' THEN  G.VR_PAGO ELSE 0 END) AS VR_PAGO_CONFIRMADO,
       SUM(CASE WHEN G.ST_PAGAMENTO = 'ES' THEN  G.VR_PAGO ELSE 0 END) AS VR_ESTORNADO,
       P.ST_PARCELA
  FROM SIGEC.SG_PAGAMENTO G
  JOIN SIGEC.SG_PARCELA   P
    ON P.ID_CONTRATO = G.ID_CONTRATO
   AND P.NR_PARCELA  = G.NR_PARCELA
 GROUP BY G.ID_CONTRATO, G.NR_PARCELA, P.VR_PARCELA, P.ST_PARCELA
 ORDER BY G.ID_CONTRATO, G.NR_PARCELA;

-- Parcelas PG cujo somatorio de pagamentos CF eh menor que o valor original
SELECT P.ID_CONTRATO,
       P.NR_PARCELA,
       P.VR_PARCELA,
       COALESCE(SUM(CASE WHEN G.ST_PAGAMENTO = 'CF' THEN G.VR_PAGO ELSE 0 END), 0)
         AS VR_PAGO_CF
  FROM SIGEC.SG_PARCELA  P
  LEFT JOIN SIGEC.SG_PAGAMENTO G
    ON G.ID_CONTRATO = P.ID_CONTRATO
   AND G.NR_PARCELA  = P.NR_PARCELA
 WHERE P.ST_PARCELA = 'PG'
 GROUP BY P.ID_CONTRATO, P.NR_PARCELA, P.VR_PARCELA
HAVING COALESCE(SUM(CASE WHEN G.ST_PAGAMENTO = 'CF' THEN G.VR_PAGO ELSE 0 END), 0)
       < P.VR_PARCELA;

-- Pagamentos duplicados (mesmo NR_DOC_PAGTO, mesmo canal, confirmados)
SELECT CD_CANAL, NR_DOC_PAGTO, COUNT(*) AS QT_DUPLICADOS
  FROM SIGEC.SG_PAGAMENTO
 WHERE ST_PAGAMENTO = 'CF'
   AND NR_DOC_PAGTO IS NOT NULL
 GROUP BY CD_CANAL, NR_DOC_PAGTO
HAVING COUNT(*) > 1;
