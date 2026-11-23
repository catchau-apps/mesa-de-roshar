/* =========================================================================
   construtor.js — criação de personagem nos 8 passos do livro (cap.1)

   Cada passo explica a escolha em uma frase, mostra ao vivo o que ela muda
   na ficha e oferece uma sugestão de um toque. O rascunho é uma ficha de
   verdade (fichaDoRascunho), então fórmulas, pré-requisitos e a folha em PDF
   usam o mesmo código da ficha: nada é calculado duas vezes.
   O rascunho é salvo a cada mudança: dá para fechar no meio e voltar depois.
   ========================================================================= */

import {
  ATRIBUTOS, PERICIAS, REINOS, TRILHAS, ANCESTRALIDADES, CRIACAO,
  PERFIL_DAS_TRILHAS, PAPEL_DOS_ATRIBUTOS, ARMAS, ARMADURAS, CONJUNTOS, ESPECIALIDADES_UTILIDADE,
  EFEITOS_DE_TALENTO, efeitosDosTalentos, rolarMarcos,
  vidaMaxima, focoMaximo, defesaFisica, defesaCognitiva, defesaEspiritual,
  movimento, dadoRecuperacao, sentidos, levantamento, modificador,
} from './sistema.js';
import { ST, salvar, fichaNova, adicionarFicha } from './estado.js';
import { pacoteAtual, normalizar } from './pacote.js';
import { conferirPreRequisitos } from './prerequisitos.js';
import { esc, pontos, recado, tremer, confirmar, ligarAcoes, ligarEntradas } from './ui.js';
import { sinal } from './dados.js';
import { paginasDaFolha, baixarFolhaPDF, linhaDeArma } from './folha.js';

let raiz, corpo, titulo, contagem, trilho, btVoltar, btAvancar;
let rascunho = null;
let passo = 0;
let aoTerminar = () => {};
let ultimosValores = {};

export function iniciarConstrutor(elemento, { aoCriar }) {
  raiz = elemento;
  aoTerminar = aoCriar;
  corpo = raiz.querySelector('[data-corpo]');
  titulo = raiz.querySelector('[data-titulo]');
  contagem = raiz.querySelector('[data-contagem]');
  trilho = raiz.querySelector('[data-trilho]');
  btVoltar = raiz.querySelector('[data-voltar]');
  btAvancar = raiz.querySelector('[data-avancar]');
  ligar();
}

export const temRascunho = () => !!ST.rascunho;

function rascunhoNovo() {
  return {
    nome: '', jogador: '', ancestralidade: '', culturas: [], trilha: '',
    atributos: { for: 0, vel: 0, int: 0, von: 0, con: 0, pre: 0 },
    pericias: {}, especialidadesExtras: [], talentos: [],
    conjunto: '', armas: [], marcos: '',
    proposito: '', obstaculo: '', objetivos: ['', ''], conexoes: '', aparencia: '', anotacoes: '',
    passo: 0,
  };
}

/* Rascunhos da versão anterior guardavam a trilha como objeto e os
   objetivos como texto corrido: converte sem perder nada. */
function migrar(r) {
  const novo = { ...rascunhoNovo(), ...r };
  if (novo.trilha && typeof novo.trilha === 'object') novo.trilha = novo.trilha.nome;
  if (typeof novo.objetivos === 'string') novo.objetivos = [novo.objetivos, ''];
  if (!Array.isArray(novo.armas)) novo.armas = [];
  if (!Array.isArray(novo.especialidadesExtras)) novo.especialidadesExtras = [];
  return novo;
}

export function abrirConstrutor({ retomar = false } = {}) {
  rascunho = retomar && ST.rascunho ? migrar(ST.rascunho) : rascunhoNovo();
  passo = retomar ? Math.min(rascunho.passo || 0, PASSOS.length - 1) : 0;
  ST.rascunho = rascunho;
  salvar();
  raiz.hidden = false;
  document.body.style.overflow = 'hidden';
  prenderFoco(true);
  ultimosValores = {};
  desenhar({ novoPasso: true });
  if (!retomar) history.pushState({ construtor: true }, '', '#criar');
}

async function fecharConstrutor() {
  const comecou = rascunho && (rascunho.nome || rascunho.trilha);
  if (comecou) {
    const ok = await confirmar({
      titulo: 'Guardar o rascunho?',
      texto: 'Você pode fechar agora e continuar de onde parou depois (Menu → Retomar criação). Escolha Descartar para jogar fora.',
      confirmar: 'Guardar e sair',
    });
    if (!ok) {
      ST.rascunho = null;
    } else {
      rascunho.passo = passo;
      ST.rascunho = rascunho;
      recado('Rascunho guardado');
    }
  } else {
    ST.rascunho = null;
  }
  salvar();
  esconder();
}

/* Tela cheia é modal: o resto da página sai do Tab e do leitor de tela. */
function prenderFoco(ligado) {
  document.querySelectorAll('body > header, body > nav, body > main, body > .pular-para-conteudo')
    .forEach((el) => { el.inert = ligado; });
}

function esconder() {
  raiz.hidden = true;
  prenderFoco(false);
  document.body.style.overflow = '';
  rascunho = null;
  if (location.hash === '#criar') history.replaceState(null, '', '#ficha');
  document.dispatchEvent(new CustomEvent('construtor:fechou'));
}

/* ========================================================================
   O rascunho como ficha
   ======================================================================== */
const trilhaAtual = () => TRILHAS.find((t) => t.nome === rascunho.trilha) || null;
const cantor = () => rascunho.ancestralidade === 'Cantor';

function todosOsTalentos() {
  const p = pacoteAtual();
  return p ? [...p.talentos.heroicos, ...p.talentos.cantor] : [];
}
const talentoPorNome = (nome) => todosOsTalentos().find((t) => normalizar(t.nome) === normalizar(nome));

/** Especialidades que um talento dá ao ser adquirido ("ganha uma especialidade de utilidade em X"). */
function especialidadesDoTalento(nome) {
  const t = talentoPorNome(nome);
  if (!t) return [];
  const achadas = [];
  const re = /quando adquire esse talento[^.]*?especialidade (?:de utilidade |cultural |em arma |em armadura )?em ([A-ZÁÂÃÉÊÍÓÔÕÚÇ][^.,;\n]*)/gi;
  for (const m of t.descricao.matchAll(re)) achadas.push(m[1].trim());
  return achadas;
}

function armaDaFicha(nome) {
  const a = ARMAS.find((x) => x.nome === nome);
  return a ? { nome: a.nome, pericia: a.pericia, dano: a.dano, tipo: a.tipo } : { nome, pericia: 'Armamento Leve', dano: '1d6' };
}

const armaduraDoConjunto = () => {
  const nome = CONJUNTOS[rascunho.conjunto]?.armadura;
  return ARMADURAS.find((a) => a.nome === nome) || null;
};

/** Trecho "Equipamentos: ..." do conjunto, como está no pacote do jogador. */
function equipamentoDoConjunto() {
  const c = pacoteAtual()?.conjuntos?.find((x) => x.nome === rascunho.conjunto);
  if (!c) return '';
  const m = /Equipamentos?:\s*([\s\S]*?)(?=\s*(?:Esferas|Conex[õo]es|Especialidade Adicional|Armas|Armadura)\s*:|$)/i.exec(c.descricao || '');
  return m ? m[1].replace(/\s+/g, ' ').trim() : '';
}

