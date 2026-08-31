/* =========================================================================
   catalogo.js — consultar o livro sem sair da ficha

   Duas janelas: o catálogo de talentos (buscar, filtrar, ler a descrição
   inteira e mandar direto para a ficha) e a descrição de uma perícia.
   Tudo sai do pacote de dados do próprio jogador.
   ========================================================================= */

import { pacoteAtual, normalizar } from './pacote.js';
import { conferirPreRequisitos } from './prerequisitos.js';
import { esc, recado } from './ui.js';

const SITUACAO = {
  atende:     { rotulo: 'você atende',        classe: 'etiqueta--luz' },
  falta:      { rotulo: 'falta pré-requisito', classe: 'etiqueta--granada' },
  indefinido: { rotulo: 'confira no livro',    classe: 'etiqueta--ambar' },
};

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
          ${t.ativacao ? ' · ativação ' + esc(t.ativacao) : ''}
        </p>
        ${clausulas.length ? `
          <p class="talento__pre">
            ${clausulas.map((c) => `<span data-ok="${c.resultado}">${
              c.resultado === true ? '✓' : c.resultado === false ? '✕' : '?'
            } ${esc(c.texto)}</span>`).join('')}
          </p>` : '<p class="talento__pre"><span data-ok="true">✓ sem pré-requisito</span></p>'}
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
