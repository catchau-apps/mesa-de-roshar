# -*- coding: utf-8 -*-
"""
Gera o pacote de dados da Mesa de Roshar a partir dos SEUS PDFs do
Cosmere RPG / Guerra das Tempestades.

O pacote fica na sua maquina. Ele nao vai para o repositorio (esta no
.gitignore) e nao sobe para lugar nenhum: o site le o arquivo direto no
navegador.

Uso:
    python ferramentas/gerar_pacote.py "C:/caminho/para/os/PDFs"
    python ferramentas/gerar_pacote.py "C:/caminho" --saida pacote.json

Depois, no site, abra a aba Regras e arraste o pacote.json para dentro.

Requer: pip install pypdf
"""
from __future__ import annotations

import argparse
import io
import json
import os
import re
import sys
from collections import Counter

try:
    from pypdf import PdfReader
except ImportError:  # pragma: no cover
    print("Falta a biblioteca pypdf. Instale com:  pip install pypdf")
    sys.exit(1)

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

FORMATO = "mesa-roshar/pacote"
VERSAO = 1

# Como reconhecer cada livro pelo nome do arquivo. A ordem importa: o primeiro
# padrao que casar define o rotulo.
LIVROS = [
    (r"guia[- ]de[- ]regras|rules?[- ]?guide|core", "Regras"),
    (r"guia[- ]do[- ]mundo|world[- ]?guide", "Mundo"),
    (r"primeiros[- ]passos|starter", "Primeiros Passos"),
    (r"ponte[- ]nove|bridge[- ]?nine", "Ponte Nove"),
    (r"quick[- ]?reference|referencia[- ]rapida", "Referência Rápida"),
    (r"gm[- ]?rules|visao[- ]geral", "Visão Geral MJ"),
]

# ------------------------------------------------------------------ limpeza

LIXO = re.compile(
    r"licenciado para .*|^\s*\d+\s*$|guerra das tempestades\s*$",
    re.IGNORECASE,
)

# O rodape traz o numero impresso, as vezes colado no titulo do capitulo
# ("Capitulo 3: Estatisticas de Personagem50"). Esse numero costuma ficar
# algumas paginas atras do numero do PDF por causa da capa.
RODAPE = re.compile(r"(?:Cap[íi]tulo\s+\d+:[^\n\d]{3,60}?|^\s*)(\d{1,3})\s*$", re.M)

# O PDF separa a maiuscula inicial do resto da palavra ("T iro", "T alento").
# So consoantes entram na correcao: "A", "E" e "O" sao palavras de verdade.
KERNING = re.compile(r"\b([BCDFGHJKLMNPQRSTVWXYZ])\s+([a-zà-ú])")

PARENTESE_FIM = re.compile(r"\s*\([^)]{0,12}\)\s*$")
TITULO = re.compile(r"^[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][\wÁ-Úá-ú' ]{2,45}$")


def limpar(texto: str) -> str:
    linhas = []
    for linha in texto.splitlines():
        linha = linha.replace("\u00ad", "").strip()
        if not linha or LIXO.match(linha):
            continue
        linhas.append(linha)
    txt = "\n".join(linhas)
    # junta palavra quebrada no fim da linha; o livro compoe o hifen com espaco
    txt = re.sub(r"(\w)\s*-\s*\n\s*(\w)", r"\1\2", txt)
    # a ligadura "fi" do PDF sai como F maiusculo dentro da palavra
    txt = re.sub(r"(?<=[a-zà-ú])F(?=[a-zà-ú])", "f", txt)
    return KERNING.sub(r"\1\2", txt)


def achar_offset(brutos: list[str]) -> int:
    """Descobre a diferenca entre a pagina do PDF e a numerada no livro."""
    votos = Counter()
    for i, bruto in enumerate(brutos):
        for m in RODAPE.finditer(bruto):
            n = int(m.group(1))
            if 1 <= n <= len(brutos):
                off = n - (i + 1)
                if -30 <= off <= 5:
                    votos[off] += 1
    if not votos:
        return 0
    off, qtd = votos.most_common(1)[0]
    return off if qtd >= len(brutos) * 0.25 else 0


def achar_titulos(texto: str) -> list[str]:
    """Linhas curtas e capitalizadas viram ancoras de secao para a busca."""
    achados = []
    for linha in texto.splitlines():
        linha = PARENTESE_FIM.sub("", linha.strip())
        if 3 <= len(linha) <= 46 and TITULO.match(linha) and not linha.endswith("."):
            if 1 <= len(linha.split()) <= 6 and linha not in achados:
                achados.append(linha)
    return achados[:8]