/** O rascunho no formato de ficha, para as fórmulas e a folha. */
function fichaDoRascunho() {
  const f = fichaNova(rascunho.nome.trim() || 'Sem nome');
  const t = trilhaAtual();
  f.jogador = rascunho.jogador || '';
  f.ancestralidade = rascunho.ancestralidade;
  f.cultura = rascunho.culturas.join(', ');
  f.trilhas = t ? t.nome : '';
  ATRIBUTOS.forEach((a) => { f.atributos[a.id] = rascunho.atributos[a.id] || 0; });
  PERICIAS.forEach((p) => { f.pericias[p.nome] = rascunho.pericias[p.nome] || 0; });
  f.talentos = [...rascunho.talentos];

  const conjunto = CONJUNTOS[rascunho.conjunto];
  const especialidades = [
    ...rascunho.culturas,
    ...rascunho.especialidadesExtras,
    ...(conjunto?.especialidade ? [conjunto.especialidade] : []),
    ...rascunho.talentos.flatMap(especialidadesDoTalento),
  ];
  f.especialidades = [...new Set(especialidades.filter(Boolean))];

  f.armas = rascunho.armas.filter(Boolean).map(armaDaFicha);
  const armadura = armaduraDoConjunto();
  f.armadura = armadura ? armadura.nome : '';
  f.deflexao = armadura ? armadura.deflexao : 0;
  const itens = equipamentoDoConjunto();
  f.equipamento = [conjunto?.nota, itens].filter(Boolean).join('\n') || (CONJUNTOS[rascunho.conjunto] ? '' : rascunho.conjunto);
  f.marcos = rascunho.marcos;

  f.vida = vidaMaxima(f);
  f.foco = focoMaximo(f);
  f.proposito = rascunho.proposito;
  f.obstaculo = rascunho.obstaculo;
  f.objetivos = rascunho.objetivos.filter((o) => o.trim()).map((texto) => ({ texto: texto.trim(), progresso: 0 }));
  f.conexoes = [conjunto?.conexao, rascunho.conexoes].filter(Boolean).join('\n');
  f.aparencia = rascunho.aparencia;
  f.anotacoes = rascunho.anotacoes;
  return f;
}

/* ========================================================================
   Sugestões: o que a trilha usa
   ======================================================================== */

/** Peso de cada perícia para a trilha: quantas vezes ela aparece nos
 *  pré-requisitos da árvore (pacote) ou a ordem do perfil (sem pacote). */
function pesosDasPericias() {
  const t = trilhaAtual();
  const pesos = Object.fromEntries(PERICIAS.map((p) => [p.nome, 0]));
  if (!t) return pesos;
  const arvore = (pacoteAtual()?.talentos?.heroicos || []).filter((x) => x.grupo === t.nome);
  for (const talento of arvore) {
    for (const p of PERICIAS) {
      if (new RegExp(`${p.nome}\\s*\\+?\\d`, 'i').test(talento.preRequisitos || '')) pesos[p.nome] += 1;
    }
  }
  // o perfil entra sempre: a árvore quase não cita a perícia de arma do
  // Guerreiro nos pré-requisitos, mas é com ela que ele ataca
  PERFIL_DAS_TRILHAS[t.nome].pericias.forEach((nome, i) => { pesos[nome] += 6 - i; });
  pesos[t.periciaInicial] += 4;
  return pesos;
}

function pesosDosAtributos() {
  const pp = pesosDasPericias();
  const pesos = Object.fromEntries(ATRIBUTOS.map((a) => [a.id, 0]));
  PERICIAS.forEach((p) => { pesos[p.atributo] += pp[p.nome]; });
  return pesos;
}

const atributosRecomendados = () => {
  const pesos = pesosDosAtributos();
  return ATRIBUTOS.map((a) => a.id).sort((a, b) => pesos[b] - pesos[a]).slice(0, 2);
};

const periciasRecomendadas = (quantas = 5) => {
  const pesos = pesosDasPericias();
  return PERICIAS.map((p) => p.nome).filter((n) => pesos[n] > 0)
    .sort((a, b) => pesos[b] - pesos[a]).slice(0, quantas);
};

function sugerirAtributos() {
  const pesos = pesosDosAtributos();
  const ordem = ATRIBUTOS.map((a) => a.id).sort((a, b) => pesos[b] - pesos[a]);
  const valores = [3, 3, 2, 2, 1, 1];
  ordem.forEach((id, i) => { rascunho.atributos[id] = valores[i]; });
}

function sugerirPericias() {
  const t = trilhaAtual();
  const pesos = pesosDasPericias();
  // o peso cresce com o atributo: a sugestão aproveita onde o personagem já é bom
  const nota = (p) => pesos[p.nome] * (1 + (rascunho.atributos[p.atributo] || 0) / 3);
  rascunho.pericias = { [t.periciaInicial]: 2 };       // 1 grátis + 1 graduação
  PERICIAS.filter((p) => p.nome !== t.periciaInicial)
    .sort((a, b) => nota(b) - nota(a)).slice(0, 3)
    .forEach((p) => { rascunho.pericias[p.nome] = 1; });
}

/* ========================================================================
   Os passos
   ======================================================================== */
const pontosSobrando = () =>
  CRIACAO.pontosAtributo - ATRIBUTOS.reduce((s, a) => s + (rascunho.atributos[a.id] || 0), 0);

function graduacoesSobrando() {
  const inicial = trilhaAtual()?.periciaInicial;
  const gastas = Object.entries(rascunho.pericias)
    .reduce((s, [nome, v]) => s + (nome === inicial ? Math.max(0, v - 1) : v), 0);
  return CRIACAO.graduacoes - gastas;
}

const especialidadesPorIntelecto = () => rascunho.atributos.int || 0;
const talentosFixos = () => {
  const t = trilhaAtual();
  return [t?.talentoChave, ...(cantor() ? ['Mudar Forma'] : [])].filter(Boolean);
};
const talentoEscolhido = () => rascunho.talentos.find((n) => !talentosFixos().includes(n)) || '';

/* Cada passo diz o que falta, em vez de só travar o botão. */
const PASSOS = [
  { titulo: 'Origens', desenhar: pOrigens,
    falta: () => [!rascunho.nome.trim() && 'o nome', !rascunho.ancestralidade && 'a ancestralidade',
      !rascunho.culturas.length && 'pelo menos uma cultura'].filter(Boolean) },
  { titulo: 'Trilha', desenhar: pTrilha, falta: () => (rascunho.trilha ? [] : ['escolher a trilha']) },
  { titulo: 'Atributos', desenhar: pAtributos,
    falta: () => (pontosSobrando() ? [`distribuir ${pontosSobrando()} ponto${pontosSobrando() > 1 ? 's' : ''}`] : []) },
  { titulo: 'Perícias', desenhar: pPericias,
    falta: () => {
      const g = graduacoesSobrando();
      const e = especialidadesPorIntelecto() - rascunho.especialidadesExtras.length;
      return [g > 0 && `${g} graduaç${g > 1 ? 'ões' : 'ão'}`, e > 0 && `${e} especialidade${e > 1 ? 's' : ''}`].filter(Boolean);
    } },
  { titulo: 'Talentos', desenhar: pTalentos, falta: () => (talentoEscolhido() ? [] : [cantor() ? 'escolher as formas iniciais' : 'escolher o talento bônus']) },
  { titulo: 'Equipamento', desenhar: pEquipamento,
    falta: () => {
      if (!rascunho.conjunto) return ['escolher um conjunto'];
      const quantas = CONJUNTOS[rascunho.conjunto]?.armas.quantas || 0;
      const faltam = quantas - rascunho.armas.filter(Boolean).length;
      return faltam > 0 ? [`escolher ${faltam} arma${faltam > 1 ? 's' : ''}`] : [];
    } },
  { titulo: 'História', desenhar: pHistoria, falta: () => [] },
  { titulo: 'Ficha pronta', desenhar: pRevisao, falta: () => [] },
];

