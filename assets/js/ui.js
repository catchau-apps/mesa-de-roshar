/* =========================================================================
   ui.js — utilidades de interface compartilhadas
   ========================================================================= */

export const $  = (sel, raiz = document) => raiz.querySelector(sel);
export const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

/** Recado curto no rodapé. Também é anunciado por leitores de tela. */
let recadoTempo;
export function recado(texto) {
  const caixa = $('#recado');
  if (!caixa) return;
  caixa.textContent = texto;
  caixa.dataset.visivel = 'true';
  clearTimeout(recadoTempo);
  recadoTempo = setTimeout(() => { caixa.dataset.visivel = 'false'; }, 2600);
}

/** Vibração curtinha na confirmação de um toque, quando o aparelho permite. */
export function tremer(padrao = 8) {
  try { navigator.vibrate?.(padrao); } catch (e) {}
}

/** Confirmação em diálogo próprio, para não usar o confirm() feio do navegador. */
export function confirmar({ titulo, texto, confirmar: rotulo = 'Confirmar', perigo = false }) {
  return new Promise((resolver) => {
    const dlg = document.createElement('dialog');
    dlg.innerHTML = `
      <div class="dialogo__cabeca"><h2>${esc(titulo)}</h2></div>
      <div class="dialogo__corpo"><p>${esc(texto)}</p></div>
      <div class="dialogo__pe">
        <button class="btn" type="button" data-resposta="nao">Cancelar</button>
        <button class="btn ${perigo ? 'btn--perigo' : 'btn--principal'}" type="button" data-resposta="sim">${esc(rotulo)}</button>
      </div>`;
    document.body.append(dlg);

    // A resposta é entregue no próprio clique, e não no evento 'close' do
    // <dialog>: há navegador em que esse evento não chega, e aí a promessa
    // ficaria pendurada para sempre com a tela travada por cima.
    let respondido = false;
    const responder = (resposta) => {
      if (respondido) return;
      respondido = true;
      try { dlg.close(resposta); } catch (e) {}
      dlg.remove();
      resolver(resposta === 'sim');
    };

    dlg.addEventListener('click', (ev) => {
      const botao = ev.target.closest('[data-resposta]');
      if (botao) responder(botao.dataset.resposta);
    });
    dlg.addEventListener('cancel', (ev) => { ev.preventDefault(); responder('nao'); });  // Esc
    dlg.addEventListener('close', () => responder(dlg.returnValue));

    dlg.showModal();
    dlg.querySelector('[data-resposta="sim"]').focus();
  });
}

/** Um passo de +/− com rótulo acessível. */
export function passo(acao, dados, simbolo, rotulo, desabilitado = false) {
  const attrs = Object.entries(dados).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ');
  return `<button type="button" data-acao="${acao}" ${attrs}
    aria-label="${esc(rotulo)}" ${desabilitado ? 'disabled' : ''}>${simbolo}</button>`;
}

/** Pontinhos de graduação, como os círculos da ficha de papel. */
export function pontos(valor, total = 5) {
  return Array.from({ length: total },
    (_, i) => `<i class="${i < valor ? 'cheio' : ''}"></i>`).join('');
}

/**
 * Liga um container a um mapa de ações. Um listener só, em vez de centenas —
 * é o que mantém a tela respondendo mesmo com a ficha inteira redesenhada.
 */
export function ligarAcoes(container, mapa) {
  container.addEventListener('click', (ev) => {
    const alvo = ev.target.closest('[data-acao]');
    if (!alvo || !container.contains(alvo)) return;
    const fn = mapa[alvo.dataset.acao];
    if (fn) { ev.preventDefault(); fn(alvo, ev); }
  });
}

/** Igual, mas para digitação em campos. */
export function ligarEntradas(container, mapa) {
  const tratar = (ev) => {
    const alvo = ev.target.closest('[data-campo]');
    if (!alvo || !container.contains(alvo)) return;
    const fn = mapa[alvo.dataset.campo] || mapa['*'];
    if (fn) fn(alvo, alvo.type === 'checkbox' ? alvo.checked : alvo.value);
  };
  container.addEventListener('input', tratar);
  container.addEventListener('change', tratar);
}

/** Preserva foco e cursor ao redesenhar — sem isso, digitar num campo perde a posição. */
export function redesenharPreservandoFoco(container, html) {
  const ativo = document.activeElement;
  const marca = ativo && container.contains(ativo)
    ? { campo: ativo.dataset?.campo, inicio: ativo.selectionStart, fim: ativo.selectionEnd }
    : null;

  container.innerHTML = html;

  if (marca?.campo) {
    const novo = container.querySelector(`[data-campo="${CSS.escape(marca.campo)}"]`);
    if (novo) {
      novo.focus();
      try { novo.setSelectionRange(marca.inicio, marca.fim); } catch (e) {}
    }
  }
}

export const icone = {
  ficha: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M5 4h10l4 4v12H5z" stroke-linejoin="round"/><path d="M9 10h6M9 14h6M9 18h4" stroke-linecap="round"/></svg>',
  dados: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" stroke-linejoin="round"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" stroke-linecap="round"/></svg>',
  regras: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v18H6.5A2.5 2.5 0 0 0 4 23z" stroke-linejoin="round"/><path d="M9 8h7M9 12h7" stroke-linecap="round"/></svg>',
  combate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M14.5 3.5l6 6-9 9-6-6z" stroke-linejoin="round"/><path d="M4 20l3-3M17 3l4 4" stroke-linecap="round"/></svg>',
  ajuda: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 16.5v-4.2M12 8.2h.01" stroke-linecap="round"/></svg>',
  lupa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4.2-4.2" stroke-linecap="round"/></svg>',
};
