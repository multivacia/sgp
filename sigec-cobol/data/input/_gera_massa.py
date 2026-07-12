#!/usr/bin/env python3
"""
Gerador determinístico das massas de teste posicionais do SIGEC.

Este script é executado uma única vez para regenerar os arquivos em
data/input/ a partir das definições dos copybooks em copybooks/SGL*.cpy.

Cada função de emissão devolve uma linha do tamanho EXATO do LRECL
declarado no copybook (padding com brancos ou zeros conforme o tipo).

Não faz parte do fluxo COBOL — é ferramenta de laboratório.
"""

from pathlib import Path

HERE = Path(__file__).parent


def xf(value: str, width: int) -> str:
    """Campo alfa: left-justify, right-pad com brancos, trunca no fim."""
    return (value or "")[:width].ljust(width, " ")


def nf(value, width: int) -> str:
    """Campo numérico display: right-justify, left-pad com zeros."""
    s = str(int(value))
    if len(s) > width:
        raise ValueError(f"Numero {value} nao cabe em {width} digitos")
    return s.rjust(width, "0")


def money(value: float, int_w: int, dec_w: int) -> str:
    """Campo 9(int_w)V9(dec_w) — sem separador, sem ponto."""
    cents = round(value * (10 ** dec_w))
    return nf(cents, int_w + dec_w)


def pad_line(line: str, lrecl: int) -> str:
    """Garante que a linha tenha exatamente LRECL bytes."""
    if len(line) > lrecl:
        return line[:lrecl]
    return line.ljust(lrecl, " ")


# =============================================================================
# SGLCTRIN — Contratos recebidos (LRECL 200)
# =============================================================================
def ctrin_header(dt: str, hr: str, origem: str, qtd: int, versao: str) -> str:
    line = (
        "H"
        + nf(dt, 8)
        + nf(hr, 6)
        + xf(origem, 8)
        + nf(qtd, 9)
        + xf(versao, 4)
    )
    return pad_line(line, 200)


def ctrin_detail(
    nr_ctr: str,
    tipo_doc: str,
    doc: str,
    nome: str,
    tp_cli: str,
    tp_ctr: str,
    valor: float,
    qtd_par: int,
    dt_ini: str,
    taxa: float,
    pct_multa: float,
) -> str:
    line = (
        "D"
        + xf(nr_ctr, 15)
        + xf(tipo_doc, 3)
        + xf(doc, 14)
        + xf(nome, 60)
        + xf(tp_cli, 2)
        + xf(tp_ctr, 2)
        + money(valor, 13, 2)
        + nf(qtd_par, 3)
        + nf(dt_ini, 8)
        + money(taxa, 3, 2)
        + money(pct_multa, 3, 2)
    )
    return pad_line(line, 200)


def ctrin_trailer(qtd: int, soma: float, dt: str) -> str:
    line = "T" + nf(qtd, 9) + money(soma, 15, 2) + nf(dt, 8)
    return pad_line(line, 200)


