# -*- coding: utf-8 -*-
"""
Gera uma previa de arquivo unico: a pagina inicial e a mesa juntas, com CSS e
JS embutidos. Serve para mostrar o site sem servidor e para conferir o visual.

Uso:  python ferramentas/gerar_previa.py [saida.html]

Nao substitui o site: o site de verdade sao os arquivos separados. Isto aqui
so empacota o que ja existe.
"""
from __future__ import annotations

import io
import os
import re
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ordem de carga: cada modulo so pode depender dos anteriores
MODULOS = [
    "sistema", "dados", "ui", "pacote", "estado",
    "painel-ficha", "painel-dados", "painel-regras",
    "painel-combate", "painel-referencia", "construtor", "app",
]
CSS = ["base", "componentes", "layout", "ficha", "site"]

RE_IMPORT = re.compile(r"^import\s*\{(.*?)\}\s*from\s*'\./([a-z-]+)\.js';\s*$", re.M | re.S)
RE_EXPORT_DECL = re.compile(r"^export\s+(const|let|var|async function|function|class)\s+([A-Za-z_$][\w$]*)", re.M)

nome_var = lambda modulo: "__mod_" + modulo.replace("-", "_")


def empacotar_modulo(modulo: str) -> str:
    """Envolve um módulo ES num IIFE que devolve os seus exports."""
    caminho = os.path.join(BASE, "assets", "js", f"{modulo}.js")
    corpo = io.open(caminho, encoding="utf-8").read()

    ligacoes = []
    for m in RE_IMPORT.finditer(corpo):
        nomes = " ".join(m.group(1).split())
        ligacoes.append(f"  const {{ {nomes} }} = {nome_var(m.group(2))};")
    corpo = RE_IMPORT.sub("", corpo)

    exportados = [m.group(2) for m in RE_EXPORT_DECL.finditer(corpo)]
    corpo = RE_EXPORT_DECL.sub(r"\1 \2", corpo)

    devolve = ", ".join(exportados)
    indentado = "\n".join("  " + linha if linha.strip() else "" for linha in corpo.splitlines())
    return (f"const {nome_var(modulo)} = (() => {{\n"
            + "\n".join(ligacoes) + ("\n" if ligacoes else "")
            + indentado
            + f"\n  return {{ {devolve} }};\n}})();\n")


def corpo_de(arquivo: str) -> str:
    html = io.open(os.path.join(BASE, arquivo), encoding="utf-8").read()
    return re.search(r"<body[^>]*>(.*)</body>", html, re.S).group(1)


def limpar_scripts(html: str) -> str:
    return re.sub(r"<script[^>]*src=[^>]*></script>", "", html)


def main() -> int:
    saida = sys.argv[1] if len(sys.argv) > 1 else os.path.join(BASE, "previa.html")

    css = "\n".join(
        io.open(os.path.join(BASE, "assets", "css", f"{n}.css"), encoding="utf-8").read()
        for n in CSS
    )
    js_modulos = "\n".join(empacotar_modulo(m) for m in MODULOS)
    tema_js = io.open(os.path.join(BASE, "assets", "js", "tema.js"), encoding="utf-8").read()

    site = limpar_scripts(corpo_de("index.html"))
    app = limpar_scripts(corpo_de("app.html"))

    # a previa mostra as duas telas na mesma página, então os ids da inicial
    # ganham sufixo para não colidirem com os da mesa
    for ident in ("conteudo",):
        site = site.replace(f'id="{ident}"', f'id="{ident}-site"')
        site = site.replace(f'href="#{ident}"', f'href="#{ident}-site"')
    site = site.replace('href="app.html"', 'href="#" data-ver="app"')
    app = app.replace('<a class="marca" href="./"', '<a class="marca" href="#" data-ver="site"')

    modelo = f"""<!DOCTYPE html>
<html lang="pt-BR" data-tema="claro">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Mesa de Roshar</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,500;0,600;1,500&amp;family=Inter:wght@400;500;600;700&amp;display=swap">
<style>
{css}
[data-vista][hidden]{{ display:none }}
</style>
<script>
  (function () {{
    try {{
      var raiz = document.documentElement;
      var salvo = localStorage.getItem('mesa-roshar:tema');
      // Numa prévia hospedada, o anfitrião carimba o tema dele em data-theme.
      var doAnfitriao = raiz.dataset.theme;
      var escuro = salvo ? salvo === 'escuro'
                 : doAnfitriao ? doAnfitriao === 'dark'
                 : matchMedia('(prefers-color-scheme: dark)').matches;
      raiz.dataset.tema = escuro ? 'escuro' : 'claro';
    }} catch (e) {{}}
  }})();
</script>
</head>
<body>
<div data-vista="site">
{site}
</div>
<div data-vista="app" hidden>
{app}
</div>

<script>
{tema_js}
</script>
<script type="module">
{js_modulos}

// Troca entre a página inicial e a mesa. Na versão publicada isso são dois
// arquivos separados; aqui é uma tela só para caber num link de prévia.
document.addEventListener('click', (ev) => {{
  const alvo = ev.target.closest('[data-ver]');
  if (!alvo) return;
  ev.preventDefault();
  const vista = alvo.dataset.ver;
  document.querySelectorAll('[data-vista]').forEach((v) => {{
    v.hidden = v.dataset.vista !== vista;
  }});
  scrollTo({{ top: 0, behavior: 'instant' }});
}});
</script>
</body>
</html>
"""

    io.open(saida, "w", encoding="utf-8", newline="").write(modelo)
    print(f"OK: {saida}  ({os.path.getsize(saida)/1024:.0f} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
