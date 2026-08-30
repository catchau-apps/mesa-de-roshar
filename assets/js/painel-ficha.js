/* =========================================================================
   painel-ficha.js — a ficha de personagem
   ========================================================================= */

import {
  ATRIBUTOS, PERICIAS, FLUXOS, REINOS, CONDICOES,
  vidaMaxima, focoMaximo, defesaFisica, defesaCognitiva, defesaEspiritual,
  modificador, periciasDe, movimento, dadoRecuperacao, sentidos,
  patamar, gradMaxima,
} from './sistema.js';
import { ST, fichaAtual, salvar, descansoLongo } from './estado.js';
import { rolarExpressao, sinal } from './dados.js';
import { esc, pontos, passo, recado, tremer, ligarAcoes, ligarEntradas, redesenharPreservandoFoco } from './ui.js';

let raiz;
let aoRolarPericia = () => {};
let aoAtacar = () => {};

export function iniciarFicha(elemento, { rolarPericia, atacar }) {
  raiz = elemento;
  aoRolarPericia = rolarPericia;
  aoAtacar = atacar;
  ligar();
}

/* ---------------------------------------------------------------- desenho */
export function desenharFicha() {
  const f = fichaAtual();
  if (!f) return;
  redesenharPreservandoFoco(raiz, `
    <div class="painel__cabeca">
      <div>
        <h2>${esc(f.nome) || 'Sem nome'}</h2>
        <p>${esc([f.ancestralidade, f.cultura, f.trilhas].filter(Boolean).join(' · ')) || 'Complete a identidade abaixo'}</p>
      </div>
      <div class="painel__acoes">
        <button class="btn btn--pequeno" data-acao="recuperar">Recuperar (${dadoRecuperacao(f.atributos.von || 0)})</button>
        <button class="btn btn--pequeno" data-acao="descanso">Descanso longo</button>
      </div>
    </div>

    <div class="grade grade--ficha">
      <div class="pilha">
        ${cartaoVitais(f)}
        ${cartaoAtributos(f)}
        ${cartaoCondicoes(f)}
      </div>
      <div class="pilha">
        ${cartaoPericias(f)}
        ${cartaoArmas(f)}
        ${cartaoListas(f)}
        ${cartaoIdentidade(f)}
        ${cartaoHistoria(f)}
      </div>
    </div>`);
}

function cartaoVitais(f) {
  const vital = (classe, chave, nome, atual, maximo) => {
    const pct = maximo > 0 ? Math.max(0, Math.min(100, (atual / maximo) * 100)) : 0;
    return `
      <div class="vital vital--${classe}">
        <span class="vital__nome">${nome}</span>
        <strong class="vital__valor num">${atual}</strong>
        <span class="vital__max num">de ${maximo}</span>
        <div class="medidor"><i style="width:${pct}%"></i></div>
        <div class="vital__botoes">
          ${passo('vital', { vital: chave, delta: -1 }, '−', `Diminuir ${nome}`)}
          ${passo('vital', { vital: chave, delta: 1 }, '+', `Aumentar ${nome}`)}
        </div>
      </div>`;
  };

  return `
    <section class="cartao">
      <div class="cartao__cabeca"><h3>Recursos</h3><span class="cartao__fonte">p. 23</span></div>
      <div class="cartao__corpo">
        <div class="vitais">
          ${vital('vida', 'vida', 'Vida', f.vida, vidaMaxima(f))}
          ${vital('foco', 'foco', 'Foco', f.foco, focoMaximo(f))}
          ${f.radiante
            ? vital('investidura', 'investidura', 'Investidura', f.investidura, f.investiduraMaxima || 0)
            : '<div class="vital vital--desligado">Investidura<br>só para Radiantes</div>'}
        </div>
        <div class="grade grade--3" style="margin-top:1rem">
          <label class="campo">
            <span class="campo__rotulo">Ajuste de vida</span>
            <input type="number" data-campo="ajusteVida" value="${f.ajusteVida || 0}">
          </label>
          <label class="campo">
            <span class="campo__rotulo">Ajuste de foco</span>
            <input type="number" data-campo="ajusteFoco" value="${f.ajusteFoco || 0}">
          </label>
          <label class="campo">
            <span class="campo__rotulo">${f.radiante ? 'Investidura máx.' : 'Deflexão'}</span>
            <input type="number" data-campo="${f.radiante ? 'investiduraMaxima' : 'deflexao'}"
                   value="${f.radiante ? (f.investiduraMaxima || 0) : (f.deflexao || 0)}">
          </label>
        </div>
        <p class="campo__dica">
          Vida = 10 + FOR + ajuste · Foco = 2 + VON + ajuste.
          Os ganhos de nível entram no ajuste: +5 nos níveis 2 a 5, +4+FOR no 6, +4 do 7 ao 10.
        </p>
      </div>
    </section>`;
}

