/* =========================================================================
   estado.js — os dados do jogador e como eles são guardados
   Tudo mora no localStorage do próprio aparelho. Nada sai daqui.
   ========================================================================= */

import { PERICIAS, FLUXOS, vidaMaxima, focoMaximo } from './sistema.js';

const CHAVE = 'mesa-roshar:dados';
const VERSAO = 1;

export const id = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export function fichaNova(nome = 'Novo personagem') {
  const f = {
    id: id(),
    nome,
    ancestralidade: '', cultura: '', trilhas: '',
    nivel: 1, radiante: false,
    atributos: { for: 0, vel: 0, int: 0, von: 0, con: 0, pre: 0 },
    pericias: {}, fluxos: {},
    vida: 10, ajusteVida: 0,
    foco: 2, ajusteFoco: 0,
    investidura: 0, investiduraMaxima: 0,
    deflexao: 0,
    condicoes: [], especialidades: [], talentos: [], armas: [],
    equipamento: '', proposito: '', obstaculo: '', objetivos: '',
    conexoes: '', ideais: '', anotacoes: '',
  };
  PERICIAS.forEach((p) => { f.pericias[p.nome] = 0; });
  FLUXOS.forEach((p) => { f.fluxos[p.nome] = 0; });
  return f;
}

function estadoInicial() {
  const f = fichaNova('Meu personagem');
  return {
    versao: VERSAO,
    fichas: [f],
    fichaAtiva: f.id,
    historico: [],
    combate: { rodada: 1, ordem: [] },
    aba: 'ficha',
    rascunho: null,   // criação de personagem pausada no meio
  };
}

function carregar() {
  try {
    const cru = localStorage.getItem(CHAVE);
    if (!cru) return estadoInicial();
    const dados = JSON.parse(cru);
    if (!dados || !Array.isArray(dados.fichas) || !dados.fichas.length) return estadoInicial();
    // preenche campos que versões futuras possam ter acrescentado
    dados.combate ??= { rodada: 1, ordem: [] };
    dados.historico ??= [];
    dados.fichas.forEach((f) => {
      f.pericias ??= {}; f.fluxos ??= {};
      PERICIAS.forEach((p) => { f.pericias[p.nome] ??= 0; });
      FLUXOS.forEach((p) => { f.fluxos[p.nome] ??= 0; });
    });
    return dados;
  } catch (e) {
    console.warn('Não consegui ler os dados salvos; começando do zero.', e);
    return estadoInicial();
  }
}

export const ST = carregar();

let pendente;
let aoSalvarFalhar = () => {};
export const seFalharAoSalvar = (fn) => { aoSalvarFalhar = fn; };

/** Grava com um respiro, para não escrever a cada tecla digitada. */
export function salvar() {
  clearTimeout(pendente);
  pendente = setTimeout(gravarAgora, 200);
}

export function gravarAgora() {
  clearTimeout(pendente);
  try {
    localStorage.setItem(CHAVE, JSON.stringify(ST));
  } catch (e) {
    aoSalvarFalhar(e);
  }
}

// Fechar a aba não pode custar o último ajuste.
addEventListener('beforeunload', gravarAgora);
addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') gravarAgora();
});

export const fichaAtual = () =>
  ST.fichas.find((f) => f.id === ST.fichaAtiva) || ST.fichas[0];

export function adicionarFicha(ficha) {
  ST.fichas.push(ficha);
  ST.fichaAtiva = ficha.id;
  salvar();
  return ficha;
}

export function duplicarFicha() {
  const copia = structuredClone(fichaAtual());
  copia.id = id();
  copia.nome += ' (cópia)';
  return adicionarFicha(copia);
}

export function removerFicha(idAlvo) {
  if (ST.fichas.length < 2) return false;
  ST.fichas = ST.fichas.filter((f) => f.id !== idAlvo);
  if (ST.fichaAtiva === idAlvo) ST.fichaAtiva = ST.fichas[0].id;
  salvar();
  return true;
}

export function registrarRolagem(total, rotulo, conta) {
  ST.historico.unshift({
    total, rotulo, conta,
    hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  });
  ST.historico = ST.historico.slice(0, 60);
  salvar();
}

/** Descanso longo: recursos cheios e um degrau de Exausto a menos (p.291). */
export function descansoLongo(f) {
  f.vida = vidaMaxima(f);
  f.foco = focoMaximo(f);
  if (f.radiante) f.investidura = f.investiduraMaxima || 0;
  const i = f.condicoes.indexOf('Exausto');
  if (i >= 0) f.condicoes.splice(i, 1);
  salvar();
}

export function exportarTudo() {
  const blob = new Blob([JSON.stringify(ST, null, 1)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mesa-roshar-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importarTudo(arquivo) {
  const texto = await arquivo.text();
  const dados = JSON.parse(texto);
  if (!dados || !Array.isArray(dados.fichas) || !dados.fichas.length) {
    throw new Error('Esse arquivo não tem fichas dentro.');
  }
  Object.keys(ST).forEach((k) => delete ST[k]);
  Object.assign(ST, dados);
  gravarAgora();
}
