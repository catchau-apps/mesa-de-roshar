/* =========================================================================
   app.js — junta os painéis, o roteador e o menu
   ========================================================================= */

import { ST, salvar, gravarAgora, fichaAtual, fichaNova, adicionarFicha,
         duplicarFicha, removerFicha, exportarTudo, importarTudo,
         seFalharAoSalvar } from './estado.js';
import { prepararPacoteDaMesa, lerMetaDaMesa, destrancarPacote } from './pacote.js';
import { $, $$, esc, recado, confirmar, ligarAcoes } from './ui.js';
import { iniciarFicha, desenharFicha } from './painel-ficha.js';
import { iniciarDados, desenharDados, rolarPericiaDireto, rolarArma } from './painel-dados.js';
import { iniciarRegras, desenharRegras } from './painel-regras.js';
import { iniciarCombate, desenharCombate } from './painel-combate.js';
import { iniciarReferencia, desenharReferencia } from './painel-referencia.js';
import { iniciarConstrutor, abrirConstrutor, temRascunho } from './construtor.js';

const PAINEIS = {
  ficha:      { desenhar: desenharFicha },
  dados:      { desenhar: desenharDados },
  regras:     { desenhar: desenharRegras },
  combate:    { desenhar: desenharCombate },
  referencia: { desenhar: desenharReferencia },
};

function irPara(aba, { focar = false } = {}) {
  if (!PAINEIS[aba]) aba = 'ficha';
  ST.aba = aba;
  salvar();

  $$('[data-aba]').forEach((b) => {
    const ativo = b.dataset.aba === aba;
    b.setAttribute('aria-selected', String(ativo));
    b.tabIndex = ativo ? 0 : -1;
  });
  $$('[data-painel]').forEach((p) => { p.hidden = p.dataset.painel !== aba; });

  PAINEIS[aba].desenhar();
  if (location.hash.slice(1) !== aba) history.replaceState(null, '', `#${aba}`);
  if (focar) $(`[data-painel="${aba}"]`)?.focus({ preventScroll: true });
  scrollTo({ top: 0, behavior: 'instant' });
}

/* #criar abre o construtor direto (link que o grupo compartilha). */
function abrirRota(rota) {
  if (rota === 'criar') {
    irPara('ficha');
    abrirConstrutor({ retomar: temRascunho() });
    return;
  }
  irPara(rota);
}

/* ------------------------------------------------------- senha da mesa */
async function pedirSenhaDaMesa() {
  const meta = await lerMetaDaMesa();
  if (!meta) { recado('O pacote da mesa não está disponível agora.'); return; }
  const dlg = document.createElement('dialog');
  dlg.innerHTML = `
    <form method="dialog" data-senha-form>
      <div class="dialogo__cabeca"><h2>Senha da mesa</h2></div>
      <div class="dialogo__corpo">
        <p>Digite a senha que o grupo combinou. É só uma vez neste aparelho: depois os talentos, culturas e regras ficam guardados aqui.</p>
        <label class="campo" style="margin-top:.8rem">
          <span class="campo__rotulo">Senha</span>
          <input type="password" data-senha autocomplete="current-password" autocapitalize="none" spellcheck="false" required>
        </label>
        <p class="campo__dica" data-senha-erro role="alert"></p>
      </div>
      <div class="dialogo__pe">
        <button class="btn" type="button" data-senha-depois>Agora não</button>
        <button class="btn btn--principal" type="submit">Entrar</button>
      </div>
    </form>`;
  document.body.append(dlg);
  const fechar = () => { try { dlg.close(); } catch (e) {} dlg.remove(); };
  dlg.addEventListener('cancel', (ev) => { ev.preventDefault(); fechar(); });
  dlg.querySelector('[data-senha-depois]').addEventListener('click', fechar);
  dlg.querySelector('[data-senha-form]').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const botao = dlg.querySelector('[type=submit]');
    const erro = dlg.querySelector('[data-senha-erro]');
    botao.disabled = true; botao.textContent = 'Abrindo…'; erro.textContent = '';
    try {
      const dados = await destrancarPacote(meta, dlg.querySelector('[data-senha]').value);
      fechar();
      document.dispatchEvent(new CustomEvent('pacote:mudou'));
      irPara(ST.aba || 'ficha');
      recado(`Pacote da mesa liberado — ${dados.paginas.length} páginas`);
    } catch (e) {
      erro.textContent = e.message;
      botao.disabled = false; botao.textContent = 'Entrar';
    }
  });
  dlg.showModal();
  dlg.querySelector('[data-senha]').focus();
}

/* ---------------------------------------------------------- seletor de ficha */
function desenharSeletor() {
  const seletor = $('#seletor-ficha');
  seletor.innerHTML = ST.fichas
    .map((f) => `<option value="${f.id}" ${f.id === ST.fichaAtiva ? 'selected' : ''}>${esc(f.nome)}</option>`)
    .join('');
}

function atualizarBotaoRascunho() {
  const botao = $('[data-acao="retomar"]');
  if (botao) botao.hidden = !temRascunho();
}