function cartaoAtributos(f) {
  return `
    <section class="cartao">
      <div class="cartao__cabeca"><h3>Atributos</h3><span class="cartao__fonte">p. 47–51</span></div>
      <div class="cartao__corpo">
        <div class="atributos">
          ${ATRIBUTOS.map((a) => `
            <div class="atributo" data-reino="${a.reino}">
              <span class="atributo__nome">${a.sigla}</span>
              <strong class="atributo__valor num">${f.atributos[a.id] || 0}</strong>
              <div class="atributo__botoes">
                ${passo('atributo', { atributo: a.id, delta: -1 }, '−', `Diminuir ${a.nome}`, (f.atributos[a.id] || 0) <= 0)}
                ${passo('atributo', { atributo: a.id, delta: 1 }, '+', `Aumentar ${a.nome}`, (f.atributos[a.id] || 0) >= 10)}
              </div>
            </div>`).join('')}
        </div>

        <div class="defesas" style="margin-top:1rem">
          <div class="defesa" data-reino="fisico">
            <span class="defesa__nome">Def. Física</span><strong class="defesa__valor num">${defesaFisica(f)}</strong>
          </div>
          <div class="defesa" data-reino="cognitivo">
            <span class="defesa__nome">Def. Cognitiva</span><strong class="defesa__valor num">${defesaCognitiva(f)}</strong>
          </div>
          <div class="defesa" data-reino="espiritual">
            <span class="defesa__nome">Def. Espiritual</span><strong class="defesa__valor num">${defesaEspiritual(f)}</strong>
          </div>
        </div>

        <div class="derivados" style="margin-top:.7rem">
          <div class="derivado"><span class="derivado__nome">Movimento</span><span class="derivado__valor">${movimento(f.atributos.vel || 0)}</span></div>
          <div class="derivado"><span class="derivado__nome">Recuperação</span><span class="derivado__valor">${dadoRecuperacao(f.atributos.von || 0)}</span></div>
          <div class="derivado"><span class="derivado__nome">Sentidos</span><span class="derivado__valor">${sentidos(f.atributos.con || 0)}</span></div>
          <div class="derivado"><span class="derivado__nome">Deflexão</span><span class="derivado__valor">${f.deflexao || 0}</span></div>
        </div>
      </div>
    </section>`;
}

function cartaoCondicoes(f) {
  return `
    <section class="cartao">
      <div class="cartao__cabeca"><h3>Condições</h3><span class="cartao__fonte">p. 293–295</span></div>
      <div class="cartao__corpo">
        <div class="linha">
          ${CONDICOES.map(([nome, efeito]) => {
            const ativa = f.condicoes.includes(nome);
            return `<button type="button" class="etiqueta alternavel ${ativa ? 'etiqueta--granada' : ''}"
              data-acao="condicao" data-condicao="${esc(nome)}"
              aria-pressed="${ativa}" title="${esc(efeito)}">${esc(nome)}</button>`;
          }).join('')}
        </div>
      </div>
    </section>`;
}

function cartaoPericias(f) {
  const grupo = (reino, lista) => `
    <div class="grupo-pericias" data-reino="${reino}">
      <h4 class="grupo-pericias__titulo">${REINOS[reino].nome}</h4>
      ${lista.map((p) => {
        const grad = reino === 'fluxo' ? (f.fluxos[p.nome] || 0) : (f.pericias[p.nome] || 0);
        const sigla = ATRIBUTOS.find((a) => a.id === p.atributo).sigla;
        return `
          <div class="pericia">
            <span class="pericia__nome">${esc(p.nome)} <small>${sigla}</small></span>
            <span class="pericia__pontos" aria-hidden="true">${pontos(grad)}</span>
            <span class="pericia__passos">
              ${passo('graduacao', { pericia: p.nome, tipo: reino === 'fluxo' ? 'fluxos' : 'pericias', delta: -1 }, '−', `Diminuir ${p.nome}`, grad <= 0)}
              ${passo('graduacao', { pericia: p.nome, tipo: reino === 'fluxo' ? 'fluxos' : 'pericias', delta: 1 }, '+', `Aumentar ${p.nome}`, grad >= 5)}
            </span>
            <button type="button" class="pericia__mod num" data-acao="rolar-pericia" data-pericia="${esc(p.nome)}"
              aria-label="Rolar ${esc(p.nome)}">${sinal(modificador(f, p))}</button>
          </div>`;
      }).join('')}
    </div>`;

  return `
    <section class="cartao">
      <div class="cartao__cabeca">
        <h3>Perícias</h3>
        <span class="cartao__fonte">graduação máx. ${gradMaxima(f)} no patamar ${patamar(f)}</span>
      </div>
      <div class="cartao__corpo">
        ${grupo('fisico', PERICIAS.filter((p) => p.reino === 'fisico'))}
        ${grupo('cognitivo', PERICIAS.filter((p) => p.reino === 'cognitivo'))}
        ${grupo('espiritual', PERICIAS.filter((p) => p.reino === 'espiritual'))}
        ${f.radiante ? grupo('fluxo', FLUXOS) : ''}
      </div>
    </section>`;
}

