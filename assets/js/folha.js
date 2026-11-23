/* =========================================================================
   folha.js — a ficha no papel
   Desenha a frente e o verso no mesmo arranjo da ficha oficial (Carta,
   612 × 792 pt) em SVG. O mesmo desenho serve de prévia na tela e vira PDF
   vetorial (jsPDF + svg2pdf, em assets/vendor, carregados só no clique).
   Texto só em Helvetica e Times: são as fontes-padrão do PDF, então o
   arquivo sai leve e os acentos funcionam sem embutir fonte.
   ========================================================================= */

import {
  ATRIBUTOS, PERICIAS, ARMAS, DESARMADO,
  vidaMaxima, focoMaximo, defesaFisica, defesaCognitiva, defesaEspiritual,
  levantamento, movimentoEfetivo, dadoRecuperacao, sentidos, periciasDe, modificador,
} from './sistema.js';
import { pacoteAtual, normalizar } from './pacote.js';

const L = 612, A = 792;
const TINTA = '#1d1d1b', TINTA2 = '#55564f', LINHA = '#3a3a36', FAIXA = '#d9dad5', CAIXA = '#ffffff';
const SANS = 'helvetica';      // o navegador troca por Arial; o PDF usa a Helvetica-padrão
const SERIF = 'times';

const escXml = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
  // fora do WinAnsi das fontes-padrão do PDF: troca pelo equivalente
  .replace(/[−–]/g, '-').replace(/[→]/g, '>').replace(/[✓]/g, 'v')
  // glifos de ação do livro viram texto
  .replace(/▶/g, '[1 ação]').replace(/▷/g, '[ação livre]').replace(/↻/g, '[reação]')
  .replace(/★/g, '[especial]').replace(/∞/g, '[sempre ativo]')
  .replace(/[“”]/g, '"').replace(/[‘’]/g, "'");

/* ------------------------------------------------------------ medir texto */
let regua = null;
function largura(texto, tamanho, negrito = false) {
  regua ??= document.createElement('canvas').getContext('2d');
  regua.font = `${negrito ? 'bold ' : ''}${tamanho}px Arial, Helvetica, sans-serif`;
  return regua.measureText(texto).width;
}

/** Quebra o texto em linhas que cabem em `max` pt. */
function quebrar(texto, max, tamanho, negrito = false) {
  const saida = [];
  for (const paragrafo of String(texto || '').split('\n')) {
    let linha = '';
    for (const palavra of paragrafo.split(/\s+/).filter(Boolean)) {
      const tentativa = linha ? `${linha} ${palavra}` : palavra;
      if (largura(tentativa, tamanho, negrito) <= max || !linha) linha = tentativa;
      else { saida.push(linha); linha = palavra; }
    }
    saida.push(linha);
  }
  return saida;
}

/* ------------------------------------------------------------ primitivas */
/** Caixa de cantos chanfrados, como as da ficha oficial. */
function caixa(x, y, w, h, { c = 5, fundo = CAIXA, traco = LINHA, espessura = 0.9 } = {}) {
  const d = `M${x + c},${y} H${x + w - c} L${x + w},${y + c} V${y + h - c} L${x + w - c},${y + h} H${x + c} L${x},${y + h - c} V${y + c} Z`;
  return `<path d="${d}" fill="${fundo}" stroke="${traco}" stroke-width="${espessura}"/>`;
}

/** O escudo das defesas e da deflexão. */
function escudo(x, y, w, h) {
  const d = `M${x},${y + 4} L${x + 4},${y} H${x + w - 4} L${x + w},${y + 4} V${y + h * 0.62} L${x + w / 2},${y + h} L${x},${y + h * 0.62} Z`;
  return `<path d="${d}" fill="${CAIXA}" stroke="${LINHA}" stroke-width="0.9"/>`;
}

function texto(x, y, conteudo, { tam = 7, peso = 'normal', cor = TINTA, ancora = 'start', fonte = SANS } = {}) {
  return `<text x="${x}" y="${y}" font-family="${fonte}" font-size="${tam}" font-weight="${peso}" fill="${cor}" text-anchor="${ancora}">${escXml(conteudo)}</text>`;
}

