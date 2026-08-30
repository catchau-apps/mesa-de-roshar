# Mesa de Roshar

Ferramenta de mesa para o **Cosmere RPG — Guerra das Tempestades**: ficha,
criação de personagem, rolador com dado de trama, busca de regras e controle de
combate. Roda no navegador, funciona sem internet e não pede conta nenhuma.

> **Projeto de fã.** Sem vínculo com a Brotherwise Games, a Dragonsteel ou a
> editora brasileira. Nenhum conteúdo dos livros está neste repositório —
> veja [Sobre os livros](#sobre-os-livros).

## O que ele faz

- **Ficha** — você mexe nos atributos e o resto se ajusta sozinho: defesas,
  vida, foco, taxa de movimento, dado de recuperação, distância dos sentidos.
- **Construtor em 8 passos** — conta os 12 pontos de atributo, respeita os
  limites da criação e só oferece talento cujo pré-requisito você cumpre.
  Dá para fechar no meio e retomar depois.
- **Rolador** — d20 + modificador, vantagem e desvantagem empilháveis, dado de
  trama com Oportunidade e Complicação aplicadas na conta, e dano de arma já
  somando o modificador da perícia.
- **Regras** — busca no texto dos seus próprios livros, com o número da página
  impressa.
- **Combate** — iniciativa na ordem do sistema (PJs rápidos → PNJs rápidos →
  PJs lentos → PNJs lentos), rodadas, vida dos inimigos e controle de reação.
- **Ajuda de mesa** — ações, reações, condições, CDs, lesões e o dado de trama.

## Por que ele é assim

As decisões de interface saíram de reclamações reais de jogadores sobre as
ferramentas que já existem:

| O que a galera reclama | O que este projeto faz |
| --- | --- |
| No D&D Beyond, "qualquer mudança demora e a página às vezes trava carregando" | Nada vai a servidor. Todo estado é local e a tela responde no mesmo quadro. |
| No app Cosmere RPG, "não dá pra pausar a criação no meio" e "não dá pra adicionar opções suas" | O construtor salva rascunho a cada passo, e todo campo aceita entrada própria. |
| No Roll20, gente pedindo "uma opção de tema claro" | Claro e escuro de verdade, seguindo o sistema por padrão. |
| Bons construtores deixam planejar a cadeia de pré-requisitos | O construtor confere graduação de perícia, talento anterior, nível e Ideais. |

## Usando

Abra `index.html` num navegador, ou publique a pasta como site estático
(GitHub Pages serve direto da raiz). Não tem build, não tem dependência de
JavaScript: é HTML, CSS e módulos ES nativos.

Para instalar como aplicativo no celular: abra o site no Chrome e use
**⋮ → Adicionar à tela inicial**.

## Sobre os livros

O repositório traz só a **mecânica** — nomes de atributo e perícia, fórmulas,
tabelas de dado. Regra de jogo não é protegida por direito autoral; o texto dos
livros é. Então o texto das regras e as descrições dos talentos **não estão
aqui** e nunca vão estar.

Para ligar a busca de regras e a lista de talentos do construtor, gere um
*pacote de dados* a partir dos PDFs que você comprou:

```bash
pip install pypdf
python ferramentas/gerar_pacote.py "C:/caminho/para/seus/PDFs"
```

O script escreve um `pacote.json`. No site, abra a aba **Regras** e arraste o
arquivo para dentro. Ele fica guardado no IndexedDB do seu navegador e não sai
dali — este projeto não tem servidor para onde mandar nada.

O `pacote.json` está no `.gitignore`. Não faça commit dele.

O gerador cuida sozinho de algumas armadilhas do PDF: descobre quantas páginas
o PDF está adiantado em relação à numeração impressa, junta palavras quebradas
por hífen no fim da linha e corrige a ligadura "fi" que sai como F maiúsculo.

## Estrutura

```
index.html              página inicial
app.html                a ferramenta
assets/
  css/  base · componentes · layout · ficha · site
  js/   sistema · estado · dados · pacote · ui
        painel-ficha · painel-dados · painel-regras
        painel-combate · painel-referencia · construtor · app
ferramentas/
  gerar_pacote.py       lê os seus PDFs e monta o pacote de dados
```

`assets/js/sistema.js` concentra a mecânica e cita a página do Guia de Regras
de onde cada fórmula veio. As páginas citadas são as **numeradas no livro**,
não as do PDF.

## Licença

Código sob [MIT](LICENSE). A licença cobre o código, não o conteúdo do
Cosmere RPG.
