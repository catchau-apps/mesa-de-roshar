/* =========================================================================
   construtor.js — criação de personagem em 8 passos (cap.1)
   O rascunho é salvo a cada mudança: dá para fechar no meio e voltar depois.
   ========================================================================= */

import {
  ATRIBUTOS, PERICIAS, REINOS, TRILHAS, ANCESTRALIDADES, CRIACAO,
  vidaMaxima, focoMaximo, defesaFisica, defesaCognitiva, defesaEspiritual,
  movimento, dadoRecuperacao, sentidos,
} from './sistema.js';
import { ST, salvar, fichaNova, adicionarFicha } from './estado.js';
import { PACOTE, normalizar } from './pacote.js';
import { esc, pontos, recado, tremer, confirmar, ligarAcoes, ligarEntradas, redesenharPreservandoFoco } from './ui.js';
import { sinal } from './dados.js';

let raiz, corpo, titulo, contagem, trilho, btVoltar, btAvancar;
let rascunho = null;
let passo = 0;
let aoTerminar = () => {};

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
    nome: '', ancestralidade: '', culturas: [], trilha: null,
    atributos: { for: 0, vel: 0, int: 0, von: 0, con: 0, pre: 0 },
    pericias: {}, talentos: [], conjunto: '',
    proposito: '', obstaculo: '', objetivos: '', conexoes: '',
    passo: 0,
  };
}

export function abrirConstrutor({ retomar = false } = {}) {
  rascunho = retomar && ST.rascunho ? ST.rascunho : rascunhoNovo();
  passo = retomar ? (rascunho.passo || 0) : 0;
  ST.rascunho = rascunho;
  salvar();
  raiz.hidden = false;
  document.body.style.overflow = 'hidden';
  desenhar();
}

async function fecharConstrutor() {
  const comecou = rascunho && (rascunho.nome || rascunho.trilha);
  if (comecou) {
    const ok = await confirmar({
      titulo: 'Guardar o rascunho?',
      texto: 'Você pode fechar agora e continuar de onde parou depois. Escolha Descartar para jogar fora.',
      confirmar: 'Guardar e sair',
    });
    if (!ok) {
      ST.rascunho = null;
    } else {
      rascunho.passo = passo;
      ST.rascunho = rascunho;
      recado('Rascunho guardado');
    }
    salvar();
  } else {
    ST.rascunho = null;
    salvar();
  }
  raiz.hidden = true;
  document.body.style.overflow = '';
  rascunho = null;
  document.dispatchEvent(new CustomEvent('construtor:fechou'));
}

/* ------------------------------------------------------------- os passos */
const PASSOS = [
  { titulo: 'Origens',     desenhar: pOrigens,   completo: () => rascunho.nome.trim() && rascunho.ancestralidade },
  { titulo: 'Trilha',      desenhar: pTrilha,    completo: () => !!rascunho.trilha },
  { titulo: 'Atributos',   desenhar: pAtributos, completo: () => pontosSobrando() === 0 },
  { titulo: 'Perícias',    desenhar: pPericias,  completo: () => graduacoesSobrando() === 0 },
  { titulo: 'Talentos',    desenhar: pTalentos,  completo: () => rascunho.talentos.length >= talentosNecessarios() },
  { titulo: 'Equipamento', desenhar: pEquipamento, completo: () => true },
  { titulo: 'História',    desenhar: pHistoria,  completo: () => true },
  { titulo: 'Revisão',     desenhar: pRevisao,   completo: () => true },
];

const pontosSobrando = () =>
  CRIACAO.pontosAtributo - ATRIBUTOS.reduce((s, a) => s + (rascunho.atributos[a.id] || 0), 0);

function graduacoesSobrando() {
  const inicial = rascunho.trilha?.periciaInicial;
  const gastas = Object.entries(rascunho.pericias)
    .reduce((s, [nome, v]) => s + (nome === inicial ? Math.max(0, v - 1) : v), 0);
  return CRIACAO.graduacoes - gastas;
}

const talentosNecessarios = () => (rascunho.ancestralidade === 'Cantor' ? 3 : 2);