const rotulo = (x, y, conteudo, ancora = 'middle') =>
  texto(x, y, conteudo.toUpperCase(), { tam: 5.6, peso: 'bold', cor: TINTA2, ancora });

/** Bloco de texto que quebra linha e corta no que couber. Devolve [svg, sobra]. */
function bloco(x, y, w, h, linhas, { tam = 7, entre = 1.3, peso = 'normal' } = {}) {
  const passo = tam * entre;
  const cabem = Math.max(0, Math.floor(h / passo));
  const usadas = linhas.slice(0, cabem);
  const svg = usadas.map((l, i) => {
    const negrito = typeof l === 'object' && l.negrito;
    const conteudo = typeof l === 'object' ? l.texto : l;
    return texto(x, y + tam + i * passo, conteudo, { tam, peso: negrito ? 'bold' : peso });
  }).join('');
  return [svg, linhas.slice(cabem)];
}

function circulos(x, y, cheios, total = 5, r = 2.6) {
  let s = '';
  for (let i = 0; i < total; i += 1) {
    s += `<circle cx="${x + i * (r * 2 + 1.6)}" cy="${y}" r="${r}" fill="${i < cheios ? TINTA : CAIXA}" stroke="${LINHA}" stroke-width="0.7"/>`;
  }
  return s;
}

const sinal = (n) => (n >= 0 ? '+' : '') + n;

/* ------------------------------------------------------------ conteúdo */
function talentosComResumo(f) {
  const pacote = pacoteAtual();
  const todos = pacote ? [...pacote.talentos.heroicos, ...pacote.talentos.radiantes, ...pacote.talentos.cantor] : [];
  return (f.talentos || []).map((nome) => {
    const t = todos.find((x) => normalizar(x.nome) === normalizar(nome));
    let resumo = t ? (t.resumo || '') : '';
    // resumo que termina em ":" anuncia a frase seguinte; traz ela junto
    if (t && /:\s*$/.test(resumo)) {
      const resto = t.descricao.slice(t.descricao.indexOf(resumo) + resumo.length).trim();
      // a frase seguinte às vezes é só o nome da postura ("Postura da Rocha."): pega duas
      const seguinte = (resto.match(/^(?:[^.!?]*[.!?](?:\s+|$)){1,2}/) || [resto.split('\n')[0]])[0];
      resumo = `${resumo} ${seguinte.replace(/\s+/g, ' ')}`.trim();
    }
    return { nome, resumo };
  });
}

function linhasDeTalentos(f, largura) {
  const linhas = [];
  for (const t of talentosComResumo(f)) {
    quebrar(t.nome, largura, 6.8, true).forEach((l) => linhas.push({ texto: l, negrito: true }));
    if (t.resumo) quebrar(t.resumo, largura, 6.6).forEach((l) => linhas.push(l));
    linhas.push('');
  }
  return linhas;
}

/** "Faca: +3 contra Físico (1d4+3 afiado)" a partir da arma da ficha. */
export function linhaDeArma(f, a) {
  const base = ARMAS.find((x) => x.nome === a.nome) || (a.nome === 'Desarmado' ? DESARMADO : null);
  const pericia = PERICIAS.find((p) => p.nome === (a.pericia || base?.pericia)) || PERICIAS[1];
  const mod = modificador(f, pericia);
  const dano = a.dano || base?.dano || '';
  const tipo = a.tipo || base?.tipo || '';
  const danoTexto = /d/.test(dano) ? `${dano}${mod ? sinal(mod) : ''}` : String((Number(dano) || 0) + mod);
  return {
    titulo: `${a.nome}: ${sinal(mod)} contra Físico`,
    detalhe: `(${danoTexto} ${tipo})`.replace(/\s+\)/, ')'),
    tracos: base ? [base.alcance, base.tracos !== '—' ? base.tracos : ''].filter(Boolean).join(' · ') : '',
  };
}