def gera_contratos():
    """
    HDR + 10 DETAIL (C01..C10) + TRAILER com qtd divergente (C11).
    C12 (HEADER inválido) fica em arquivo separado.
    """
    linhas = []
    linhas.append(
        ctrin_header("20260115", "083000", "SGRCON", 10, "V001")
    )
    # C01 - PF valido
    linhas.append(
        ctrin_detail(
            "CTR00000000001", "CPF", "22233344401",
            "CARLOS ALBERTO MENDES",
            "PF", "CR", 12000.00, 12, "20260202", 2.50, 2.00,
        )
    )
    # C02 - PJ valido
    linhas.append(
        ctrin_detail(
            "CTR000000000002", "CNP", "11222333000181",
            "INDUSTRIA MODELO LTDA",
            "PJ", "FI", 250000.00, 60, "20260202", 1.80, 2.00,
        )
    )
    # C03 - ES valido (IE)
    linhas.append(
        ctrin_detail(
            "CTR000000000003", "LE ", "110042490114",
            "COOPERATIVA UNIAO CENTRAL",
            "ES", "CO", 50000.00, 24, "20260202", 1.20, 2.00,
        )
    )
    # C04 - CPF DV invalido
    linhas.append(
        ctrin_detail(
            "CTR000000000004", "CPF", "22233344400",
            "CARLOS ALBERTO MENDES (DV ERR)",
            "PF", "CR", 12000.00, 12, "20260202", 2.50, 2.00,
        )
    )
    # C05 - CNPJ DV invalido
    linhas.append(
        ctrin_detail(
            "CTR000000000005", "CNP", "11222333000180",
            "INDUSTRIA MODELO LTDA (DV ERR)",
            "PJ", "FI", 250000.00, 60, "20260202", 1.80, 2.00,
        )
    )
    # C06 - CPF comprimento errado
    linhas.append(
        ctrin_detail(
            "CTR000000000006", "CPF", "1122334455",
            "DOCUMENTO CURTO",
            "PF", "CR", 5000.00, 6, "20260202", 2.50, 2.00,
        )
    )
    # C07 - tipo cliente XX
    linhas.append(
        ctrin_detail(
            "CTR000000000007", "CPF", "44455566677",
            "TIPO INVALIDO",
            "XX", "CR", 5000.00, 6, "20260202", 2.50, 2.00,
        )
    )
    # C08 - qtd-parcelas = 300 (aceito por codigo, rejeitado por doc)
    linhas.append(
        ctrin_detail(
            "CTR000000000008", "CPF", "55566677788",
            "PARCELAS ACIMA DOC",
            "PF", "EM", 100000.00, 300, "20260202", 2.50, 2.00,
        )
    )
    # C09 - qtd-parcelas = 400 (rejeitado por codigo)
    linhas.append(
        ctrin_detail(
            "CTR000000000009", "CPF", "66677788899",
            "PARCELAS ACIMA CODIGO",
            "PF", "EM", 100000.00, 400, "20260202", 2.50, 2.00,
        )
    )
    # C10 - data-inicio feriado (21/04)
    linhas.append(
        ctrin_detail(
            "CTR000000000010", "CPF", "77788899900",
            "INICIO EM FERIADO",
            "PF", "CR", 8000.00, 8, "20260421", 2.50, 2.00,
        )
    )
    # TRAILER com divergencia proposital (C11): qtd real=10, declara=15
    soma = (
        12000.00 + 250000.00 + 50000.00 + 12000.00 + 250000.00
        + 5000.00 + 5000.00 + 100000.00 + 100000.00 + 8000.00
    )
    linhas.append(ctrin_trailer(15, soma, "20260115"))
    return "\n".join(linhas) + "\n"


def gera_contratos_hdr_invalido():
    """C12 — arquivo sem HEADER (comeca direto no DETAIL)."""
    linhas = []
    linhas.append(
        ctrin_detail(
            "CTR000000000099", "CPF", "22233344401",
            "SEM HEADER",
            "PF", "CR", 12000.00, 12, "20260202", 2.50, 2.00,
        )
    )
    linhas.append(ctrin_trailer(1, 12000.00, "20260115"))
    return "\n".join(linhas) + "\n"


# =============================================================================
# SGLPAGIN — Pagamentos recebidos (LRECL 120)
# =============================================================================
def pagin_header(dt: str, hr: str, origem: str, qtd: int, soma: float, versao: str) -> str:
    line = (
        "H"
        + nf(dt, 8)
        + nf(hr, 6)
        + xf(origem, 8)
        + nf(qtd, 9)
        + money(soma, 15, 2)
        + xf(versao, 4)
    )
    return pad_line(line, 120)


def pagin_detail(
    id_ctr: int, nr_par: int, valor: float, dt_pag: str,
    canal: str, nr_doc: str, cd_banco: int, cd_ag: int, cd_auth: str,
) -> str:
    line = (
        "D"
        + nf(id_ctr, 12)
        + nf(nr_par, 3)
        + money(valor, 13, 2)
        + nf(dt_pag, 8)
        + xf(canal, 3)
        + xf(nr_doc, 20)
        + nf(cd_banco, 3)
        + nf(cd_ag, 5)
        + xf(cd_auth, 20)
    )
    return pad_line(line, 120)


def pagin_trailer(qtd: int, soma: float, dt: str) -> str:
    line = "T" + nf(qtd, 9) + money(soma, 15, 2) + nf(dt, 8)
    return pad_line(line, 120)