/* ------------------------------------------------------------- desenho */
function desenhar() {
  const p = PASSOS[passo];
  titulo.textContent = p.titulo;
  contagem.textContent = `passo ${passo + 1} de ${PASSOS.length}`;
  trilho.innerHTML = PASSOS.map((_, i) =>
    `<i data-estado="${i < passo ? 'feito' : i === passo ? 'agora' : ''}"></i>`).join('');
  btVoltar.style.visibility = passo ? 'visible' : 'hidden';
  btAvancar.textContent = passo === PASSOS.length - 1 ? 'Criar ficha' : 'Continuar';
  redesenharPreservandoFoco(corpo, `<div class="envolto">${p.desenhar()}</div>`);
  corpo.scrollTop = 0;

  rascunho.passo = passo;
  ST.rascunho = rascunho;
  salvar();
}

function pOrigens() {
  const culturas = PACOTE?.culturas || [];
  return `
    <h2 style="margin-bottom:.35rem">Quem é você?</h2>
    <p class="campo__dica" style="margin-bottom:1.25rem">Ancestralidade e cultura dizem de onde seu personagem vem. (p.16)</p>

    <label class="campo" style="margin-bottom:1.5rem">
      <span class="campo__rotulo">Nome do personagem</span>
      <input data-campo="nome" value="${esc(rascunho.nome)}" placeholder="Como o chamam?">
    </label>

    <h3 style="font-size:.95rem;margin-bottom:.6rem">Ancestralidade</h3>
    <div class="escolhas escolhas--duas" style="margin-bottom:1.5rem">
      ${ANCESTRALIDADES.map((a) => `
        <button type="button" class="escolha" data-acao="ancestralidade" data-valor="${esc(a)}"
          aria-pressed="${rascunho.ancestralidade === a}">
          <span class="escolha__titulo">${esc(a)}</span>
          <span class="escolha__texto">${a === 'Humano'
            ? 'Ganha um talento bônus de qualquer trilha heroica no nível 1.'
            : 'Muda de forma com esprenos: ganha Mudar Forma e um talento de formas iniciais.'}</span>
        </button>`).join('')}
    </div>

    <h3 style="font-size:.95rem;margin-bottom:.35rem">Especialidades culturais</h3>
    <p class="campo__dica" style="margin-bottom:.6rem">
      Escolha até ${CRIACAO.especialidadesCulturais} (${rascunho.culturas.length}/${CRIACAO.especialidadesCulturais}).
    </p>
    ${culturas.length ? `
      <div class="linha">
        ${culturas.map((c) => `<button type="button" class="etiqueta alternavel"
          data-acao="cultura" data-valor="${esc(c.nome)}"
          aria-pressed="${rascunho.culturas.includes(c.nome)}">${esc(c.nome)}</button>`).join('')}
      </div>`
    : `<div class="linha">
        <input data-nova-cultura placeholder="Ex.: Alethiana" style="flex:1;min-width:170px">
        <button class="btn btn--pequeno" data-acao="cultura-manual">Adicionar</button>
       </div>
       <p class="campo__dica">Com um pacote de dados instalado, a lista do livro aparece aqui.</p>
       <div class="linha" style="margin-top:.6rem">
        ${rascunho.culturas.map((c, i) => `<span class="etiqueta">${esc(c)}
          <button type="button" data-acao="tirar-cultura" data-indice="${i}"
            style="background:none;border:none;cursor:pointer;color:inherit;padding:0 0 0 .2em"
            aria-label="Remover ${esc(c)}">×</button></span>`).join('')}
       </div>`}`;
}

function pTrilha() {
  return `
    <h2 style="margin-bottom:.35rem">Trilha inicial</h2>
    <p class="campo__dica" style="margin-bottom:1.25rem">
      Ela dá uma graduação grátis numa perícia e o seu talento-chave. (p.17)
    </p>
    <div class="escolhas">
      ${TRILHAS.map((t) => {
        const doPacote = PACOTE?.trilhas?.find((x) => x.nome === t.nome);
        return `
          <button type="button" class="escolha" data-acao="trilha" data-valor="${esc(t.nome)}"
            aria-pressed="${rascunho.trilha?.nome === t.nome}">
            <span class="escolha__titulo">${esc(t.nome)}
              <span class="escolha__fonte">${esc(t.especializacoes.join(' · '))}</span></span>
            ${doPacote?.tema ? `<span class="escolha__texto">${esc(doPacote.tema)}</span>` : ''}
            <span class="escolha__meta">Perícia inicial: ${esc(t.periciaInicial)} · Talento-chave: ${esc(t.talentoChave)}</span>
          </button>`;
      }).join('')}
    </div>`;
}