/* ------------------------------------------------------------ cabeçalho */
function cabecalho(f, verso) {
  let s = '';
  // marca do projeto (não é o logo oficial)
  s += caixa(14, 12, 216, 56, { c: 6 });
  s += `<path d="M44 20 L58 28 V44 L44 52 L30 44 V28 Z" fill="none" stroke="${TINTA}" stroke-width="1.3"/>`;
  s += `<path d="M44 28 V44 M44 36 L51 32 M44 36 L37 32" stroke="${TINTA}" stroke-width="1.1" fill="none"/>`;
  s += texto(68, 39, verso ? 'ROSHAR' : 'COSMERE', { tam: 19, peso: 'bold', fonte: SERIF });
  s += texto(69, 52, verso ? 'Guerra das Tempestades' : 'Ficha de personagem', { tam: 7.4, peso: 'bold', cor: TINTA2 });
  s += caixa(14, 72, 216, 36, { c: 6 });
  s += rotulo(122, 81, 'Nome do jogador');
  s += texto(122, 100, f.jogador || '', { tam: 10, ancora: 'middle' });

  s += caixa(244, 12, 354, 96, { c: 6 });
  s += `<line x1="244" y1="46" x2="598" y2="46" stroke="${LINHA}" stroke-width="0.7"/>`;
  s += `<line x1="510" y1="12" x2="510" y2="108" stroke="${LINHA}" stroke-width="0.7"/>`;
  s += rotulo(252, 22, 'Nome do personagem', 'start');
  s += texto(252, 39, f.nome || '', { tam: 13, peso: 'bold', fonte: SERIF });
  s += rotulo(554, 22, 'Nível');
  s += texto(554, 40, f.nivel || 1, { tam: 14, peso: 'bold', ancora: 'middle' });
  s += rotulo(252, 56, 'Trilhas', 'start');
  const [trilhas] = bloco(252, 60, 250, 44, quebrar(f.trilhas || '', 250, 9), { tam: 9 });
  s += trilhas;
  s += rotulo(554, 56, 'Ancestralidade');
  s += texto(554, 76, f.ancestralidade || '', { tam: 9.5, ancora: 'middle' });
  return s;
}

/** A faixa cinza dos três reinos: atributos e defesas. */
function faixaDosReinos(f, comRecursos) {
  const altura = comRecursos ? 118 : 72;
  let s = `<rect x="0" y="114" width="${L}" height="${altura}" fill="${FAIXA}"/>`;
  const reinos = [
    { nome: 'Físico', x: 18, a: 'for', b: 'vel', defesa: defesaFisica(f) },
    { nome: 'Cognitivo', x: 216, a: 'int', b: 'von', defesa: defesaCognitiva(f) },
    { nome: 'Espiritual', x: 414, a: 'con', b: 'pre', defesa: defesaEspiritual(f) },
  ];
  for (const r of reinos) {
    s += texto(r.x + 90, 123, r.nome.toUpperCase(), { tam: 7.5, peso: 'bold', ancora: 'middle' });
    for (const [lado, id] of [[0, r.a], [1, r.b]]) {
      const x = r.x + (lado ? 118 : 0);
      const atr = ATRIBUTOS.find((t) => t.id === id);
      s += caixa(x, 130, 62, 50, { c: 4 });
      s += rotulo(x + 31, 139, atr.nome);
      s += texto(x + 31, 167, f.atributos[id] || 0, { tam: 18, peso: 'bold', ancora: 'middle' });
    }
    s += rotulo(r.x + 90, 131, 'Defesa');
    s += escudo(r.x + 70, 134, 40, 42);
    s += texto(r.x + 90, 161, r.defesa, { tam: 15, peso: 'bold', ancora: 'middle' });
  }
  if (!comRecursos) return s;

  const recurso = (x, nome, maximo, atual) => {
    let t = caixa(x, 188, 126, 36, { c: 5 });
    t += `<line x1="${x + 66}" y1="192" x2="${x + 66}" y2="220" stroke="${LINHA}" stroke-width="0.6"/>`;
    t += rotulo(x + 33, 197, nome) + texto(x + 33, 203, 'MÁXIMA', { tam: 4.6, cor: TINTA2, ancora: 'middle' });
    t += texto(x + 33, 217, maximo, { tam: 12, peso: 'bold', ancora: 'middle' });
    t += texto(x + 96, 197, 'ATUAL', { tam: 4.6, cor: TINTA2, ancora: 'middle' });
    t += texto(x + 96, 217, atual ?? '', { tam: 12, ancora: 'middle' });
    return t;
  };
  s += recurso(22, 'Vida', vidaMaxima(f), f.vida);
  s += escudo(154, 187, 34, 34) + texto(171, 207, f.deflexao || 0, { tam: 12, peso: 'bold', ancora: 'middle' });
  s += rotulo(171, 229, 'Deflexão');
  s += recurso(244, 'Foco', focoMaximo(f), f.foco);
  s += recurso(442, 'Investidura', f.investiduraMaxima || 0, f.investidura || 0);
  return s;
}

