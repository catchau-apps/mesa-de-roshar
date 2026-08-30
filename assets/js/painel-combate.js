/* =========================================================================
   painel-combate.js — iniciativa e rodadas
   A ordem do sistema é por tipo de turno, não por um número rolado:
   PJs rápidos, PNJs rápidos, PJs lentos, PNJs lentos (p.302).
   ========================================================================= */

import { vidaMaxima } from './sistema.js';
import { ST, fichaAtual, salvar, id } from './estado.js';
import { esc, recado, tremer, ligarAcoes, confirmar } from './ui.js';

let raiz;

const FASES = [
  ['pj-rapido',  'PJs — turno rápido (2 ações)'],
  ['pnj-rapido', 'PNJs — turno rápido'],
  ['pj-lento',   'PJs — turno lento (3 ações)'],
  ['pnj-lento',  'PNJs — turno lento'],
];

const faseDe = (c) => `${c.pj ? 'pj' : 'pnj'}-${c.lento ? 'lento' : 'rapido'}`;

export function iniciarCombate(elemento) {
  raiz = elemento;
  ligar();
}

export function desenharCombate() {
  const c = ST.combate;

  raiz.innerHTML = `
    <div class="painel__cabeca">
      <div>
        <h2>Combate</h2>
        <p>Rodada <strong class="num" style="color:var(--ambar);font-size:1.1em">${c.rodada}</strong></p>
      </div>
      <div class="painel__acoes">
        <button class="btn btn--principal btn--pequeno" data-acao="nova-rodada">Nova rodada</button>
        <button class="btn btn--pequeno btn--perigo" data-acao="zerar">Zerar</button>
      </div>
    </div>

    <section class="cartao">
      <div class="cartao__cabeca"><h3>Entrar no combate</h3></div>
      <div class="cartao__corpo">
        <div class="linha">
          <input data-nome placeholder="Nome" style="flex:2;min-width:150px" aria-label="Nome do combatente">
          <input data-vida type="number" placeholder="Vida" style="flex:1;min-width:88px" aria-label="Vida">
          <button class="btn btn--pequeno btn--principal" data-acao="add" data-lado="pj">+ PJ</button>
          <button class="btn btn--pequeno btn--ambar" data-acao="add" data-lado="pnj">+ PNJ</button>
        </div>
        ${ST.fichas.length ? `
          <div class="linha" style="margin-top:.75rem">
            <span class="campo__rotulo" style="margin:0">Suas fichas</span>
            ${ST.fichas.map((f) => `<button type="button" class="etiqueta alternavel"
              data-acao="add-ficha" data-ficha="${f.id}">+ ${esc(f.nome)}</button>`).join('')}
          </div>` : ''}
      </div>
    </section>

    <div style="margin-top:1rem">
      ${c.ordem.length
        ? FASES.map(([fase, rotulo]) => {
            const lista = c.ordem.filter((x) => faseDe(x) === fase);
            if (!lista.length) return '';
            return `<h3 class="faixa-turno">${rotulo}</h3>${lista.map(linha).join('')}`;
          }).join('')
        : `<div class="vazio">
             <strong>Combate vazio</strong>
             <p>Acrescente os personagens acima. Cada um escolhe turno rápido ou lento a cada rodada.</p>
           </div>`}
    </div>`;
}