function pAtributos() {
  const sobra = pontosSobrando();
  const f = { atributos: rascunho.atributos, ajusteVida: 0, ajusteFoco: 0, nivel: 1 };
  return `
    <h2 style="margin-bottom:.35rem">Atributos</h2>
    <p class="campo__dica" style="margin-bottom:1rem">
      Distribua ${CRIACAO.pontosAtributo} pontos. Nenhum passa de ${CRIACAO.atributoMaximo} na criação, e 0 é um valor válido. (p.18)
    </p>

    <div class="placar" data-estado="${sobra === 0 ? 'pronto' : sobra < 0 ? 'excedido' : ''}" role="status">
      <strong class="placar__valor num">${sobra}</strong>
      <span class="placar__rotulo">pontos restantes</span>
    </div>

    <div class="atributos" style="margin-bottom:1.25rem">
      ${ATRIBUTOS.map((a) => {
        const v = rascunho.atributos[a.id] || 0;
        return `
          <div class="atributo" data-reino="${a.reino}">
            <span class="atributo__nome">${a.sigla}</span>
            <strong class="atributo__valor num">${v}</strong>
            <div class="atributo__botoes">
              <button type="button" data-acao="atributo" data-valor="${a.id}" data-delta="-1"
                aria-label="Diminuir ${a.nome}" ${v <= 0 ? 'disabled' : ''}>−</button>
              <button type="button" data-acao="atributo" data-valor="${a.id}" data-delta="1"
                aria-label="Aumentar ${a.nome}" ${v >= CRIACAO.atributoMaximo || sobra <= 0 ? 'disabled' : ''}>+</button>
            </div>
          </div>`;
      }).join('')}
    </div>

    <div class="defesas" style="margin-bottom:.7rem">
      <div class="defesa" data-reino="fisico"><span class="defesa__nome">Def. Física</span>
        <strong class="defesa__valor num">${defesaFisica(f)}</strong></div>
      <div class="defesa" data-reino="cognitivo"><span class="defesa__nome">Def. Cognitiva</span>
        <strong class="defesa__valor num">${defesaCognitiva(f)}</strong></div>
      <div class="defesa" data-reino="espiritual"><span class="defesa__nome">Def. Espiritual</span>
        <strong class="defesa__valor num">${defesaEspiritual(f)}</strong></div>
    </div>
    <div class="derivados">
      <div class="derivado"><span class="derivado__nome">Vida</span><span class="derivado__valor">${vidaMaxima(f)}</span></div>
      <div class="derivado"><span class="derivado__nome">Foco</span><span class="derivado__valor">${focoMaximo(f)}</span></div>
      <div class="derivado"><span class="derivado__nome">Movimento</span><span class="derivado__valor">${movimento(f.atributos.vel)}</span></div>
      <div class="derivado"><span class="derivado__nome">Recuperação</span><span class="derivado__valor">${dadoRecuperacao(f.atributos.von)}</span></div>
      <div class="derivado"><span class="derivado__nome">Sentidos</span><span class="derivado__valor">${sentidos(f.atributos.con)}</span></div>
    </div>`;
}

function pPericias() {
  const sobra = graduacoesSobrando();
  const inicial = rascunho.trilha.periciaInicial;

  const linha = (p) => {
    const v = rascunho.pericias[p.nome] || 0;
    const eInicial = p.nome === inicial;
    const piso = eInicial ? 1 : 0;
    const sigla = ATRIBUTOS.find((a) => a.id === p.atributo).sigla;
    return `
      <div class="pericia">
        <span class="pericia__nome">${esc(p.nome)} <small>${sigla}${eInicial ? ' · inicial' : ''}</small></span>
        <span class="pericia__pontos" aria-hidden="true">${pontos(v)}</span>
        <span class="pericia__passos">
          <button type="button" data-acao="graduacao" data-valor="${esc(p.nome)}" data-delta="-1"
            aria-label="Diminuir ${esc(p.nome)}" ${v <= piso ? 'disabled' : ''}>−</button>
          <button type="button" data-acao="graduacao" data-valor="${esc(p.nome)}" data-delta="1"
            aria-label="Aumentar ${esc(p.nome)}" ${v >= CRIACAO.graduacaoMaxima || sobra <= 0 ? 'disabled' : ''}>+</button>
        </span>
        <span class="pericia__mod num">${sinal((rascunho.atributos[p.atributo] || 0) + v)}</span>
      </div>`;
  };

  return `
    <h2 style="margin-bottom:.35rem">Perícias</h2>
    <p class="campo__dica" style="margin-bottom:1rem">
      Você já tem 1 graduação grátis em <strong style="color:var(--luz)">${esc(inicial)}</strong>,
      da trilha ${esc(rascunho.trilha.nome)}. Distribua mais ${CRIACAO.graduacoes};
      nenhuma passa de ${CRIACAO.graduacaoMaxima} na criação. (p.18)
    </p>
    <div class="placar" data-estado="${sobra === 0 ? 'pronto' : sobra < 0 ? 'excedido' : ''}" role="status">
      <strong class="placar__valor num">${sobra}</strong>
      <span class="placar__rotulo">graduações restantes</span>
    </div>
    ${['fisico', 'cognitivo', 'espiritual'].map((reino) => `
      <div class="grupo-pericias" data-reino="${reino}">
        <h4 class="grupo-pericias__titulo">${REINOS[reino].nome}</h4>
        ${PERICIAS.filter((p) => p.reino === reino).map(linha).join('')}
      </div>`).join('')}`;
}