/* ------------------------------------------------------------ frente */
function frente(f) {
  let s = cabecalho(f, false) + faixaDosReinos(f, true);

  // perícias: três colunas, seis linhas e uma em branco (fluxo ou própria)
  const extras = periciasDe(f).filter((p) => p.reino === 'fluxo');
  const proprias = (f.periciasProprias || []).map((p) => ({ ...p, propria: true }));
  const colunas = [
    { x: 14, reino: 'fisico' }, { x: 214, reino: 'cognitivo' }, { x: 414, reino: 'espiritual' },
  ];
  colunas.forEach((col, ci) => {
    const lista = PERICIAS.filter((p) => p.reino === col.reino);
    const extra = [...extras, ...proprias][ci];
    [...lista, extra || null].forEach((p, i) => {
      const y = 240 + i * 23;
      s += `<rect x="${col.x}" y="${y}" width="18" height="17" rx="1.5" fill="${CAIXA}" stroke="${LINHA}" stroke-width="0.8"/>`;
      if (!p) {
        s += `<line x1="${col.x + 24}" y1="${y + 13}" x2="${col.x + 120}" y2="${y + 13}" stroke="${LINHA}" stroke-width="0.5"/>`;
        s += circulos(col.x + 136, y + 9, 0);
        return;
      }
      const sigla = ATRIBUTOS.find((a) => a.id === p.atributo)?.sigla || '';
      const grad = p.reino === 'fluxo' ? (f.fluxos?.[p.nome] || 0) : p.propria ? (p.graduacoes || 0) : (f.pericias[p.nome] || 0);
      const mod = p.propria ? (f.atributos[p.atributo] || 0) + grad : modificador(f, p);
      s += texto(col.x + 9, y + 12.2, sinal(mod), { tam: 8, peso: 'bold', ancora: 'middle' });
      s += texto(col.x + 24, y + 11.5, `${p.nome.toUpperCase()} (${sigla})`, { tam: 6.2, peso: 'bold' });
      s += circulos(col.x + 136, y + 9, grad);
    });
  });

  // linha de estatísticas derivadas
  const mov = movimentoEfetivo(f).texto;
  const derivados = [
    { x: 14, w: 92, nome: 'Levantamento', valor: levantamento(f.atributos.for || 0) },
    { x: 110, w: 94, nome: 'Movimento', valor: mov },
    { x: 214, w: 188, nome: 'Dado de recuperação', valor: dadoRecuperacao(f.atributos.von || 0) },
    { x: 414, w: 184, nome: 'Distância dos sentidos', valor: sentidos(f.atributos.con || 0) },
  ];
  for (const d of derivados) {
    s += caixa(d.x, 404, d.w, 52, { c: 5 });
    s += rotulo(d.x + d.w / 2, 414, d.nome);
    s += texto(d.x + d.w / 2, 440, d.valor, { tam: 12, peso: 'bold', ancora: 'middle' });
  }

  // condições e especialidades
  s += caixa(14, 462, 190, 70, { c: 5 }) + rotulo(109, 472, 'Condições e lesões');
  const condicoes = (f.condicoes || []).map((c) => (typeof c === 'string' ? c : `${c.nome}${c.valor ? ` [${c.valor}]` : ''}`));
  s += bloco(20, 476, 178, 52, quebrar(condicoes.join(', '), 178, 7), { tam: 7 })[0];
  s += caixa(214, 462, 384, 70, { c: 5 }) + rotulo(406, 472, 'Especialidades');
  s += bloco(222, 476, 368, 52, quebrar((f.especialidades || []).join(' · '), 368, 7.4), { tam: 7.4 })[0];

  // armas e talentos
  s += caixa(14, 538, 190, 232, { c: 6 }) + rotulo(109, 548, 'Armas');
  const linhasArmas = [];
  for (const a of (f.armas || [])) {
    const l = linhaDeArma(f, a);
    quebrar(l.titulo, 178, 7, true).forEach((t) => linhasArmas.push({ texto: t, negrito: true }));
    quebrar(l.detalhe, 178, 7).forEach((t) => linhasArmas.push(t));
    if (l.tracos) quebrar(l.tracos, 178, 6.4).forEach((t) => linhasArmas.push(t));
    linhasArmas.push('');
  }
  s += bloco(20, 552, 178, 214, linhasArmas, { tam: 7 })[0];

  s += caixa(214, 538, 384, 232, { c: 6 }) + rotulo(406, 548, 'Talentos');
  const [svgTalentos, sobra] = bloco(222, 552, 368, 214, linhasDeTalentos(f, 368), { tam: 6.6 });
  s += svgTalentos;

  s += texto(L / 2, 784, 'Ficha gerada pela Mesa de Roshar · projeto de fã, sem vínculo com a Brotherwise Games', { tam: 5.4, cor: TINTA2, ancora: 'middle' });
  return [s, sobra];
}