/* ------------------------------------------------------------- desenho */
function desenhar({ novoPasso = false } = {}) {
  const p = PASSOS[passo];
  titulo.textContent = p.titulo;
  contagem.textContent = `Passo ${passo + 1} de ${PASSOS.length}`;
  trilho.innerHTML = PASSOS.map((x, i) => {
    const estado = i < passo ? 'feito' : i === passo ? 'agora' : '';
    const alcancavel = i <= passo || PASSOS.slice(0, i).every((y) => !y.falta().length);
    return `<button type="button" data-acao="ir-passo" data-valor="${i}" data-estado="${estado}"
      ${alcancavel ? '' : 'disabled'} aria-label="Passo ${i + 1}: ${x.titulo}${i === passo ? ' (atual)' : ''}"
      ${i === passo ? 'aria-current="step"' : ''}><i></i><span>${x.titulo}</span></button>`;
  }).join('');
  btVoltar.style.visibility = passo ? 'visible' : 'hidden';
  const falta = p.falta();
  btAvancar.textContent = passo === PASSOS.length - 1 ? 'Criar ficha' : 'Continuar';
  btAvancar.setAttribute('aria-disabled', falta.length ? 'true' : 'false');

  // guarda foco e rolagem: tocar em + não pode jogar a tela para o topo
  const ativo = document.activeElement;
  const chave = ativo && corpo.contains(ativo)
    ? (ativo.dataset.campo ? `[data-campo="${CSS.escape(ativo.dataset.campo)}"]`
      : ativo.dataset.acao ? `[data-acao="${CSS.escape(ativo.dataset.acao)}"][data-valor="${CSS.escape(ativo.dataset.valor || '')}"]${ativo.dataset.delta ? `[data-delta="${ativo.dataset.delta}"]` : ''}` : null)
    : null;
  const selecao = ativo && 'selectionStart' in ativo ? [ativo.selectionStart, ativo.selectionEnd] : null;
  const rolagem = corpo.scrollTop;

  corpo.innerHTML = `<div class="envolto criacao">${p.desenhar()}${rodapeDoPasso(falta)}</div>`;

  if (novoPasso) corpo.scrollTop = 0;
  else corpo.scrollTop = rolagem;
  if (chave) {
    const novo = corpo.querySelector(chave);
    if (novo) {
      novo.focus({ preventScroll: true });
      if (selecao) try { novo.setSelectionRange(...selecao); } catch (e) { /* campo sem cursor */ }
    }
  } else if (novoPasso) {
    corpo.querySelector('h2')?.focus({ preventScroll: true });
  }

  rascunho.passo = passo;
  ST.rascunho = rascunho;
  salvar();
}

function rodapeDoPasso(falta) {
  if (!falta.length || passo === PASSOS.length - 1) return '';
  return `<p class="criacao__falta" role="status">Para continuar, falta ${esc(juntarLista(falta))}.</p>`;
}

const juntarLista = (itens) => (itens.length < 2 ? itens.join('') : `${itens.slice(0, -1).join(', ')} e ${itens.at(-1)}`);

const cabecaDoPasso = (nome, explicacao, pagina) => `
  <h2 class="criacao__titulo" tabindex="-1">${esc(nome)}</h2>
  <p class="criacao__explica">${explicacao}${pagina ? ` <span class="criacao__pagina">Guia de Regras, p.${pagina}</span>` : ''}</p>`;

/* Resumo ao vivo: o número que mudou com o último toque pisca. */
function resumoAoVivo(f, { compacto = false } = {}) {
  const valores = {
    'Vida': vidaMaxima(f), 'Foco': focoMaximo(f),
    'Def. Física': defesaFisica(f), 'Def. Cognitiva': defesaCognitiva(f), 'Def. Espiritual': defesaEspiritual(f),
    'Movimento': movimento(f.atributos.vel), 'Recuperação': dadoRecuperacao(f.atributos.von),
    'Sentidos': sentidos(f.atributos.con), 'Levantamento': levantamento(f.atributos.for),
  };
  if (compacto) ['Sentidos', 'Levantamento'].forEach((k) => delete valores[k]);
  const html = Object.entries(valores).map(([nome, valor]) => {
    const mudou = ultimosValores[nome] !== undefined && ultimosValores[nome] !== valor;
    ultimosValores[nome] = valor;
    return `<div class="resumo-vivo__item" ${mudou ? 'data-mudou' : ''}><span>${nome}</span><strong class="num">${esc(valor)}</strong></div>`;
  }).join('');
  return `<section class="resumo-vivo" aria-label="Como a ficha está agora">${html}</section>`;
}

/* ------------------------------------------------------------- 1 · origens */
function pOrigens() {
  const culturas = pacoteAtual()?.culturas || [];
  const nomesSugeridos = culturas.filter((c) => rascunho.culturas.includes(c.nome)).flatMap((c) => c.nomes || []);
  return `
    ${cabecaDoPasso('Quem é você?', 'Ancestralidade é a espécie (humano ou cantor). Cultura é onde você cresceu: cada uma vira uma especialidade e dá as línguas que você fala.', 16)}

    <h3 class="criacao__sub">Ancestralidade</h3>
    <div class="escolhas escolhas--duas">
      ${ANCESTRALIDADES.map((a) => `
        <button type="button" class="escolha" data-acao="ancestralidade" data-valor="${esc(a)}"
          aria-pressed="${rascunho.ancestralidade === a}">
          <span class="escolha__titulo">${esc(a)}</span>
          <span class="escolha__texto">${a === 'Humano'
            ? 'Ganha um talento bônus: outro da sua trilha inicial ou o talento-chave de outra trilha.'
            : 'Muda de forma com esprenos nas grantormentas: ganha Mudar Forma e escolhe um par de formas iniciais.'}</span>
        </button>`).join('')}
    </div>

    <h3 class="criacao__sub">Cultura <span class="criacao__contador">${rascunho.culturas.length}/${CRIACAO.especialidadesCulturais}</span></h3>
    <p class="campo__dica">Escolha até ${CRIACAO.especialidadesCulturais}. Toque em “ler” para ver o que ela sabe.</p>
    ${culturas.length ? `
      <div class="culturas">
        ${culturas.map((c) => `
          <div class="cultura" data-escolhida="${rascunho.culturas.includes(c.nome)}">
            <button type="button" class="cultura__botao" data-acao="cultura" data-valor="${esc(c.nome)}"
              aria-pressed="${rascunho.culturas.includes(c.nome)}">${esc(c.nome)}</button>
            ${(c.resumo || c.descricao) ? `<details class="cultura__detalhe"><summary>ler</summary>
              ${c.resumo ? `<p>${esc(c.resumo)}</p>` : ''}${c.descricao ? `<p>${esc(c.descricao)}</p>` : ''}</details>` : ''}
          </div>`).join('')}
      </div>`
    : `<div class="linha">
        <label class="so-leitor-de-tela" for="nova-cultura">Nova cultura</label>
        <input id="nova-cultura" data-nova-cultura placeholder="Ex.: Alethiana" style="flex:1;min-width:170px">
        <button class="btn btn--pequeno" data-acao="cultura-manual">Adicionar</button>
       </div>
       <p class="campo__dica">Instale o pacote de dados (aba Regras) para ver a lista do livro.</p>
       <div class="linha" style="margin-top:.6rem">
        ${rascunho.culturas.map((c, i) => `<span class="etiqueta">${esc(c)}
          <button type="button" class="etiqueta__tirar" data-acao="tirar-cultura" data-valor="${i}" aria-label="Remover ${esc(c)}">×</button></span>`).join('')}
       </div>`}

    <h3 class="criacao__sub">Nome</h3>
    <div class="linha linha--campo">
      <label class="campo" style="flex:1">
        <span class="campo__rotulo">Nome do personagem</span>
        <input data-campo="nome" value="${esc(rascunho.nome)}" autocomplete="off" spellcheck="false">
      </label>
      ${nomesSugeridos.length ? `<button type="button" class="btn" data-acao="sugerir-nome" data-valor="">Sugerir nome</button>` : ''}
    </div>
    ${!nomesSugeridos.length && culturas.length ? '<p class="campo__dica">Escolha uma cultura para receber sugestões de nome dela.</p>' : ''}
    <label class="campo" style="margin-top:.8rem">
      <span class="campo__rotulo">Seu nome (jogador) <small>opcional</small></span>
      <input data-campo="jogador" value="${esc(rascunho.jogador)}" autocomplete="nickname">
    </label>`;
}

