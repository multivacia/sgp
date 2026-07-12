--*********************************************************************
--* 03_PARCELAS_ORFAS.sql                                              *
--* Parcelas cujo contrato foi apagado (nao deve ocorrer devido a FK   *
--* ON DELETE CASCADE), mas ficaram registradas por importacao        *
--* legada / carga direta com FK desabilitada.                         *
--*********************************************************************

SET CURRENT SCHEMA = SIGEC;

-- Parcelas sem contrato correspondente
SELECT P.ID_CONTRATO, P.NR_PARCELA, P.DT_VENCIMENTO, P.VR_SALDO
  FROM SIGEC.SG_PARCELA P
 WHERE NOT EXISTS (
         SELECT 1 FROM SIGEC.SG_CONTRATO C
          WHERE C.ID_CONTRATO = P.ID_CONTRATO
       )
 ORDER BY P.ID_CONTRATO, P.NR_PARCELA;

-- Pagamentos sem parcela correspondente
SELECT G.ID_PAGAMENTO, G.ID_CONTRATO, G.NR_PARCELA, G.VR_PAGO
  FROM SIGEC.SG_PAGAMENTO G
 WHERE NOT EXISTS (
         SELECT 1 FROM SIGEC.SG_PARCELA P
          WHERE P.ID_CONTRATO = G.ID_CONTRATO
            AND P.NR_PARCELA  = G.NR_PARCELA
       )
 ORDER BY G.ID_CONTRATO, G.NR_PARCELA;

-- Contratos sem cliente correspondente
SELECT C.ID_CONTRATO, C.ID_CLIENTE
  FROM SIGEC.SG_CONTRATO C
 WHERE NOT EXISTS (
         SELECT 1 FROM SIGEC.SG_CLIENTE X
          WHERE X.ID_CLIENTE = C.ID_CLIENTE
       )
 ORDER BY C.ID_CONTRATO;
