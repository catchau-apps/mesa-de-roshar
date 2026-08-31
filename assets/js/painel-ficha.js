/* =========================================================================
   painel-ficha.js — a ficha, no layout da ficha oficial

   A ordem e o agrupamento seguem a ficha impressa da edição brasileira:
   cabeçalho, faixa dos três reinos com as defesas em escudo, os recursos,
   as dezoito perícias em três colunas com a linha em branco no fim de cada
   uma, os derivados, e as caixas grandes. O verso vem em seguida.
   ========================================================================= */

import {
  ATRIBUTOS, PERICIAS, FLUXOS, CONDICOES,
  vidaMaxima, focoMaximo, defesaFisica, defesaCognitiva, defesaEspiritual,
  modificador, movimento, dadoRecuperacao, sentidos, levantamento, patamar,
  ORDENS_RADIANTES, fluxosDaOrdem,
} from './sistema.js';
import { fichaAtual, salvar, descansoLongo } from './estado.js';
import { rolarExpressao, sinal } from './dados.js';
import { esc, recado, tremer, ligarAcoes, ligarEntradas, redesenharPreservandoFoco } from './ui.js';
import { cartaoProgressao, subirDeNivel } from './assistente.js';
import { abrirCatalogoDeTalentos, abrirDescricaoDaPericia,
         abrirDescricaoDoTalento } from './catalogo.js';

let raiz;
let aoRolarPericia = () => {};
let aoAtacar = () => {};

export function iniciarFicha(elemento, { rolarPericia, atacar }) {
  raiz = elemento;
  aoRolarPericia = rolarPericia;
  aoAtacar = atacar;
  ligar();
}

/* Cada reino ocupa uma coluna da faixa: dois atributos com a defesa no meio. */
const REINOS_FICHA = [
  { id: 'fisico',     nome: 'Físico',     esquerda: 'for', direita: 'vel', defesa: defesaFisica },
  { id: 'cognitivo',  nome: 'Cognitivo',  esquerda: 'int', direita: 'von', defesa: defesaCognitiva },
  { id: 'espiritual', nome: 'Espiritual', esquerda: 'con', direita: 'pre', defesa: defesaEspiritual },
];

const moldura = (conteudo, classe = '') =>
  `<div class="moldura ${classe}"><div>${conteudo}</div></div>`;

const campo = (rotulo, nome, valor, extras = '') => moldura(`
  <span class="rotulo">${rotulo}</span>
  <input data-campo="${nome}" value="${esc(valor)}" aria-label="${rotulo}" ${extras}>`);

/* Campo numérico da ficha. Não usamos <input type="number">: ele não deixa
   posicionar o cursor por código e ainda traz setinhas que atrapalham no
   celular. Texto com teclado numérico resolve, e os passos de − e + cobrem
   o caso comum, que é mexer de um em um. */
function passoNumero(rotulo, nome, valor, minimo = null) {
  return `
    <div class="ajuste">
      <span class="campo__rotulo">${rotulo}</span>
      <div class="ajuste__controles">
        <button type="button" data-acao="ajuste" data-alvo="${nome}" data-delta="-1"
          aria-label="Diminuir ${rotulo}" ${minimo !== null && valor <= minimo ? 'disabled' : ''}>−</button>
        <input data-campo="${nome}" value="${valor}" aria-label="${rotulo}"
          inputmode="numeric" autocomplete="off" spellcheck="false">
        <button type="button" data-acao="ajuste" data-alvo="${nome}" data-delta="1"
          aria-label="Aumentar ${rotulo}">+</button>
      </div>
    </div>`;
}

/* ---------------------------------------------------------------- desenho */
export function desenharFicha() {
  const f = fichaAtual();
  if (!f) return;

  redesenharPreservandoFoco(raiz, `
    <div class="painel__cabeca">
      <div>
        <h2>Ficha de personagem</h2>
        <p data-saida="cabecalho">Nível ${f.nivel} · patamar ${patamar(f)}${f.trilhas ? ' · ' + esc(f.trilhas) : ''}</p>
      </div>
      <div class="painel__acoes">
        <button class="btn btn--pequeno" data-acao="recuperar">Recuperar (${dadoRecuperacao(f.atributos.von || 0)})</button>
        <button class="btn btn--pequeno" data-acao="descanso">Descanso longo</button>
      </div>
    </div>

    <div class="folha">
      ${cabecalho(f)}
      ${faixaAtributos(f)}
      ${recursos(f)}
      ${cartaoProgressao(f)}
      ${pericias(f)}
      ${derivados(f)}
      ${condicoesEEspecialidades(f)}
      ${armasETalentos(f)}

      <p class="folha__verso">verso</p>
      ${verso(f)}
    </div>`);
}