/* ------------------------------------------------------------- 2 · trilha */
function pTrilha() {
  const nomeAtr = (id) => ATRIBUTOS.find((a) => a.id === id).nome;
  return `
    ${cabecaDoPasso('Trilha inicial', 'É o seu “ofício” no começo: dá uma graduação grátis numa perícia e o primeiro talento. Mais tarde dá para seguir outras trilhas ou virar Radiante.', 17)}
    <div class="escolhas">
      ${TRILHAS.map((t) => {
        const chave = talentoPorNome(t.talentoChave);
        const salvo = rascunho.trilha;
        rascunho.trilha = t.nome;                       // calcula a recomendação desta trilha
        const atr = atributosRecomendados();
        rascunho.trilha = salvo;
        return `
          <button type="button" class="escolha" data-acao="trilha" data-valor="${esc(t.nome)}"
            aria-pressed="${rascunho.trilha === t.nome}">
            <span class="escolha__titulo">${esc(t.nome)}
              <span class="escolha__fonte">${esc(t.especializacoes.join(' · '))}</span></span>
            <span class="escolha__texto">${esc(PERFIL_DAS_TRILHAS[t.nome].tema)}</span>
            <span class="escolha__meta">Perícia grátis: ${esc(t.periciaInicial)} · Atributos que mais usa: ${atr.map(nomeAtr).join(' e ')}</span>
            <span class="escolha__texto"><strong>${esc(t.talentoChave)}</strong>${chave?.resumo ? ` — ${esc(chave.resumo)}` : ''}</span>
          </button>`;
      }).join('')}
    </div>`;
}

/* ------------------------------------------------------------- 3 · atributos */
function pAtributos() {
  const sobra = pontosSobrando();
  const f = fichaDoRascunho();
  const recomendados = atributosRecomendados();
  return `
    ${cabecaDoPasso('Atributos', `Distribua ${CRIACAO.pontosAtributo} pontos; nenhum passa de ${CRIACAO.atributoMaximo} agora e 0 é válido. Cada ponto entra direto nas perícias, defesas e reservas ligadas a ele — veja abaixo mudando ao vivo.`, 18)}

    <div class="criacao__acoes">
      <div class="placar" data-estado="${sobra === 0 ? 'pronto' : sobra < 0 ? 'excedido' : ''}" role="status" aria-live="polite">
        <strong class="placar__valor num">${sobra}</strong>
        <span class="placar__rotulo">ponto${sobra === 1 ? '' : 's'} para distribuir</span>
      </div>
      <button type="button" class="btn" data-acao="sugerir-atributos" data-valor="">Distribuir para ${esc(rascunho.trilha)}</button>
    </div>

    ${resumoAoVivo(f)}

    <div class="atributos-criacao">
      ${['fisico', 'cognitivo', 'espiritual'].map((reino) => `
        <section class="reino-criacao" data-reino="${reino}">
          <h3 class="reino-criacao__titulo">${REINOS[reino].nome.replace(/s$/, '')} · defesa ${reino === 'fisico' ? defesaFisica(f) : reino === 'cognitivo' ? defesaCognitiva(f) : defesaEspiritual(f)}</h3>
          ${ATRIBUTOS.filter((a) => a.reino === reino).map((a) => {
            const v = rascunho.atributos[a.id] || 0;
            const pericias = PERICIAS.filter((p) => p.atributo === a.id);
            return `
              <div class="atributo-criacao">
                <div class="atributo-criacao__topo">
                  <span class="atributo-criacao__nome">${esc(a.nome)}${recomendados.includes(a.id) ? ' <span class="selo">usa muito</span>' : ''}</span>
                  <div class="passos">
                    <button type="button" data-acao="atributo" data-valor="${a.id}" data-delta="-1"
                      aria-label="Diminuir ${a.nome}" ${v <= 0 ? 'disabled' : ''}>−</button>
                    <strong class="num" aria-live="polite" aria-label="${a.nome} ${v}">${v}</strong>
                    <button type="button" data-acao="atributo" data-valor="${a.id}" data-delta="1"
                      aria-label="Aumentar ${a.nome}" ${v >= CRIACAO.atributoMaximo || sobra <= 0 ? 'disabled' : ''}>+</button>
                  </div>
                </div>
                <p class="atributo-criacao__papel">${esc(PAPEL_DOS_ATRIBUTOS[a.id])}</p>
                <p class="atributo-criacao__pericias">${pericias.map((p) => `${esc(p.nome)} <b class="num">${sinal(modificador(f, p))}</b>`).join(' · ')}</p>
              </div>`;
          }).join('')}
        </section>`).join('')}
    </div>
    ${rascunho.atributos.int ? `<p class="campo__dica">Intelecto ${rascunho.atributos.int}: você escolhe ${rascunho.atributos.int} especialidade${rascunho.atributos.int > 1 ? 's' : ''} extra${rascunho.atributos.int > 1 ? 's' : ''} no próximo passo.</p>` : ''}`;
}

