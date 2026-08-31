/* =========================================================================
   prerequisitos.js — lê os pré-requisitos de um talento (p.18)

   Confere graduação de perícia, talento anterior da árvore, nível e Ideais.
   O que não der para interpretar fica marcado como "não sei dizer" em vez de
   passar batido: melhor avisar do que liberar algo inválido.
   ========================================================================= */

import { PERICIAS, FLUXOS } from './sistema.js';
import { normalizar } from './pacote.js';

const grad = (ficha, nome) => {
  const p = [...PERICIAS, ...FLUXOS].find((x) => normalizar(x.nome) === normalizar(nome));
  if (!p) return null;
  return p.reino === 'fluxo' ? (ficha.fluxos[p.nome] || 0) : (ficha.pericias[p.nome] || 0);
};

const temTalento = (ficha, nome) =>
  ficha.talentos.some((t) => normalizar(t) === normalizar(nome));

/** Avalia uma cláusula. Devolve true, false, ou null quando não souber ler. */
function avaliarClausula(texto, ficha) {
  const p = texto.trim();
  if (!p) return true;

  let m = /^n[íi]vel\s*(\d+)/i.exec(p);
  if (m) return (ficha.nivel || 1) >= Number(m[1]);

  if (/falar o .*ideal/i.test(p)) {
    // Ideais são jurados em jogo; a ficha guarda isso em texto livre.
    return normalizar(ficha.ideais || '').includes(normalizar(p.replace(/^falar\s+/i, '')));
  }

  if (/ancestralidade cantor/i.test(p)) return /cantor/i.test(ficha.ancestralidade || '');
  if (/ancestralidade humano/i.test(p)) return /humano/i.test(ficha.ancestralidade || '');

  m = /talento(?:-?\s?chave)?\s+(.+)$/i.exec(p);
  if (m) return temTalento(ficha, m[1].trim());

  m = /^(.+?)\s*(\d+)\s*\+?$/.exec(p);
  if (m) {
    const g = grad(ficha, m[1].trim());
    if (g !== null) return g >= Number(m[2]);
  }
  return null;
}

/**
 * Quebra o pré-requisito em cláusulas e diz se o personagem atende.
 * `situacao` é 'atende', 'falta' ou 'indefinido'.
 */
export function conferirPreRequisitos(talento, ficha) {
  const texto = (talento.preRequisitos || '').trim();
  if (!texto || /^nenhum/i.test(texto)) {
    return { situacao: 'atende', clausulas: [] };
  }

  const clausulas = texto.split(';').map((c) => {
    const resultado = avaliarClausula(c, ficha);
    return { texto: c.trim(), resultado };
  });

  if (clausulas.some((c) => c.resultado === false)) return { situacao: 'falta', clausulas };
  if (clausulas.some((c) => c.resultado === null)) return { situacao: 'indefinido', clausulas };
  return { situacao: 'atende', clausulas };
}

export const podeEscolher = (talento, ficha) =>
  conferirPreRequisitos(talento, ficha).situacao === 'atende';