function cabecalho(f) {
  return `
    <div class="folha__topo">
      <div class="folha__pilha">
        ${moldura(`
          <div class="folha__marca">
            <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <path d="M16 2 27 9v14L16 30 5 23V9z" stroke-linejoin="round"/>
              <path d="M16 9v14M16 16l7-4M16 16l-7-4" stroke-linecap="round"/>
            </svg>
            <span><b>COSMERE</b><span>o jogo de rpg</span></span>
          </div>`)}
        ${campo('Nome do jogador', 'jogador', f.jogador)}
      </div>

      <div class="folha__identidade">
        ${campo('Nome do personagem', 'nome', f.nome)}
        ${campo('Nível', 'nivel', f.nivel, 'inputmode="numeric" autocomplete="off"')}
        ${campo('Trilhas', 'trilhas', f.trilhas)}
        ${campo('Ancestralidade', 'ancestralidade', f.ancestralidade)}
      </div>
    </div>`;
}

function faixaAtributos(f) {
  const atributo = (chave) => {
    const a = ATRIBUTOS.find((x) => x.id === chave);
    const v = f.atributos[chave] || 0;
    return moldura(`
      <div class="atr-caixa">
        <span class="rotulo">${a.nome}</span>
        <strong class="atr-caixa__valor num">${v}</strong>
        <div class="atr-caixa__passos">
          <button type="button" data-acao="atributo" data-atributo="${chave}" data-delta="-1"
            aria-label="Diminuir ${a.nome}" ${v <= 0 ? 'disabled' : ''}>−</button>
          <button type="button" data-acao="atributo" data-atributo="${chave}" data-delta="1"
            aria-label="Aumentar ${a.nome}" ${v >= 10 ? 'disabled' : ''}>+</button>
        </div>
      </div>`);
  };

  return `
    <div class="faixa-atributos">
      ${REINOS_FICHA.map((r) => `
        <div class="reino" data-reino="${r.id}">
          <h3 class="reino__nome">${r.nome}</h3>
          <div class="reino__linha">
            ${atributo(r.esquerda)}
            <div class="escudo"><div>
              <span class="rotulo">Defesa</span>
              <strong class="escudo__valor num">${r.defesa(f)}</strong>
            </div></div>
            ${atributo(r.direita)}
          </div>
        </div>`).join('')}
    </div>`;
}

function recursos(f) {
  const par = (classe, chave, rotuloMax, maximo) => `
    <div class="recurso-folha recurso-folha--${classe}">
      ${moldura(`
        <div class="recurso-folha__par">
          <div class="recurso-folha__lado">
            <span class="rotulo">${rotuloMax}</span>
            <strong class="recurso-folha__valor num" data-saida="${chave}Maximo">${maximo}</strong>
          </div>
          <div class="recurso-folha__lado">
            <span class="rotulo rotulo--fraco">Atual</span>
            <strong class="recurso-folha__valor num">${f[chave]}</strong>
            <div class="recurso-folha__passos">
              <button type="button" data-acao="vital" data-vital="${chave}" data-delta="-1"
                aria-label="Diminuir ${rotuloMax}">−</button>
              <button type="button" data-acao="vital" data-vital="${chave}" data-delta="1"
                aria-label="Aumentar ${rotuloMax}">+</button>
            </div>
          </div>
        </div>`)}
    </div>`;

  return `
    <div class="recursos-folha">
      <div class="recurso-folha recurso-folha--vida">
        ${moldura(`
          <div class="recurso-folha__par">
            <div class="recurso-folha__lado">
              <span class="rotulo">Vida<br><span class="rotulo--fraco">máxima</span></span>
              <strong class="recurso-folha__valor num" data-saida="vidaMaximo">${vidaMaxima(f)}</strong>
            </div>
            <div class="recurso-folha__lado">
              <span class="rotulo rotulo--fraco">Atual</span>
              <strong class="recurso-folha__valor num">${f.vida}</strong>
              <div class="recurso-folha__passos">
                <button type="button" data-acao="vital" data-vital="vida" data-delta="-1" aria-label="Diminuir vida">−</button>
                <button type="button" data-acao="vital" data-vital="vida" data-delta="1" aria-label="Aumentar vida">+</button>
              </div>
            </div>
          </div>`)}
        <div class="escudo escudo--deflexao"><div>
          <span class="rotulo">Deflexão</span>
          <strong class="escudo__valor num" data-saida="deflexao">${f.deflexao || 0}</strong>
        </div></div>
      </div>

      ${par('foco', 'foco', 'Foco máximo', focoMaximo(f))}

      ${f.radiante
        ? par('investidura', 'investidura', 'Investidura máx.', f.investiduraMaxima || 0)
        : `<div class="recurso-folha recurso-folha--investidura">
             ${moldura('<div class="recurso-folha--desligado">Investidura<br>só para Radiantes</div>')}
           </div>`}
    </div>`;
}