/* ------------------------------------------------------------- 4 · perícias */
function pPericias() {
  const sobra = graduacoesSobrando();
  const t = trilhaAtual();
  const inicial = t.periciaInicial;
  const f = fichaDoRascunho();
  const recomendadas = periciasRecomendadas(6);

  const linha = (p) => {
    const v = rascunho.pericias[p.nome] || 0;
    const piso = p.nome === inicial ? 1 : 0;
    const sigla = ATRIBUTOS.find((a) => a.id === p.atributo).sigla;
    const marca = p.nome === inicial ? '<span class="selo selo--luz">grátis</span>'
      : recomendadas.includes(p.nome) ? `<span class="selo">${esc(t.nome)}</span>` : '';
    return `
      <div class="pericia pericia--criacao">
        <span class="pericia__nome">${esc(p.nome)} <small>${sigla}</small> ${marca}</span>
        <span class="pericia__pontos" aria-hidden="true">${pontos(v)}</span>
        <span class="passos passos--pequeno">
          <button type="button" data-acao="graduacao" data-valor="${esc(p.nome)}" data-delta="-1"
            aria-label="Diminuir ${esc(p.nome)}" ${v <= piso ? 'disabled' : ''}>−</button>
          <strong class="num" aria-label="${v} graduações">${v}</strong>
          <button type="button" data-acao="graduacao" data-valor="${esc(p.nome)}" data-delta="1"
            aria-label="Aumentar ${esc(p.nome)}" ${v >= CRIACAO.graduacaoMaxima || sobra <= 0 ? 'disabled' : ''}>+</button>
        </span>
        <span class="pericia__mod num" aria-label="modificador ${sinal(modificador(f, p))}">${sinal(modificador(f, p))}</span>
      </div>`;
  };

  const extras = especialidadesPorIntelecto();
  const escolhidas = rascunho.especialidadesExtras;
  // primeiro as armas da perícia de combate que a trilha usa, depois o resto
  const periciaDeArma = recomendadas.find((n) => /^Armamento/.test(n));
  const armasDaTrilha = ARMAS.filter((a) => a.pericia === periciaDeArma).map((a) => a.nome);
  const sugestoes = [
    ...new Set([...armasDaTrilha, ...ESPECIALIDADES_UTILIDADE, ...ARMAS.map((a) => a.nome),
      ...ARMADURAS.map((a) => a.nome), ...(pacoteAtual()?.culturas || []).map((c) => c.nome)]),
  ].filter((s) => !rascunho.culturas.includes(s) && !escolhidas.includes(s));

  return `
    ${cabecaDoPasso('Perícias e especialidades', `Você já tem 1 graduação grátis em <strong>${esc(inicial)}</strong>. Distribua mais ${CRIACAO.graduacoes}; nenhuma passa de ${CRIACAO.graduacaoMaxima} agora. O número à direita é o que você soma no d20 (atributo + graduações).`, 18)}

    <div class="criacao__acoes">
      <div class="placar" data-estado="${sobra === 0 ? 'pronto' : sobra < 0 ? 'excedido' : ''}" role="status" aria-live="polite">
        <strong class="placar__valor num">${sobra}</strong>
        <span class="placar__rotulo">graduaç${sobra === 1 ? 'ão' : 'ões'} para distribuir</span>
      </div>
      <button type="button" class="btn" data-acao="sugerir-pericias" data-valor="">Sugerir para ${esc(t.nome)}</button>
    </div>
    <p class="campo__dica">As marcadas com “${esc(t.nome)}” aparecem nos pré-requisitos da sua árvore: graduação nelas libera talentos depois.</p>

    ${['fisico', 'cognitivo', 'espiritual'].map((reino) => `
      <div class="grupo-pericias" data-reino="${reino}">
        <h3 class="grupo-pericias__titulo">${REINOS[reino].nome}</h3>
        ${PERICIAS.filter((p) => p.reino === reino).map(linha).join('')}
      </div>`).join('')}

    <h3 class="criacao__sub">Especialidades <span class="criacao__contador">${escolhidas.length}/${extras}</span></h3>
    <p class="campo__dica">${extras
      ? `Além das culturas (${esc(rascunho.culturas.join(', ') || 'nenhuma')}), você escolhe ${extras} — uma por ponto de Intelecto. Arma ou armadura liberam os traços de perito delas.`
      : 'Com Intelecto 0 você fica só com as especialidades das culturas. Subir Intelecto dá uma especialidade extra por ponto.'}</p>
    ${extras ? `
      <div class="linha">
        ${escolhidas.map((e, i) => `<span class="etiqueta etiqueta--luz">${esc(e)}
          <button type="button" class="etiqueta__tirar" data-acao="tirar-especialidade" data-valor="${i}" aria-label="Remover ${esc(e)}">×</button></span>`).join('')}
      </div>
      ${escolhidas.length < extras ? `
        <div class="linha linha--campo" style="margin-top:.6rem">
          <label class="campo" style="flex:1">
            <span class="campo__rotulo">Especialidade</span>
            <input data-nova-especialidade list="lista-especialidades" placeholder="Ex.: Lança Longa, Engenharia">
            <datalist id="lista-especialidades">${sugestoes.map((s) => `<option value="${esc(s)}">`).join('')}</datalist>
          </label>
          <button type="button" class="btn" data-acao="especialidade-manual" data-valor="">Adicionar</button>
        </div>
        <div class="linha sugestoes" aria-label="Sugestões">
          ${sugestoes.slice(0, 14).map((s) => `<button type="button" class="etiqueta alternavel" data-acao="especialidade" data-valor="${esc(s)}">${esc(s)}</button>`).join('')}
        </div>` : ''}` : ''}`;
}

/* ------------------------------------------------------------- 5 · talentos */
function cartaoDeTalento(t, f, escolhido) {
  const pre = conferirPreRequisitos(t, f);
  const efeito = EFEITOS_DE_TALENTO[t.nome]?.nota;
  const ganha = especialidadesDoTalento(t.nome);
  return `
    <div class="talento-criacao" data-escolhido="${escolhido === t.nome}">
      <button type="button" class="escolha" data-acao="talento" data-valor="${esc(t.nome)}" aria-pressed="${escolhido === t.nome}">
        <span class="escolha__titulo">${esc(t.nome)}
          <span class="escolha__fonte">${esc(t.grupo || '')}${t.especializacao ? ' · ' + esc(t.especializacao) : ''}${t.pagina ? ' · p.' + t.pagina : ''}</span></span>
        <span class="escolha__meta">${t.ativacao ? esc(t.ativacao) + ' · ' : ''}pré-requisito: ${esc(t.preRequisitos || 'nenhum')} ${pre.situacao === 'atende' ? '✓' : ''}</span>
        <span class="escolha__texto">${esc(t.resumo || '')}</span>
        ${efeito || ganha.length ? `<span class="escolha__efeito">Na ficha: ${esc([efeito, ...ganha.map((g) => `especialidade ${g}`)].filter(Boolean).join(' · '))} (aplicado sozinho)</span>` : ''}
      </button>
      ${t.descricao && t.descricao.length > (t.resumo || '').length + 10 ? `
        <details class="talento-criacao__mais"><summary>Texto completo</summary><p>${esc(t.descricao)}</p></details>` : ''}
    </div>`;
}