/* ------------------------------------------------------------------ menu */
function abrirMenu() {
  const dlg = $('#menu');
  $('#menu-rascunho').hidden = !temRascunho();
  dlg.showModal();
}

/* ------------------------------------------------------------------ início */
async function iniciar() {
  seFalharAoSalvar(() => {
    recado('Não consegui salvar: o armazenamento do navegador está cheio.');
  });

  iniciarFicha($('[data-painel="ficha"]'), {
    rolarPericia: (nome, mod) => { rolarPericiaDireto(nome, mod); },
    atacar: (arma, mod, soDano) => { rolarArma(arma, mod, soDano); irPara('dados'); },
  });
  iniciarDados($('[data-painel="dados"]'));
  iniciarRegras($('[data-painel="regras"]'));
  iniciarCombate($('[data-painel="combate"]'));
  iniciarReferencia($('[data-painel="referencia"]'));
  iniciarConstrutor($('#construtor'), {
    aoCriar() { desenharSeletor(); atualizarBotaoRascunho(); irPara('ficha'); },
  });

  // navegação
  $$('[data-aba]').forEach((b) => b.addEventListener('click', () => irPara(b.dataset.aba)));
  $('#navegacao').addEventListener('keydown', (ev) => {
    const abas = $$('[data-aba]');
    const i = abas.indexOf(document.activeElement);
    if (i < 0) return;
    const passo = ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowLeft' ? -1 : 0;
    if (!passo) return;
    ev.preventDefault();
    const proximo = abas[(i + passo + abas.length) % abas.length];
    proximo.focus();
    irPara(proximo.dataset.aba);
  });

  $('#seletor-ficha').addEventListener('change', (ev) => {
    ST.fichaAtiva = ev.target.value;
    salvar();
    irPara('ficha');
  });

  ligarAcoes(document.body, {
    menu: abrirMenu,
    'fechar-menu'() { $('#menu').close(); },
    construtor() { $('#menu').close(); abrirConstrutor(); },
    retomar() { $('#menu').close(); abrirConstrutor({ retomar: true }); },

    'ficha-branca'() {
      $('#menu').close();
      adicionarFicha(fichaNova('Novo personagem'));
      desenharSeletor();
      irPara('ficha');
    },

    duplicar() {
      $('#menu').close();
      duplicarFicha();
      desenharSeletor();
      irPara('ficha');
    },

    async excluir() {
      $('#menu').close();
      if (ST.fichas.length < 2) { recado('Você precisa ter pelo menos uma ficha'); return; }
      const ok = await confirmar({
        titulo: `Excluir ${fichaAtual().nome}?`,
        texto: 'Essa ficha some do aparelho e não dá para desfazer.',
        confirmar: 'Excluir', perigo: true,
      });
      if (!ok) return;
      removerFicha(ST.fichaAtiva);
      desenharSeletor();
      irPara('ficha');
      recado('Ficha excluída');
    },

    exportar() { $('#menu').close(); exportarTudo(); recado('Backup baixado'); },
    importar() { $('#arquivo-backup').click(); },
  });

  $('#arquivo-backup').addEventListener('change', async (ev) => {
    const arquivo = ev.target.files[0];
    if (!arquivo) return;
    try {
      await importarTudo(arquivo);
      $('#menu').close();
      desenharSeletor();
      atualizarBotaoRascunho();
      irPara('ficha');
      recado('Backup importado');
    } catch (e) {
      recado('Arquivo inválido: ' + e.message);
    }
    ev.target.value = '';
  });

  // eventos que os painéis emitem entre si
  document.addEventListener('ir-para', (ev) => irPara(ev.detail));
  document.addEventListener('ficha:renomeada', desenharSeletor);
  document.addEventListener('ficha:subiu-nivel', () => { desenharFicha(); desenharSeletor(); });
  document.addEventListener('construtor:fechou', () => { atualizarBotaoRascunho(); desenharFicha(); });
  document.addEventListener('pacote:mudou', () => { atualizarBotaoRascunho(); });
  document.addEventListener('buscar-regra', (ev) => {
    irPara('regras');
    const campo = $('[data-busca]');
    if (campo) { campo.value = ev.detail; campo.dispatchEvent(new Event('input', { bubbles: true })); }
  });

  addEventListener('hashchange', () => abrirRota(location.hash.slice(1)));
  document.addEventListener('pedir-senha-mesa', () => pedirSenhaDaMesa());

  const situacao = await prepararPacoteDaMesa();

  desenharSeletor();
  atualizarBotaoRascunho();
  abrirRota(location.hash.slice(1) || ST.aba || 'ficha');
  if (situacao === 'pedir-senha') await pedirSenhaDaMesa();

  // Se o jogador fechou a criação no meio, oferece retomar assim que abrir.
  if (temRascunho()) recado('Você tem uma criação de personagem pela metade — retome no menu');

  addEventListener('pagehide', gravarAgora);
}

iniciar();