function pericias(f) {
  const coluna = (reino) => {
    const daCasa = PERICIAS.filter((p) => p.reino === reino);
    // só os dois fluxos da ordem do personagem, nunca os dez
    const fluxos = f.radiante
      ? fluxosDaOrdem(f.ordem).filter((p) => atributoDoReino(p.atributo) === reino)
      : [];
    const proprias = f.periciasProprias
      .map((p, i) => ({ ...p, indice: i }))
      .filter((p) => atributoDoReino(p.atributo) === reino);

    return `<div>
      ${daCasa.map((p) => linhaPericia(f, p)).join('')}
      ${fluxos.map((p) => linhaPericia(f, p)).join('')}
      ${proprias.map((p) => linhaPropria(f, p)).join('')}
      <button type="button" class="botao-propria" data-acao="nova-propria" data-reino="${reino}">
        + perícia própria
      </button>
    </div>`;
  };

  return `
    <div class="pericias-folha">
      ${coluna('fisico')}
      ${coluna('cognitivo')}
      ${coluna('espiritual')}
    </div>`;
}

/* Cada perícia de fluxo herda o reino do atributo que ela usa, para cair na
   mesma coluna da ficha em que o jogador já procura por ele. */
function atributoDoReino(idAtributo) {
  return ATRIBUTOS.find((a) => a.id === idAtributo)?.reino || 'fisico';
}

function circulos(nome, tipo, valor) {
  return Array.from({ length: 5 }, (_, i) => `
    <button type="button" data-acao="graduacao" data-pericia="${esc(nome)}" data-tipo="${tipo}"
      data-nivel="${i + 1}" aria-pressed="${i < valor}"
      aria-label="${esc(nome)} com ${i + 1} graduaç${i ? 'ões' : 'ão'}"></button>`).join('');
}

function linhaPericia(f, p) {
  const tipo = p.reino === 'fluxo' ? 'fluxos' : 'pericias';
  const grad = tipo === 'fluxos' ? (f.fluxos[p.nome] || 0) : (f.pericias[p.nome] || 0);
  const sigla = ATRIBUTOS.find((a) => a.id === p.atributo).sigla;
  return `
    <div class="linha-pericia">
      <button type="button" class="linha-pericia__mod" data-acao="rolar-pericia" data-pericia="${esc(p.nome)}"
        aria-label="Rolar ${esc(p.nome)}"><span class="num">${sinal(modificador(f, p))}</span></button>
      <button type="button" class="linha-pericia__nome linha-pericia__nome--link"
        data-acao="ver-pericia" data-pericia="${esc(p.nome)}"
        title="Ver a descrição do livro">${esc(p.nome)} <small>(${sigla})</small></button>
      <span class="linha-pericia__circulos">${circulos(p.nome, tipo, grad)}</span>
    </div>`;
}

function linhaPropria(f, p) {
  const grad = f.pericias[p.nome] || 0;
  const modificadorPropria = (f.atributos[p.atributo] || 0) + grad;
  return `
    <div class="linha-pericia linha-pericia--propria">
      <button type="button" class="linha-pericia__mod" data-acao="rolar-propria" data-indice="${p.indice}"
        aria-label="Rolar ${esc(p.nome || 'perícia própria')}"><span class="num">${sinal(modificadorPropria)}</span></button>
      <span class="linha-pericia__nome">
        <input data-propria="${p.indice}" data-prop="nome" value="${esc(p.nome)}"
          placeholder="perícia" aria-label="Nome da perícia própria">
        <select data-propria="${p.indice}" data-prop="atributo" aria-label="Atributo da perícia própria">
          ${ATRIBUTOS.map((a) => `<option value="${a.id}" ${a.id === p.atributo ? 'selected' : ''}>${a.sigla}</option>`).join('')}
        </select>
        <button type="button" class="objetivo-folha__tirar" data-acao="tirar-propria" data-indice="${p.indice}"
          aria-label="Remover perícia própria">×</button>
      </span>
      <span class="linha-pericia__circulos">${circulos(p.nome, 'pericias', grad)}</span>
    </div>`;
}

