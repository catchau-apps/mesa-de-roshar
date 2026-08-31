/* =========================================================================
   catalogo.js — consultar o livro sem sair da ficha

   Duas janelas: o catálogo de talentos (buscar, filtrar, ler a descrição
   inteira e mandar direto para a ficha) e a descrição de uma perícia.
   Tudo sai do pacote de dados do próprio jogador.
   ========================================================================= */

import { pacoteAtual, normalizar, buscar } from './pacote.js';
import { condicaoPorNome, ACOES_RADIANTE } from './sistema.js';
import { conferirPreRequisitos } from './prerequisitos.js';
import { esc, recado } from './ui.js';

const SITUACAO = {
  atende:     { rotulo: 'você atende',         classe: 'etiqueta--luz' },
  falta:      { rotulo: 'falta pré-requisito', classe: 'etiqueta--granada' },
  indefinido: { rotulo: 'confira com o MJ',    classe: 'etiqueta--ambar' },
};

const MARCA_CLAUSULA = {
  true:  { sinal: '✓', titulo: 'você atende esta condição' },
  false: { sinal: '✕', titulo: 'esta condição ainda não é atendida' },
  null:  { sinal: '?', titulo: 'depende do que aconteceu na mesa — o app não tem como saber' },
};

/** As cláusulas de pré-requisito, com o sinal e a explicação de cada uma. */
export function chipsDeClausulas(clausulas) {
  if (!clausulas.length) {
    return `<span data-ok="true" title="este talento não exige nada">✓ sem pré-requisito</span>`;
  }
  return clausulas.map((c) => {
    const marca = MARCA_CLAUSULA[String(c.resultado)];
    return `<span data-ok="${c.resultado}" title="${esc(marca.titulo)}">${marca.sinal} ${esc(c.texto)}</span>`;
  }).join('');
}

/** Todos os talentos com este nome — o mesmo nome existe em ordens diferentes. */
function acharTalentos(nome) {
  const alvo = normalizar(nome);
  return todosOsTalentos().filter((t) => normalizar(t.nome) === alvo);
}

/** A ficha do livro sobre um talento que já está na ficha do personagem. */
export function abrirDescricaoDoTalento(nome, ficha) {
  const achados = acharTalentos(nome);

  const dlg = document.createElement('dialog');
  dlg.innerHTML = `
    <div class="dialogo__cabeca">
      <h2>${esc(nome)}</h2>
      <button class="btn btn--fantasma" type="button" data-fechar
        aria-label="Fechar" style="margin-left:auto;width:38px;padding:0">✕</button>
    </div>
    <div class="dialogo__corpo" style="max-height:70vh;overflow:auto">
      ${achados.length ? achados.map((t) => {
        const { situacao, clausulas } = conferirPreRequisitos(t, ficha);
        return `
          <article class="talento" data-situacao="${situacao}" style="margin-bottom:.6rem">
            <p class="talento__origem" style="margin-top:0">
              ${esc(t.grupo || t.tipo)}${t.especializacao ? ' · ' + esc(t.especializacao) : ''}
              ${t.pagina ? ' · p.' + t.pagina : ''}
              ${t.ativacao ? ' · <strong>' + esc(t.ativacao) + '</strong>' : ''}
            </p>
            <p class="talento__pre">${chipsDeClausulas(clausulas)}</p>
            <p class="talento__texto">${esc(t.descricao)}</p>
          </article>`;
      }).join('')
      : `<p class="campo__dica">${pacoteAtual()
          ? 'Esse talento não está no pacote — deve ser anotação sua. O texto fica por sua conta.'
          : 'Instale o pacote de dados na aba Regras para ler a descrição do livro aqui.'}</p>`}
    </div>`;
  document.body.append(dlg);
  const fechar = () => { dlg.close(); dlg.remove(); };
  dlg.addEventListener('click', (ev) => { if (ev.target.closest('[data-fechar]')) fechar(); });
  dlg.addEventListener('cancel', (ev) => { ev.preventDefault(); fechar(); });
  dlg.showModal();
}

/** Todos os talentos do pacote, com o grupo já normalizado. */
function todosOsTalentos() {
  const p = pacoteAtual();
  if (!p?.talentos) return [];
  return [
    ...(p.talentos.heroicos || []).map((t) => ({ ...t, tipo: 'Trilha heroica' })),
    ...(p.talentos.radiantes || []).map((t) => ({ ...t, tipo: 'Ordem Radiante' })),
    ...(p.talentos.cantor || []).map((t) => ({ ...t, tipo: 'Ancestralidade' })),
  ];
}

export const temCatalogo = () => todosOsTalentos().length > 0;

