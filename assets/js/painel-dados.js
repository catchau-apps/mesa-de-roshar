/* =========================================================================
   painel-dados.js — rolador
   ========================================================================= */

import { periciasDe, modificador } from './sistema.js';
import { ST, fichaAtual, salvar, registrarRolagem } from './estado.js';
import { rolarTeste, rolarTrama, rolarDano, rolarDadosAvulsos, sinal } from './dados.js';
import { esc, recado, tremer, ligarAcoes, ligarEntradas, redesenharPreservandoFoco } from './ui.js';

let raiz;
let ultimo = null;
let extra = null;   // dano mostrado logo abaixo do teste

const escolha = {
  rotulo: 'Teste', modificador: 0,
  vantagens: 0, desvantagens: 0, trama: false,
  quantidade: 1, arma: null,
};

export function iniciarDados(elemento) {
  raiz = elemento;
  ligar();
}

/** Chamado quando o jogador toca no modificador de uma perícia na ficha. */
export function rolarPericiaDireto(nome, mod) {
  escolha.rotulo = nome;
  escolha.modificador = mod;
  escolha.arma = null;
  executarTeste();
}

/** Ataque com arma: o teste sai e, se acertar, o dano vem em seguida. */
export function rolarArma(arma, mod, soDano) {
  if (soDano) {
    const d = rolarDano(arma, mod, false);
    if (!d) { recado('Dano inválido — use algo como 1d8'); return; }
    extra = { nome: arma.nome, ...d };
    ultimo = null;
    desenharDados();
    registrarRolagem(d.total, `Dano — ${arma.nome}`, d.conta);
    return;
  }
  escolha.rotulo = `Ataque — ${arma.nome}`;
  escolha.modificador = mod;
  escolha.arma = { arma, mod };
  executarTeste();
}

function executarTeste() {
  ultimo = rolarTeste(escolha);
  extra = null;
  registrarRolagem(ultimo.total, ultimo.rotulo, ultimo.conta);
  tremer(ultimo.d20 === 20 ? [10, 40, 10] : 14);

  if (escolha.arma) {
    const d = rolarDano(escolha.arma.arma, escolha.arma.mod, ultimo.d20 === 20);
    if (d) {
      extra = { nome: escolha.arma.arma.nome, ...d };
      registrarRolagem(d.total, `Dano — ${escolha.arma.arma.nome}`, d.conta);
    }
  }
  desenharDados();
  document.dispatchEvent(new CustomEvent('ir-para', { detail: 'dados' }));
}

export function desenharDados() {
  const f = fichaAtual();
  const lista = periciasDe(f);

  redesenharPreservandoFoco(raiz, `
    <div class="painel__cabeca">
      <div><h2>Rolar</h2><p>d20 + atributo + graduações, contra a CD.</p></div>
    </div>

    ${caixaResultado()}
    ${extra ? caixaDano() : ''}

    <div class="grade grade--2" style="margin-top:1rem;align-items:start">
      <section class="cartao">
        <div class="cartao__cabeca"><h3>Teste de perícia</h3></div>
        <div class="cartao__corpo pilha">
          <div class="grade grade--2">
            <label class="campo">
              <span class="campo__rotulo">Perícia</span>
              <select data-campo="pericia">
                <option value="">— livre —</option>
                ${lista.map((p) => `<option value="${esc(p.nome)}"${escolha.rotulo === p.nome ? ' selected' : ''}>${esc(p.nome)} (${sinal(modificador(f, p))})</option>`).join('')}
              </select>
            </label>
            <label class="campo">
              <span class="campo__rotulo">Modificador</span>
              <input type="number" data-campo="modificador" value="${escolha.modificador}">
            </label>
          </div>

          <div class="linha" style="justify-content:space-between">
            ${contador('Vantagem', 'vantagens', escolha.vantagens)}
            ${contador('Desvantagem', 'desvantagens', escolha.desvantagens)}
          </div>

          <label class="linha" style="cursor:pointer;gap:.6rem">
            <input type="checkbox" data-campo="trama" ${escolha.trama ? 'checked' : ''}
                   style="width:18px;height:18px;min-height:auto;accent-color:var(--ambar)">
            <span><strong style="color:var(--ambar)">Aumentar as apostas</strong>
              <span class="campo__dica" style="display:inline">— rola o dado de trama (p.8)</span></span>
          </label>

          <button class="btn btn--principal" data-acao="rolar" style="min-height:52px;font-size:1.05rem">
            Rolar d20
          </button>
        </div>
      </section>

      <div class="pilha">
        <section class="cartao">
          <div class="cartao__cabeca"><h3>Dados avulsos</h3></div>
          <div class="cartao__corpo">
            <div class="teclado-dados">
              ${[4, 6, 8, 10, 12, 20, 100].map((n) => `
                <button type="button" data-acao="avulso" data-lados="${n}">d${n}</button>`).join('')}
              <button type="button" data-acao="trama" style="color:var(--ambar)">trama</button>
            </div>
            <div class="linha" style="margin-top:.75rem">
              <span class="campo__rotulo" style="margin:0">Quantos</span>
              ${contadorSimples('quantidade', escolha.quantidade)}
            </div>
          </div>
        </section>

        <section class="cartao">
          <div class="cartao__cabeca">
            <h3>Histórico</h3>
            <button class="btn btn--pequeno btn--fantasma" data-acao="limpar" style="margin-left:auto">Limpar</button>
          </div>
          <div class="cartao__corpo">
            <div class="historico">
              ${ST.historico.length ? ST.historico.map((h) => `
                <div class="historico__item">
                  <span class="historico__total num">${h.total}</span>
                  <span class="historico__desc"><b>${esc(h.rotulo)}</b>${esc(h.conta)}</span>
                  <span class="historico__hora">${esc(h.hora)}</span>
                </div>`).join('')
              : '<p class="campo__dica" style="margin:0;text-align:center">Nada rolado ainda.</p>'}
            </div>
          </div>
        </section>
      </div>
    </div>`);
}