/* ------------------------------------------------------------ verso */
function verso(f, talentosQueSobraram) {
  let s = cabecalho(f, true) + faixaDosReinos(f, false);
  const topo = 194;

  // coluna da esquerda: aparência e talentos (continuação)
  s += caixa(14, topo, 190, 216, { c: 6 }) + rotulo(109, topo + 10, 'Aparência do personagem');
  s += bloco(20, topo + 14, 178, 196, quebrar(f.aparencia || '', 178, 7.2), { tam: 7.2 })[0];
  s += caixa(14, topo + 222, 190, 354, { c: 6 }) + rotulo(109, topo + 232, 'Talentos (continuação)');
  s += bloco(20, topo + 236, 178, 334, talentosQueSobraram.flatMap((l) => quebrar(typeof l === 'object' ? l.texto : l, 178, 6.6)), { tam: 6.6 })[0];

  // coluna do meio: armadura, equipamento, marcos; anotações
  s += caixa(214, topo, 190, 300, { c: 6 }) + rotulo(309, topo + 10, 'Armadura e equipamento');
  const equipamento = [f.armadura ? `${f.armadura} (deflexão ${f.deflexao || 0})` : '', f.equipamento || '']
    .filter(Boolean).join('\n');
  s += bloco(220, topo + 14, 178, 250, quebrar(equipamento, 178, 7), { tam: 7 })[0];
  s += caixa(220, topo + 270, 178, 24, { c: 4 });
  s += texto(226, topo + 281, 'MARCOS', { tam: 5.6, peso: 'bold', cor: TINTA2 });
  s += texto(392, topo + 288, f.marcos || '', { tam: 11, peso: 'bold', ancora: 'end' });
  s += caixa(214, topo + 306, 190, 270, { c: 6 }) + rotulo(309, topo + 316, 'Anotações');
  s += bloco(220, topo + 320, 178, 250, quebrar(f.anotacoes || '', 178, 7), { tam: 7 })[0];

  // coluna da direita: propósito, obstáculo, objetivos; conexões
  s += caixa(414, topo, 184, 300, { c: 6 });
  s += rotulo(506, topo + 10, 'Propósito');
  s += bloco(420, topo + 14, 172, 36, quebrar(f.proposito || '', 172, 7), { tam: 7 })[0];
  s += `<line x1="414" y1="${topo + 54}" x2="598" y2="${topo + 54}" stroke="${LINHA}" stroke-width="0.6"/>`;
  s += rotulo(506, topo + 64, 'Obstáculo');
  s += bloco(420, topo + 68, 172, 36, quebrar(f.obstaculo || '', 172, 7), { tam: 7 })[0];
  s += `<line x1="414" y1="${topo + 108}" x2="598" y2="${topo + 108}" stroke="${LINHA}" stroke-width="0.6"/>`;
  s += rotulo(506, topo + 118, 'Objetivos');
  const objetivos = Array.isArray(f.objetivos) ? f.objetivos : [];
  for (let i = 0; i < 8; i += 1) {
    const y = topo + 138 + i * 19.5;
    const o = objetivos[i];
    s += `<line x1="420" y1="${y}" x2="560" y2="${y}" stroke="${LINHA}" stroke-width="0.5"/>`;
    if (o?.texto) s += texto(421, y - 2.5, quebrar(o.texto, 138, 6.6)[0], { tam: 6.6 });
    s += circulos(568, y - 3, o?.progresso || 0, 3, 2.4);
  }
  s += caixa(414, topo + 306, 184, 270, { c: 6 }) + rotulo(506, topo + 316, 'Conexões');
  s += bloco(420, topo + 320, 172, 250, quebrar(f.conexoes || '', 172, 7), { tam: 7 })[0];

  s += texto(L / 2, 784, 'Ficha gerada pela Mesa de Roshar · projeto de fã, sem vínculo com a Brotherwise Games', { tam: 5.4, cor: TINTA2, ancora: 'middle' });
  return s;
}

