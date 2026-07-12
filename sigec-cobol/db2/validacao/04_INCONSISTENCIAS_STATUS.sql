--*********************************************************************
--* 04_INCONSISTENCIAS_STATUS.sql                                      *
--* Detecta contratos/parcelas com status incompativel com os dados.  *
--*********************************************************************

SET CURRENT SCHEMA = SIGEC;

-- Contratos EN (encerrado) que ainda tem parcela em aberto
SELECT C.ID_CONTRATO, C.ST_CONTRATO, COUNT(P.NR_PARCELA) AS PARC_ABERTAS
  FROM SIGEC.SG_CONTRATO C
  JOIN SIGEC.SG_PARCELA  P
    ON P.ID_CONTRATO = C.ID_CONTRATO
 WHERE C.ST_CONTRATO = 'EN'
   AND P.ST_PARCELA IN ('AB','PP','VC')
 GROUP BY C.ID_CONTRATO, C.ST_CONTRATO
 ORDER BY C.ID_CONTRATO;

-- Contratos EN com VR_SALDO > 0
SELECT ID_CONTRATO, ST_CONTRATO, VR_SALDO
  FROM SIGEC.SG_CONTRATO
 WHERE ST_CONTRATO = 'EN'
   AND VR_SALDO   > 0;

-- Contratos CA (cancelado) com pagamento posterior a data de cancelamento
--   (aproximacao: qualquer pagamento CF apos DT_ALTERACAO do contrato).
SELECT G.ID_CONTRATO, G.ID_PAGAMENTO, G.DT_PAGAMENTO
  FROM SIGEC.SG_PAGAMENTO G
  JOIN SIGEC.SG_CONTRATO  C
    ON C.ID_CONTRATO = G.ID_CONTRATO
 WHERE C.ST_CONTRATO = 'CA'
   AND G.ST_PAGAMENTO = 'CF';

-- Contratos AT sem nenhuma parcela em aberto (candidatos a EN)
SELECT C.ID_CONTRATO, C.ST_CONTRATO, C.QT_PARCELAS_ABERTAS
  FROM SIGEC.SG_CONTRATO C
 WHERE C.ST_CONTRATO IN ('AT','BL')
   AND NOT EXISTS (
         SELECT 1 FROM SIGEC.SG_PARCELA P
          WHERE P.ID_CONTRATO = C.ID_CONTRATO
            AND P.ST_PARCELA IN ('AB','PP','VC')
       );

-- Parcelas PG com VR_SALDO > 0
SELECT ID_CONTRATO, NR_PARCELA, VR_PARCELA, VR_SALDO
  FROM SIGEC.SG_PARCELA
 WHERE ST_PARCELA = 'PG'
   AND VR_SALDO > 0;

-- Parcelas com DT_ULTIMO_PAGTO nao nulo mas sem pagamento correspondente
SELECT P.ID_CONTRATO, P.NR_PARCELA, P.DT_ULTIMO_PAGTO
  FROM SIGEC.SG_PARCELA P
 WHERE P.DT_ULTIMO_PAGTO IS NOT NULL
   AND NOT EXISTS (
         SELECT 1 FROM SIGEC.SG_PAGAMENTO G
          WHERE G.ID_CONTRATO  = P.ID_CONTRATO
            AND G.NR_PARCELA   = P.NR_PARCELA
            AND G.ST_PAGAMENTO = 'CF'
       );