def rotular(nome_arquivo: str) -> str:
    base = nome_arquivo.lower()
    for padrao, rotulo in LIVROS:
        if re.search(padrao, base):
            return rotulo
    return os.path.splitext(os.path.basename(nome_arquivo))[0][:28]


# ------------------------------------------------------------------ talentos

ANCORA = re.compile(r"Pr[ée]-?\s?requisitos?:", re.I)
ATIVACAO = re.compile(r"Ativa[çc][ãa]o:\s*([^\n]{0,14})", re.I)
LEGENDA = re.compile(r"[íi]cone\s+legenda|Cap[íi]tulo\s+\d+:|CORE RULEBOOK", re.I)
LEGENDA_CUSTO = re.compile(
    r"^(?:Sempre ativo|Ação livre|Ativação especial|Reação|\d+\s*aç(?:ão|ões))\s*", re.I
)
LIXO_NOME = re.compile(
    r"cap[íi]tulo|trilhas?\s|especializa|^os talentos|^p[áa]gina|^\d|^[▶▷↻★∞R0-9\s]+$", re.I
)
ABRE_TRILHA = re.compile(r"Especializa[çc][õo]es de\s+([A-ZÁÂÃÉÊÍÓÔÕÚÇ][\wÁ-Úá-úãõçâêô]+)")
ESPECIALIZACAO = re.compile(
    r"^Especializa[çc][ãa]o\s+([A-ZÁÂÃÉÊÍÓÔÕÚÇ][\wÁ-Úá-úãõçâêô]+)\s*$", re.M
)
CHAVE_ORDEM = re.compile(
    r"Talento-?chave de\s+([A-ZÁÂÃÉÊÍÓÔÕÚÇ][\wÁ-Úá-ú-]*(?:\s+(?:d[oae]s?\s+)?[A-ZÁ-Ú][\wÁ-Úá-ú]*)?)"
)

TRILHAS = ["Agente", "Caçador", "Emissário", "Erudito", "Guerreiro", "Líder"]
CAP_HEROICAS = (69, 121)
CAP_RADIANTES = (123, 211)
ARVORE_CANTOR = (31, 37)
CONJUNTOS = ["Prisioneiro", "Submundo", "Acadêmico", "Artesão", "Militar", "Cortesão"]
CULTURAS = [
    "Alethiana", "Azishiana", "Herdaziana", "Irialiana", "Kharbranthiana",
    "Natan", "Ouvinte", "Reshiana", "Shina", "Thaylena", "Unkalakiana",
    "Vedena", "Viajante",
]


def limpar_nome(n: str) -> str:
    n = " ".join(n.split())
    n = re.sub(r"^[▶▷↻★∞*0-9\s]+", "", n)
    n = LEGENDA_CUSTO.sub("", n)
    n = re.sub(r"^[▶▷↻★∞*0-9\s]+", "", n)
    n = re.sub(r"\s*\([^)]*\)\s*$", "", n)
    return KERNING.sub(r"\1\2", n).strip(" .:-")


def limpar_corrido(t: str) -> str:
    t = re.sub(r"\n(?=[a-zà-ú])", " ", t)
    t = re.sub(r"[ \t]+", " ", t)
    t = re.sub(r"\n{2,}", "\n", t)
    return KERNING.sub(r"\1\2", t).strip()


def pegar_nome(antes: str) -> str:
    """O nome fica na(s) linha(s) logo antes de 'Pré-requisitos:'.

    Na arvore de talentos ele quebra em duas linhas ("Comando/Demonstrativo"),
    entao juntamos a linha anterior quando ela parece continuacao de titulo.
    """
    linhas = [l.strip() for l in antes.split("\n") if l.strip()]
    if not linhas:
        return ""
    nome = linhas[-1]
    if len(linhas) >= 2:
        ant = linhas[-2]
        if (len(ant) <= 30 and len(nome) <= 30 and not re.search(r"[.:;!?]$", ant)
                and len(ant) + len(nome) <= 46 and not ANCORA.search(ant)):
            nome = ant + " " + nome
    return nome


