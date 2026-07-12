//SGCBVSAM JOB (SIGEC,VSAM),'DEFINE VSAM SGVCOBRA',
//         CLASS=A,MSGCLASS=X,MSGLEVEL=(1,1),
//         NOTIFY=&SYSUID,REGION=0M,TIME=30
//*
//*----------------------------------------------------------------*
//* SISTEMA .: SIGEC                                              *
//* JCL .....: SGCBVSAM - CRIACAO DO CLUSTER VSAM SGVCOBRA E       *
//*            EXECUCAO SUBSEQUENTE DE SGCB0150 PARA CARGA.        *
//* USO .....: SETUP DE AMBIENTE + REPROCESSAMENTO INTEGRAL DA     *
//*            FILA DE COBRANCA.                                   *
//*----------------------------------------------------------------*
//*
//*-------- STEP010 - DELETE (IDEMPOTENTE, IGNORA ERRO) -----------
//STEP010  EXEC PGM=IDCAMS
//SYSPRINT DD  SYSOUT=*
//SYSIN    DD  *
  DELETE (SIGEC.LAB.VSAM.SGVCOBRA) CLUSTER
  SET MAXCC = 0
/*
//*
//*-------- STEP020 - DEFINE CLUSTER SGVCOBRA (KSDS) --------------
//STEP020  EXEC PGM=IDCAMS
//SYSPRINT DD  SYSOUT=*
//SYSIN    DD  *
  DEFINE CLUSTER                                       -
         ( NAME(SIGEC.LAB.VSAM.SGVCOBRA)               -
           INDEXED                                     -
           KEYS(12 0)                                  -
           RECORDSIZE(240 240)                         -
           SHAREOPTIONS(2 3)                           -
           FREESPACE(20 10)                            -
           CYL(50 25)                                  -
           VOLUMES(SIGVOL)                             -
           SPEED                                       -
         )                                             -
         DATA                                          -
         ( NAME(SIGEC.LAB.VSAM.SGVCOBRA.DATA)          -
           CISZ(4096)                                  -
         )                                             -
         INDEX                                         -
         ( NAME(SIGEC.LAB.VSAM.SGVCOBRA.INDEX)         -
           CISZ(1024)                                  -
         )
/*
//*
//*-------- STEP030 - ALTER PARA REUSABLE (OPCIONAL) --------------
//STEP030  EXEC PGM=IDCAMS,COND=(0,NE,STEP020)
//SYSPRINT DD  SYSOUT=*
//SYSIN    DD  *
  ALTER SIGEC.LAB.VSAM.SGVCOBRA REUSE
/*
//*
//*-------- STEP150 - CARGA INICIAL DO VSAM VIA SGCB0150 ----------
//STEP150  EXEC PGM=SGCB0150,COND=(4,LT)
//STEPLIB  DD  DSN=SIGEC.LAB.LOADLIB,DISP=SHR
//SYSPRINT DD  SYSOUT=*
//SYSOUT   DD  SYSOUT=*
//SYSUDUMP DD  SYSOUT=*
//SGVCOBRA DD  DSN=SIGEC.LAB.VSAM.SGVCOBRA,DISP=SHR
//SGLINADI DD  DSN=SIGEC.LAB.OUT.SGLINADI(0),DISP=SHR
//SGLAUDVS DD  DSN=SIGEC.LAB.OUT.SGLAUDVS(+1),
//             DISP=(NEW,CATLG,DELETE),
//             SPACE=(CYL,(10,5)),
//             DCB=(RECFM=FB,LRECL=200,BLKSIZE=27800)
//