const embrulhar = (conteudo, titulo) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L} ${A}" width="${L}" height="${A}" role="img" aria-label="${escXml(titulo)}">`
  + `<rect width="${L}" height="${A}" fill="#ffffff"/>${conteudo}</svg>`;

/** As duas páginas da ficha, em SVG. */
export function paginasDaFolha(f) {
  const [p1, sobra] = frente(f);
  return [
    embrulhar(p1, `Frente da ficha de ${f.nome || 'personagem'}`),
    embrulhar(verso(f, sobra), `Verso da ficha de ${f.nome || 'personagem'}`),
  ];
}

/* ------------------------------------------------------------ PDF */
const carregados = {};
function carregarScript(src) {
  carregados[src] ??= new Promise((ok, erro) => {
    const s = document.createElement('script');
    s.src = src; s.onload = ok;
    s.onerror = () => erro(new Error(`Não consegui carregar ${src}`));
    document.head.append(s);
  });
  return carregados[src];
}

const nomeDoArquivo = (f) =>
  `Ficha - ${(f.nome || 'personagem').replace(/[\\/:*?"<>|]+/g, '').trim() || 'personagem'}.pdf`;

/** Gera e baixa o PDF das duas páginas. */
export async function baixarFolhaPDF(f) {
  if (!window.jspdf) await carregarScript('assets/vendor/jspdf.umd.min.js?v=1');
  if (!window.jspdf.jsPDF.API.svg) await carregarScript('assets/vendor/svg2pdf.umd.min.js?v=1');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'letter', compress: true });
  doc.setProperties({ title: `Ficha de ${f.nome || 'personagem'}`, creator: 'Mesa de Roshar' });

  const palco = document.createElement('div');
  palco.style.cssText = 'position:fixed;left:-10000px;top:0;width:612px;height:792px;overflow:hidden';
  document.body.append(palco);
  try {
    const paginas = paginasDaFolha(f);
    for (let i = 0; i < paginas.length; i += 1) {
      if (i) doc.addPage('letter', 'portrait');
      palco.innerHTML = paginas[i];
      await doc.svg(palco.firstElementChild, { x: 0, y: 0, width: L, height: A });
    }
    doc.save(nomeDoArquivo(f));
  } finally {
    palco.remove();
  }
}