/* --- pré-requisitos (p.18) ------------------------------------------------
   Confere graduação de perícia, talento anterior da árvore, nível e Ideais.
   O que não der para interpretar fica de fora: melhor faltar opção do que
   oferecer algo inválido.                                                  */
function atendePreRequisito(talento) {
  const pr = (talento.preRequisitos || '').trim();
  if (!pr || /^nenhum/i.test(pr)) return true;
  return pr.split(';').every((parte) => umPreRequisito(parte.trim()));
}

function umPreRequisito(p) {
  if (!p) return true;
  let m = /^n[íi]vel\s*(\d+)/i.exec(p);
  if (m) return 1 >= Number(m[1]);
  if (/falar o .*ideal/i.test(p)) return false;
  if (/ancestralidade cantor/i.test(p)) return rascunho.ancestralidade === 'Cantor';

  m = /talento(?:-?\s?chave)?\s+(.+)$/i.exec(p);
  if (m) return rascunho.talentos.some((t) => normalizar(t) === normalizar(m[1].trim()));

  m = /^(.+?)\s*(\d+)\s*\+?$/.exec(p);
  if (m) {
    const alvo = PERICIAS.find((x) => normalizar(x.nome) === normalizar(m[1].trim()));
    if (alvo) return (rascunho.pericias[alvo.nome] || 0) >= Number(m[2]);
  }
  return false;
}

function pTalentos() {
  const cantor = rascunho.ancestralidade === 'Cantor';
  const chave = rascunho.trilha.talentoChave;

  if (!rascunho.talentos.includes(chave)) rascunho.talentos.push(chave);
  if (cantor && !rascunho.talentos.includes('Mudar Forma')) rascunho.talentos.push('Mudar Forma');
  if (!cantor) rascunho.talentos = rascunho.talentos.filter((t) => t !== 'Mudar Forma');

  const fixos = cantor ? [chave, 'Mudar Forma'] : [chave];
  const escolhido = rascunho.talentos.find((t) => !fixos.includes(t)) || '';

  const fonte = cantor ? (PACOTE?.talentos?.cantor || []) : (PACOTE?.talentos?.heroicos || []);
  const opcoes = fonte.filter((t) => !fixos.includes(t.nome) && atendePreRequisito(t));

  return `
    <h2 style="margin-bottom:.35rem">Talentos</h2>
    <p class="campo__dica" style="margin-bottom:1rem">
      O talento-chave da trilha vem junto. ${cantor
        ? 'Como cantor, você também ganha Mudar Forma e escolhe suas formas iniciais.'
        : 'Como humano, você ganha um talento bônus de qualquer trilha heroica.'} (p.20)
    </p>

    <section class="cartao" style="margin-bottom:1.25rem">
      <div class="cartao__cabeca"><h3>Você já tem</h3></div>
      <div class="cartao__corpo">
        <div class="linha">${fixos.map((t) => `<span class="etiqueta etiqueta--luz">${esc(t)}</span>`).join('')}</div>
      </div>
    </section>

    <h3 style="font-size:.95rem;margin-bottom:.6rem">
      ${cantor ? 'Suas formas iniciais' : 'Talento bônus de humano'}
    </h3>

    ${PACOTE ? `
      ${opcoes.length ? `
        <p class="campo__dica" style="margin-bottom:.6rem">
          ${opcoes.length} disponíve${opcoes.length === 1 ? 'l' : 'is'} com as suas perícias atuais.
        </p>
        <div class="escolhas">
          ${opcoes.map((t) => `
            <button type="button" class="escolha" data-acao="talento" data-valor="${esc(t.nome)}"
              aria-pressed="${escolhido === t.nome}">
              <span class="escolha__titulo">${esc(t.nome)}
                <span class="escolha__fonte">${esc(t.grupo || '')}${t.especializacao ? ' · ' + esc(t.especializacao) : ''}${t.pagina ? ' · p.' + t.pagina : ''}</span></span>
              <span class="escolha__meta">${t.ativacao ? esc(t.ativacao) + ' · ' : ''}pré: ${esc(t.preRequisitos || 'nenhum')}</span>
              <span class="escolha__texto">${esc((t.descricao || '').slice(0, 260))}${(t.descricao || '').length > 260 ? '…' : ''}</span>
            </button>`).join('')}
        </div>`
      : `<div class="vazio"><strong>Nenhum talento disponível</strong>
           <p>Com estas perícias você não atende ao pré-requisito de nenhum talento. Volte um passo e ajuste as graduações.</p></div>`}`
    : `<div class="aviso" style="margin-bottom:1rem">
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
           <circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.6h.01" stroke-linecap="round"/></svg>
         <div>Sem pacote de dados instalado, a lista de talentos do livro não aparece.
           Escreva o nome do talento à mão — ou instale o pacote na aba Regras.</div>
       </div>
       <div class="linha">
         <input data-talento-manual placeholder="Nome do talento" value="${esc(escolhido)}" style="flex:1;min-width:180px">
         <button class="btn btn--pequeno btn--principal" data-acao="talento-manual">Usar este</button>
       </div>`}`;
}

