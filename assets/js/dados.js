/* =========================================================================
   dados.js — o motor de rolagem
   ========================================================================= */

const d = (lados) => 1 + Math.floor(Math.random() * lados);

export const sinal = (n) => (n >= 0 ? '+' : '') + n;

/* Vantagem (p.58): para cada vantagem você rola dois de um dado escolhido e
   fica com o melhor; desvantagem, com o pior. Vantagem e desvantagem se
   cancelam, então o que importa é o saldo. */
export function rolarCom(lados, vantagens = 0, desvantagens = 0) {
  const saldo = vantagens - desvantagens;
  const quantos = Math.abs(saldo) + 1;
  const rolagens = Array.from({ length: quantos }, () => d(lados));
  const escolhido = saldo >= 0 ? Math.max(...rolagens) : Math.min(...rolagens);
  return { escolhido, rolagens };
}

/* Dado de trama (p.8): num d6 comum, 1 e 2 são Complicação — e ainda assim
   somam ao teste —, 3 e 4 não fazem nada, 5 e 6 são Oportunidade. */
export function faceDaTrama(valor) {
  if (valor === 1) return { tipo: 'C', bonus: 2, texto: 'Complicação (+2)' };
  if (valor === 2) return { tipo: 'C', bonus: 4, texto: 'Complicação (+4)' };
  if (valor <= 4)  return { tipo: null, bonus: 0, texto: 'em branco' };
  return { tipo: 'O', bonus: 0, texto: 'Oportunidade' };
}

export function rolarTrama() {
  const valor = d(6);
  return { valor, ...faceDaTrama(valor) };
}

/**
 * Um teste de perícia completo: d20 + modificador, com dado de trama opcional.
 * Natural 20 vira Oportunidade e natural 1 vira Complicação, mesmo sem trama.
 */
export function rolarTeste({ rotulo = 'Teste', modificador = 0, vantagens = 0, desvantagens = 0, trama = false }) {
  const { escolhido: d20, rolagens } = rolarCom(20, vantagens, desvantagens);
  let total = d20 + modificador;
  let selo = null;
  let extra = '';

  const partes = [
    rolagens.length > 1 ? `d20 [${rolagens.join(', ')}] → ${d20}` : `d20 ${d20}`,
    `${sinal(modificador)}`,
  ];

  if (trama) {
    const t = rolarCom(6, vantagens, desvantagens);
    const face = faceDaTrama(t.escolhido);
    total += face.bonus;
    selo = face.tipo;
    partes.push(`· trama ${face.texto}`);
  }
  if (d20 === 20) { selo = 'O'; extra = 'Natural 20 — Oportunidade!'; }
  if (d20 === 1)  { selo = 'C'; extra = 'Natural 1 — Complicação!'; }

  return {
    rotulo, total, d20, selo, extra,
    conta: `${partes.join(' ')} = ${total}`,
    critico: d20 === 20 ? 'alto' : d20 === 1 ? 'baixo' : null,
  };
}

/** Rola uma expressão simples como "2d6" ou "1d8". */
export function rolarExpressao(expressao, { maximo = false } = {}) {
  const m = /^\s*(\d*)\s*d\s*(\d+)\s*$/i.exec(expressao || '');
  if (!m) return null;
  const quantos = Number(m[1]) || 1;
  const lados = Number(m[2]);
  const rolagens = Array.from({ length: quantos }, () => (maximo ? lados : d(lados)));
  return { rolagens, soma: rolagens.reduce((a, b) => a + b, 0), quantos, lados };
}

/** Dano de arma: o dado dela mais o modificador da perícia usada (p.56). */
export function rolarDano(arma, modificadorPericia, critico = false) {
  const base = rolarExpressao(arma.dano, { maximo: critico });
  if (!base) return null;
  return {
    total: base.soma + modificadorPericia,
    conta: `${arma.dano} [${base.rolagens.join(', ')}] ${sinal(modificadorPericia)}`,
    critico,
  };
}

export function rolarDadosAvulsos(quantos, lados) {
  const rolagens = Array.from({ length: quantos }, () => d(lados));
  return { rolagens, total: rolagens.reduce((a, b) => a + b, 0) };
}