def gera_pagamentos():
    """
    HDR + 4 DETAIL (C13..C16) + TRAILER.
    """
    linhas = []
    soma = 1000.00 + 800.00 + 500.00 + 1500.00
    linhas.append(
        pagin_header("20260115", "090000", "ADQPSP01", 4, soma, "V001")
    )
    # C13 - pagamento valido PIX
    linhas.append(
        pagin_detail(
            100000000001, 1, 1000.00, "20260114", "PIX",
            "PIX20260114000000001", 341, 12345, "AUTHPIX00000000000001",
        )
    )
    # C14 - data futura
    linhas.append(
        pagin_detail(
            100000000001, 2, 800.00, "20261231", "PIX",
            "PIX20261231000000002", 341, 12345, "AUTHPIX00000000000002",
        )
    )
    # C15 - canal invalido
    linhas.append(
        pagin_detail(
            100000000001, 3, 500.00, "20260114", "ZZZ",
            "XXX20260114000000003", 341, 12345, "AUTHXXX00000000000003",
        )
    )
    # C16 - pagamento em excesso via PIX
    linhas.append(
        pagin_detail(
            100000000002, 1, 1500.00, "20260114", "PIX",
            "PIX20260114000000004", 341, 12345, "AUTHPIX00000000000004",
        )
    )
    linhas.append(pagin_trailer(4, soma, "20260115"))
    return "\n".join(linhas) + "\n"


# =============================================================================
# SGLPARM — Parametros (LRECL 100)
# =============================================================================
def parm_row(chave: str, tipo: str, valor: str, ini: str, fim: str, desc: str, usr: str) -> str:
    line = (
        xf(chave, 30)
        + xf(tipo, 1)
        + xf(valor, 30)
        + nf(ini, 8)
        + nf(fim, 8)
        + xf(desc, 15)
        + xf(usr, 8)
    )
    return pad_line(line, 100)


def gera_parametros():
    linhas = [
        parm_row("LIMITE-COMMIT", "N", "1000", "20260101", "99991231", "COMMIT INTERM", "SETUP001"),
        parm_row("LIMITE-ERROS", "N", "500", "20260101", "99991231", "MAX ERROS", "SETUP001"),
        parm_row("LIMITE-CTR-DIA", "N", "100000", "20260101", "99991231", "MAX CTR DIARIO", "SETUP001"),
        parm_row("LIMITE-PAG-DIA", "N", "500000", "20260101", "99991231", "MAX PAG DIARIO", "SETUP001"),
        parm_row("DIAS-INAD-LEVE", "N", "5", "20260101", "99991231", "INICIO LEVE", "SETUP001"),
        parm_row("DIAS-INAD-MOD", "N", "30", "20260101", "99991231", "INICIO MOD", "SETUP001"),
        parm_row("DIAS-INAD-GRAVE", "N", "60", "20260101", "99991231", "INICIO GRAVE", "SETUP001"),
        parm_row("DIAS-INAD-CRIT", "N", "90", "20260101", "99991231", "INICIO CRIT", "SETUP001"),
        parm_row("PCT-DESC-MOD", "N", "20", "20260101", "99991231", "DESC MOD", "SETUP001"),
        parm_row("PCT-DESC-GRAVE", "N", "30", "20260101", "99991231", "DESC GRAVE", "SETUP001"),
        parm_row("PCT-DESC-CRIT", "N", "50", "20260101", "99991231", "DESC CRIT", "SETUP001"),
        parm_row("FL-INCLUI-CRITICA", "F", "N", "20260101", "99991231", "INCL CRIT", "SETUP001"),
        parm_row("FL-ES-RISCO-LIVRE", "F", "N", "20260101", "99991231", "ES RISCO", "SETUP001"),
        parm_row("FL-SIMULA-DB2", "F", "N", "20260101", "99991231", "SIM DB2", "SETUP001"),
        parm_row("FL-GERA-INTERFACES", "F", "S", "20260101", "99991231", "GERA INT", "SETUP001"),
        parm_row("FL-GERA-RELATORIOS", "F", "S", "20260101", "99991231", "GERA REL", "SETUP001"),
        parm_row("FL-RECALC-SALDO", "F", "S", "20260101", "99991231", "RECALC SALDO", "SETUP001"),
    ]
    return "\n".join(linhas) + "\n"


# =============================================================================
# SGLFERIA — Feriados (LRECL 80)
# =============================================================================
def feria_row(dt: str, tipo: str, uf: str, cd_mun: str, desc: str, ind: str, fonte: str) -> str:
    line = (
        nf(dt, 8)
        + xf(tipo, 3)
        + xf(uf, 2)
        + xf(cd_mun, 7)
        + xf(desc, 40)
        + xf(ind, 1)
        + xf(fonte, 10)
    )
    return pad_line(line, 80)