function pEquipamento() {
  const conjuntos = PACOTE?.conjuntos || [];
  return `
    <h2 style="margin-bottom:.35rem">Conjunto inicial</h2>
    <p class="campo__dica" style="margin-bottom:1.25rem">O equipamento com que você começa. (p.20)</p>
    ${conjuntos.length ? `
      <div class="escolhas">
        ${conjuntos.map((c) => `
          <button type="button" class="escolha" data-acao="conjunto" data-valor="${esc(c.nome)}"
            aria-pressed="${rascunho.conjunto === c.nome}">
            <span class="escolha__titulo">${esc(c.nome)}
              ${c.pagina ? `<span class="escolha__fonte">p.${c.pagina}</span>` : ''}</span>
            <span class="escolha__texto" style="white-space:pre-wrap">${esc(c.descricao || '')}</span>
          </button>`).join('')}
      </div>`
    : `<label class="campo">
         <span class="campo__rotulo">Equipamento inicial</span>
         <textarea data-campo="conjunto" placeholder="Anote as armas, armadura, esferas e itens que você começa carregando.">${esc(rascunho.conjunto)}</textarea>
       </label>
       <p class="campo__dica">Com um pacote instalado, os conjuntos do capítulo 7 aparecem aqui como opções.</p>`}`;
}

function pHistoria() {
  return `
    <h2 style="margin-bottom:.35rem">História</h2>
    <p class="campo__dica" style="margin-bottom:1.25rem">
      Propósito é o que move seu personagem; obstáculo é o que atrapalha. Nada aqui é obrigatório. (p.21)
    </p>
    <div class="pilha">
      <label class="campo"><span class="campo__rotulo">Propósito</span>
        <input data-campo="proposito" value="${esc(rascunho.proposito)}" placeholder="O que o move?"></label>
      <label class="campo"><span class="campo__rotulo">Obstáculo</span>
        <input data-campo="obstaculo" value="${esc(rascunho.obstaculo)}" placeholder="O que atrapalha?"></label>
      <label class="campo"><span class="campo__rotulo">Objetivos</span>
        <textarea data-campo="objetivos">${esc(rascunho.objetivos)}</textarea></label>
      <label class="campo"><span class="campo__rotulo">Conexões</span>
        <textarea data-campo="conexoes">${esc(rascunho.conexoes)}</textarea></label>
    </div>`;
}