function derivados(f) {
  const caixa = (rotulo, valor) => moldura(`
    <div class="derivado-folha">
      <span class="rotulo">${rotulo}</span>
      <strong class="derivado-folha__valor">${valor}</strong>
    </div>`);

  return `
    <div class="derivados-folha">
      ${caixa('Levantamento', levantamento(f.atributos.for || 0))}
      ${caixa('Movimento', movimento(f.atributos.vel || 0))}
      ${caixa('Dado de recuperação', dadoRecuperacao(f.atributos.von || 0))}
      ${caixa('Distância dos sentidos', sentidos(f.atributos.con || 0))}
    </div>`;
}

function condicoesEEspecialidades(f) {
  return `
    <div class="caixas-folha caixas-folha--12">
      ${moldura(`
        <span class="rotulo">Condições e lesões</span>
        <div class="condicoes-folha">
          ${CONDICOES.map(([nome, efeito]) => `
            <button type="button" data-acao="condicao" data-condicao="${esc(nome)}"
              aria-pressed="${f.condicoes.includes(nome)}" title="${esc(efeito)}">${esc(nome)}</button>`).join('')}
        </div>
        <textarea data-campo="lesoes" rows="2" placeholder="Lesões e durações"
          aria-label="Lesões">${esc(f.lesoes || '')}</textarea>`)}

      ${moldura(`
        <span class="rotulo">Especialidades</span>
        ${listaEtiquetas('especialidades', f.especialidades, 'Ex.: Espada longa, Alethiana')}`)}
    </div>`;
}

function listaEtiquetas(lista, itens, marcador, acaoAoTocar = '') {
  const conteudo = (t) => acaoAoTocar
    ? `<button type="button" class="etiqueta__abrir" data-acao="${acaoAoTocar}" data-item="${esc(t)}"
         title="Ver o que o livro diz">${esc(t)}</button>`
    : esc(t);
  return `
    <div class="etiquetas-folha">
      ${itens.length
        ? itens.map((t, i) => `<span class="etiqueta">${conteudo(t)}
            <button type="button" data-acao="tirar-item" data-lista="${lista}" data-indice="${i}"
              aria-label="Remover ${esc(t)}">×</button></span>`).join('')
        : '<span class="campo__dica" style="margin:0">Nada aqui ainda.</span>'}
    </div>
    <div class="entrada-folha">
      <input data-novo="${lista}" placeholder="${esc(marcador)}" aria-label="${esc(marcador)}">
      <button type="button" data-acao="por-item" data-lista="${lista}">Add</button>
    </div>`;
}