function caixaResultado() {
  if (!ultimo) {
    return `
      <div class="resultado">
        <span class="resultado__rotulo">pronto</span>
        <strong class="resultado__total">d20</strong>
        <span class="resultado__conta">escolha uma perícia e role</span>
      </div>`;
  }
  return `
    <div class="resultado" ${ultimo.critico ? `data-critico="${ultimo.critico}"` : ''}
         role="status" aria-live="polite">
      <span class="resultado__rotulo">${esc(ultimo.rotulo)}</span>
      <strong class="resultado__total num">${ultimo.total}</strong>
      <span class="resultado__conta">${esc(ultimo.conta)}</span>
      ${ultimo.selo ? `<div class="resultado__selo" data-tipo="${ultimo.selo}">
        ${ultimo.selo === 'O' ? '◆ Oportunidade' : '◆ Complicação'}</div>` : ''}
      ${ultimo.extra ? `<p class="resultado__conta" style="margin:.5rem 0 0;color:var(--ambar)">${esc(ultimo.extra)}</p>` : ''}
    </div>`;
}

function caixaDano() {
  return `
    <section class="cartao" style="margin-top:.75rem">
      <div class="cartao__cabeca">
        <h3>Dano — ${esc(extra.nome)}</h3>
        ${extra.critico ? '<span class="etiqueta etiqueta--ambar">crítico</span>' : ''}
      </div>
      <div class="cartao__corpo" style="text-align:center">
        <strong class="num" style="font-family:var(--f-titulo);font-size:2.2rem;color:var(--fisico);line-height:1.1">${extra.total}</strong>
        <div class="campo__dica">${esc(extra.conta)}</div>
      </div>
    </section>`;
}

const contador = (rotulo, chave, valor) => `
  <div class="linha">
    <span class="campo__rotulo" style="margin:0">${rotulo}</span>
    ${contadorSimples(chave, valor)}
  </div>`;

const contadorSimples = (chave, valor) => `
  <span class="contadores">
    <button class="btn btn--pequeno" type="button" data-acao="contador" data-chave="${chave}" data-delta="-1"
      aria-label="Diminuir">−</button>
    <span class="contadores__valor num">${valor}</span>
    <button class="btn btn--pequeno" type="button" data-acao="contador" data-chave="${chave}" data-delta="1"
      aria-label="Aumentar">+</button>
  </span>`;

function ligar() {
  ligarAcoes(raiz, {
    rolar: executarTeste,

    contador(alvo) {
      const chave = alvo.dataset.chave;
      const delta = Number(alvo.dataset.delta);
      const tetos = { vantagens: [0, 5], desvantagens: [0, 5], quantidade: [1, 20] };
      const [min, max] = tetos[chave];
      escolha[chave] = Math.max(min, Math.min(max, escolha[chave] + delta));
      desenharDados();
    },

    avulso(alvo) {
      const lados = Number(alvo.dataset.lados);
      const { rolagens, total } = rolarDadosAvulsos(escolha.quantidade, lados);
      ultimo = {
        rotulo: `${escolha.quantidade}d${lados}`, total, selo: null, extra: '',
        conta: rolagens.join(' + '), critico: null, d20: 0,
      };
      extra = null;
      registrarRolagem(total, ultimo.rotulo, ultimo.conta);
      desenharDados(); tremer();
    },

    trama() {
      const t = rolarTrama();
      ultimo = {
        rotulo: 'Dado de trama', total: t.bonus, selo: t.tipo, extra: '',
        conta: `d6 = ${t.valor} → ${t.texto}`, critico: null, d20: 0,
      };
      extra = null;
      registrarRolagem(t.bonus, 'Dado de trama', t.texto);
      desenharDados(); tremer();
    },

    limpar() {
      ST.historico = [];
      salvar();
      desenharDados();
    },
  });

  ligarEntradas(raiz, {
    pericia(_, valor) {
      const f = fichaAtual();
      const p = periciasDe(f).find((x) => x.nome === valor);
      escolha.rotulo = p ? p.nome : 'Teste';
      escolha.modificador = p ? modificador(f, p) : 0;
      escolha.arma = null;
      desenharDados();
    },
    modificador(_, valor) { escolha.modificador = Number(valor) || 0; },
    trama(_, valor) { escolha.trama = valor; },
  });
}