function pRevisao() {
  const f = { atributos: rascunho.atributos, ajusteVida: 0, ajusteFoco: 0, nivel: 1 };
  const pericias = Object.entries(rascunho.pericias).filter(([, v]) => v > 0)
    .map(([n, v]) => `${n} ${v}`).join(' · ') || 'nenhuma';

  return `
    <h2 style="margin-bottom:.35rem">${esc(rascunho.nome || 'Sem nome')}</h2>
    <p class="campo__dica" style="margin-bottom:1.25rem">Confira e crie a ficha. Depois dá para mudar tudo.</p>

    <section class="cartao revisao" style="margin-bottom:.8rem">
      <div class="cartao__corpo">
        <dl>
          <dt>Ancestralidade</dt><dd>${esc(rascunho.ancestralidade)}</dd>
          <dt>Cultura</dt><dd>${esc(rascunho.culturas.join(', ') || '—')}</dd>
          <dt>Trilha</dt><dd>${esc(rascunho.trilha.nome)}</dd>
          <dt>Conjunto</dt><dd>${esc(rascunho.conjunto || '—')}</dd>
        </dl>
      </div>
    </section>

    <div class="atributos" style="margin-bottom:.7rem">
      ${ATRIBUTOS.map((a) => `
        <div class="atributo" data-reino="${a.reino}">
          <span class="atributo__nome">${a.sigla}</span>
          <strong class="atributo__valor num">${rascunho.atributos[a.id] || 0}</strong>
        </div>`).join('')}
    </div>
    <div class="defesas" style="margin-bottom:.7rem">
      <div class="defesa" data-reino="fisico"><span class="defesa__nome">Def. Física</span>
        <strong class="defesa__valor num">${defesaFisica(f)}</strong></div>
      <div class="defesa" data-reino="cognitivo"><span class="defesa__nome">Def. Cognitiva</span>
        <strong class="defesa__valor num">${defesaCognitiva(f)}</strong></div>
      <div class="defesa" data-reino="espiritual"><span class="defesa__nome">Def. Espiritual</span>
        <strong class="defesa__valor num">${defesaEspiritual(f)}</strong></div>
    </div>
    <div class="derivados" style="margin-bottom:.8rem">
      <div class="derivado"><span class="derivado__nome">Vida</span><span class="derivado__valor">${vidaMaxima(f)}</span></div>
      <div class="derivado"><span class="derivado__nome">Foco</span><span class="derivado__valor">${focoMaximo(f)}</span></div>
      <div class="derivado"><span class="derivado__nome">Movimento</span><span class="derivado__valor">${movimento(f.atributos.vel)}</span></div>
      <div class="derivado"><span class="derivado__nome">Recuperação</span><span class="derivado__valor">${dadoRecuperacao(f.atributos.von)}</span></div>
    </div>

    <section class="cartao revisao">
      <div class="cartao__corpo">
        <dl>
          <dt>Perícias</dt><dd style="font-weight:500">${esc(pericias)}</dd>
          <dt>Talentos</dt><dd style="font-weight:500">${esc(rascunho.talentos.join(' · '))}</dd>
        </dl>
      </div>
    </section>`;
}

