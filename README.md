# Mesa de Roshar

Ferramenta de mesa para o **Cosmere RPG — Guerra das Tempestades**: ficha,
criação de personagem, rolador com dado de trama, busca de regras e controle de
combate. Roda no navegador, funciona sem internet e não pede conta nenhuma.

> **Projeto de fã.** Sem vínculo com a Brotherwise Games, a Dragonsteel ou a
> editora brasileira. Nenhum conteúdo dos livros está neste repositório —
> veja [Sobre os livros](#sobre-os-livros).

## O que ele faz

- **Ficha** — no layout da ficha oficial. Você mexe nos atributos e o resto se
  ajusta sozinho: defesas, vida, foco, movimento, dado de recuperação,
  levantamento e distância dos sentidos.
- **Painel de progressão** — responde sem abrir o livro: quantos pontos de
  atributo e graduações você ainda tem para distribuir, quantos talentos deve
  ter no seu nível, e qual é a graduação máxima do seu patamar. O botão de
  subir de nível aplica a vida e lista o que ficou para escolher.
- **Catálogo de talentos** — todos os talentos do seu pacote, buscáveis e
  filtráveis por trilha ou ordem, com a descrição inteira e o pré-requisito
  conferido contra a sua ficha (✓ atende, ✕ falta). Um toque manda para a ficha.
- **Descrição das perícias** — toque no nome da perícia para ler o que o livro
  diz sobre ela.
- **Construtor em 8 passos** — segue o capítulo 1 do livro e explica cada
  escolha em uma frase. Mostra ao vivo o que cada ponto muda (perícias,
  defesas, vida, foco, movimento), sugere atributos e perícias pela trilha
  escolhida, dá as especialidades extras do Intelecto, só oferece talento cujo
  pré-requisito você cumpre (e mostra os que faltam pouco), escolhe as armas
  do conjunto inicial com o ataque já calculado, põe a deflexão da armadura e
  rola os marcos. Dá para fechar no meio e retomar depois.
- **Ficha em PDF** — frente e verso no arranjo da ficha oficial, em PDF
  vetorial gerado no próprio navegador (funciona offline). Botão na ficha e
  no último passo do construtor.
- **Bônus aplicados sozinhos** — talentos que mudam números (Senhor de Si,
  Mente Ambiciosa, Resistente, Compostura) entram nas defesas, vida e foco
  sem ajuste manual; especialidades que talentos e conjuntos dão também.
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

O `pacote.json` está no `.gitignore`. Não faça commit dele **em repositório
público** — publicar o texto dos livros é redistribuição.

Se o repositório for **privado** e todo mundo na sua mesa tiver os livros, aí
dá para versionar o pacote junto e ninguém precisa gerar o seu: tire a linha
`pacote.json` do `.gitignore`. A ferramenta não muda; muda só quem consegue
baixar.

### Senha da mesa

O site publicado traz o pacote **cifrado** (AES-256-GCM, chave derivada da
senha com PBKDF2-SHA256, 600 mil iterações) em `assets/mesa/`. Sem a senha
o arquivo é ilegível. Quem tem a senha digita uma vez; o navegador abre o
pacote, guarda no IndexedDB e, se o pacote do site mudar, abre de novo
sozinho. O link `app.html#criar` vai direto para o construtor.

Para trocar o pacote ou a senha:

```bash
node ferramentas/cifrar_pacote.mjs "senha da mesa" dados/pacote.json
```

Atualizou o site? Gere o pacote de novo: o gerador passou a separar direito
os talentos (pré-requisito completo, nomes inteiros, sem o texto do talento
vizinho) e as culturas (resumo, lista de nomes e especialidade).

O gerador cuida sozinho de algumas armadilhas do PDF: descobre quantas páginas
o PDF está adiantado em relação à numeração impressa, junta palavras quebradas
por hífen no fim da linha e corrige a ligadura "fi" que sai como F maiúsculo.

## Estrutura

```
index.html              página inicial
app.html                a ferramenta
assets/
  css/  base · componentes · layout · ficha · folha · criacao · site
  js/   sistema · estado · dados · pacote · ui · prerequisitos
        assistente (progressão) · catalogo (talentos e perícias)
        painel-ficha · painel-dados · painel-regras
        painel-combate · painel-referencia · construtor · folha (PDF) · app
  vendor/ jsPDF e svg2pdf.js (MIT), carregados só ao baixar o PDF
ferramentas/
  gerar_pacote.py       lê os seus PDFs e monta o pacote de dados
  gerar_previa.py       empacota o site num HTML só, para conferir o visual
```

`assets/js/sistema.js` concentra a mecânica e cita a página do Guia de Regras
de onde cada fórmula veio, incluindo a tabela Evolução de Personagem (p.25) que
alimenta o painel de progressão e os dois fluxos de cada ordem Radiante. As
páginas citadas são as **numeradas no livro**, não as do PDF.

## Licença

Código sob [MIT](LICENSE). A licença cobre o código, não o conteúdo do
Cosmere RPG. `assets/vendor/` traz o [jsPDF](https://github.com/parallax/jsPDF)
2.5.2 e o [svg2pdf.js](https://github.com/yWorks/svg2pdf.js) 2.2.4, ambos MIT,
com a licença no cabeçalho de cada arquivo.
