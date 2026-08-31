/* =========================================================================
   painel-regras.js — busca no pacote de livros do jogador
   ========================================================================= */

import { pacoteAtual, buscar, livrosDoPacote, realcar, instalarPacote, removerPacote } from './pacote.js';
import { esc, recado, ligarAcoes, icone, confirmar } from './ui.js';

let raiz;
let consulta = '';
let livro = '';
let esperando;

const ATALHOS = [
  'Condições', 'Lesões', 'Descanso', 'Aumentando as Apostas', 'Ganhar Vantagem',
  'Cobertura', 'Queda', 'Armadura Fractal', 'Esferas', 'Grantormenta', 'Ideais',
];

export function iniciarRegras(elemento) {
  raiz = elemento;
  ligar();
}

export function desenharRegras() {
  raiz.innerHTML = pacoteAtual() ? comPacote() : semPacote();
}

function semPacote() {
  return `
    <div class="painel__cabeca">
      <div><h2>Regras</h2><p>Busque no texto dos seus próprios livros.</p></div>
    </div>

    <section class="cartao">
      <div class="cartao__corpo">
        <div class="solta" data-solta>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
            <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" stroke-linecap="round"/>
          </svg>
          <strong style="display:block;font-family:var(--f-titulo);font-size:1.15rem;margin-bottom:.4rem">
            Solte aqui o seu pacote de dados
          </strong>
          <p class="campo__dica" style="max-width:46ch;margin:0 auto 1rem">
            Arraste o <code>pacote.json</code> gerado a partir dos seus PDFs, ou escolha o arquivo.
            Ele fica guardado neste navegador e não sobe para lugar nenhum.
          </p>
          <button class="btn btn--principal" data-acao="escolher">Escolher arquivo</button>
          <input type="file" accept=".json,application/json" hidden data-arquivo>
        </div>

        <div class="aviso" style="margin-top:1.25rem">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.6h.01" stroke-linecap="round"/>
          </svg>
          <div>
            <strong>Como gerar</strong><br>
            Na pasta do projeto, com os seus PDFs à mão:
            <code>python ferramentas/gerar_pacote.py "caminho/dos/livros"</code>.
            O script lê os livros, monta o índice e escreve o <code>pacote.json</code>.
          </div>
        </div>
      </div>
    </section>`;
}

function comPacote() {
  const pacote = pacoteAtual();
  const resultados = consulta.trim().length >= 2 ? buscar(consulta, { livro }) : null;
  return `
    <div class="painel__cabeca">
      <div><h2>Regras</h2><p>${pacote.paginas.length} páginas dos seus livros, buscáveis.</p></div>
      <div class="painel__acoes">
        <button class="btn btn--pequeno btn--perigo" data-acao="remover-pacote">Remover pacote</button>
      </div>
    </div>

    <section class="cartao">
      <div class="cartao__corpo">
        <div class="busca">
          ${icone.lupa}
          <input type="search" data-busca value="${esc(consulta)}" autocomplete="off"
                 placeholder="Buscar regra, condição, talento, criatura…"
                 aria-label="Buscar nas regras">
        </div>
        <div class="linha" style="margin-top:.75rem">
          <button type="button" class="etiqueta alternavel" data-acao="livro" data-livro=""
            aria-pressed="${livro === ''}">Todos</button>
          ${livrosDoPacote().map((l) => `
            <button type="button" class="etiqueta alternavel" data-acao="livro" data-livro="${esc(l)}"
              aria-pressed="${livro === l}">${esc(l)}</button>`).join('')}
        </div>
      </div>
    </section>

    <div style="margin-top:1rem" aria-live="polite">
      ${resultados ? listaResultados(resultados) : atalhos()}
    </div>`;
}

const atalhos = () => `
  <section class="cartao">
    <div class="cartao__cabeca"><h3>Atalhos</h3></div>
    <div class="cartao__corpo">
      <div class="linha">
        ${ATALHOS.map((a) => `<button type="button" class="etiqueta alternavel"
          data-acao="atalho" data-termo="${esc(a)}">${esc(a)}</button>`).join('')}
      </div>
    </div>
  </section>`;