function pTalentos() {
  const t = trilhaAtual();
  // talentos automáticos: chave da trilha e, para cantor, Mudar Forma
  const fixos = talentosFixos();
  const bonus = rascunho.talentos.find((n) => !fixos.includes(n) && n !== 'Mudar Forma');
  rascunho.talentos = [...fixos, ...(bonus ? [bonus] : [])];
  const escolhido = talentoEscolhido();
  const f = fichaDoRascunho();
  f.talentos = [...fixos];

  const pacote = pacoteAtual();
  const fixosHtml = fixos.map((nome) => {
    const dados = talentoPorNome(nome);
    return `<li><strong>${esc(nome)}</strong>${dados?.resumo ? ` — ${esc(dados.resumo)}` : ''}</li>`;
  }).join('');

  let opcoes = '';
  if (pacote) {
    if (cantor()) {
      const formas = pacote.talentos.cantor.filter((x) => /Mudar Forma/i.test(x.preRequisitos || '') && x.nome !== 'Mudar Forma');
      opcoes = `
        <h3 class="criacao__sub">Suas formas iniciais</h3>
        <p class="campo__dica">Cada opção dá duas formas para assumir com Mudar Forma, além das formas opaca e copulatória.</p>
        <div class="escolhas">${formas.map((x) => cartaoDeTalento(x, f, escolhido)).join('')}</div>`;
    } else {
      const daTrilha = pacote.talentos.heroicos
        .filter((x) => x.grupo === t.nome && x.nome !== t.talentoChave && conferirPreRequisitos(x, f).situacao === 'atende');
      const chavesDeOutras = TRILHAS.filter((x) => x.nome !== t.nome)
        .map((x) => pacote.talentos.heroicos.find((y) => y.grupo === x.nome && normalizar(y.nome) === normalizar(x.talentoChave)) ||
          { nome: x.talentoChave, grupo: x.nome, preRequisitos: 'nenhum', resumo: '' });
      const bloqueados = pacote.talentos.heroicos
        .filter((x) => x.grupo === t.nome && x.nome !== t.talentoChave && conferirPreRequisitos(x, f).situacao !== 'atende')
        .filter((x) => !/talento\s+(?!-?chave)/i.test(x.preRequisitos || '') || /chave/i.test(x.preRequisitos || ''));
      opcoes = `
        <h3 class="criacao__sub">Talento bônus de humano</h3>
        <p class="campo__dica">Escolha um: outro talento da trilha ${esc(t.nome)} cujo pré-requisito você já cumpre, ou o talento-chave de outra trilha.</p>
        <h4 class="criacao__grupo">Da trilha ${esc(t.nome)} <span class="criacao__contador">${daTrilha.length}</span></h4>
        ${daTrilha.length ? `<div class="escolhas">${daTrilha.map((x) => cartaoDeTalento(x, f, escolhido)).join('')}</div>`
          : '<p class="campo__dica">Com as graduações atuais nenhum outro talento da trilha está liberado.</p>'}
        ${bloqueados.length ? `<details class="criacao__bloqueados"><summary>Quase lá: ${bloqueados.length} talento${bloqueados.length > 1 ? 's' : ''} da trilha ${bloqueados.length > 1 ? 'pedem' : 'pede'} outra graduação</summary>
          <ul>${bloqueados.map((x) => `<li><strong>${esc(x.nome)}</strong> — precisa de ${esc(x.preRequisitos)}</li>`).join('')}</ul>
          <p class="campo__dica">Volte ao passo Perícias se quiser liberar algum.</p></details>` : ''}
        <h4 class="criacao__grupo">Talento-chave de outra trilha</h4>
        <div class="escolhas">${chavesDeOutras.map((x) => cartaoDeTalento(x, f, escolhido)).join('')}</div>`;
    }
  } else {
    opcoes = `
      <div class="aviso">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
          <circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.6h.01" stroke-linecap="round"/></svg>
        <div>Sem o pacote de dados, a lista de talentos do livro não aparece. Escreva o nome à mão ou instale o pacote na aba Regras.</div>
      </div>
      <div class="linha linha--campo">
        <label class="campo" style="flex:1"><span class="campo__rotulo">${cantor() ? 'Talento de formas iniciais' : 'Talento bônus'}</span>
          <input data-talento-manual value="${esc(escolhido)}"></label>
        <button class="btn btn--principal" data-acao="talento-manual" data-valor="">Usar este</button>
      </div>`;
  }

  return `
    ${cabecaDoPasso('Talentos', `Talentos são as habilidades especiais. ${cantor() ? 'Como cantor, você ganha Mudar Forma e escolhe um par de formas.' : 'Como humano, você escolhe um talento bônus.'} Bônus que mudam números entram na ficha sozinhos.`, 20)}
    <section class="cartao criacao__ganhos">
      <div class="cartao__cabeca"><h3>Você já tem</h3></div>
      <div class="cartao__corpo"><ul class="lista-simples">${fixosHtml}</ul></div>
    </section>
    ${opcoes}`;
}

/* ------------------------------------------------------------- 6 · equipamento */
function pEquipamento() {
  const doPacote = pacoteAtual()?.conjuntos || [];
  const nomes = Object.keys(CONJUNTOS);
  const c = CONJUNTOS[rascunho.conjunto];
  const f = fichaDoRascunho();
  const armadura = armaduraDoConjunto();

  const seletorDeArmas = c && c.armas.quantas ? `
    <h3 class="criacao__sub">Armas do conjunto <span class="criacao__contador">${rascunho.armas.filter(Boolean).length}/${c.armas.quantas}</span></h3>
    <p class="campo__dica">O ataque já sai somando a perícia: é exatamente o que vai na ficha.</p>
    <div class="armas-criacao">
      ${c.armas.opcoes.map((nome) => {
        const arma = ARMAS.find((a) => a.nome === nome);
        const escolhida = rascunho.armas.includes(nome);
        const l = linhaDeArma(f, armaDaFicha(nome));
        return `
          <button type="button" class="arma-criacao" data-acao="arma" data-valor="${esc(nome)}" aria-pressed="${escolhida}">
            <strong>${esc(nome)}</strong>
            <span>${esc(l.titulo.split(': ')[1])} ${esc(l.detalhe)}</span>
            <small>${esc(arma.pericia)} · ${esc(arma.alcance)}${arma.tracos !== '—' ? ' · ' + esc(arma.tracos) : ''}</small>
          </button>`;
      }).join('')}
    </div>` : '';

  const avisoForca = armadura && armadura.forca > (rascunho.atributos.for || 0)
    ? `<p class="criacao__alerta" role="note">${esc(armadura.nome)} é Desajeitada [${armadura.forca}]: com Força ${rascunho.atributos.for || 0} você fica Lento e com desvantagem nos ataques enquanto a vestir. Dá para tirar a armadura e jogar com deflexão 0.</p>` : '';

  return `
    ${cabecaDoPasso('Equipamento', 'Escolha um conjunto inicial: ele traz armas, armadura, itens e esferas. O nome não prende a história — um Cortesão pode ter herdado ou roubado tudo.', 20)}
    <div class="escolhas escolhas--duas">
      ${nomes.map((nome) => {
        const mec = CONJUNTOS[nome];
        const texto = doPacote.find((x) => x.nome === nome)?.descricao || '';
        return `
          <button type="button" class="escolha" data-acao="conjunto" data-valor="${esc(nome)}" aria-pressed="${rascunho.conjunto === nome}">
            <span class="escolha__titulo">${esc(nome)} <span class="escolha__fonte">p.243</span></span>
            <span class="escolha__meta">${mec.armas.quantas ? `${mec.armas.quantas} arma${mec.armas.quantas > 1 ? 's' : ''}` : 'sem armas'}
              · ${esc(mec.armadura || 'sem armadura')}${mec.marcos ? ` · ${mec.marcos} marcos` : ''}</span>
            ${texto ? `<span class="escolha__texto">${esc(texto.slice(0, 240))}${texto.length > 240 ? '…' : ''}</span>` : ''}
            ${mec.conexao ? `<span class="escolha__efeito">Conexão: ${esc(mec.conexao)}</span>` : ''}
          </button>`;
      }).join('')}
    </div>

    ${c ? `
      ${seletorDeArmas}
      <div class="grade-criacao">
        <section class="cartao">
          <div class="cartao__cabeca"><h3>Armadura</h3></div>
          <div class="cartao__corpo">
            ${armadura ? `<p><strong>${esc(armadura.nome)}</strong> — deflexão <strong>${armadura.deflexao}</strong>${armadura.tracos !== '—' ? ` · ${esc(armadura.tracos)}` : ''}</p>
              <p class="campo__dica">A deflexão reduz o dano afiado, impactante e energético. Já vai preenchida na ficha.</p>` : '<p>Nenhuma: deflexão 0.</p>'}
            ${avisoForca}
          </div>
        </section>
        <section class="cartao">
          <div class="cartao__cabeca"><h3>Marcos</h3></div>
          <div class="cartao__corpo">
            ${c.marcos ? `
              <div class="linha linha--campo">
                <label class="campo" style="flex:1"><span class="campo__rotulo">Marcos na algibeira (${c.marcos})</span>
                  <input data-campo="marcos" inputmode="numeric" value="${esc(rascunho.marcos)}"></label>
                <button type="button" class="btn" data-acao="rolar-marcos" data-valor="">Rolar ${c.marcos}</button>
              </div>` : '<p>Este conjunto não traz esferas.</p>'}
            ${c.especialidade ? `<p class="campo__dica">Também dá a especialidade ${esc(c.especialidade)} (já somada).</p>` : ''}
          </div>
        </section>
      </div>` : ''}`;
}

