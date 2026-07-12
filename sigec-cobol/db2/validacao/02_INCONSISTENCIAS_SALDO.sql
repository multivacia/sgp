--*********************************************************************
--* 02_INCONSISTENCIAS_SALDO.sql                                       *
--* Encontra divergencias entre saldo consolidado do contrato e a      *
--* soma dos saldos das parcelas ativas.                               *
--*                                                                    *
--* Regra: para contratos AT/BL/IN/RN,                                 *
--*   SG_CONTRATO.VR_SALDO deve ser aproximadamente igual a            *
--*   SUM(SG_PARCELA.VR_SALDO) das parcelas nao canceladas.            *
--*                                                                    *
--* Tolerancia: 0.05 (5 centavos) para lidar com arredondamento.       *
--*********************************************************************

SET CURRENT SCHEMA = SIGEC;

WITH SALDO_PAR AS (
  SELECT ID_CONTRATO,
         SUM(CASE WHEN ST_PARCELA <> 'CN' THEN VR_SALDO ELSE 0 END) AS VR_SALDO_PAR
    FROM SIGEC.SG_PARCELA
   GROUP BY ID_CONTRATO
)
SELECT C.ID_CONTRATO,
       C.ST_CONTRATO,
       C.VR_SALDO           AS VR_SALDO_CONTRATO,
       COALESCE(P.VR_SALDO_PAR, 0) AS VR_SALDO_PARCELAS,
       C.VR_SALDO - COALESCE(P.VR_SALDO_PAR, 0) AS DIFERENCA
  FROM SIGEC.SG_CONTRATO C
  LEFT JOIN SALDO_PAR   P ON P.ID_CONTRATO = C.ID_CONTRATO
 WHERE C.ST_CONTRATO IN ('AT','BL','IN','RN')
   AND ABS(C.VR_SALDO - COALESCE(P.VR_SALDO_PAR, 0)) > 0.05
 ORDER BY ABS(C.VR_SALDO - COALESCE(P.VR_SALDO_PAR, 0)) DESC;
