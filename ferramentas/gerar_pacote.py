# -*- coding: utf-8 -*-
"""
Gera o pacote de dados da Mesa de Roshar a partir dos SEUS PDFs do
Cosmere RPG / Guerra das Tempestades.

O pacote fica na sua maquina. O site le o arquivo direto no navegador e
guarda no IndexedDB; nao existe servidor para onde mandar nada.

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
VERSAO = 2

# Como reconhecer cada livro pelo nome do arquivo.
LIVROS = [
    (r"guia[- ]de[- ]regras|rules?[- ]?guide|core", "Regras"),
    (r"guia[- ]do[- ]mundo|world[- ]?guide", "Mundo"),
    (r"primeiros[- ]passos|starter", "Primeiros Passos"),
    (r"ponte[- ]nove|bridge[- ]?nine", "Ponte Nove"),
    (r"quick[- ]?reference|referencia[- ]rapida", "Referência Rápida"),
    (r"gm[- ]?rules|visao[- ]geral", "Visão Geral MJ"),
]

# Ficha preenchida e material de personagem sao do jogador, nao base de
# conhecimento: indexa-los so suja a busca com dados de uma mesa.
IGNORAR = re.compile(
    r"kash|ficha[- ]de[- ]personagem|character[- ]sheet|token|battlemap|mapa",
    re.IGNORECASE,
)

# ------------------------------------------------------------------ limpeza

LIXO = re.compile(
    r"licenciado para .*|^\s*\d+\s*$|guerra das tempestades\s*$",
    re.IGNORECASE,
)
# A linha de rodape ("Capitulo 5: Trilhas Radiantes194") aparece no meio do
# capitulo quando juntamos as paginas, e cortava a descricao de qualquer
# talento que atravessasse a virada de pagina.
RODAPE_CAPITULO = re.compile(r"^Cap[\u00ed\u0069]tulo\s+\d+:.*$")
RODAPE = re.compile(r"(?:Cap[íi]tulo\s+\d+:[^\n\d]{3,60}?|^\s*)(\d{1,3})\s*$", re.M)
KERNING = re.compile(r"\b([BCDFGHJKLMNPQRSTVWXYZ])\s+([a-zà-ú])")
PARENTESE_FIM = re.compile(r"\s*\([^)]{0,12}\)\s*$")
TITULO = re.compile(r"^[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][\wÁ-Úá-ú' ]{2,45}$")


def limpar(texto: str) -> str:
    linhas = []
    for linha in texto.splitlines():
        linha = linha.replace("\u00ad", "").strip()
        if not linha or LIXO.match(linha) or RODAPE_CAPITULO.match(linha):
            continue
        linhas.append(linha)
    txt = "\n".join(linhas)
    txt = txt.replace(chr(0xF075), "•")   # marcador de lista da fonte do livro
    txt = re.sub(r"(\w)\s*-\s*\n\s*(\w)", r"\1\2", txt)      # hifen de quebra
    txt = re.sub(r"(?<=[a-zà-ú])F(?=[a-zà-ú])", "f", txt)     # ligadura "fi"
    return KERNING.sub(r"\1\2", txt)


def achar_offset(brutos: list[str]) -> int:
    """Diferenca entre a pagina do PDF e a numerada no livro."""
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
    achados = []
    for linha in texto.splitlines():
        linha = PARENTESE_FIM.sub("", linha.strip())
        if 3 <= len(linha) <= 46 and TITULO.match(linha) and not linha.endswith("."):
            if 1 <= len(linha.split()) <= 6 and linha not in achados:
                achados.append(linha)
    return achados[:8]


def rotular(nome_arquivo: str) -> str:
    base = os.path.basename(nome_arquivo).lower()
    for padrao, rotulo in LIVROS:
        if re.search(padrao, base):
            return rotulo
    return os.path.splitext(os.path.basename(nome_arquivo))[0][:28]


# ------------------------------------------------------------------ talentos

ANCORA = re.compile(r"Pr[ée]-?\s?requisitos?:", re.I)
ATIVACAO_LINHA = re.compile(r"Ativa[çc][ãa]o:\s*([^\n]{0,14})", re.I)
LEGENDA = re.compile(r"[íi]cone\s+legenda|Cap[íi]tulo\s+\d+:|CORE RULEBOOK", re.I)
LEGENDA_CUSTO = re.compile(
    r"^(?:Sempre ativo|Ação livre|Ativação especial|Reação|\d+\s*aç(?:ão|ões))\s*", re.I
)
LIXO_NOME = re.compile(
    r"cap[íi]tulo|trilhas?\s|especializa|^os talentos|^p[áa]gina|^\d|^[▶▷↻★∞R0-9\s]+$", re.I
)

# Nas paginas de arvore o custo vem como um glifo antes do nome, e nao existe
# linha "Ativação:". O PDF as vezes entrega o simbolo como numero ou letra.
GLIFOS = {
    "▶": "1 ação", "1": "1 ação",
    "2": "2 ações",
    "3": "3 ações",
    "▷": "ação livre", "0": "ação livre",
    "↻": "reação", "R": "reação", "r": "reação",
    "★": "ativação especial", "*": "ativação especial",
    "∞": "sempre ativo", "8": "sempre ativo",
}
# Uma linha de pre-requisito que termina nestas palavras esta pela metade: o
# que completa ela vem na linha seguinte, mesmo comecando com maiuscula.
PENDURADO = re.compile(r"(?:[;,]|\b(?:talento|talento-?chave|e|ou|de|da|do|com))\s*$", re.I)

GLIFO_INICIAL = re.compile(r"^([▶▷↻★∞*0-38Rr])\s*(?=[A-ZÁÂÃÉÊÍÓÔÕÚÇ])")
# Nas paginas de fluxo o nome do fluxo ("transformação") vem antes do glifo, e
# as vezes sobra o fim da descricao anterior. O nome do talento e o que vem
# depois do ultimo glifo da linha.
GLIFO_INTERNO = re.compile(r"^.*[^\w]?([▶▷↻★∞*0-38Rr])\s*(?=[A-ZÁÂÃÉÊÍÓÔÕÚÇ])")

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
PERICIAS = [
    "Agilidade", "Armamento Leve", "Armamento Pesado", "Atletismo", "Furtividade",
    "Ladroagem", "Dedução", "Disciplina", "Intimidação", "Manufatura", "Medicina",
    "Saber", "Dissimulação", "Intuição", "Liderança", "Percepção", "Persuasão",
    "Sobrevivência",
]
# os fluxos também aparecem em pré-requisitos
FLUXOS = [
    "Adesão", "Gravitação", "Divisão", "Abrasão", "Progressão", "Iluminação",
    "Transformação", "Transporte", "Coesão", "Tensão",
]


CUSTOS = re.compile(
    r"[Gg]ast(?:a|ar|e)\s+(?:at[ée]\s+)?(\d+|um|uma|dois|duas)\s+"
    r"(?:pontos?\s+de\s+)?(foco|Investidura)", re.I
)
PALAVRA_NUMERO = {"um": "1", "uma": "1", "dois": "2", "duas": "2"}


def achar_custo(descricao: str) -> str:
    """O custo do talento aparece na descricao: "Gasta 1 de foco"."""
    achados = []
    for m in CUSTOS.finditer(descricao):
        quanto = PALAVRA_NUMERO.get(m.group(1).lower(), m.group(1))
        recurso = "foco" if m.group(2).lower() == "foco" else "Investidura"
        par = f"{quanto} de {recurso}"
        if par not in achados:
            achados.append(par)
    return " ou ".join(achados[:2])


def primeira_frase(descricao: str) -> str:
    """Uma linha dizendo o que o talento faz.

    O livro abre com um paragrafo de ambientacao e so depois da a regra, num
    paragrafo proprio. Entao a mecanica e' a primeira frase do segundo
    paragrafo; se o talento tem um paragrafo so, ele ja e' a regra.
    """
    paragrafos = [p.strip() for p in descricao.split(chr(10)) if p.strip()]
    if not paragrafos:
        return ""
    alvo = paragrafos[1] if len(paragrafos) > 1 else paragrafos[0]
    frases = [f.strip() for f in re.split(r"(?<=[.!?])\s+", alvo) if f.strip()]
    return (frases[0] if frases else alvo)[:220]


def limpar_corrido(t: str) -> str:
    """Remonta os paragrafos que o PDF quebrou por causa da coluna.

    Nas paginas de arvore cada linha e uma quebra de coluna, nao de frase.
    Juntamos com a linha de cima sempre que ela nao terminou a frase — a
    excecao sao os itens de lista, que comecam com marcador.
    """
    saida = []
    for linha in t.split(chr(10)):
        atual = linha.strip()
        if not atual:
            continue
        marcador = bool(re.match(r"^[•▪–—-]|^[\u25b6\u25b7\u21bb\u2605\u221e]", atual))
        if saida and not marcador and not re.search(r"[.!?:;]$", saida[-1]):
            saida[-1] += " " + atual
        else:
            saida.append(atual)
    txt = chr(10).join(saida)
    txt = re.sub(r"[ \t]+", " ", txt)
    return KERNING.sub(r"\1\2", txt).strip()

def uma_linha(t: str) -> str:
    """Junta tudo numa linha so — pre-requisito nunca tem paragrafo."""
    return KERNING.sub(r"\1\2", " ".join(t.split())).strip()


LIGACOES = {"de", "do", "da", "dos", "das", "e", "o", "a", "os", "as",
            "em", "no", "na", "nos", "nas", "ao", "aos", "à", "às", "com",
            "sem", "por", "para", "pelo", "pela", "que", "se", "um", "uma"}


def juntar_palavras_partidas(nome: str) -> str:
    """O PDF insere espaco no meio da palavra: "Resul tado", "Al ternauta".

    Uma palavra minuscula logo depois de uma maiuscula so pode ser preposicao;
    se nao for, e o resto da palavra anterior.
    """
    partes = nome.split()
    saida = []
    for parte in partes:
        if (saida and parte[:1].islower() and parte.lower() not in LIGACOES
                and saida[-1][:1].isupper()):
            saida[-1] += parte
        else:
            saida.append(parte)
    return " ".join(saida)


def limpar_nome(n: str) -> tuple[str, str]:
    """Devolve (nome, ativacao): o glifo de custo vem colado no nome."""
    n = " ".join(n.split())
    ativacao = ""
    m = GLIFO_INICIAL.match(n) or GLIFO_INTERNO.match(n)
    if m:
        ativacao = GLIFOS.get(m.group(1), "")
        n = n[m.end():]
    # rotulo de secao em minusculas antes do nome ("coesão Lança de Pedra")
    n = re.sub(r"^(?:[a-zà-ú]+\s+)+(?=[A-ZÁÂÃÉÊÍÓÔÕÚÇ])", "", n)
    n = re.sub(r"^[▶▷↻★∞*0-9\s]+", "", n)
    n = LEGENDA_CUSTO.sub("", n)
    n = re.sub(r"\s*\([^)]*\)\s*$", "", n)
    if n.count(")") > n.count("("):
        n = re.sub(r"\s*\(.*$", "", n.split(")")[0])
    n = juntar_palavras_partidas(KERNING.sub(r"\1\2", n))
    return n.strip(" .:-"), ativacao


def pegar_nome(antes: str) -> str:
    linhas = [l.strip() for l in antes.split("\n") if l.strip()]
    if not linhas:
        return ""
    nome = linhas[-1]
    if len(linhas) >= 2:
        ant = linhas[-2]
        parenteses_aberto = ant.count("(") > ant.count(")")
        so_glifo = bool(re.fullmatch(r"[▶▷↻★∞*0-38Rr]", ant))
        cabe = (len(ant) <= 30 and len(nome) <= 30
                and len(ant) + len(nome) <= 46
                and not re.search(r"[.:;!?][\u201d\u2019)\]]*$", ant))
        if (cabe or parenteses_aberto or so_glifo) and not ANCORA.search(ant):
            nome = ant + " " + nome
    return nome


def fatiar_talentos(txt: str):
    """(nome_cru, bloco, posicao) de cada talento do texto."""
    ancoras = list(ANCORA.finditer(txt))
    for i, m in enumerate(ancoras):
        fim = ancoras[i + 1].start() if i + 1 < len(ancoras) else len(txt)
        nome = pegar_nome(txt[: m.start()])
        bloco = txt[m.end(): fim]
        if i + 1 < len(ancoras):
            prox = pegar_nome(txt[: ancoras[i + 1].start()])
            if prox:
                sobra = len(prox.split(chr(10))[-1])
                bloco = bloco[: max(0, len(bloco) - sobra - 1)]
        yield nome, bloco, m.start()


def montar_regex_prerequisito(nomes_de_talentos: list[str]) -> re.Pattern:
    """Uma clausula de pre-requisito so tem estas formas conhecidas.

    O regex consome exatamente ate onde a gramatica alcanca. Assim a descricao
    nunca e engolida, e o pre-requisito nao fica pela metade quando quebra em
    varias linhas ("Falar o Primeiro" numa linha, "Ideal" na seguinte).
    """
    pericias = "|".join(re.escape(p) for p in sorted(PERICIAS + FLUXOS, key=len, reverse=True))
    talentos = "|".join(re.escape(t) for t in sorted(nomes_de_talentos, key=len, reverse=True))
    ideais = r"Falar\s+o\s+(?:Primeiro|Segundo|Terceiro|Quarto|Quinto)\s+Ideal"
    clausula = (
        rf"(?:{ideais}"
        rf"|N[íi]vel\s+\d+\s*\+?"
        rf"|Ancestralidade\s+\w+"
        rf"|[Tt]alento(?:-?\s?chave)?\s+(?:{talentos})"
        rf"|(?:{pericias})\s*\+?\s*\d+\s*\+?"
        rf"|nenhum)"
    )
    return re.compile(rf"^\s*({clausula}(?:\s*[;,]\s*(?:e\s+)?{clausula})*)", re.I)


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


def coletar_talentos(paginas, faixa, marcos):
    """Passo 1: acha os talentos do capitulo e guarda o bloco cru de cada um.

    O capitulo e' processado inteiro, e nao pagina a pagina: a descricao de um
    talento frequentemente atravessa a virada de pagina, e cortando por pagina
    ela ficava pela metade. A pagina de cada talento sai da posicao em que ele
    aparece no texto emendado.
    """
    dentro = sorted(
        (p for p in paginas if faixa[0] <= p["pagina"] <= faixa[1]),
        key=lambda x: x["pagina"],
    )
    if not dentro:
        return []

    partes, limites, posicao = [], [], 0
    for pagina in dentro:
        partes.append(pagina["texto"])
        limites.append((posicao, posicao + len(pagina["texto"]), pagina["pagina"]))
        posicao += len(pagina["texto"]) + 1
    texto = chr(10).join(partes)

    def pagina_de(offset):
        for comeco, final, numero in limites:
            if comeco <= offset <= final:
                return numero
        return limites[-1][2]

    # especializacao e trilha valem a partir de onde aparecem no texto
    marcas = [(m.start(), m.group(1)) for m in ESPECIALIZACAO.finditer(texto)]
    marcas += [(m.start(), "") for m in ABRE_TRILHA.finditer(texto)]
    marcas.sort()

    def especializacao_de(offset):
        atual = ""
        for onde, nome in marcas:
            if onde > offset:
                break
            atual = nome
        return atual

    crus = []
    for nome_cru, bloco, onde in fatiar_talentos(texto):
        nome, glifo = limpar_nome(nome_cru)
        if not nome or len(nome) < 3 or LIXO_NOME.search(nome):
            continue
        pagina = pagina_de(onde)
        crus.append({
            "nome": nome, "glifo": glifo, "bloco": bloco,
            "grupo": grupo_da_pagina(marcos, pagina, faixa[1]),
            "especializacao": especializacao_de(onde), "pagina": pagina,
        })
    return crus


def concluir_talentos(crus, regex_pre):
    """Passo 2: separa pre-requisito, ativacao e descricao dentro do bloco."""
    prontos = []
    for c in crus:
        bloco = c["bloco"]

        ativacao = c["glifo"]
        m = ATIVACAO_LINHA.search(bloco)
        if m:
            simbolo = m.group(1).strip()
            ativacao = GLIFOS.get(simbolo, ativacao or simbolo)
            antes, depois = bloco[: m.start()], bloco[m.end():]
        else:
            antes, depois = bloco, ""

        cabeca = uma_linha(antes)
        achado = regex_pre.match(cabeca)
        if achado:
            pre = uma_linha(achado.group(1))
            sobra = cabeca[achado.end():].strip()
        else:
            # Pre-requisito em texto livre ("Ter um patrono que faz parte da
            # alta sociedade"): a gramatica nao alcanca, mas o livro quebra a
            # linha no meio da frase e a continuacao sempre comeca em
            # minuscula. Juntamos enquanto for continuacao; a descricao vem
            # depois, comecando com maiuscula.
            partes = [l for l in antes.split(chr(10)) if l.strip()]
            pedaco = partes[:1]
            for proxima in partes[1:]:
                juntas = uma_linha(" ".join(pedaco))
                # continua se a linha de baixo e' continuacao da frase, ou se a
                # de cima terminou pendurada ("...; talento" espera o nome)
                if proxima.lstrip()[:1].islower() or PENDURADO.search(juntas):
                    pedaco.append(proxima)
                else:
                    break
            pre = uma_linha(" ".join(pedaco))
            sobra = chr(10).join(partes[len(pedaco):])

        descricao = limpar_corrido("\n".join(x for x in (sobra, depois) if x))
        descricao = LEGENDA.split(descricao)[0].strip()
        descricao = re.sub(r"\s*Cap[íi]tulo\s+\d+:.*$", "", descricao, flags=re.S).strip()
        if len(descricao) < 25:
            continue

        prontos.append({
            "nome": c["nome"], "grupo": c["grupo"],
            "especializacao": c["especializacao"],
            "preRequisitos": pre.strip(" .;:") or "nenhum",
            "ativacao": ativacao,
            "custo": achar_custo(descricao),
            "resumo": primeira_frase(descricao),
            "descricao": descricao[:1400],
            "pagina": c["pagina"],
        })

    # O livro repete cada talento na arvore e na pagina de descricao. Fica a
    # versao com ativacao reconhecida e, entre iguais, a de texto mais longo.
    vistos = {}
    for t in prontos:
        chave = (t["nome"], t["grupo"])
        anterior = vistos.get(chave)
        nota = (bool(t["ativacao"]), len(t["descricao"]))
        if not anterior or nota > (bool(anterior["ativacao"]), len(anterior["descricao"])):
            vistos[chave] = t

    return juntar_nomes_truncados(sorted(
        vistos.values(), key=lambda t: (t["grupo"], t["especializacao"], t["nome"])))


def juntar_nomes_truncados(talentos):
    """O PDF as vezes perde uma palavra do titulo ("Segundo" em vez de
    "Segundo Ideal"), e o mesmo talento aparecia duas vezes: um com o texto
    curto da arvore e outro com o detalhado. Quando um nome e' o comeco do
    outro, no mesmo grupo e com o mesmo pre-requisito, e' o mesmo talento —
    fica o nome completo com a melhor descricao."""
    saida = list(talentos)
    for curto in list(saida):
        for longo in saida:
            if curto is longo or curto["grupo"] != longo["grupo"]:
                continue
            partes_c, partes_l = curto["nome"].split(), longo["nome"].split()
            if len(partes_c) >= len(partes_l) or partes_l[:len(partes_c)] != partes_c:
                continue
            if curto["preRequisitos"] != longo["preRequisitos"]:
                continue
            if len(curto["descricao"]) > len(longo["descricao"]):
                longo.update({k: curto[k] for k in
                              ("descricao", "resumo", "custo", "ativacao", "pagina")})
            if curto in saida:
                saida.remove(curto)
            break
    return saida


def extrair_blocos(paginas, faixa, nomes, prefixo):
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


def extrair_pericias(paginas):
    quebra = chr(10)
    texto = quebra.join(
        p["texto"] for p in sorted(paginas, key=lambda x: x["pagina"])
        if 58 <= p["pagina"] <= 68
    )
    nomes = "|".join(re.escape(n) for n in PERICIAS)
    atributos = "Força|Velocidade|Intelecto|Vontade|Consciência|Presença"
    padrao = re.compile(
        rf"^({nomes})\s*\((?:{atributos})\)\s*$(.*?)"
        rf"(?=^(?:{nomes})\s*\(|\Z)",
        re.S | re.M,
    )
    achados = {}
    for m in padrao.finditer(texto):
        corpo = LEGENDA.split(limpar_corrido(m.group(2)))[0].strip()
        if len(corpo) > len(achados.get(m.group(1), "")):
            achados[m.group(1)] = corpo[:1600]
    return [{"nome": n, "descricao": achados.get(n, "")} for n in PERICIAS]


# ------------------------------------------------------------------ principal

def main() -> int:
    ap = argparse.ArgumentParser(description="Gera o pacote de dados a partir dos seus PDFs.")
    ap.add_argument("pasta", help="pasta com os PDFs do Cosmere RPG")
    ap.add_argument("--saida", default="pacote.json", help="arquivo de saida (padrao: pacote.json)")
    ap.add_argument("--tudo", action="store_true",
                    help="indexa tambem fichas e material de personagem, normalmente ignorados")
    args = ap.parse_args()

    if not os.path.isdir(args.pasta):
        print(f"Nao achei a pasta: {args.pasta}")
        return 1

    todos = sorted(
        os.path.join(args.pasta, f) for f in os.listdir(args.pasta)
        if f.lower().endswith(".pdf")
    )
    pdfs = todos if args.tudo else [f for f in todos if not IGNORAR.search(os.path.basename(f))]
    pulados = [os.path.basename(f) for f in todos if f not in pdfs]

    if not pdfs:
        print("Nenhum PDF para indexar nessa pasta.")
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
                "pagina": max(1, i + 1 + offset),
                "pdf": i + 1,
                "titulos": achar_titulos(texto),
                "texto": texto,
            })
            aproveitadas += 1
        print(f"  {rotulo:22} {aproveitadas:4} páginas  (livro = PDF {offset:+d})")

    if pulados:
        print(f"\n  ignorados (ficha ou material de personagem): {', '.join(pulados)}")

    if not paginas:
        print("\nNenhuma pagina com texto. Os PDFs podem ser digitalizacoes sem camada de texto.")
        return 1

    regras = [p for p in paginas if p["livro"] == "Regras"]
    talentos = {"heroicos": [], "radiantes": [], "cantor": []}
    conjuntos, culturas, pericias = [], [], []

    if regras:
        dentro = lambda faixa: [p for p in regras if faixa[0] <= p["pagina"] <= faixa[1]]
        crus_h = coletar_talentos(regras, CAP_HEROICAS, secoes_heroicas(dentro(CAP_HEROICAS)))
        crus_r = coletar_talentos(regras, CAP_RADIANTES, secoes_radiantes(dentro(CAP_RADIANTES)))
        crus_c = coletar_talentos(regras, ARVORE_CANTOR, [(ARVORE_CANTOR[0], "Cantor")])

        # o regex de pre-requisito precisa saber quais nomes de talento existem
        nomes = sorted({c["nome"] for c in crus_h + crus_r + crus_c})
        regex_pre = montar_regex_prerequisito(nomes)

        talentos["heroicos"] = concluir_talentos(crus_h, regex_pre)
        talentos["radiantes"] = concluir_talentos(crus_r, regex_pre)
        talentos["cantor"] = concluir_talentos(crus_c, regex_pre)

        achados_conj = extrair_blocos(regras, (240, 248), CONJUNTOS, "Conjunto")
        conjuntos = [{"nome": n, "descricao": achados_conj.get(n, ""), "pagina": 243} for n in CONJUNTOS]
        achados_cult = extrair_blocos(regras, (36, 48), CULTURAS, "Especialidade")
        culturas = [{"nome": n, "descricao": achados_cult.get(n, "")} for n in CULTURAS]
        pericias = extrair_pericias(regras)

    pacote = {
        "formato": FORMATO,
        "versao": VERSAO,
        "paginas": paginas,
        "talentos": talentos,
        "conjuntos": conjuntos,
        "culturas": culturas,
        "pericias": pericias,
    }

    with io.open(args.saida, "w", encoding="utf-8") as f:
        json.dump(pacote, f, ensure_ascii=False, separators=(",", ":"))

    tamanho = os.path.getsize(args.saida) / 1e6
    total = sum(len(v) for v in talentos.values())
    sem_ativacao = sum(1 for v in talentos.values() for t in v if not t["ativacao"])
    print(f"\n{len(paginas)} páginas indexadas")
    print(f"talentos: {len(talentos['heroicos'])} heroicos, "
          f"{len(talentos['radiantes'])} Radiantes, {len(talentos['cantor'])} de cantor")
    print(f"  sem ativação reconhecida: {sem_ativacao} de {total}")
    print(f"perícias com descrição: {sum(1 for p in pericias if p['descricao'])} de {len(pericias)}")
    print(f"\nPronto: {os.path.abspath(args.saida)}  ({tamanho:.1f} MB)")
    print("Abra o site, vá na aba Regras e arraste esse arquivo para dentro.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