/* ------------------------------------------------------------- 7 · história */
function pHistoria() {
  const campo = (chave, rotulo, dica, multi = false) => `
    <label class="campo">
      <span class="campo__rotulo">${rotulo}</span>
      ${multi ? `<textarea data-campo="${chave}" rows="3">${esc(rascunho[chave])}</textarea>`
        : `<input data-campo="${chave}" value="${esc(rascunho[chave])}">`}
      <span class="campo__dica">${dica}</span>
    </label>`;
  const conexaoDoConjunto = CONJUNTOS[rascunho.conjunto]?.conexao;
  return `
    ${cabecaDoPasso('História', 'Nada aqui tem número, mas é o que o mestre usa para criar cenas para você. Pode deixar em branco e preencher depois.', 21)}
    <div class="pilha">
      ${campo('proposito', 'Propósito', 'O que move o personagem. Ex.: proteger quem não pode se proteger.')}
      ${campo('obstaculo', 'Obstáculo', 'O que atrapalha, de novo e de novo. Ex.: orgulho, impulsividade.')}
      <fieldset class="campo">
        <legend class="campo__rotulo">Objetivos (1 ou 2 para começar)</legend>
        ${rascunho.objetivos.map((o, i) => `
          <label class="so-leitor-de-tela" for="objetivo-${i}">Objetivo ${i + 1}</label>
          <input id="objetivo-${i}" data-campo="objetivo-${i}" value="${esc(o)}" style="margin-bottom:.4rem">`).join('')}
        <span class="campo__dica">Metas concretas que dão recompensas ao serem cumpridas. Ex.: jurar o Primeiro Ideal.</span>
      </fieldset>
      ${campo('aparencia', 'Aparência', 'Altura, roupas, marcas que chamam atenção.', true)}
      ${campo('conexoes', 'Conexões', conexaoDoConjunto ? `O conjunto já anota: ${esc(conexaoDoConjunto)}.` : 'Pessoas e facções ligadas a você. Pode ficar em branco.', true)}
      ${campo('anotacoes', 'Anotações', 'Qualquer coisa: ocupação, lealdades, personalidade, ordem Radiante que pretende seguir.', true)}
    </div>`;
}

/* ------------------------------------------------------------- 8 · revisão */
function pRevisao() {
  const f = fichaDoRascunho();
  const efeitos = efeitosDosTalentos(f).fontes;
  const [frente, verso] = paginasDaFolha(f);
  // sem width/height o SVG segue o viewBox e a largura vem do CSS
  const ajustar = (svg) => svg.replace(` width="612" height="792"`, '');
  return `
    ${cabecaDoPasso(f.nome, 'Tudo calculado: confira a folha, baixe o PDF se quiser e crie a ficha. Depois dá para mudar qualquer coisa nela.', 23)}
    ${efeitos.length ? `<p class="criacao__ok">Somado pelos talentos: ${esc(efeitos.map((e) => `${e.nome} (${e.nota})`).join(' · '))}.</p>` : ''}
    <div class="criacao__acoes">
      <button type="button" class="btn btn--principal" data-acao="baixar-pdf" data-valor="">Baixar ficha em PDF</button>
    </div>
    <div class="folha-previa" role="group" aria-label="Prévia da ficha em papel">
      <div class="folha-previa__pagina">${ajustar(frente)}</div>
      <div class="folha-previa__pagina">${ajustar(verso)}</div>
    </div>`;
}

/* ========================================================================
   Interação
   ======================================================================== */
function irPara(n) {
  passo = Math.max(0, Math.min(PASSOS.length - 1, n));
  desenhar({ novoPasso: true });
}