function listaResultados(resultados) {
  if (!resultados.length) {
    return `<div class="vazio"><strong>Nada encontrado</strong><p>Tente outro termo ou tire o filtro de livro.</p></div>`;
  }
  return `
    <p class="campo__dica" style="margin:0 0 .6rem">${resultados.length} página(s)</p>
    ${resultados.map((r, i) => `
      <article class="achado">
        <div class="achado__cabeca">
          <span class="etiqueta etiqueta--luz">${esc(r.livro)}</span>
          <span class="campo__dica" style="margin:0">página ${r.pagina}</span>
        </div>
        <div class="achado__trecho" id="trecho-${i}">${realcar(r.trecho, r.termos, esc)}</div>
        <button class="btn btn--pequeno btn--fantasma" data-acao="expandir" data-alvo="trecho-${i}"
          style="margin-top:.4rem;color:var(--luz)">mostrar tudo</button>
      </article>`).join('')}`;
}

function ligar() {
  ligarAcoes(raiz, {
    escolher() { raiz.querySelector('[data-arquivo]')?.click(); },

    livro(alvo) { livro = alvo.dataset.livro; desenharRegras(); },

    atalho(alvo) {
      consulta = alvo.dataset.termo;
      desenharRegras();
      raiz.querySelector('[data-busca]')?.focus();
    },

    expandir(alvo) {
      const trecho = raiz.querySelector(`#${alvo.dataset.alvo}`);
      const aberto = trecho.dataset.aberto === 'true';
      trecho.dataset.aberto = String(!aberto);
      alvo.textContent = aberto ? 'mostrar tudo' : 'recolher';
    },

    async 'remover-pacote'() {
      const ok = await confirmar({
        titulo: 'Remover o pacote?',
        texto: 'A busca de regras e os talentos do construtor voltam a ficar indisponíveis. Suas fichas não são afetadas.',
        confirmar: 'Remover', perigo: true,
      });
      if (!ok) return;
      await removerPacote();
      consulta = ''; livro = '';
      desenharRegras();
      document.dispatchEvent(new CustomEvent('pacote:mudou'));
      recado('Pacote removido');
    },
  });

  raiz.addEventListener('input', (ev) => {
    if (!ev.target.matches('[data-busca]')) return;
    consulta = ev.target.value;
    clearTimeout(esperando);
    esperando = setTimeout(() => {
      const foco = document.activeElement === ev.target;
      const posicao = ev.target.selectionStart;
      desenharRegras();
      if (foco) {
        const novo = raiz.querySelector('[data-busca]');
        novo?.focus();
        try { novo.setSelectionRange(posicao, posicao); } catch (e) {}
      }
    }, 190);
  });

  raiz.addEventListener('change', async (ev) => {
    if (!ev.target.matches('[data-arquivo]')) return;
    await receberArquivo(ev.target.files[0]);
  });

  // arrastar e soltar
  ['dragenter', 'dragover'].forEach((evento) => {
    raiz.addEventListener(evento, (ev) => {
      const zona = ev.target.closest('[data-solta]');
      if (!zona) return;
      ev.preventDefault();
      zona.dataset.ativo = 'true';
    });
  });
  ['dragleave', 'drop'].forEach((evento) => {
    raiz.addEventListener(evento, (ev) => {
      const zona = ev.target.closest('[data-solta]');
      if (zona) zona.dataset.ativo = 'false';
    });
  });
  raiz.addEventListener('drop', async (ev) => {
    if (!ev.target.closest('[data-solta]')) return;
    ev.preventDefault();
    await receberArquivo(ev.dataTransfer.files[0]);
  });
}

async function receberArquivo(arquivo) {
  if (!arquivo) return;
  try {
    const dados = await instalarPacote(arquivo);
    desenharRegras();
    document.dispatchEvent(new CustomEvent('pacote:mudou'));
    recado(`Pacote instalado — ${dados.paginas.length} páginas`);
  } catch (e) {
    recado(e.message);
  }
}