def fatiar_talentos(txt: str):
    ancoras = list(ANCORA.finditer(txt))
    for i, m in enumerate(ancoras):
        fim = ancoras[i + 1].start() if i + 1 < len(ancoras) else len(txt)
        nome = pegar_nome(txt[: m.start()])
        bloco = txt[m.end(): fim]

        if i + 1 < len(ancoras):
            prox = pegar_nome(txt[: ancoras[i + 1].start()])
            if prox:
                sobra = len(prox.split("\n")[-1])
                bloco = bloco[: max(0, len(bloco) - sobra - 1)]

        ma = ATIVACAO.search(bloco)
        if ma:
            pre, ativ, desc = bloco[: ma.start()], ma.group(1).strip(), bloco[ma.end():]
        else:
            partes = bloco.split("\n", 1)
            pre, ativ, desc = partes[0], "", (partes[1] if len(partes) > 1 else "")
        yield nome, pre, ativ, desc


def secoes_heroicas(paginas):
    marcos = []
    for p in sorted(paginas, key=lambda x: x["pagina"]):
        m = ABRE_TRILHA.search(p["texto"])
        if m and m.group(1) in TRILHAS and (not marcos or marcos[-1][1] != m.group(1)):
            marcos.append((p["pagina"], m.group(1)))
    return marcos


def secoes_radiantes(paginas):
    por_pagina = {p["pagina"]: p["texto"] for p in paginas}
    marcos = []
    for p in sorted(paginas, key=lambda x: x["pagina"]):
        m = CHAVE_ORDEM.search(p["texto"])
        if not m:
            continue
        nome = " ".join(m.group(1).split())
        nome = re.split(r"\s+(?:Quando|Os|As|Um|Uma|Esses|Essas)\b", nome)[0].strip()
        if not nome or any(n == nome for _, n in marcos):
            continue
        chave = nome.split()[0].lower()
        inicio = p["pagina"]
        for volta in range(1, 7):
            alvo = p["pagina"] - volta
            if alvo in por_pagina and chave in por_pagina[alvo].lower():
                inicio = alvo
            else:
                break
        marcos.append((inicio, nome))
    return marcos


def grupo_da_pagina(marcos, pagina, fim):
    for i, (ini, nome) in enumerate(marcos):
        prox = marcos[i + 1][0] if i + 1 < len(marcos) else fim + 1
        if ini <= pagina < prox:
            return nome
    return ""


def extrair_talentos(paginas, faixa, tipo):
    dentro = [p for p in paginas if faixa[0] <= p["pagina"] <= faixa[1]]
    marcos = secoes_heroicas(dentro) if tipo == "heroica" else secoes_radiantes(dentro)
    if tipo == "cantor":
        marcos = [(faixa[0], "Cantor")]

    talentos = []
    especializacao = None
    for p in sorted(dentro, key=lambda x: x["pagina"]):
        txt = p["texto"]
        grupo = grupo_da_pagina(marcos, p["pagina"], faixa[1])

        m = ESPECIALIZACAO.search(txt)
        if m:
            especializacao = m.group(1).strip()
        if ABRE_TRILHA.search(txt):
            especializacao = None

        for nome, pre, ativ, desc in fatiar_talentos(txt):
            nome = limpar_nome(nome)
            if not nome or len(nome) < 3 or LIXO_NOME.search(nome):
                continue
            descricao = LEGENDA.split(limpar_corrido(desc))[0].strip()
            descricao = re.sub(r"\s*Cap[íi]tulo\s+\d+:.*$", "", descricao, flags=re.S).strip()
            if len(descricao) < 25:
                continue
            talentos.append({
                "nome": nome,
                "grupo": grupo,
                "especializacao": especializacao or "",
                "preRequisitos": limpar_corrido(pre).strip(" .;") or "nenhum",
                "ativacao": " ".join(ativ.split()),
                "descricao": descricao[:1200],
                "pagina": p["pagina"],
            })

    # tira duplicatas das paginas de resumo; o grupo entra na chave porque
    # "Primeiro Ideal" existe em todas as ordens, cada um com seu texto
    vistos = {}
    for t in talentos:
        chave = (t["nome"], t["grupo"])
        if chave not in vistos or len(t["descricao"]) > len(vistos[chave]["descricao"]):
            vistos[chave] = t
    return sorted(vistos.values(), key=lambda t: (t["grupo"], t["especializacao"], t["nome"]))