def gera_feriados():
    linhas = [
        feria_row("20260101", "NAC", "BR", "0000000", "CONFRATERNIZACAO UNIVERSAL", "N", "IBGE"),
        feria_row("20260216", "NAC", "BR", "0000000", "CARNAVAL SEGUNDA", "N", "IBGE"),
        feria_row("20260217", "NAC", "BR", "0000000", "CARNAVAL TERCA", "N", "IBGE"),
        feria_row("20260403", "NAC", "BR", "0000000", "SEXTA-FEIRA SANTA", "N", "IBGE"),
        feria_row("20260421", "NAC", "BR", "0000000", "TIRADENTES", "N", "IBGE"),
        feria_row("20260501", "NAC", "BR", "0000000", "DIA DO TRABALHO", "N", "IBGE"),
        feria_row("20260604", "NAC", "BR", "0000000", "CORPUS CHRISTI", "N", "IBGE"),
        feria_row("20260907", "NAC", "BR", "0000000", "INDEPENDENCIA", "N", "IBGE"),
        feria_row("20261012", "NAC", "BR", "0000000", "NOSSA SENHORA APARECIDA", "N", "IBGE"),
        feria_row("20261102", "NAC", "BR", "0000000", "FINADOS", "N", "IBGE"),
        feria_row("20261115", "NAC", "BR", "0000000", "PROCLAMACAO REPUBLICA", "N", "IBGE"),
        feria_row("20261225", "NAC", "BR", "0000000", "NATAL", "N", "IBGE"),
    ]
    return "\n".join(linhas) + "\n"


# =============================================================================
# SGLBLOQ — Bloqueios (LRECL 200)
# =============================================================================
def bloq_row(
    bloq_id: int, tipo: str, id_ctr: int, id_cli: int, cart: str, iface: str,
    dt_ini: str, dt_fim: str, ativo: str, cd_motivo: str, motivo: str,
    aprovador: str, dt_aprov: str, usr_incl: str, dt_incl: str, hr_incl: str,
) -> str:
    line = (
        nf(bloq_id, 9)
        + xf(tipo, 3)
        + nf(id_ctr, 12)
        + nf(id_cli, 10)
        + xf(cart, 8)
        + xf(iface, 6)
        + nf(dt_ini, 8)
        + nf(dt_fim, 8)
        + xf(ativo, 1)
        + xf(cd_motivo, 10)
        + xf(motivo, 60)
        + xf(aprovador, 8)
        + nf(dt_aprov, 8)
        + xf(usr_incl, 8)
        + nf(dt_incl, 8)
        + nf(hr_incl, 6)
    )
    return pad_line(line, 200)


def gera_bloqueios():
    """
    2 bloqueios:
      - C24: bloqueio de contrato 100000000001 (renegociacao bloqueada)
      - C28: bloqueio de janela inteira em 2026-01-15 (driver aborta)
    """
    linhas = [
        bloq_row(
            1, "CTR", 100000000001, 0, "", "",
            "20260101", "20261231", "S",
            "REN-INADM", "CONTRATO EM DISCUSSAO JUDICIAL",
            "GERCRED1", "20260110", "OPER0001", "20260110", "143000",
        ),
        bloq_row(
            2, "JAN", 0, 0, "", "",
            "20260115", "20260115", "S",
            "MANUT-EMERG", "MANUTENCAO EMERGENCIAL DB2 - JANELA CANCELADA",
            "DBAADMIN", "20260114", "OPER0002", "20260114", "203000",
        ),
    ]
    return "\n".join(linhas) + "\n"


def gera_bloqueios_vazio():
    """Arquivo alocavel mas vazio - para exercitar C25 usa-se ausencia de DD."""
    return ""


# =============================================================================
# Escrita dos arquivos
# =============================================================================
def main():
    HERE.mkdir(parents=True, exist_ok=True)
    outputs = {
        "contratos_recebidos.txt": gera_contratos(),
        "contratos_recebidos_hdr_invalido.txt": gera_contratos_hdr_invalido(),
        "pagamentos_recebidos.txt": gera_pagamentos(),
        "parametros.txt": gera_parametros(),
        "feriados.txt": gera_feriados(),
        "bloqueios.txt": gera_bloqueios(),
    }
    for name, content in outputs.items():
        target = HERE / name
        target.write_text(content, encoding="utf-8")
        n_linhas = content.count("\n")
        larg = max((len(l) for l in content.splitlines()), default=0)
        print(f"{name:45} {n_linhas:3d} linhas  LRECL max={larg}")


if __name__ == "__main__":
    main()