function ligar() {
  raiz.querySelector('[data-fechar]').addEventListener('click', fecharConstrutor);
  btVoltar.addEventListener('click', () => { if (passo > 0) irPara(passo - 1); });
  btAvancar.addEventListener('click', () => {
    if (passo === PASSOS.length - 1) { finalizar(); return; }
    const falta = PASSOS[passo].falta();
    if (falta.length) {
      recado(`Falta ${juntarLista(falta)}`);
      corpo.querySelector('.criacao__falta')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    irPara(passo + 1);
  });
  raiz.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && !document.querySelector('dialog[open]')) fecharConstrutor(); });
  window.addEventListener('popstate', () => { if (!raiz.hidden && location.hash !== '#criar') fecharConstrutor(); });

  // a barra de passos fica fora do corpo
  trilho.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-acao="ir-passo"]');
    if (b && !b.disabled) irPara(Number(b.dataset.valor));
  });

  ligarAcoes(corpo, {
    ancestralidade(alvo) {
      rascunho.ancestralidade = alvo.dataset.valor;
      rascunho.talentos = rascunho.talentos.filter((n) => talentosFixos().includes(n));
      desenhar();
    },

    cultura(alvo) {
      const nome = alvo.dataset.valor;
      const i = rascunho.culturas.indexOf(nome);
      if (i >= 0) rascunho.culturas.splice(i, 1);
      else if (rascunho.culturas.length < CRIACAO.especialidadesCulturais) rascunho.culturas.push(nome);
      else { recado(`Só ${CRIACAO.especialidadesCulturais} culturas: tire uma antes`); return; }
      desenhar();
    },

    'cultura-manual'() {
      const campo = corpo.querySelector('[data-nova-cultura]');
      const valor = campo.value.trim();
      if (!valor) return;
      if (rascunho.culturas.length >= CRIACAO.especialidadesCulturais) {
        recado(`Só ${CRIACAO.especialidadesCulturais} culturas: tire uma antes`); return;
      }
      rascunho.culturas.push(valor);
      desenhar();
    },

    'tirar-cultura'(alvo) { rascunho.culturas.splice(Number(alvo.dataset.valor), 1); desenhar(); },

    'sugerir-nome'() {
      const lista = (pacoteAtual()?.culturas || []).filter((c) => rascunho.culturas.includes(c.nome)).flatMap((c) => c.nomes || []);
      const opcoes = lista.filter((n) => n !== rascunho.nome);
      if (!opcoes.length) return;
      rascunho.nome = opcoes[Math.floor(Math.random() * opcoes.length)];
      desenhar();
    },

    trilha(alvo) {
      const nova = TRILHAS.find((t) => t.nome === alvo.dataset.valor);
      if (rascunho.trilha && rascunho.trilha !== nova.nome) {
        const tinha = Object.values(rascunho.pericias).reduce((a, b) => a + b, 0) > 1 || rascunho.talentos.length > 1;
        rascunho.pericias = {};        // a graduação grátis e o talento-chave mudam
        rascunho.talentos = [];
        if (tinha) recado('Trilha trocada: refaça as perícias e o talento bônus');
      }
      rascunho.trilha = nova.nome;
      rascunho.pericias[nova.periciaInicial] = Math.max(1, rascunho.pericias[nova.periciaInicial] || 0);
      desenhar();
    },

    atributo(alvo) {
      const chave = alvo.dataset.valor;
      const delta = Number(alvo.dataset.delta);
      const novo = (rascunho.atributos[chave] || 0) + delta;
      if (novo < 0 || novo > CRIACAO.atributoMaximo) return;
      if (delta > 0 && pontosSobrando() <= 0) return;
      rascunho.atributos[chave] = novo;
      // Intelecto menor pode deixar especialidade sobrando: corta as últimas
      rascunho.especialidadesExtras = rascunho.especialidadesExtras.slice(0, especialidadesPorIntelecto());
      desenhar(); tremer();
    },

    'sugerir-atributos'() { sugerirAtributos(); desenhar(); recado('Distribuído pelos atributos que a trilha mais usa'); },

    graduacao(alvo) {
      const nome = alvo.dataset.valor;
      const piso = nome === trilhaAtual().periciaInicial ? 1 : 0;
      const delta = Number(alvo.dataset.delta);
      const novo = (rascunho.pericias[nome] || 0) + delta;
      if (novo < piso || novo > CRIACAO.graduacaoMaxima) return;
      if (delta > 0 && graduacoesSobrando() <= 0) return;
      rascunho.pericias[nome] = novo;
      desenhar(); tremer();
    },

    'sugerir-pericias'() { sugerirPericias(); desenhar(); recado('Graduações nas perícias da trilha onde você já é bom'); },

    especialidade(alvo) { adicionarEspecialidade(alvo.dataset.valor); },
    'especialidade-manual'() { adicionarEspecialidade(corpo.querySelector('[data-nova-especialidade]')?.value || ''); },
    'tirar-especialidade'(alvo) { rascunho.especialidadesExtras.splice(Number(alvo.dataset.valor), 1); desenhar(); },

    talento(alvo) {
      const atual = talentoEscolhido();
      rascunho.talentos = [...talentosFixos(), ...(alvo.dataset.valor === atual ? [] : [alvo.dataset.valor])];
      desenhar();
    },

    'talento-manual'() {
      const valor = corpo.querySelector('[data-talento-manual]').value.trim();
      if (!valor) { recado('Escreva o nome do talento'); return; }
      rascunho.talentos = [...talentosFixos(), valor];
      desenhar();
      recado('Talento anotado');
    },

    conjunto(alvo) {
      if (rascunho.conjunto !== alvo.dataset.valor) {
        rascunho.conjunto = alvo.dataset.valor;
        rascunho.armas = [];
        const c = CONJUNTOS[rascunho.conjunto];
        rascunho.marcos = c.marcos ? String(rolarMarcos(c.marcos)) : '';
        if (c.armas.quantas === 1 && c.armas.opcoes.length === 1) rascunho.armas = [...c.armas.opcoes];
      }
      desenhar();
    },

    arma(alvo) {
      const c = CONJUNTOS[rascunho.conjunto];
      const nome = alvo.dataset.valor;
      const i = rascunho.armas.indexOf(nome);
      if (i >= 0) rascunho.armas.splice(i, 1);
      else if (rascunho.armas.length < c.armas.quantas) rascunho.armas.push(nome);
      else if (c.armas.quantas === 1) rascunho.armas = [nome];
      else { recado(`São ${c.armas.quantas} armas: tire uma antes`); return; }
      desenhar();
    },

    'rolar-marcos'() {
      const c = CONJUNTOS[rascunho.conjunto];
      rascunho.marcos = String(rolarMarcos(c.marcos));
      desenhar();
      recado(`${c.marcos}: ${rascunho.marcos} marcos`);
    },

    async 'baixar-pdf'(alvo) {
      alvo.disabled = true;
      alvo.textContent = 'Gerando PDF…';
      try { await baixarFolhaPDF(fichaDoRascunho()); recado('PDF baixado'); }
      catch (e) { recado('Não consegui gerar o PDF. Tente de novo.'); console.error(e); }
      finally { alvo.disabled = false; alvo.textContent = 'Baixar ficha em PDF'; }
    },
  });

  ligarEntradas(corpo, {
    '*'(alvo, valor) {
      const campo = alvo.dataset.campo;
      const m = /^objetivo-(\d)$/.exec(campo);
      if (m) rascunho.objetivos[Number(m[1])] = valor;
      else rascunho[campo] = valor;
      ST.rascunho = rascunho;
      salvar();
      // o nome libera o botão Continuar sem redesenhar a tela inteira
      if (campo === 'nome') {
        btAvancar.setAttribute('aria-disabled', PASSOS[passo].falta().length ? 'true' : 'false');
        const aviso = corpo.querySelector('.criacao__falta');
        if (aviso) { const falta = PASSOS[passo].falta(); aviso.hidden = !falta.length; aviso.textContent = `Para continuar, falta ${juntarLista(falta)}.`; }
      }
    },
  });
  corpo.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Enter') return;
    if (ev.target.matches('[data-nova-especialidade]')) { ev.preventDefault(); adicionarEspecialidade(ev.target.value); }
    if (ev.target.matches('[data-nova-cultura]')) { ev.preventDefault(); corpo.querySelector('[data-acao="cultura-manual"]')?.click(); }
  });
}

function adicionarEspecialidade(valor) {
  const nome = valor.trim();
  if (!nome) { recado('Escreva ou toque numa especialidade'); return; }
  if (rascunho.especialidadesExtras.length >= especialidadesPorIntelecto()) { recado('Você já escolheu todas'); return; }
  if ([...rascunho.culturas, ...rascunho.especialidadesExtras].some((e) => normalizar(e) === normalizar(nome))) {
    recado('Você já tem essa'); return;
  }
  rascunho.especialidadesExtras.push(nome);
  desenhar();
}

function finalizar() {
  const faltando = PASSOS.findIndex((p) => p.falta().length);
  if (faltando >= 0 && faltando < PASSOS.length - 1) {
    recado(`Volte ao passo ${PASSOS[faltando].titulo}: falta ${juntarLista(PASSOS[faltando].falta())}`);
    irPara(faltando);
    return;
  }
  const f = fichaDoRascunho();
  adicionarFicha(f);
  ST.rascunho = null;
  salvar();
  esconder();
  aoTerminar();
  recado(`${f.nome} criado!`);
}