/* ------------------------------------------------------------- interação */
function ligar() {
  raiz.querySelector('[data-fechar]').addEventListener('click', fecharConstrutor);
  btVoltar.addEventListener('click', () => { if (passo > 0) { passo -= 1; desenhar(); } });
  btAvancar.addEventListener('click', () => {
    if (passo === PASSOS.length - 1) { finalizar(); return; }
    if (!PASSOS[passo].completo()) { recado('Termine este passo primeiro'); return; }
    passo += 1;
    desenhar();
  });

  ligarAcoes(raiz, {
    ancestralidade(alvo) { rascunho.ancestralidade = alvo.dataset.valor; desenhar(); },

    cultura(alvo) {
      const nome = alvo.dataset.valor;
      const i = rascunho.culturas.indexOf(nome);
      if (i >= 0) rascunho.culturas.splice(i, 1);
      else if (rascunho.culturas.length < CRIACAO.especialidadesCulturais) rascunho.culturas.push(nome);
      else { recado(`Só ${CRIACAO.especialidadesCulturais} especialidades culturais`); return; }
      desenhar();
    },

    'cultura-manual'() {
      const campo = raiz.querySelector('[data-nova-cultura]');
      const valor = campo.value.trim();
      if (!valor) return;
      if (rascunho.culturas.length >= CRIACAO.especialidadesCulturais) {
        recado(`Só ${CRIACAO.especialidadesCulturais} especialidades culturais`); return;
      }
      rascunho.culturas.push(valor);
      desenhar();
    },

    'tirar-cultura'(alvo) { rascunho.culturas.splice(Number(alvo.dataset.indice), 1); desenhar(); },

    trilha(alvo) {
      const nova = TRILHAS.find((t) => t.nome === alvo.dataset.valor);
      if (rascunho.trilha && rascunho.trilha.nome !== nova.nome) {
        rascunho.pericias = {};    // a graduação grátis e o talento-chave mudam
        rascunho.talentos = [];
      }
      rascunho.trilha = nova;
      rascunho.pericias[nova.periciaInicial] = Math.max(1, rascunho.pericias[nova.periciaInicial] || 0);
      desenhar();
    },

    atributo(alvo) {
      const chave = alvo.dataset.valor;
      const novo = (rascunho.atributos[chave] || 0) + Number(alvo.dataset.delta);
      if (novo < 0 || novo > CRIACAO.atributoMaximo) return;
      if (Number(alvo.dataset.delta) > 0 && pontosSobrando() <= 0) return;
      rascunho.atributos[chave] = novo;
      desenhar(); tremer();
    },

    graduacao(alvo) {
      const nome = alvo.dataset.valor;
      const piso = nome === rascunho.trilha.periciaInicial ? 1 : 0;
      const novo = (rascunho.pericias[nome] || 0) + Number(alvo.dataset.delta);
      if (novo < piso || novo > CRIACAO.graduacaoMaxima) return;
      if (Number(alvo.dataset.delta) > 0 && graduacoesSobrando() <= 0) return;
      rascunho.pericias[nome] = novo;
      desenhar(); tremer();
    },

    talento(alvo) {
      const cantor = rascunho.ancestralidade === 'Cantor';
      const fixos = cantor ? [rascunho.trilha.talentoChave, 'Mudar Forma'] : [rascunho.trilha.talentoChave];
      const atual = rascunho.talentos.find((t) => !fixos.includes(t)) || '';
      rascunho.talentos = fixos.concat(alvo.dataset.valor === atual ? [] : [alvo.dataset.valor]);
      desenhar();
    },

    'talento-manual'() {
      const campo = raiz.querySelector('[data-talento-manual]');
      const valor = campo.value.trim();
      if (!valor) { recado('Escreva o nome do talento'); return; }
      const cantor = rascunho.ancestralidade === 'Cantor';
      const fixos = cantor ? [rascunho.trilha.talentoChave, 'Mudar Forma'] : [rascunho.trilha.talentoChave];
      rascunho.talentos = fixos.concat([valor]);
      desenhar();
      recado('Talento anotado');
    },

    conjunto(alvo) { rascunho.conjunto = alvo.dataset.valor; desenhar(); },
  });

  ligarEntradas(raiz, {
    '*'(alvo, valor) {
      rascunho[alvo.dataset.campo] = valor;
      ST.rascunho = rascunho;
      salvar();
    },
  });
}

function finalizar() {
  if (!rascunho.nome.trim()) { recado('Dê um nome ao personagem'); passo = 0; desenhar(); return; }

  const f = fichaNova(rascunho.nome.trim());
  f.ancestralidade = rascunho.ancestralidade;
  f.cultura = rascunho.culturas.join(', ');
  f.trilhas = rascunho.trilha.nome;
  ATRIBUTOS.forEach((a) => { f.atributos[a.id] = rascunho.atributos[a.id] || 0; });
  PERICIAS.forEach((p) => { f.pericias[p.nome] = rascunho.pericias[p.nome] || 0; });
  f.talentos = [...rascunho.talentos];
  f.especialidades = [...rascunho.culturas];
  f.vida = vidaMaxima(f);
  f.foco = focoMaximo(f);
  f.proposito = rascunho.proposito;
  f.obstaculo = rascunho.obstaculo;
  f.objetivos = rascunho.objetivos;
  f.conexoes = rascunho.conexoes;

  const conjunto = PACOTE?.conjuntos?.find((c) => c.nome === rascunho.conjunto);
  f.equipamento = conjunto ? `Conjunto de ${conjunto.nome}\n${conjunto.descricao || ''}` : rascunho.conjunto;

  adicionarFicha(f);
  ST.rascunho = null;
  salvar();

  raiz.hidden = true;
  document.body.style.overflow = '';
  rascunho = null;
  aoTerminar();
  recado('Personagem criado!');
}