const linha = (c) => `
  <div class="combatente" data-lado="${c.pj ? 'pj' : 'pnj'}" data-feito="${c.feito}">
    <button type="button" class="combatente__icone" data-acao="feito" data-id="${c.id}"
      aria-pressed="${c.feito}" aria-label="Marcar turno de ${esc(c.nome)} como usado">${c.feito ? '✓' : '○'}</button>
    <span class="combatente__nome">${esc(c.nome)}
      <small>${c.lento ? '3 ações · lento' : '2 ações · rápido'}</small></span>
    <button type="button" class="btn btn--pequeno" data-acao="turno" data-id="${c.id}">
      ${c.lento ? 'lento' : 'rápido'}</button>
    <span class="combatente__vida">
      <input type="number" data-vida-de="${c.id}" value="${c.vida}" aria-label="Vida de ${esc(c.nome)}">
      <span class="num">/${c.vidaMaxima || '?'}</span>
    </span>
    <button type="button" class="combatente__icone" data-acao="reacao" data-id="${c.id}"
      aria-pressed="${c.reacao}" aria-label="Reação de ${esc(c.nome)}" title="Reação">↻</button>
    <button type="button" class="combatente__icone" data-acao="remover" data-id="${c.id}"
      aria-label="Tirar ${esc(c.nome)} do combate">×</button>
  </div>`;

function ligar() {
  const achar = (alvo) => ST.combate.ordem.find((x) => x.id === alvo.dataset.id);

  ligarAcoes(raiz, {
    'nova-rodada'() {
      ST.combate.rodada += 1;
      ST.combate.ordem.forEach((x) => { x.feito = false; x.reacao = false; });
      salvar(); desenharCombate();
      recado(`Rodada ${ST.combate.rodada}`);
    },

    async zerar() {
      const ok = await confirmar({
        titulo: 'Zerar o combate?',
        texto: 'Todos os combatentes saem da lista e a contagem volta para a rodada 1.',
        confirmar: 'Zerar', perigo: true,
      });
      if (!ok) return;
      ST.combate = { rodada: 1, ordem: [] };
      salvar(); desenharCombate();
    },

    add(alvo) {
      const campoNome = raiz.querySelector('[data-nome]');
      const campoVida = raiz.querySelector('[data-vida]');
      const nome = campoNome.value.trim();
      if (!nome) { recado('Digite um nome'); campoNome.focus(); return; }
      const vida = Number(campoVida.value) || 0;
      ST.combate.ordem.push({
        id: id(), nome, vida, vidaMaxima: vida,
        pj: alvo.dataset.lado === 'pj', lento: false, feito: false, reacao: false,
      });
      campoNome.value = ''; campoVida.value = '';
      salvar(); desenharCombate();
      campoNome.focus();
    },

    'add-ficha'(alvo) {
      const f = ST.fichas.find((x) => x.id === alvo.dataset.ficha);
      ST.combate.ordem.push({
        id: id(), nome: f.nome, vida: f.vida, vidaMaxima: vidaMaxima(f),
        pj: true, lento: false, feito: false, reacao: false, ficha: f.id,
      });
      salvar(); desenharCombate();
    },

    turno(alvo) { const c = achar(alvo); c.lento = !c.lento; salvar(); desenharCombate(); tremer(); },
    feito(alvo) { const c = achar(alvo); c.feito = !c.feito; salvar(); desenharCombate(); tremer(); },
    reacao(alvo) { const c = achar(alvo); c.reacao = !c.reacao; salvar(); desenharCombate(); tremer(); },

    remover(alvo) {
      ST.combate.ordem = ST.combate.ordem.filter((x) => x.id !== alvo.dataset.id);
      salvar(); desenharCombate();
    },
  });

  // A vida do combatente reflete de volta na ficha, quando veio de uma.
  raiz.addEventListener('input', (ev) => {
    const campo = ev.target.closest('[data-vida-de]');
    if (!campo) return;
    const c = ST.combate.ordem.find((x) => x.id === campo.dataset.vidaDe);
    c.vida = Number(campo.value) || 0;
    if (c.ficha) {
      const f = ST.fichas.find((x) => x.id === c.ficha);
      if (f) f.vida = c.vida;
    }
    salvar();
  });

  raiz.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Enter' || !ev.target.closest('[data-nome],[data-vida]')) return;
    ev.preventDefault();
    raiz.querySelector('[data-acao="add"][data-lado="pj"]')?.click();
  });
}