/** Uma janela simples de texto, usada por condições e ações. */
function janela(titulo, corpo) {
  const dlg = document.createElement('dialog');
  dlg.innerHTML = `
    <div class="dialogo__cabeca">
      <h2>${esc(titulo)}</h2>
      <button class="btn btn--fantasma" type="button" data-fechar
        aria-label="Fechar" style="margin-left:auto;width:38px;padding:0">✕</button>
    </div>
    <div class="dialogo__corpo" style="max-height:70vh;overflow:auto">${corpo}</div>`;
  document.body.append(dlg);
  const fechar = () => { dlg.close(); dlg.remove(); };
  dlg.addEventListener('click', (ev) => { if (ev.target.closest('[data-fechar]')) fechar(); });
  dlg.addEventListener('cancel', (ev) => { ev.preventDefault(); fechar(); });
  dlg.showModal();
}

/** O que uma condição faz: o resumo da mecânica e, se houver pacote, o livro. */
export function abrirDescricaoDaCondicao(nome) {
  const definicao = condicaoPorNome(nome);
  const doLivro = pacoteAtual() ? buscar(nome, { livro: 'Regras', limite: 1 })[0] : null;
  janela(nome, `
    <p class="talento__texto"><strong>${esc(definicao?.texto || '')}</strong></p>
    ${doLivro
      ? `<p class="campo__dica" style="margin:.75rem 0 .25rem">Guia de Regras, página ${doLivro.pagina}</p>
         <p class="talento__texto">${esc(doLivro.trecho.slice(0, 900))}</p>`
      : `<p class="campo__dica" style="margin-top:.75rem">Instale o pacote de dados na aba Regras
           para ler o texto do livro aqui.</p>`}`);
}

/** O texto de uma ação de Radiante. */
export function abrirDescricaoDaAcao(nome) {
  const acao = ACOES_RADIANTE.find((a) => a.nome === nome);
  if (!acao) return;
  janela(acao.nome, `
    <p class="talento__origem" style="margin-top:0">
      <strong>${esc(acao.custo)}</strong> · Guia de Regras, página ${acao.pagina}
    </p>
    <p class="talento__texto">${esc(acao.texto)}</p>`);
}

/** O que o livro diz de um talento, para a ficha mostrar em uma linha. */
export function fichaDoTalento(nome) {
  const alvo = normalizar(nome);
  return todosOsTalentos().find((t) => normalizar(t.nome) === alvo) || null;
}

/**
 * Abre o catálogo. `aoEscolher(nome)` recebe o talento escolhido.
 */
