/* =========================================================================
   pacote.js — o conteúdo dos livros do próprio jogador
   O pacote é grande demais para o localStorage, então mora no IndexedDB.
   Ele nunca sai do navegador: não há servidor para onde mandar.
   ========================================================================= */

const BANCO = 'mesa-roshar';
const ARMAZEM = 'pacote';
const CHAVE = 'atual';

function abrirBanco() {
  return new Promise((ok, erro) => {
    const req = indexedDB.open(BANCO, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(ARMAZEM)) req.result.createObjectStore(ARMAZEM);
    };
    req.onsuccess = () => ok(req.result);
    req.onerror = () => erro(req.error);
  });
}

function transacao(modo, acao) {
  return abrirBanco().then((db) => new Promise((ok, erro) => {
    const t = db.transaction(ARMAZEM, modo);
    const pedido = acao(t.objectStore(ARMAZEM));
    pedido.onsuccess = () => ok(pedido.result);
    pedido.onerror = () => erro(pedido.error);
  }));
}

export const gravarPacote = (dados) => transacao('readwrite', (loja) => loja.put(dados, CHAVE));
export const lerPacote    = ()      => transacao('readonly',  (loja) => loja.get(CHAVE));
export const apagarPacote = ()      => transacao('readwrite', (loja) => loja.delete(CHAVE));

export const normalizar = (s) =>
  String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/* O pacote na memória, já com o texto normalizado para a busca não refazer
   esse trabalho a cada tecla. */
export let PACOTE = null;

export function validarPacote(dados) {
  if (!dados || typeof dados !== 'object') throw new Error('Arquivo vazio ou ilegível.');
  if (dados.formato !== 'mesa-roshar/pacote') {
    throw new Error('Isso não parece um pacote da Mesa de Roshar. Gere um com ferramentas/gerar_pacote.py.');
  }
  if (!Array.isArray(dados.paginas)) throw new Error('O pacote não tem páginas indexadas.');
  return dados;
}

export function prepararPacote(dados) {
  dados.paginas.forEach((p) => { p.norm = normalizar(p.texto); });
  dados.talentos ??= { heroicos: [], radiantes: [], cantor: [] };
  PACOTE = dados;
  return dados;
}

export async function carregarPacoteSalvo() {
  try {
    const guardado = await lerPacote();
    if (guardado) return prepararPacote(guardado);
  } catch (e) {
    console.warn('Não consegui abrir o pacote guardado.', e);
  }
  return null;
}

export async function instalarPacote(arquivo) {
  const dados = validarPacote(JSON.parse(await arquivo.text()));
  await gravarPacote(dados);
  return prepararPacote(dados);
}

export async function removerPacote() {
  await apagarPacote();
  PACOTE = null;
}

/**
 * Busca no texto dos livros.
 * A frase inteira vale muito mais que os termos soltos, mas com retorno
 * decrescente — um bloco de estatísticas que repete o termo não pode vencer
 * a página que define a regra. Título de seção batendo vale mais ainda.
 */
export function buscar(consulta, { livro = '', limite = 40 } = {}) {
  if (!PACOTE) return [];
  const alvo = normalizar(consulta).trim();
  if (alvo.length < 2) return [];
  const termos = alvo.split(/\s+/).filter(Boolean);
  const achados = [];

  for (const pagina of PACOTE.paginas) {
    if (livro && pagina.livro !== livro) continue;

    let pontos = 0;
    let temTodos = true;
    for (const termo of termos) {
      const vezes = pagina.norm.split(termo).length - 1;
      if (!vezes) { temTodos = false; break; }
      pontos += vezes;
    }
    if (!temTodos) continue;

    if (termos.length > 1) {
      const frases = pagina.norm.split(alvo).length - 1;
      pontos += Math.min(frases, 3) * 120;
    }
    const titulos = pagina.titulos || [];
    if (titulos.some((t) => normalizar(t).includes(alvo))) pontos += 300;
    else if (titulos.some((t) => normalizar(t).includes(termos[0]))) pontos += 60;
    if (pagina.livro === 'Regras') pontos += 8;   // a mecânica costuma estar lá

    achados.push({ pagina, pontos });
  }

  achados.sort((a, b) => b.pontos - a.pontos);
  return achados.slice(0, limite).map(({ pagina }) => {
    let i = pagina.norm.indexOf(alvo);
    if (i < 0) i = pagina.norm.indexOf(termos[0]);
    const inicio = Math.max(0, i - 220);
    return {
      livro: pagina.livro,
      pagina: pagina.pagina,
      trecho: (inicio > 0 ? '…' : '') + pagina.texto.slice(inicio, inicio + 1400),
      termos,
    };
  });
}

export const livrosDoPacote = () =>
  PACOTE ? [...new Set(PACOTE.paginas.map((p) => p.livro))] : [];

/** Realce sem acento: "persuasao" acha "Persuasão". */
const CLASSES = { a: '[aáàâã]', e: '[eéê]', i: '[ií]', o: '[oóôõ]', u: '[uú]', c: '[cç]' };

export function realcar(texto, termos, escapar) {
  let html = escapar(texto);
  for (const termo of termos) {
    if (termo.length < 2 || !/^[a-z0-9]+$/.test(termo)) continue;
    const padrao = termo.split('').map((c) => CLASSES[c] || c).join('');
    html = html.replace(new RegExp(`(${padrao})`, 'gi'), '<mark>$1</mark>');
  }
  return html;
}
