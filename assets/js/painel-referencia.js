/* =========================================================================
   painel-referencia.js — a colinha da mesa
   ========================================================================= */

import {
  ACOES, REACOES, CONDICOES, DIFICULDADES, LESOES,
  OPORTUNIDADES, COMPLICACOES,
} from './sistema.js';
import { PACOTE } from './pacote.js';
import { esc, ligarAcoes } from './ui.js';

let raiz;

export function iniciarReferencia(elemento) {
  raiz = elemento;
  ligar();
}

const item = (nome, custo, texto) => `
  <div style="padding:.6rem 0;border-bottom:1px solid var(--borda)">
    <div class="linha" style="gap:.5rem">
      ${custo ? `<span class="etiqueta etiqueta--ambar" style="font-family:var(--f-num)">${esc(custo)}</span>` : ''}
      <strong style="font-size:.95rem">${esc(nome)}</strong>
      ${PACOTE ? `<button class="btn btn--pequeno btn--fantasma" data-acao="ver" data-termo="${esc(nome)}"
        style="margin-left:auto;color:var(--luz)">ver no livro</button>` : ''}
    </div>
    <p style="margin:.25rem 0 0;font-size:.88rem;color:var(--tinta-2)">${esc(texto)}</p>
  </div>`;

const tabela = (colunas, linhas) => `
  <table style="width:100%;border-collapse:collapse;font-size:.9rem">
    <thead><tr>${colunas.map((c, i) => `<th style="text-align:${i ? 'right' : 'left'};padding:.4rem .5rem;
      font-size:.68rem;text-transform:uppercase;letter-spacing:.08em;color:var(--tinta-3);
      border-bottom:1px solid var(--borda)">${esc(c)}</th>`).join('')}</tr></thead>
    <tbody>${linhas.map((l) => `<tr>${l.map((v, i) => `<td style="text-align:${i ? 'right' : 'left'};
      padding:.45rem .5rem;border-bottom:1px solid var(--borda)">${v}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>`;

export function desenharReferencia() {
  raiz.innerHTML = `
    <div class="painel__cabeca">
      <div><h2>Ajuda de mesa</h2><p>O essencial para não parar o jogo procurando no livro.</p></div>
    </div>

    <div class="grade grade--2" style="align-items:start">
      <div class="pilha">
        <section class="cartao">
          <div class="cartao__cabeca"><h3>Como funciona um teste</h3><span class="cartao__fonte">p. 56</span></div>
          <div class="cartao__corpo">
            <p style="margin:0 0 .75rem;font-size:.95rem;line-height:1.7">
              <strong style="color:var(--luz)">d20 + atributo + graduações</strong> contra a CD.<br>
              Ao acertar um ataque, some o modificador da perícia ao dano.<br>
              <strong>Vantagem:</strong> role dois de um dado escolhido e fique com o melhor;
              desvantagem, com o pior. <span class="campo__dica" style="display:inline">(p.58)</span>
            </p>
            ${tabela(['Dificuldade', 'CD'],
              DIFICULDADES.map(([n, v]) => [esc(n), `<strong class="num" style="color:var(--ambar)">${v}</strong>`]))}
          </div>
        </section>

        <section class="cartao">
          <div class="cartao__cabeca"><h3>Dado de trama</h3><span class="cartao__fonte">p. 8</span></div>
          <div class="cartao__corpo">
            ${tabela(['d6', 'Resultado'], [
              ['1', '<strong style="color:var(--granada)">Complicação</strong> · +2 no teste'],
              ['2', '<strong style="color:var(--granada)">Complicação</strong> · +4 no teste'],
              ['3–4', 'em branco'],
              ['5–6', '<strong style="color:var(--ambar)">Oportunidade</strong>'],
            ])}
            <h4 style="font-size:.7rem;text-transform:uppercase;letter-spacing:.09em;color:var(--ambar);margin:1rem 0 .3rem">
              Gastar uma Oportunidade</h4>
            ${OPORTUNIDADES.map(([n, d]) => item(n, '', d)).join('')}
            <h4 style="font-size:.7rem;text-transform:uppercase;letter-spacing:.09em;color:var(--granada);margin:1rem 0 .3rem">
              Enfrentar uma Complicação</h4>
            ${COMPLICACOES.map(([n, d]) => item(n, '', d)).join('')}
          </div>
        </section>

        <section class="cartao">
          <div class="cartao__cabeca"><h3>Lesões</h3><span class="cartao__fonte">d20 + deflexão − 5 por lesão</span></div>
          <div class="cartao__corpo">
            ${tabela(['Resultado', 'Consequência'], LESOES.map(([r, c]) => [`<strong>${esc(r)}</strong>`, esc(c)]))}
          </div>
        </section>
      </div>

      <div class="pilha">
        <section class="cartao">
          <div class="cartao__cabeca"><h3>Ações</h3><span class="cartao__fonte">p. 303–304</span></div>
          <div class="cartao__corpo">${ACOES.map(([n, c, d]) => item(n, c, d)).join('')}</div>
        </section>

        <section class="cartao">
          <div class="cartao__cabeca"><h3>Reações</h3><span class="cartao__fonte">p. 305</span></div>
          <div class="cartao__corpo">${REACOES.map(([n, d]) => item(n, '↻', d)).join('')}</div>
        </section>

        <section class="cartao">
          <div class="cartao__cabeca"><h3>Condições</h3><span class="cartao__fonte">p. 293–295</span></div>
          <div class="cartao__corpo">${CONDICOES.map(([n, d]) => item(n, '', d)).join('')}</div>
        </section>
      </div>
    </div>`;
}

function ligar() {
  ligarAcoes(raiz, {
    ver(alvo) {
      document.dispatchEvent(new CustomEvent('buscar-regra', { detail: alvo.dataset.termo }));
    },
  });
}