export function abrirCatalogoDeTalentos(ficha, aoEscolher) {
  const talentos = todosOsTalentos();
  if (!talentos.length) {
    recado('Instale o pacote de dados na aba Regras para ver os talentos do livro');
    return;
  }

  const grupos = [...new Set(talentos.map((t) => t.grupo).filter(Boolean))].sort();
  const estado = { busca: '', grupo: '', soDisponiveis: false };

  const dlg = document.createElement('dialog');
  dlg.className = 'catalogo';
  document.body.append(dlg);

  const filtrar = () => {
    const alvo = normalizar(estado.busca).trim();
    return talentos.filter((t) => {
      if (estado.grupo && t.grupo !== estado.grupo) return false;
      if (alvo && !normalizar(`${t.nome} ${t.descricao} ${t.preRequisitos}`).includes(alvo)) return false;
      if (estado.soDisponiveis && conferirPreRequisitos(t, ficha).situacao !== 'atende') return false;
      return true;
    });
  };

  const cartao = (t) => {
    const { situacao, clausulas } = conferirPreRequisitos(t, ficha);
    const jaTem = ficha.talentos.some((x) => normalizar(x) === normalizar(t.nome));
    const marca = SITUACAO[situacao];
    return `
      <article class="talento" data-situacao="${situacao}">
        <div class="talento__topo">
          <h3>${esc(t.nome)}</h3>
          <span class="etiqueta ${marca.classe}">${marca.rotulo}</span>
        </div>
        <p class="talento__origem">
          ${esc(t.grupo || t.tipo)}${t.especializacao ? ' · ' + esc(t.especializacao) : ''}
          ${t.pagina ? ' · p.' + t.pagina : ''}
          ${t.ativacao ? ' · <strong>' + esc(t.ativacao) + '</strong>' : ''}
        </p>
        <p class="talento__pre">${chipsDeClausulas(clausulas)}</p>
        <p class="talento__texto">${esc(t.descricao)}</p>
        <div class="talento__acoes">
          ${jaTem
            ? '<span class="campo__dica" style="margin:0">já está na ficha</span>'
            : `<button class="btn btn--pequeno btn--principal" data-por="${esc(t.nome)}">
                 Adicionar à ficha</button>`}
        </div>
      </article>`;
  };

  const pintar = () => {
    const lista = filtrar();
    dlg.innerHTML = `
      <div class="catalogo__topo">
        <div class="dialogo__cabeca" style="padding:0 0 .6rem">
          <h2>Talentos do livro</h2>
          <button class="btn btn--fantasma" type="button" data-fechar
            aria-label="Fechar" style="margin-left:auto;width:38px;padding:0">✕</button>
        </div>
        <div class="busca">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true">
            <circle cx="11" cy="11" r="7"/><path d="M20 20l-4.2-4.2" stroke-linecap="round"/></svg>
          <input type="search" data-busca value="${esc(estado.busca)}" autocomplete="off"
                 placeholder="Buscar por nome, efeito ou pré-requisito" aria-label="Buscar talento">
        </div>
        <div class="linha" style="margin-top:.6rem">
          <button type="button" class="etiqueta alternavel" data-grupo=""
            aria-pressed="${estado.grupo === ''}">Todos</button>
          ${grupos.map((g) => `<button type="button" class="etiqueta alternavel" data-grupo="${esc(g)}"
            aria-pressed="${estado.grupo === g}">${esc(g)}</button>`).join('')}
        </div>
        <label class="linha" style="margin-top:.6rem;cursor:pointer;gap:.5rem;font-size:.88rem">
          <input type="checkbox" data-so-disponiveis ${estado.soDisponiveis ? 'checked' : ''}
                 style="width:17px;height:17px;min-height:auto;accent-color:var(--luz)">
          Só os que eu já posso pegar
        </label>
        <p class="campo__dica" style="margin:.5rem 0 0">${lista.length} talento(s)</p>
      </div>
      <div class="catalogo__lista">
        ${lista.length
          ? lista.slice(0, 120).map(cartao).join('')
          : '<div class="vazio"><strong>Nada encontrado</strong><p>Tente outro termo ou tire os filtros.</p></div>'}
      </div>`;
  };

  const fechar = () => { dlg.close(); dlg.remove(); };

  dlg.addEventListener('click', (ev) => {
    if (ev.target.closest('[data-fechar]')) { fechar(); return; }

    const grupo = ev.target.closest('[data-grupo]');
    if (grupo) { estado.grupo = grupo.dataset.grupo; pintar(); return; }

    const por = ev.target.closest('[data-por]');
    if (por) {
      aoEscolher(por.dataset.por);
      recado(`${por.dataset.por} foi para a ficha`);
      pintar();
    }
  });

  let esperando;
  dlg.addEventListener('input', (ev) => {
    if (ev.target.matches('[data-busca]')) {
      estado.busca = ev.target.value;
      clearTimeout(esperando);
      esperando = setTimeout(() => {
        const posicao = ev.target.selectionStart;
        pintar();
        const novo = dlg.querySelector('[data-busca]');
        novo.focus();
        try { novo.setSelectionRange(posicao, posicao); } catch (e) {}
      }, 180);
    }
    if (ev.target.matches('[data-so-disponiveis]')) {
      estado.soDisponiveis = ev.target.checked;
      pintar();
    }
  });
  dlg.addEventListener('cancel', (ev) => { ev.preventDefault(); fechar(); });

  pintar();
  dlg.showModal();
  dlg.querySelector('[data-busca]')?.focus();
}

/** Mostra o que o livro diz sobre uma perícia. */
export function abrirDescricaoDaPericia(nome) {
  const p = pacoteAtual();
  const achada = p?.pericias?.find((x) => normalizar(x.nome) === normalizar(nome));

  const dlg = document.createElement('dialog');
  dlg.innerHTML = `
    <div class="dialogo__cabeca">
      <h2>${esc(nome)}</h2>
      <button class="btn btn--fantasma" type="button" data-fechar
        aria-label="Fechar" style="margin-left:auto;width:38px;padding:0">✕</button>
    </div>
    <div class="dialogo__corpo">
      ${achada?.descricao
        ? `<p class="talento__texto" style="max-height:60vh;overflow:auto">${esc(achada.descricao)}</p>`
        : `<p class="campo__dica">${p
            ? 'O pacote não trouxe a descrição desta perícia.'
            : 'Instale o pacote de dados na aba Regras para ler a descrição do livro aqui.'}</p>`}
    </div>`;
  document.body.append(dlg);
  const fechar = () => { dlg.close(); dlg.remove(); };
  dlg.addEventListener('click', (ev) => { if (ev.target.closest('[data-fechar]')) fechar(); });
  dlg.addEventListener('cancel', (ev) => { ev.preventDefault(); fechar(); });
  dlg.showModal();
}