function armasETalentos(f) {
  return `
    <div class="caixas-folha caixas-folha--12">
      ${moldura(`
        <span class="rotulo">Armas</span>
        ${f.armas.length ? `
          <div class="arma-folha__cabecalho">
            <span>Arma</span><span>Perícia</span><span>Dano</span><span></span>
          </div>` : ''}
        ${f.armas.map((a, i) => `
          <div class="arma-folha">
            <input data-arma="${i}" data-prop="nome" value="${esc(a.nome)}" aria-label="Nome da arma">
            <select data-arma="${i}" data-prop="pericia" aria-label="Perícia da arma">
              ${PERICIAS.map((p) => `<option ${p.nome === a.pericia ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')}
            </select>
            <input data-arma="${i}" data-prop="dano" value="${esc(a.dano)}" placeholder="1d8" aria-label="Dano">
            <span class="arma-folha__acoes">
              <button type="button" data-acao="atacar" data-arma="${i}">Atacar</button>
              <button type="button" data-acao="tirar-arma" data-arma="${i}" aria-label="Excluir arma">×</button>
            </span>
          </div>`).join('')}
        <div class="entrada-folha">
          <button type="button" data-acao="nova-arma">+ Arma</button>
        </div>`, 'caixa-armas')}

      ${moldura(`
        <span class="rotulo">Talentos</span>
        ${listaEtiquetas('talentos', f.talentos, 'Nome do talento', 'ver-talento')}
        <div class="entrada-folha" style="padding-top:0">
          <button type="button" data-acao="ver-talentos" style="width:100%">
            Buscar no livro…
          </button>
        </div>`)}
    </div>`;
}

function verso(f) {
  /* As colunas seguem o verso da ficha impressa: aparência à esquerda,
     equipamento e marcos no meio, propósito e objetivos à direita. */
  return `
    <div class="caixas-folha caixas-folha--111">
      <div class="folha__pilha">
        ${moldura(`
          <span class="rotulo">Aparência do personagem</span>
          <textarea data-campo="aparencia" rows="9" aria-label="Aparência do personagem">${esc(f.aparencia)}</textarea>`)}
        ${moldura(`
          <div class="caixa-folha__corpo">
            <span class="rotulo" style="padding-left:0;padding-right:0">Ajustes</span>
            <label class="linha" style="cursor:pointer;gap:.5rem;font-size:.85rem">
              <input type="checkbox" data-campo="radiante" ${f.radiante ? 'checked' : ''}
                     style="width:17px;height:17px;min-height:auto;accent-color:var(--luz);padding:0">
              Cavaleiro Radiante
            </label>
            ${f.radiante ? `
              <label class="campo" style="margin-top:.5rem">
                <span class="campo__rotulo">Ordem</span>
                <select data-campo="ordem" style="border:1px solid var(--borda);padding:.3rem">
                  <option value="">— escolha a ordem —</option>
                  ${Object.keys(ORDENS_RADIANTES).map((o) => `
                    <option value="${esc(o)}" ${o === f.ordem ? 'selected' : ''}>${esc(o)}</option>`).join('')}
                </select>
              </label>
              <p class="campo__dica">${f.ordem
                ? `Fluxos da ordem: <strong>${ORDENS_RADIANTES[f.ordem].join('</strong> e <strong>')}</strong>.
                   Eles entram como perícias, uma graduação em cada ao falar o Primeiro Ideal.`
                : 'Cada ordem manipula dois fluxos. Escolha a ordem para as perícias de fluxo aparecerem.'}</p>` : ''}
            <div class="ajustes">
              ${passoNumero('Ajuste de vida', 'ajusteVida', f.ajusteVida || 0)}
              ${passoNumero('Ajuste de foco', 'ajusteFoco', f.ajusteFoco || 0)}
              ${passoNumero('Deflexão', 'deflexao', f.deflexao || 0, 0)}
              ${f.radiante ? passoNumero('Investidura máx.', 'investiduraMaxima', f.investiduraMaxima || 0, 0) : ''}
            </div>
            <p class="campo__dica">
              Vida = 10 + FOR + ajuste · Foco = 2 + VON + ajuste.
              Os ganhos de nível entram no ajuste: +5 nos níveis 2 a 5, +4+FOR no 6, +4 do 7 ao 10.
            </p>
          </div>`)}
      </div>

      <div class="folha__pilha">
        ${moldura(`
          <span class="rotulo">Armadura e equipamento</span>
          <textarea data-campo="equipamento" rows="9" aria-label="Armadura e equipamento">${esc(f.equipamento)}</textarea>`)}
        ${campo('Marcos', 'marcos', f.marcos)}
        ${moldura(`
          <span class="rotulo">Anotações</span>
          <textarea data-campo="anotacoes" rows="6" aria-label="Anotações">${esc(f.anotacoes)}</textarea>`)}
      </div>

      <div class="folha__pilha">
        ${campo('Propósito', 'proposito', f.proposito)}
        ${campo('Obstáculo', 'obstaculo', f.obstaculo)}
        ${moldura(`
          <span class="rotulo">Objetivos</span>
          ${f.objetivos.map((o, i) => `
            <div class="objetivo-folha">
              <input data-objetivo="${i}" value="${esc(o.texto)}" aria-label="Objetivo ${i + 1}">
              <span class="objetivo-folha__marcas">
                ${Array.from({ length: 3 }, (_, n) => `
                  <button type="button" data-acao="progresso" data-indice="${i}" data-nivel="${n + 1}"
                    aria-pressed="${n < o.progresso}"
                    aria-label="Objetivo ${i + 1} com ${n + 1} de 3"></button>`).join('')}
              </span>
              <button type="button" class="objetivo-folha__tirar" data-acao="tirar-objetivo" data-indice="${i}"
                aria-label="Remover objetivo">×</button>
            </div>`).join('')}
          <div class="entrada-folha">
            <button type="button" data-acao="novo-objetivo">+ Objetivo</button>
          </div>`)}
        ${f.radiante ? moldura(`
          <span class="rotulo">Ideais falados</span>
          <textarea data-campo="ideais" rows="4" aria-label="Ideais falados">${esc(f.ideais)}</textarea>`) : ''}
        ${campo('Cultura', 'cultura', f.cultura)}
        ${moldura(`
          <span class="rotulo">Conexões</span>
          <textarea data-campo="conexoes" rows="5" aria-label="Conexões">${esc(f.conexoes)}</textarea>`)}
      </div>
    </div>`;
}

/* Enquanto se digita, "-" e "" ainda não são números: valem 0 para a conta,
   mas o campo guarda o que o jogador escreveu — nada é reescrito por baixo. */
function paraNumero(campo, valor) {
  const n = Number(String(valor).trim());
  if (campo === 'nivel') return Number.isFinite(n) ? Math.max(1, Math.min(30, n)) : 1;
  return Number.isFinite(n) ? n : 0;
}

/** Repinta só os números que dependem dos campos digitáveis. */
function atualizarSaidas(f) {
  const escreve = (nome, texto) => {
    const el = raiz.querySelector(`[data-saida="${nome}"]`);
    if (el) el.textContent = texto;
  };
  escreve('vidaMaximo', vidaMaxima(f));
  escreve('focoMaximo', focoMaximo(f));
  escreve('investiduraMaximo', f.investiduraMaxima || 0);
  escreve('deflexao', f.deflexao || 0);
  escreve('cabecalho',
    `Nível ${f.nivel} · patamar ${patamar(f)}${f.trilhas ? ' · ' + f.trilhas : ''}`);

  // O painel de progressão muda inteiro com o nível, e não tem campo de texto
  // dentro — dá para trocá-lo sem atrapalhar quem está digitando.
  const progressao = raiz.querySelector('.progressao');
  if (progressao) progressao.outerHTML = cartaoProgressao(f);
}

/* ---------------------------------------------------------------- ações */
function ligar() {
  ligarAcoes(raiz, {
    vital(alvo) {
      const f = fichaAtual();
      const chave = alvo.dataset.vital;
      const tetos = { vida: vidaMaxima(f), foco: focoMaximo(f), investidura: f.investiduraMaxima || 0 };
      f[chave] = Math.max(0, Math.min(tetos[chave], f[chave] + Number(alvo.dataset.delta)));
      salvar(); desenharFicha(); tremer();
    },

    atributo(alvo) {
      const f = fichaAtual();
      const chave = alvo.dataset.atributo;
      const vidaAntes = vidaMaxima(f);
      const focoAntes = focoMaximo(f);
      f.atributos[chave] = Math.max(0, Math.min(10, (f.atributos[chave] || 0) + Number(alvo.dataset.delta)));
      // o máximo mudou: o valor atual acompanha, como num ganho de nível
      f.vida = Math.max(0, Math.min(vidaMaxima(f), f.vida + (vidaMaxima(f) - vidaAntes)));
      f.foco = Math.max(0, Math.min(focoMaximo(f), f.foco + (focoMaximo(f) - focoAntes)));
      salvar(); desenharFicha(); tremer();
    },

    /* Clicar no círculo n define a graduação como n; clicar no último aceso
       apaga, que é como se risca um círculo no papel. */
    graduacao(alvo) {
      const f = fichaAtual();
      const { pericia, tipo } = alvo.dataset;
      const nivel = Number(alvo.dataset.nivel);
      const atual = f[tipo][pericia] || 0;
      f[tipo][pericia] = atual === nivel ? nivel - 1 : nivel;
      salvar(); desenharFicha(); tremer();
    },

    condicao(alvo) {
      const f = fichaAtual();
      const nome = alvo.dataset.condicao;
      const i = f.condicoes.indexOf(nome);
      i < 0 ? f.condicoes.push(nome) : f.condicoes.splice(i, 1);
      salvar(); desenharFicha();
    },

    'rolar-pericia'(alvo) {
      const f = fichaAtual();
      const p = [...PERICIAS, ...FLUXOS].find((x) => x.nome === alvo.dataset.pericia);
      aoRolarPericia(p.nome, modificador(f, p));
    },

    'rolar-propria'(alvo) {
      const f = fichaAtual();
      const p = f.periciasProprias[Number(alvo.dataset.indice)];
      if (!p?.nome) { recado('Dê um nome a essa perícia primeiro'); return; }
      aoRolarPericia(p.nome, (f.atributos[p.atributo] || 0) + (f.pericias[p.nome] || 0));
    },

    'nova-propria'(alvo) {
      const f = fichaAtual();
      const reino = alvo.dataset.reino;
      const atributo = ATRIBUTOS.find((a) => a.reino === reino).id;
      f.periciasProprias.push({ nome: '', atributo });
      salvar(); desenharFicha();
    },

    'tirar-propria'(alvo) {
      const f = fichaAtual();
      const [removida] = f.periciasProprias.splice(Number(alvo.dataset.indice), 1);
      if (removida?.nome) delete f.pericias[removida.nome];
      salvar(); desenharFicha();
    },

    'nova-arma'() {
      fichaAtual().armas.push({
        nome: 'Nova arma', pericia: 'Armamento Leve', dano: '1d6',
        tipo: '', alcance: '',
      });
      salvar(); desenharFicha();
    },

    'tirar-arma'(alvo) {
      fichaAtual().armas.splice(Number(alvo.dataset.arma), 1);
      salvar(); desenharFicha();
    },

    atacar(alvo) {
      const f = fichaAtual();
      const arma = f.armas[Number(alvo.dataset.arma)];
      const p = PERICIAS.find((x) => x.nome === arma.pericia) || PERICIAS[0];
      aoAtacar(arma, modificador(f, p), false);
    },

    'por-item'(alvo) {
      const lista = alvo.dataset.lista;
      const entrada = raiz.querySelector(`[data-novo="${lista}"]`);
      const valor = entrada.value.trim();
      if (!valor) return;
      fichaAtual()[lista].push(valor);
      entrada.value = '';
      salvar(); desenharFicha();
    },

    'tirar-item'(alvo) {
      fichaAtual()[alvo.dataset.lista].splice(Number(alvo.dataset.indice), 1);
      salvar(); desenharFicha();
    },

    'ver-talentos'() {
      abrirCatalogoDeTalentos(fichaAtual(), (nome) => {
        const f = fichaAtual();
        if (!f.talentos.includes(nome)) f.talentos.push(nome);
        salvar(); desenharFicha();
      });
    },

    'ver-pericia'(alvo) { abrirDescricaoDaPericia(alvo.dataset.pericia); },

    'ver-talento'(alvo) { abrirDescricaoDoTalento(alvo.dataset.item, fichaAtual()); },

    'subir-nivel'() { subirDeNivel(); },

    'novo-objetivo'() {
      fichaAtual().objetivos.push({ texto: '', progresso: 0 });
      salvar(); desenharFicha();
    },

    'tirar-objetivo'(alvo) {
      fichaAtual().objetivos.splice(Number(alvo.dataset.indice), 1);
      salvar(); desenharFicha();
    },

    progresso(alvo) {
      const o = fichaAtual().objetivos[Number(alvo.dataset.indice)];
      const nivel = Number(alvo.dataset.nivel);
      o.progresso = o.progresso === nivel ? nivel - 1 : nivel;
      salvar(); desenharFicha(); tremer();
    },

    ajuste(alvo) {
      const f = fichaAtual();
      const nome = alvo.dataset.alvo;
      const minimo = ['deflexao', 'investiduraMaxima'].includes(nome) ? 0 : -Infinity;
      f[nome] = Math.max(minimo, (Number(f[nome]) || 0) + Number(alvo.dataset.delta));
      salvar(); desenharFicha(); tremer();
    },

    recuperar() {
      const f = fichaAtual();
      const dado = dadoRecuperacao(f.atributos.von || 0);
      abrirRecuperacao(dado, rolarExpressao(dado).soma);
    },

    descanso() {
      descansoLongo(fichaAtual());
      desenharFicha();
      recado('Descanso longo — recursos cheios');
    },
  });

  raiz.addEventListener('keydown', (ev) => {
    const entrada = ev.target.closest('[data-novo]');
    if (!entrada || ev.key !== 'Enter') return;
    ev.preventDefault();
    raiz.querySelector(`[data-acao="por-item"][data-lista="${entrada.dataset.novo}"]`)?.click();
  });

  const NUMERICOS = ['nivel', 'ajusteVida', 'ajusteFoco', 'deflexao', 'investiduraMaxima'];
  /* Só estes mudam a estrutura da ficha (quais caixas existem). Os demais
     mexem apenas em números já desenhados, e para esses basta repintar as
     saídas — redesenhar tudo a cada tecla é o que fazia o cursor pular. */
  const ESTRUTURAIS = ['radiante', 'ordem'];

  ligarEntradas(raiz, {
    '*'(alvo, valor) {
      const f = fichaAtual();
      const campoNome = alvo.dataset.campo;

      f[campoNome] = NUMERICOS.includes(campoNome) ? paraNumero(campoNome, valor) : valor;

      // Ao jurar o Primeiro Ideal o Radiante ganha uma perícia para cada fluxo
      // da ordem, com 1 graduação em cada (cap.5). Só semeia o que está zerado,
      // para nunca sobrescrever o que o jogador já anotou.
      if (campoNome === 'ordem') {
        fluxosDaOrdem(valor).forEach((fluxo) => {
          if (!f.fluxos[fluxo.nome]) f.fluxos[fluxo.nome] = 1;
        });
      }
      salvar();

      if (ESTRUTURAIS.includes(campoNome)) desenharFicha();
      else atualizarSaidas(f);

      if (['nome', 'nivel', 'trilhas'].includes(campoNome)) {
        document.dispatchEvent(new CustomEvent('ficha:renomeada'));
      }
    },
  });

  /* Ao sair do campo, o texto volta a mostrar o número que ficou guardado —
     é aqui que "-" ou "" viram 0, e não no meio da digitação. */
  raiz.addEventListener('focusout', (ev) => {
    const alvo = ev.target.closest('[data-campo]');
    if (!alvo || !NUMERICOS.includes(alvo.dataset.campo)) return;
    alvo.value = fichaAtual()[alvo.dataset.campo] ?? 0;
  });

  // campos que não são do objeto raiz da ficha
  raiz.addEventListener('input', (ev) => {
    const f = fichaAtual();

    const arma = ev.target.closest('[data-arma][data-prop]');
    if (arma) {
      f.armas[Number(arma.dataset.arma)][arma.dataset.prop] = arma.value;
      salvar();
      return;
    }

    const propria = ev.target.closest('[data-propria][data-prop]');
    if (propria) {
      const alvo = f.periciasProprias[Number(propria.dataset.propria)];
      const antes = alvo.nome;
      alvo[propria.dataset.prop] = propria.value;
      // renomear leva a graduação junto
      if (propria.dataset.prop === 'nome' && antes && antes !== propria.value) {
        f.pericias[propria.value] = f.pericias[antes] || 0;
        delete f.pericias[antes];
      }
      salvar();
      return;
    }

    const objetivo = ev.target.closest('[data-objetivo]');
    if (objetivo) {
      f.objetivos[Number(objetivo.dataset.objetivo)].texto = objetivo.value;
      salvar();
    }
  });

  raiz.addEventListener('change', (ev) => {
    const propria = ev.target.closest('select[data-propria][data-prop]');
    if (!propria) return;
    fichaAtual().periciasProprias[Number(propria.dataset.propria)][propria.dataset.prop] = propria.value;
    salvar(); desenharFicha();
  });
}

function abrirRecuperacao(dado, valor) {
  const dlg = document.createElement('dialog');
  dlg.innerHTML = `
    <div class="dialogo__cabeca"><h2>Recuperar</h2></div>
    <div class="dialogo__corpo">
      <div class="resultado">
        <span class="resultado__rotulo">Dado de recuperação ${dado}</span>
        <strong class="resultado__total num">${valor}</strong>
        <span class="resultado__conta">distribua entre vida e foco</span>
      </div>
    </div>
    <div class="dialogo__pe">
      <button class="btn" type="button" data-alvo="foco">Tudo em foco</button>
      <button class="btn btn--principal" type="button" data-alvo="vida">Tudo em vida</button>
    </div>`;
  document.body.append(dlg);

  const fechar = () => { dlg.close(); dlg.remove(); };
  dlg.addEventListener('click', (ev) => {
    const botao = ev.target.closest('[data-alvo]');
    if (!botao) return;
    const f = fichaAtual();
    const alvo = botao.dataset.alvo;
    const teto = alvo === 'vida' ? vidaMaxima(f) : focoMaximo(f);
    f[alvo] = Math.min(teto, f[alvo] + valor);
    salvar(); desenharFicha();
    recado(`+${valor} de ${alvo}`);
    fechar();
  });
  dlg.addEventListener('cancel', (ev) => { ev.preventDefault(); fechar(); });
  dlg.showModal();
}
