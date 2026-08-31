/* =========================================================================
   assistente.js — o painel de progressão

   Responde, sem o jogador precisar abrir o livro: quanto ainda tenho para
   distribuir, qual é a minha graduação máxima agora, quantos talentos devo
   ter, e o que ganho ao subir de nível.
   Tudo sai da tabela Evolução de Personagem (p.25).
   ========================================================================= */

import {
  ganhosDoNivel, orcamentoAte, gastoNaFicha, gradMaxima, patamar, vidaMaxima,
} from './sistema.js';
import { fichaAtual, salvar } from './estado.js';
import { esc, recado } from './ui.js';

/** Uma linha do painel: quanto foi gasto, de quanto o nível dá. */
function medida(rotulo, gasto, total, dica = '') {
  const falta = total - gasto;
  const estado = falta === 0 ? 'certo' : falta > 0 ? 'sobrando' : 'excedido';
  const recado = falta > 0 ? `faltam ${falta}` : falta < 0 ? `${-falta} a mais` : 'em dia';
  return `
    <div class="medida" data-estado="${estado}">
      <span class="medida__rotulo">${rotulo}</span>
      <span class="medida__conta num">${gasto}<small> de ${total}</small></span>
      <span class="medida__recado">${recado}</span>
      ${dica ? `<span class="medida__dica">${dica}</span>` : ''}
    </div>`;
}

export function cartaoProgressao(f) {
  const forca = f.atributos.for || 0;
  const orcamento = orcamentoAte(f.nivel, forca);
  const gasto = gastoNaFicha(f);
  const proximo = f.nivel < 30 ? ganhosDoNivel(f.nivel + 1, forca) : null;

  return `
    <section class="cartao progressao">
      <div class="cartao__cabeca">
        <h3>Progressão</h3>
        <span class="cartao__fonte">nível ${f.nivel} · patamar ${patamar(f)} · p.25</span>
      </div>
      <div class="cartao__corpo">
        <div class="medidas">
          ${medida('Pontos de atributo', gasto.pontosAtributo, orcamento.pontosAtributo,
                   'máximo 5 por atributo')}
          ${medida('Graduações de perícia', gasto.graduacoes, orcamento.graduacoes,
                   `máximo ${gradMaxima(f)} por perícia neste patamar`)}
          ${medida('Talentos', gasto.talentos, orcamento.talentosTotais,
                   `${orcamento.talentos} de trilha + ${orcamento.talentosAncestrais} de ancestralidade`)}
        </div>

        <div class="linha" style="margin-top:.9rem">
          <button class="btn btn--pequeno btn--principal" data-acao="ver-talentos">
            Escolher talento no livro
          </button>
          ${proximo ? `
            <button class="btn btn--pequeno btn--ambar" data-acao="subir-nivel">
              Subir para o nível ${f.nivel + 1}
            </button>` : ''}
        </div>

        ${proximo ? `
          <p class="campo__dica" style="margin-top:.6rem">
            No nível ${proximo.nivel} você ganha ${proximo.vidaTexto} de vida,
            ${proximo.graduacoesTexto}${proximo.pontosAtributo ? ', +1 ponto de atributo' : ''}
            e ${proximo.talentoTexto}${proximo.talentoAncestral ? ', mais um talento bônus de ancestralidade' : ''}.
          </p>` : ''}
      </div>
    </section>`;
}

/** Sobe o nível: aplica o que é automático e diz o que ficou para escolher. */
export function subirDeNivel() {
  const f = fichaAtual();
  if (f.nivel >= 30) { recado('Nível 30 é o teto da ficha'); return; }

  const forca = f.atributos.for || 0;
  const ganho = ganhosDoNivel(f.nivel + 1, forca);

  const dlg = document.createElement('dialog');
  dlg.innerHTML = `
    <div class="dialogo__cabeca"><h2>Nível ${ganho.nivel}</h2></div>
    <div class="dialogo__corpo">
      <p class="campo__dica" style="margin-top:0">
        A vida entra sozinha. O resto fica marcado no painel de progressão para você distribuir.
      </p>
      <ul class="ganhos">
        <li><b>Vida</b><span>${ganho.vidaTexto}</span></li>
        ${ganho.pontosAtributo
          ? `<li><b>Atributo</b><span>+${ganho.pontosAtributo} ponto para distribuir</span></li>` : ''}
        <li><b>Perícias</b><span>${ganho.graduacoesTexto}</span></li>
        <li><b>Talento</b><span>${ganho.talentoTexto}</span></li>
        ${ganho.talentoAncestral
          ? '<li><b>Ancestralidade</b><span>mais um talento bônus (começo de patamar)</span></li>' : ''}
        <li><b>Graduação máxima</b><span>passa a ser ${
          Math.min(5, patamar({ nivel: ganho.nivel }) + 1)} por perícia</span></li>
      </ul>
    </div>
    <div class="dialogo__pe">
      <button class="btn" type="button" data-resposta="nao">Cancelar</button>
      <button class="btn btn--principal" type="button" data-resposta="sim">Subir de nível</button>
    </div>`;
  document.body.append(dlg);

  let respondido = false;
  const responder = (resposta) => {
    if (respondido) return;
    respondido = true;
    try { dlg.close(); } catch (e) {}
    dlg.remove();
    if (resposta !== 'sim') return;

    f.nivel = ganho.nivel;
    // A vida ganha por nível mora no ajuste, já que a fórmula da ficha é
    // 10 + FOR + ajuste. O valor atual sobe junto, como o livro manda.
    f.ajusteVida = (Number(f.ajusteVida) || 0) + ganho.vida;
    f.vida = Math.min(vidaMaxima(f), f.vida + ganho.vida);
    salvar();

    const pendencias = [];
    if (ganho.pontosAtributo) pendencias.push('1 ponto de atributo');
    pendencias.push(ganho.graduacoesTexto.replace(/^\+/, ''));
    if (ganho.talentos) pendencias.push('1 talento');
    if (ganho.talentoAncestral) pendencias.push('1 talento de ancestralidade');

    document.dispatchEvent(new CustomEvent('ficha:subiu-nivel'));
    recado(`Nível ${ganho.nivel}. Falta escolher: ${pendencias.join(', ')}.`);
  };

  dlg.addEventListener('click', (ev) => {
    const botao = ev.target.closest('[data-resposta]');
    if (botao) responder(botao.dataset.resposta);
  });
  dlg.addEventListener('cancel', (ev) => { ev.preventDefault(); responder('nao'); });
  dlg.showModal();
  dlg.querySelector('[data-resposta="sim"]').focus();
}