def extrair_blocos(paginas, faixa, nomes, prefixo):
    """Fatia trechos que comecam por 'prefixo Nome' (conjuntos, culturas)."""
    texto = "\n".join(
        p["texto"] for p in sorted(paginas, key=lambda x: x["pagina"])
        if faixa[0] <= p["pagina"] <= faixa[1]
    )
    alternativas = "|".join(re.escape(n) for n in nomes)
    padrao = re.compile(
        rf"{prefixo}\s+(?:de\s+|do\s+|da\s+)?({alternativas})\b(.*?)"
        rf"(?={prefixo}\s+(?:de\s+|do\s+|da\s+)?(?:{alternativas})\b|\Z)",
        re.S,
    )
    achados = {}
    for m in padrao.finditer(texto):
        corpo = LEGENDA.split(limpar_corrido(m.group(2)))[0].strip(" :\n")
        corpo = re.split(r"\bConjuntos Iniciais\b|\bArmas\s*\n\s*Desde a chegada", corpo)[0]
        if len(corpo) > len(achados.get(m.group(1), "")):
            achados[m.group(1)] = corpo[:700]
    return achados


# ------------------------------------------------------------------ principal

def main() -> int:
    ap = argparse.ArgumentParser(description="Gera o pacote de dados a partir dos seus PDFs.")
    ap.add_argument("pasta", help="pasta com os PDFs do Cosmere RPG")
    ap.add_argument("--saida", default="pacote.json", help="arquivo de saida (padrao: pacote.json)")
    args = ap.parse_args()

    if not os.path.isdir(args.pasta):
        print(f"Nao achei a pasta: {args.pasta}")
        return 1

    pdfs = sorted(
        os.path.join(args.pasta, f) for f in os.listdir(args.pasta)
        if f.lower().endswith(".pdf")
    )
    if not pdfs:
        print("Nenhum PDF nessa pasta.")
        return 1

    paginas = []
    print(f"Lendo {len(pdfs)} PDF(s) de {args.pasta}\n")

    for caminho in pdfs:
        rotulo = rotular(caminho)
        try:
            leitor = PdfReader(caminho)
        except Exception as e:
            print(f"  [erro] {os.path.basename(caminho)}: {e}")
            continue

        brutos = []
        for pagina in leitor.pages:
            try:
                brutos.append(pagina.extract_text() or "")
            except Exception:
                brutos.append("")

        offset = achar_offset(brutos)
        aproveitadas = 0
        for i, bruto in enumerate(brutos):
            texto = limpar(bruto)
            if len(texto) < 120:
                continue
            paginas.append({
                "livro": rotulo,
                "pagina": max(1, i + 1 + offset),   # numero impresso no livro
                "pdf": i + 1,
                "titulos": achar_titulos(texto),
                "texto": texto,
            })
            aproveitadas += 1
        print(f"  {rotulo:20} {aproveitadas:4} páginas  (livro = PDF {offset:+d})")

    if not paginas:
        print("\nNenhuma pagina com texto. Os PDFs podem ser digitalizacoes sem camada de texto.")
        return 1

    regras = [p for p in paginas if p["livro"] == "Regras"]
    talentos = {"heroicos": [], "radiantes": [], "cantor": []}
    conjuntos, culturas = [], []

    if regras:
        talentos["heroicos"] = extrair_talentos(regras, CAP_HEROICAS, "heroica")
        talentos["radiantes"] = extrair_talentos(regras, CAP_RADIANTES, "radiante")
        talentos["cantor"] = extrair_talentos(regras, ARVORE_CANTOR, "cantor")
        for t in talentos["cantor"]:
            t["grupo"] = "Cantor"

        achados_conj = extrair_blocos(regras, (240, 248), CONJUNTOS, "Conjunto")
        conjuntos = [{"nome": n, "descricao": achados_conj.get(n, ""), "pagina": 243} for n in CONJUNTOS]

        achados_cult = extrair_blocos(regras, (36, 48), CULTURAS, "Especialidade")
        culturas = [{"nome": n, "descricao": achados_cult.get(n, "")} for n in CULTURAS]

    pacote = {
        "formato": FORMATO,
        "versao": VERSAO,
        "paginas": paginas,
        "talentos": talentos,
        "conjuntos": conjuntos,
        "culturas": culturas,
    }

    with io.open(args.saida, "w", encoding="utf-8") as f:
        json.dump(pacote, f, ensure_ascii=False, separators=(",", ":"))

    tamanho = os.path.getsize(args.saida) / 1e6
    print(f"\n{len(paginas)} páginas indexadas")
    print(f"talentos: {len(talentos['heroicos'])} heroicos, "
          f"{len(talentos['radiantes'])} Radiantes, {len(talentos['cantor'])} de cantor")
    print(f"\nPronto: {os.path.abspath(args.saida)}  ({tamanho:.1f} MB)")
    print("Abra o site, vá na aba Regras e arraste esse arquivo para dentro.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