function cartaoArmas(f) {
  const opcoes = periciasDe(f);
  return `
    <section class="cartao">
      <div class="cartao__cabeca"><h3>Armas</h3><span class="cartao__fonte">dano + modificador da perícia</span></div>
      <div class="cartao__corpo">
        ${f.armas.length ? f.armas.map((a, i) => `
          <div class="cartao" style="margin-bottom:.6rem">
            <div class="cartao__corpo">
              <div class="grade grade--2">
                <label class="campo" style="grid-column:1/-1">
                  <span class="campo__rotulo">Nome</span>
                  <input data-campo="arma:${i}:nome" value="${esc(a.nome)}">
                </label>
                <label class="campo">
                  <span class="campo__rotulo">Perícia</span>
                  <select data-campo="arma:${i}:pericia">
                    ${opcoes.map((p) => `<option ${p.nome === a.pericia ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')}
                  </select>
                </label>
                <label class="campo">
                  <span class="campo__rotulo">Dano</span>
                  <input data-campo="arma:${i}:dano" value="${esc(a.dano)}" placeholder="1d8">
                </label>
                <label class="campo">
                  <span class="campo__rotulo">Tipo</span>
                  <input data-campo="arma:${i}:tipo" value="${esc(a.tipo)}" placeholder="cortante">
                </label>
                <label class="campo">
                  <span class="campo__rotulo">Alcance</span>
                  <input data-campo="arma:${i}:alcance" value="${esc(a.alcance)}" placeholder="corpo a corpo">
                </label>
              </div>
              <div class="linha" style="margin-top:.75rem">
                <button class="btn btn--pequeno btn--principal" data-acao="atacar" data-arma="${i}">Atacar</button>
                <button class="btn btn--pequeno" data-acao="dano" data-arma="${i}">Só o dano</button>
                <button class="btn btn--pequeno btn--perigo" data-acao="remover-arma" data-arma="${i}"
                  style="margin-left:auto">Excluir</button>
              </div>
            </div>
          </div>`).join('')
        : '<p class="campo__dica" style="margin:0 0 .75rem">Nenhuma arma cadastrada ainda.</p>'}
        <button class="btn btn--pequeno" data-acao="nova-arma">+ Adicionar arma</button>
      </div>
    </section>`;
}

function listaEditavel(titulo, campo, itens, marcador) {
  return `
    <section class="cartao">
      <div class="cartao__cabeca"><h3>${titulo}</h3></div>
      <div class="cartao__corpo">
        <div class="linha">
          ${itens.length ? itens.map((t, i) => `
            <span class="etiqueta">${esc(t)}
              <button type="button" data-acao="remover-item" data-lista="${campo}" data-indice="${i}"
                aria-label="Remover ${esc(t)}" style="background:none;border:none;cursor:pointer;color:inherit;padding:0 0 0 .2em">×</button>
            </span>`).join('')
          : `<p class="campo__dica" style="margin:0">Nada aqui ainda.</p>`}
        </div>
        <div class="linha" style="margin-top:.75rem">
          <input data-novo="${campo}" placeholder="${esc(marcador)}" style="flex:1;min-width:160px">
          <button class="btn btn--pequeno" data-acao="adicionar-item" data-lista="${campo}">Adicionar</button>
        </div>
      </div>
    </section>`;
}

const cartaoListas = (f) => `
  ${listaEditavel('Talentos', 'talentos', f.talentos, 'Nome do talento')}
  ${listaEditavel('Especialidades', 'especialidades', f.especialidades, 'Ex.: Espada longa, Alethiano')}`;

function cartaoIdentidade(f) {
  return `
    <section class="cartao">
      <div class="cartao__cabeca"><h3>Identidade</h3></div>
      <div class="cartao__corpo">
        <div class="grade grade--2">
          <label class="campo" style="grid-column:1/-1">
            <span class="campo__rotulo">Nome</span>
            <input data-campo="nome" value="${esc(f.nome)}">
          </label>
          <label class="campo">
            <span class="campo__rotulo">Nível</span>
            <input type="number" min="1" max="30" data-campo="nivel" value="${f.nivel}">
          </label>
          <label class="campo">
            <span class="campo__rotulo">Patamar</span>
            <input value="${patamar(f)}" disabled>
          </label>
          <label class="campo">
            <span class="campo__rotulo">Ancestralidade</span>
            <input data-campo="ancestralidade" value="${esc(f.ancestralidade)}" placeholder="humano, cantor…">
          </label>
          <label class="campo">
            <span class="campo__rotulo">Cultura</span>
            <input data-campo="cultura" value="${esc(f.cultura)}" placeholder="alethiana, thaylena…">
          </label>
          <label class="campo" style="grid-column:1/-1">
            <span class="campo__rotulo">Trilhas</span>
            <input data-campo="trilhas" value="${esc(f.trilhas)}" placeholder="Guerreiro, Alternauta…">
          </label>
        </div>
        <label class="linha" style="margin-top:.85rem;cursor:pointer;gap:.6rem">
          <input type="checkbox" data-campo="radiante" ${f.radiante ? 'checked' : ''}
                 style="width:18px;height:18px;min-height:auto;accent-color:var(--luz)">
          <span>Cavaleiro Radiante <span class="campo__dica" style="display:inline">(mostra Investidura e as perícias de fluxo)</span></span>
        </label>
      </div>
    </section>`;
}

function cartaoHistoria(f) {
  return `
    <section class="cartao">
      <div class="cartao__cabeca"><h3>História</h3><span class="cartao__fonte">p. 21</span></div>
      <div class="cartao__corpo pilha">
        <label class="campo"><span class="campo__rotulo">Propósito</span>
          <input data-campo="proposito" value="${esc(f.proposito)}"></label>
        <label class="campo"><span class="campo__rotulo">Obstáculo</span>
          <input data-campo="obstaculo" value="${esc(f.obstaculo)}"></label>
        <label class="campo"><span class="campo__rotulo">Objetivos</span>
          <textarea data-campo="objetivos">${esc(f.objetivos)}</textarea></label>
        ${f.radiante ? `<label class="campo"><span class="campo__rotulo">Ideais falados</span>
          <textarea data-campo="ideais">${esc(f.ideais)}</textarea></label>` : ''}
        <label class="campo"><span class="campo__rotulo">Conexões</span>
          <textarea data-campo="conexoes">${esc(f.conexoes)}</textarea></label>
        <label class="campo"><span class="campo__rotulo">Equipamento e esferas</span>
          <textarea data-campo="equipamento">${esc(f.equipamento)}</textarea></label>
        <label class="campo"><span class="campo__rotulo">Anotações</span>
          <textarea data-campo="anotacoes">${esc(f.anotacoes)}</textarea></label>
      </div>
    </section>`;
}

/* ---------------------------------------------------------------- ações */
function ligar() {
  ligarAcoes(raiz, {
    vital(alvo) {
      const f = fichaAtual();
      const delta = Number(alvo.dataset.delta);
      const tetos = { vida: vidaMaxima(f), foco: focoMaximo(f), investidura: f.investiduraMaxima || 0 };
      const chave = alvo.dataset.vital;
      f[chave] = Math.max(0, Math.min(tetos[chave], f[chave] + delta));
      salvar(); desenharFicha(); tremer();
    },

    atributo(alvo) {
      const f = fichaAtual();
      const chave = alvo.dataset.atributo;
      const vidaAntes = vidaMaxima(f);
      const focoAntes = focoMaximo(f);
      f.atributos[chave] = Math.max(0, Math.min(10, (f.atributos[chave] || 0) + Number(alvo.dataset.delta)));
      // O máximo mudou: leva o valor atual junto, como num ganho de nível.
      f.vida = Math.max(0, Math.min(vidaMaxima(f), f.vida + (vidaMaxima(f) - vidaAntes)));
      f.foco = Math.max(0, Math.min(focoMaximo(f), f.foco + (focoMaximo(f) - focoAntes)));
      salvar(); desenharFicha(); tremer();
    },

    graduacao(alvo) {
      const f = fichaAtual();
      const { pericia, tipo } = alvo.dataset;
      f[tipo][pericia] = Math.max(0, Math.min(5, (f[tipo][pericia] || 0) + Number(alvo.dataset.delta)));
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
      const p = periciasDe(f).find((x) => x.nome === alvo.dataset.pericia);
      aoRolarPericia(p.nome, modificador(f, p));
    },

    'nova-arma'() {
      fichaAtual().armas.push({
        nome: 'Nova arma', pericia: 'Armamento Leve', dano: '1d6',
        tipo: 'cortante', alcance: 'corpo a corpo',
      });
      salvar(); desenharFicha();
    },

    'remover-arma'(alvo) {
      fichaAtual().armas.splice(Number(alvo.dataset.arma), 1);
      salvar(); desenharFicha();
    },

    atacar(alvo) { dispararArma(alvo, false); },
    dano(alvo) { dispararArma(alvo, true); },

    'adicionar-item'(alvo) {
      const lista = alvo.dataset.lista;
      const campo = raiz.querySelector(`[data-novo="${lista}"]`);
      const valor = campo.value.trim();
      if (!valor) return;
      fichaAtual()[lista].push(valor);
      campo.value = '';
      salvar(); desenharFicha();
    },

    'remover-item'(alvo) {
      fichaAtual()[alvo.dataset.lista].splice(Number(alvo.dataset.indice), 1);
      salvar(); desenharFicha();
    },

    recuperar() {
      const f = fichaAtual();
      const dado = dadoRecuperacao(f.atributos.von || 0);
      const { soma } = rolarExpressao(dado);
      abrirRecuperacao(dado, soma);
    },

    async descanso() {
      descansoLongo(fichaAtual());
      desenharFicha();
      recado('Descanso longo — recursos cheios');
    },
  });

  // Enter no campo de talento/especialidade adiciona sem precisar do botão.
  raiz.addEventListener('keydown', (ev) => {
    const campo = ev.target.closest('[data-novo]');
    if (!campo || ev.key !== 'Enter') return;
    ev.preventDefault();
    raiz.querySelector(`[data-acao="adicionar-item"][data-lista="${campo.dataset.novo}"]`)?.click();
  });

  ligarEntradas(raiz, {
    '*'(alvo, valor) {
      const f = fichaAtual();
      const campo = alvo.dataset.campo;

      if (campo.startsWith('arma:')) {
        const [, i, prop] = campo.split(':');
        f.armas[Number(i)][prop] = valor;
        salvar();
        return;
      }

      const numericos = ['nivel', 'ajusteVida', 'ajusteFoco', 'deflexao', 'investiduraMaxima'];
      if (numericos.includes(campo)) {
        f[campo] = campo === 'nivel'
          ? Math.max(1, Math.min(30, Number(valor) || 1))
          : (Number(valor) || 0);
      } else {
        f[campo] = valor;
      }
      salvar();

      // Só redesenha quando o valor muda outra coisa na tela.
      if (['nivel', 'radiante', 'ajusteVida', 'ajusteFoco', 'deflexao', 'investiduraMaxima', 'nome'].includes(campo)) {
        desenharFicha();
        document.dispatchEvent(new CustomEvent('ficha:renomeada'));
      }
    },
  });
}

function dispararArma(alvo, soDano) {
  const f = fichaAtual();
  const arma = f.armas[Number(alvo.dataset.arma)];
  const p = periciasDe(f).find((x) => x.nome === arma.pericia) || PERICIAS[0];
  aoAtacar(arma, modificador(f, p), soDano);
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
      <button class="btn" data-alvo="foco">Tudo em foco</button>
      <button class="btn btn--principal" data-alvo="vida">Tudo em vida</button>
    </div>`;
  document.body.append(dlg);
  dlg.addEventListener('click', (ev) => {
    const botao = ev.target.closest('[data-alvo]');
    if (!botao) return;
    const f = fichaAtual();
    const alvo = botao.dataset.alvo;
    const teto = alvo === 'vida' ? vidaMaxima(f) : focoMaximo(f);
    f[alvo] = Math.min(teto, f[alvo] + valor);
    salvar(); desenharFicha();
    recado(`+${valor} de ${alvo}`);
    dlg.close();
  });
  dlg.addEventListener('close', () => dlg.remove(), { once: true });
  dlg.showModal();
}
