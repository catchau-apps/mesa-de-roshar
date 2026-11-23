/* =========================================================================
   sistema.js — a mecânica do Cosmere RPG
   Só estrutura de regra: nomes de atributo e perícia, fórmulas e tabelas.
   Nenhum texto dos livros mora aqui; isso vem do pacote do próprio jogador.
   Páginas citadas são as numeradas no Guia de Regras (edição brasileira).
   ========================================================================= */

export const ATRIBUTOS = [
  { id: 'for', nome: 'Força',       sigla: 'FOR', reino: 'fisico' },
  { id: 'vel', nome: 'Velocidade',  sigla: 'VEL', reino: 'fisico' },
  { id: 'int', nome: 'Intelecto',   sigla: 'INT', reino: 'cognitivo' },
  { id: 'von', nome: 'Vontade',     sigla: 'VON', reino: 'cognitivo' },
  { id: 'con', nome: 'Consciência', sigla: 'CON', reino: 'espiritual' },
  { id: 'pre', nome: 'Presença',    sigla: 'PRE', reino: 'espiritual' },
];

/* As dezoito perícias (p.60–65). */
export const PERICIAS = [
  { nome: 'Agilidade',        atributo: 'vel', reino: 'fisico' },
  { nome: 'Armamento Leve',   atributo: 'vel', reino: 'fisico' },
  { nome: 'Armamento Pesado', atributo: 'for', reino: 'fisico' },
  { nome: 'Atletismo',        atributo: 'for', reino: 'fisico' },
  { nome: 'Furtividade',      atributo: 'vel', reino: 'fisico' },
  { nome: 'Ladroagem',        atributo: 'vel', reino: 'fisico' },

  { nome: 'Dedução',          atributo: 'int', reino: 'cognitivo' },
  { nome: 'Disciplina',       atributo: 'von', reino: 'cognitivo' },
  { nome: 'Intimidação',      atributo: 'von', reino: 'cognitivo' },
  { nome: 'Manufatura',       atributo: 'int', reino: 'cognitivo' },
  { nome: 'Medicina',         atributo: 'int', reino: 'cognitivo' },
  { nome: 'Saber',            atributo: 'int', reino: 'cognitivo' },

  { nome: 'Dissimulação',     atributo: 'pre', reino: 'espiritual' },
  { nome: 'Intuição',         atributo: 'con', reino: 'espiritual' },
  { nome: 'Liderança',        atributo: 'pre', reino: 'espiritual' },
  { nome: 'Percepção',        atributo: 'con', reino: 'espiritual' },
  { nome: 'Persuasão',        atributo: 'pre', reino: 'espiritual' },
  { nome: 'Sobrevivência',    atributo: 'con', reino: 'espiritual' },
];

/* Perícias de fluxo: só aparecem para Radiantes (p.49–51). */
export const FLUXOS = [
  { nome: 'Tensão',        atributo: 'for', reino: 'fluxo' },
  { nome: 'Abrasão',       atributo: 'vel', reino: 'fluxo' },
  { nome: 'Divisão',       atributo: 'int', reino: 'fluxo' },
  { nome: 'Transporte',    atributo: 'int', reino: 'fluxo' },
  { nome: 'Coesão',        atributo: 'von', reino: 'fluxo' },
  { nome: 'Transformação', atributo: 'von', reino: 'fluxo' },
  { nome: 'Gravitação',    atributo: 'con', reino: 'fluxo' },
  { nome: 'Progressão',    atributo: 'con', reino: 'fluxo' },
  { nome: 'Adesão',        atributo: 'pre', reino: 'fluxo' },
  { nome: 'Iluminação',    atributo: 'pre', reino: 'fluxo' },
];

export const REINOS = {
  fisico:     { nome: 'Físicas',     defesa: 'Física' },
  cognitivo:  { nome: 'Cognitivas',  defesa: 'Cognitiva' },
  espiritual: { nome: 'Espirituais', defesa: 'Espiritual' },
  fluxo:      { nome: 'Fluxos',      defesa: null },
};

/* Tabelas por valor de atributo (p.49–50). O par é [valor máximo, resultado]. */
const TABELA_MOVIMENTO   = [[0, '6 m'], [2, '7,5 m'], [4, '9 m'], [6, '12 m'], [8, '18 m'], [Infinity, '24 m']];
const TABELA_RECUPERACAO = [[0, '1d4'], [2, '1d6'], [4, '1d8'], [6, '1d10'], [8, '1d12'], [Infinity, '1d20']];
const TABELA_SENTIDOS    = [[0, '1,5 m'], [2, '3 m'], [4, '6 m'], [6, '15 m'], [8, '30 m'], [Infinity, 'sem limite']];
/* Capacidade de levantamento por Força (p.48). A ficha oficial tem esse campo. */
const TABELA_LEVANTAMENTO = [[0, '50 kg'], [2, '100 kg'], [4, '250 kg'], [6, '500 kg'], [8, '2.500 kg'], [Infinity, '5.000 kg']];

const consultar = (tabela, valor) => (tabela.find(([teto]) => valor <= teto) || tabela.at(-1))[1];

export const movimento    = (velocidade) => consultar(TABELA_MOVIMENTO, velocidade);
export const dadoRecuperacao = (vontade) => consultar(TABELA_RECUPERACAO, vontade);
export const sentidos     = (consciencia) => consultar(TABELA_SENTIDOS, consciencia);
export const levantamento = (forca) => consultar(TABELA_LEVANTAMENTO, forca);

/* --- fórmulas da ficha --------------------------------------------------
   Vida = 10 + FOR e Foco = 2 + VON (p.23).
   Cada defesa = 10 + os dois atributos do reino (p.24).
   Modificador de perícia = atributo + graduações (p.56).                  */
export const patamar   = (f) => Math.min(5, Math.ceil((f.nivel || 1) / 5));
export const gradMaxima = (f) => Math.min(5, patamar(f) + 1);

/* --- talentos que mudam números da ficha ---------------------------------
   O passo 8 da criação (p.23) manda somar "bônus de talentos": aqui está o
   que cada um faz, para a ficha somar sozinha em vez de pedir ajuste manual.
   Só os efeitos permanentes; o que depende de situação fica no texto.     */
export const EFEITOS_DE_TALENTO = {
  'Senhor de Si':    { defesa: { cognitivo: 2, espiritual: 2 }, nota: '+2 nas defesas Cognitiva e Espiritual' },
  'Mente Ambiciosa': { defesa: { cognitivo: 2 }, nota: '+2 na defesa Cognitiva' },
  'Resistente':      { vidaPorNivel: 1, nota: '+1 de vida máxima por nível' },
  'Compostura':      { focoPorPatamar: 1, nota: '+1 de foco máximo por patamar' },
};

const normalizarNome = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Soma o que os talentos da ficha fazem nas estatísticas. */
export function efeitosDosTalentos(f) {
  const total = { defesa: { fisico: 0, cognitivo: 0, espiritual: 0 }, vida: 0, foco: 0, fontes: [] };
  const nomes = new Set((f.talentos || []).map(normalizarNome));
  for (const [nome, e] of Object.entries(EFEITOS_DE_TALENTO)) {
    if (!nomes.has(normalizarNome(nome))) continue;
    for (const [reino, v] of Object.entries(e.defesa || {})) total.defesa[reino] += v;
    if (e.vidaPorNivel) total.vida += e.vidaPorNivel * (f.nivel || 1);
    if (e.focoPorPatamar) total.foco += e.focoPorPatamar * patamar(f);
    total.fontes.push({ nome, nota: e.nota });
  }
  return total;
}

export const vidaMaxima = (f) => 10 + (f.atributos.for || 0) + efeitosDosTalentos(f).vida + (Number(f.ajusteVida) || 0);
export const focoMaximo = (f) => 2 + (f.atributos.von || 0) + efeitosDosTalentos(f).foco + (Number(f.ajusteFoco) || 0);

export const defesaFisica     = (f) => 10 + (f.atributos.for || 0) + (f.atributos.vel || 0) + efeitosDosTalentos(f).defesa.fisico;
export const defesaCognitiva  = (f) => 10 + (f.atributos.int || 0) + (f.atributos.von || 0) + efeitosDosTalentos(f).defesa.cognitivo;
export const defesaEspiritual = (f) => 10 + (f.atributos.con || 0) + (f.atributos.pre || 0) + efeitosDosTalentos(f).defesa.espiritual;

/**
 * Modificador de perícia: atributo + graduações, já com o que as condições
 * fizerem — Aprimorado soma no atributo, Exausto tira de todo teste.
 */
export function modificador(ficha, pericia) {
  const efeitos = efeitosAtivos(ficha);
  const base = (ficha.atributos[pericia.atributo] || 0) + efeitos.bonusAtributo[pericia.atributo];
  const grad = pericia.reino === 'fluxo'
    ? (ficha.fluxos[pericia.nome] || 0)
    : (ficha.pericias[pericia.nome] || 0);
  return base + grad - efeitos.penalidadeTestes;
}

/* --- ordens Radiantes (cap.5) -------------------------------------------
   Cada ordem manipula exatamente dois fluxos, e o Radiante ganha uma perícia
   para cada um deles ao falar o Primeiro Ideal, começando com 1 graduação em
   cada. Ninguém tem os dez: a lista abaixo saiu da recompensa do Primeiro
   Ideal de cada ordem. O livro básico traz nove ordens jogáveis.            */
export const ORDENS_RADIANTES = {
  'Alternauta':               ['Transformação', 'Transporte'],
  'Corredor dos Ventos':      ['Adesão', 'Gravitação'],
  'Dançarino de Precipícios': ['Abrasão', 'Progressão'],
  'Guardião das Pedras':      ['Coesão', 'Tensão'],
  'Plasmador':                ['Coesão', 'Transporte'],
  'Pulverizador':             ['Abrasão', 'Divisão'],
  'Rompe-céus':               ['Divisão', 'Gravitação'],
  'Sentinela da Verdade':     ['Iluminação', 'Progressão'],
  'Teceluz':                  ['Iluminação', 'Transformação'],
};

/** Os dois fluxos da ordem, ou nenhum enquanto ela não for escolhida. */
export const fluxosDaOrdem = (ordem) =>
  (ORDENS_RADIANTES[ordem] || []).map((nome) => FLUXOS.find((f) => f.nome === nome));

export const periciasDe = (ficha) =>
  ficha.radiante ? [...PERICIAS, ...fluxosDaOrdem(ficha.ordem)] : PERICIAS;

/* --- limites da criação de personagem (p.18) --- */
export const CRIACAO = {
  pontosAtributo: 12,
  atributoMaximo: 3,
  graduacoes: 4,
  graduacaoMaxima: 2,
  especialidadesCulturais: 2,
};

/* --- condições (p.293–295) -----------------------------------------------
   Além do texto, cada condição declara o que faz na ficha. É isso que deixa a
   ficha reagir: marcar Lento muda o movimento, marcar Exausto [2] tira 2 de
   todos os testes, e assim por diante.
   `valor` diz que a condição carrega um número (Exausto [−2], Aprimorado [+1]). */
export const CONDICOES = [
  { nome: 'Afligido', texto: 'Sofre o dano indicado no fim de cada turno seu.', valor: 'dano' },
  { nome: 'Aprimorado', texto: 'Ganha o bônus de atributo indicado; não muda defesas nem os máximos.',
    valor: 'atributo', efeito: { bonusAtributo: true } },
  { nome: 'Atordoado', texto: 'Ganha duas ações a menos e nenhuma reação no seu turno.',
    efeito: { acoesAMenos: 2, semReacoes: true } },
  { nome: 'Desorientado', texto: 'Sem reações; testes de sentidos com desvantagem.',
    efeito: { semReacoes: true, desvantagemSentidos: true } },
  { nome: 'Determinado', texto: 'Ao falhar um teste, pode somar uma Oportunidade e perder a condição.' },
  { nome: 'Exausto', texto: 'Penalidade cumulativa nos testes; cai 1 a cada descanso longo.',
    valor: 'penalidade', efeito: { penalidadeTestes: true } },
  { nome: 'Focado', texto: 'Habilidades custam 1 de foco a menos.', efeito: { custoFocoMenor: true } },
  { nome: 'Imobilizado', texto: 'Movimento zero; não se move nem é movido.', efeito: { movimento: 'zero' } },
  { nome: 'Inconsciente', texto: 'Movimento zero e Prostrado; não age nem reage.',
    efeito: { movimento: 'zero', semReacoes: true, semAcoes: true } },
  { nome: 'Lento', texto: 'Movimento pela metade.', efeito: { movimento: 'metade' } },
  { nome: 'Potencializado', texto: 'Vantagem em tudo e Investidura cheia no início de cada turno seu.',
    efeito: { vantagemGeral: true, investiduraCheia: true } },
  { nome: 'Prostrado', texto: 'Caído e Lento; corpo a corpo contra você ganha vantagem.',
    efeito: { movimento: 'metade' } },
  { nome: 'Restringido', texto: 'Movimento zero e desvantagem, exceto para escapar.',
    efeito: { movimento: 'zero', desvantagemGeral: true } },
  { nome: 'Surpreendido', texto: 'Sem reação inicial, sem turno rápido e uma ação a menos.',
    efeito: { acoesAMenos: 1, semReacoes: true } },
];

export const condicaoPorNome = (nome) => CONDICOES.find((c) => c.nome === nome);

/**
 * Soma o que as condições ativas fazem. É a fonte única de verdade para a
 * ficha inteira: modificadores de perícia, movimento e avisos saem daqui.
 */
export function efeitosAtivos(ficha) {
  const total = {
    penalidadeTestes: 0,
    bonusAtributo: { for: 0, vel: 0, int: 0, von: 0, con: 0, pre: 0 },
    movimento: null, vantagemGeral: false, desvantagemGeral: false,
    desvantagemSentidos: false, semReacoes: false, semAcoes: false,
    acoesAMenos: 0, custoFocoMenor: false, investiduraCheia: false,
    ativas: [],
  };
  for (const marcada of (ficha.condicoes || [])) {
    const nome = typeof marcada === 'string' ? marcada : marcada.nome;
    const definicao = condicaoPorNome(nome);
    if (!definicao) continue;
    total.ativas.push(marcada);
    const e = definicao.efeito || {};
    if (e.penalidadeTestes) total.penalidadeTestes += Number(marcada.valor) || 1;
    if (e.bonusAtributo && marcada.atributo) {
      total.bonusAtributo[marcada.atributo] += Number(marcada.valor) || 1;
    }
    // movimento zero manda sobre movimento pela metade
    if (e.movimento === 'zero') total.movimento = 'zero';
    else if (e.movimento === 'metade' && total.movimento !== 'zero') total.movimento = 'metade';
    if (e.vantagemGeral) total.vantagemGeral = true;
    if (e.desvantagemGeral) total.desvantagemGeral = true;
    if (e.desvantagemSentidos) total.desvantagemSentidos = true;
    if (e.semReacoes) total.semReacoes = true;
    if (e.semAcoes) total.semAcoes = true;
    if (e.acoesAMenos) total.acoesAMenos = Math.max(total.acoesAMenos, e.acoesAMenos);
    if (e.custoFocoMenor) total.custoFocoMenor = true;
    if (e.investiduraCheia) total.investiduraCheia = true;
  }
  return total;
}

/** O valor do atributo já com o bônus de Aprimorado. */
export function atributoEfetivo(ficha, id) {
  return (ficha.atributos[id] || 0) + efeitosAtivos(ficha).bonusAtributo[id];
}

/** A taxa de movimento depois das condições. */
export function movimentoEfetivo(ficha) {
  const efeitos = efeitosAtivos(ficha);
  if (efeitos.movimento === 'zero') return { texto: '0 m', motivo: 'parado por condição' };
  const base = movimento(atributoEfetivo(ficha, 'vel'));
  if (efeitos.movimento !== 'metade') {
    return { texto: base, motivo: efeitos.bonusAtributo.vel ? 'Aprimorado' : null };
  }
  const numero = parseFloat(base.replace(',', '.'));
  const metade = String((numero / 2).toFixed(1)).replace(/\.0$/, '').replace('.', ',');
  return { texto: `${metade} m`, motivo: 'pela metade' };
}

/* --- ações de Radiante (p.124–125) --------------------------------------
   As três ações que a Investidura paga. Elas mexem na ficha de verdade, por
   isso guardam o que fazem, e não só o texto.                             */
export const ACOES_RADIANTE = [
  {
    nome: 'Inspirar Luz das Tempestades', custo: '2 ações', pagina: 124,
    texto: 'Extrai Luz das Tempestades de esferas infundidas a até 1,5 metro de você. '
         + 'Com esferas suficientes, recupera a Investidura até o valor máximo.',
    aplica: 'encherInvestidura',
  },
  {
    nome: 'Aprimorar', custo: '1 ação · 1 de Investidura', pagina: 125,
    texto: 'Fica Aprimorado [+1 de Força] e Aprimorado [+1 de Velocidade] até o fim do seu '
         + 'próximo turno. Ao fim de cada turno, pode gastar mais 1 de Investidura como ação '
         + 'livre para manter as condições.',
    aplica: 'aprimorar',
  },
  {
    nome: 'Regenerar', custo: 'ação livre · 1 de Investidura', pagina: 125,
    texto: 'Recupera vida igual a 1d6 + seu patamar. Pode ser usada mesmo Inconsciente ou '
         + 'impedido de agir de outra forma.',
    aplica: 'regenerar',
  },
];

/* --- ações e reações (p.303–305) --- */
export const ACOES = [
  ['Golpear', '1', 'Um ataque contra a defesa Física. Ao errar, 1 de foco raspa.'],
  ['Mover', '1', 'Anda até a sua taxa de movimento. Pode repetir no turno.'],
  ['Interagir', '1', 'Mexe num objeto ao alcance, sem teste. Pode repetir.'],
  ['Ganhar Vantagem', '1', 'Testa uma perícia contra a defesa correspondente; sucesso dá vantagem no próximo teste com outra perícia.'],
  ['Proteger', '1', 'Ergue o escudo ou se abriga: ataques contra você ganham desvantagem.'],
  ['Desengajar', '1', 'Move 1,5 m sem acionar Golpes Reativos.'],
  ['Usar uma Perícia', '1', 'Usa uma perícia que não seja de ataque.'],
  ['Preparar', '1*', 'Escolhe um acionamento e a ação que responde a ele.'],
  ['Agarrar', '2', 'Atletismo contra a defesa Física; sucesso deixa Restringido.'],
  ['Empurrar', '2', 'Atletismo contra a defesa Física; sucesso empurra 1,5 m.'],
  ['Recuperar', '2', 'Uma vez por cena, rola o dado de recuperação por vida e foco.'],
  ['Falar', '0', 'Conversa, sem teste.'],
  ['Largar', '0', 'Solta o que está segurando.'],
];

export const REACOES = [
  ['Auxiliar', 'Gasta 1 de foco para dar vantagem ao teste de um aliado.'],
  ['Esquivar', 'Gasta 1 de foco para impor desvantagem a um ataque contra você.'],
  ['Evitar Perigo', 'Teste de Agilidade contra um perigo (CD 15, ou o resultado do inimigo).'],
  ['Golpe Reativo', 'Quando um inimigo sai do seu alcance, gasta 1 de foco e ataca.'],
];

export const DIFICULDADES = [
  ['Fácil', 10], ['Mediana', 15], ['Difícil', 20], ['Muito Difícil', 25], ['Quase Impossível', 30],
];

export const LESOES = [
  ['−6 ou menos', 'Morte.'],
  ['−5 a 0', 'Lesão permanente.'],
  ['1 a 5', 'Lesão cruel — 6d6 dias.'],
  ['6 a 15', 'Lesão superficial — 1d6 dias.'],
  ['16+', 'Ferimento leve — o resto do dia.'],
];

export const OPORTUNIDADES = [
  ['Auxiliar um Aliado', 'O próximo teste de um aliado ganha vantagem.'],
  ['Recompor-se', 'Recupera 1 ponto de foco.'],
  ['Acerto Crítico', 'Num ataque, transforma o acerto em crítico (dano máximo).'],
  ['Influenciar a Narrativa', 'Uma reviravolta a seu favor.'],
];

export const COMPLICACOES = [
  ['Atrapalhar um Aliado', 'O próximo teste de um PJ sofre desvantagem.'],
  ['Ficar Distraído', 'Perde 1 ponto de foco.'],
  ['Influenciar a Narrativa', 'Uma reviravolta contra você.'],
];

/* --- trilhas heroicas (p.17) ---------------------------------------------
   Só o esqueleto mecânico: qual perícia a trilha dá de graça e qual é o
   talento-chave. O texto de cada uma vem do pacote do jogador.            */
export const TRILHAS = [
  { nome: 'Agente',    periciaInicial: 'Intuição',   talentoChave: 'Oportunista',
    especializacoes: ['Investigador', 'Espião', 'Ladrão'] },
  { nome: 'Caçador',   periciaInicial: 'Percepção',  talentoChave: 'Marcar Presa',
    especializacoes: ['Arqueiro', 'Assassino', 'Rastreador'] },
  { nome: 'Emissário', periciaInicial: 'Disciplina', talentoChave: 'Presença Estimulante',
    especializacoes: ['Diplomata', 'Fiel', 'Mentor'] },
  { nome: 'Erudito',   periciaInicial: 'Saber',      talentoChave: 'Erudição',
    especializacoes: ['Artifabriano', 'Estrategista', 'Cirurgião'] },
  { nome: 'Guerreiro', periciaInicial: 'Atletismo',  talentoChave: 'Postura Vigilante',
    especializacoes: ['Duelista', 'Fractário', 'Soldado'] },
  { nome: 'Líder',     periciaInicial: 'Liderança',  talentoChave: 'Comando Decisivo',
    especializacoes: ['Campeão', 'Oficial', 'Político'] },
];

/* Em que cada trilha costuma apoiar o personagem, para o construtor sugerir.
   Saiu das perícias que aparecem nos pré-requisitos de cada árvore (cap.4);
   com o pacote instalado, o construtor recalcula isso pela árvore real.   */
export const PERFIL_DAS_TRILHAS = {
  Agente:    { tema: 'Resolve problemas com astúcia ou mãos hábeis: investigação, espionagem, furtos.',
               pericias: ['Intuição', 'Dedução', 'Dissimulação', 'Ladroagem', 'Furtividade', 'Percepção'] },
  Caçador:   { tema: 'Atirador e rastreador: acha o alvo, persegue e elimina à distância.',
               pericias: ['Percepção', 'Sobrevivência', 'Armamento Leve', 'Agilidade', 'Furtividade', 'Atletismo'] },
  Emissário: { tema: 'Negociador e inspirador: convence, acalma e fortalece aliados.',
               pericias: ['Disciplina', 'Persuasão', 'Intuição', 'Liderança', 'Saber', 'Dissimulação'] },
  Erudito:   { tema: 'Pensador que planeja, constrói e cura: estratégia, fabriais e medicina.',
               pericias: ['Saber', 'Manufatura', 'Medicina', 'Dedução', 'Disciplina', 'Intuição'] },
  Guerreiro: { tema: 'Lutador de linha de frente: posturas, armas pesadas e resistência.',
               pericias: ['Atletismo', 'Armamento Pesado', 'Armamento Leve', 'Agilidade', 'Intimidação', 'Disciplina'] },
  Líder:     { tema: 'Comandante que guia aliados em combate e na política.',
               pericias: ['Liderança', 'Persuasão', 'Atletismo', 'Intimidação', 'Disciplina', 'Dissimulação'] },
};

/** O que cada atributo governa, em uma linha, para explicar na criação. */
export const PAPEL_DOS_ATRIBUTOS = {
  for: 'Defesa Física, vida máxima, levantamento',
  vel: 'Defesa Física, movimento',
  int: 'Defesa Cognitiva, especialidades extras',
  von: 'Defesa Cognitiva, foco máximo, dado de recuperação',
  con: 'Defesa Espiritual, distância dos sentidos',
  pre: 'Defesa Espiritual, influência sobre os outros',
};

/* --- equipamento (cap.7, p.246–252) --------------------------------------
   Só a mecânica de cada item: perícia, dano, alcance, traços e preço. */
export const ARMAS = [
  // armamento leve (p.246)
  { nome: 'Arco Curto',     pericia: 'Armamento Leve',   dano: '1d6', tipo: 'afiado',     alcance: 'Distância [24/96]', tracos: 'Duas Mãos',             perito: 'Saque Rápido', preco: 80 },
  { nome: 'Azagaia',        pericia: 'Armamento Leve',   dano: '1d6', tipo: 'afiado',     alcance: 'Corpo a corpo',     tracos: 'Arremesso [9/36]',      perito: 'Indireta', preco: 20 },
  { nome: 'Cajado',         pericia: 'Armamento Leve',   dano: '1d6', tipo: 'impactante', alcance: 'Corpo a corpo',     tracos: 'Discreta, Duas Mãos',   perito: 'Defensiva', preco: 1 },
  { nome: 'Espada Lateral', pericia: 'Armamento Leve',   dano: '1d6', tipo: 'afiado',     alcance: 'Corpo a corpo',     tracos: 'Saque Rápido',          perito: 'Mão Inábil', preco: 40 },
  { nome: 'Faca',           pericia: 'Armamento Leve',   dano: '1d4', tipo: 'afiado',     alcance: 'Corpo a corpo',     tracos: 'Discreta',              perito: 'Arremesso [6/18]', preco: 8 },
  { nome: 'Funda',          pericia: 'Armamento Leve',   dano: '1d4', tipo: 'impactante', alcance: 'Distância [9/36]',  tracos: 'Discreta',              perito: 'Indireta', preco: 2 },
  { nome: 'Lança Curta',    pericia: 'Armamento Leve',   dano: '1d8', tipo: 'afiado',     alcance: 'Corpo a corpo',     tracos: 'Duas Mãos',             perito: 'perde Duas Mãos', preco: 10 },
  { nome: 'Maça',           pericia: 'Armamento Leve',   dano: '1d6', tipo: 'impactante', alcance: 'Corpo a corpo',     tracos: '—',                     perito: 'Ímpeto', preco: 20 },
  { nome: 'Rapieira',       pericia: 'Armamento Leve',   dano: '1d6', tipo: 'afiado',     alcance: 'Corpo a corpo',     tracos: 'Saque Rápido',          perito: 'Defensiva', preco: 100 },
  // armamento pesado (p.247)
  { nome: 'Alabarda',       pericia: 'Armamento Pesado', dano: '1d10', tipo: 'afiado',     alcance: 'Corpo a corpo',          tracos: 'Duas Mãos',               perito: 'Corpo a corpo [+1,5]', preco: 40 },
  { nome: 'Arco Longo',     pericia: 'Armamento Pesado', dano: '1d6',  tipo: 'afiado',     alcance: 'Distância [45/180]',     tracos: 'Duas Mãos',               perito: 'Indireta', preco: 100 },
  { nome: 'Besta',          pericia: 'Armamento Pesado', dano: '1d8',  tipo: 'afiado',     alcance: 'Distância [30/120]',     tracos: 'Carregada [1], Duas Mãos', perito: 'Mortal', preco: 200 },
  { nome: 'Escudo',         pericia: 'Armamento Pesado', dano: '1d4',  tipo: 'impactante', alcance: 'Corpo a corpo',          tracos: 'Defensiva',               perito: 'Mão Inábil', preco: 10 },
  { nome: 'Espada Longa',   pericia: 'Armamento Pesado', dano: '1d8',  tipo: 'afiado',     alcance: 'Corpo a corpo',          tracos: 'Duas Mãos, Saque Rápido', perito: 'perde Duas Mãos', preco: 60 },
  { nome: 'Lança Longa',    pericia: 'Armamento Pesado', dano: '1d8',  tipo: 'afiado',     alcance: 'Corpo a corpo [+1,5]',   tracos: 'Duas Mãos',               perito: 'Defensiva', preco: 15 },
  { nome: 'Machado',        pericia: 'Armamento Pesado', dano: '1d6',  tipo: 'afiado',     alcance: 'Corpo a corpo',          tracos: 'Arremesso [6/18]',        perito: 'Mão Inábil', preco: 20 },
  { nome: 'Martelo',        pericia: 'Armamento Pesado', dano: '1d10', tipo: 'impactante', alcance: 'Corpo a corpo',          tracos: 'Duas Mãos',               perito: 'Ímpeto', preco: 40 },
  { nome: 'Montante',       pericia: 'Armamento Pesado', dano: '1d10', tipo: 'afiado',     alcance: 'Corpo a corpo',          tracos: 'Duas Mãos',               perito: 'Mortal', preco: 200 },
];

/* Todo personagem pode atacar desarmado (Atletismo, 1 de dano). */
export const DESARMADO = { nome: 'Desarmado', pericia: 'Atletismo', dano: '1', tipo: 'impactante', alcance: 'Corpo a corpo', tracos: '—', perito: '—', preco: 0 };

export const ARMADURAS = [
  { nome: 'Uniforme',            deflexao: 0, forca: 0, tracos: 'Apresentável', preco: 40 },
  { nome: 'Armadura de Couro',   deflexao: 1, forca: 0, tracos: '—',            preco: 60 },
  { nome: 'Cota de Malha',       deflexao: 2, forca: 3, tracos: 'Desajeitada [3]', preco: 80 },
  { nome: 'Placa Peitoral',      deflexao: 2, forca: 3, tracos: 'Desajeitada [3]', preco: 120 },
  { nome: 'Meia Armadura',       deflexao: 3, forca: 4, tracos: 'Desajeitada [4]', preco: 400 },
  { nome: 'Armadura Completa',   deflexao: 4, forca: 5, tracos: 'Desajeitada [5]', preco: 1600 },
];

const armasDe = (pericia) => ARMAS.filter((a) => a.pericia === pericia).map((a) => a.nome);

/* Conjuntos iniciais (p.243): o que dá para automatizar. A lista de itens
   vem do pacote; aqui só as escolhas de arma, a armadura e o dado de marcos. */
export const CONJUNTOS = {
  'Acadêmico': { armas: { quantas: 1, opcoes: ['Faca', 'Funda', 'Cajado'] }, armadura: 'Uniforme',
                 marcos: '3d12', especialidade: 'Literatura' },
  'Artesão':   { armas: { quantas: 1, opcoes: ['Martelo', ...armasDe('Armamento Leve')] }, armadura: 'Armadura de Couro',
                 marcos: '4d8' },
  'Militar':   { armas: { quantas: 2, opcoes: ARMAS.map((a) => a.nome) }, armadura: 'Cota de Malha',
                 marcos: '2d6', nota: 'Também vem com uniforme.' },
  'Cortesão':  { armas: { quantas: 1, opcoes: ['Espada Lateral', 'Montante', 'Espada Longa', 'Arco Longo'] }, armadura: '',
                 marcos: '4d20', conexao: 'Patrono da sua casa nobre' },
  'Prisioneiro': { armas: { quantas: 0, opcoes: [] }, armadura: '', marcos: '',
                   conexao: 'Um espreno Radiante que começou a se conectar com você' },
  'Submundo':  { armas: { quantas: 2, opcoes: armasDe('Armamento Leve') }, armadura: 'Armadura de Couro',
                 marcos: '1d20' },
};

/* Especialidades de exemplo (p.52–54), para escolher com um toque. */
export const ESPECIALIDADES_UTILIDADE = [
  'Andar a Cavalo', 'Cuidado de Animais', 'Engenharia', 'Estratégia Militar', 'História',
  'Manufatura de Arma', 'Manufatura de Armadura', 'Manufatura de Equipamento', 'Religião',
  'Literatura', 'Submundo', 'Alta Sociedade', 'Vida Militar',
];

/** Marcos do conjunto: "3d12" → soma rolada. */
export function rolarMarcos(expr) {
  const m = /^(\d+)d(\d+)$/.exec(expr || '');
  if (!m) return 0;
  let soma = 0;
  for (let i = 0; i < Number(m[1]); i += 1) soma += 1 + Math.floor(Math.random() * Number(m[2]));
  return soma;
}

export const ANCESTRALIDADES = ['Humano', 'Cantor'];

/* Os Ideais são jurados em ordem, então basta a ficha guardar até qual o
   personagem chegou: o resto se deduz. */
export const IDEAIS = ['Primeiro', 'Segundo', 'Terceiro', 'Quarto', 'Quinto'];

/** "Falar o Segundo Ideal" → 2. Devolve 0 quando não reconhece. */
export function nivelDoIdeal(texto) {
  const m = /(primeiro|segundo|terceiro|quarto|quinto)\s+ideal/i.exec(texto || '');
  return m ? IDEAIS.findIndex((x) => x.toLowerCase() === m[1].toLowerCase()) + 1 : 0;
}

/* =========================================================================
   Evolução de personagem (tabela do cap.1, p.25)
   ========================================================================= */

/* Vida ganha por nível. "+FOR" marca os níveis em que a Força entra de novo
   na conta — começo de cada patamar. */
const VIDA_POR_NIVEL = {
  2: 5, 3: 5, 4: 5, 5: 5,
  6: 4, 7: 4, 8: 4, 9: 4, 10: 4,
  11: 3, 12: 3, 13: 3, 14: 3, 15: 3,
  16: 2, 17: 2, 18: 2, 19: 2, 20: 2,
};
const NIVEIS_COM_FORCA = [6, 11, 16];           // ganham +FOR além do valor fixo
const NIVEIS_DE_ATRIBUTO = [3, 6, 9, 12, 15, 18];
const NIVEIS_DE_TALENTO_ANCESTRAL = [1, 6, 11, 16, 21];

/** O que o personagem ganha ao chegar neste nível. */
export function ganhosDoNivel(nivel, forca = 0) {
  if (nivel <= 1) {
    return {
      nivel: 1,
      vida: 10 + forca, vidaTexto: `10 + FOR (${10 + forca})`,
      pontosAtributo: CRIACAO.pontosAtributo,
      graduacoes: CRIACAO.graduacoes,
      graduacoesTexto: `${CRIACAO.graduacoes} + 1 da trilha inicial`,
      talentos: 1, talentoAncestral: true,
      talentoTexto: 'talento-chave da trilha inicial',
      escolhaEntreGraduacaoOuTalento: false,
    };
  }
  const acimaDe20 = nivel >= 21;
  const base = acimaDe20 ? 1 : (VIDA_POR_NIVEL[nivel] || 0);
  const comForca = NIVEIS_COM_FORCA.includes(nivel);
  return {
    nivel,
    vida: base + (comForca ? forca : 0),
    vidaTexto: comForca ? `+${base} + FOR (+${base + forca})` : `+${base}`,
    pontosAtributo: NIVEIS_DE_ATRIBUTO.includes(nivel) ? 1 : 0,
    graduacoes: acimaDe20 ? 1 : 2,
    graduacoesTexto: acimaDe20 ? '1 graduação OU 1 talento' : '+2 graduações',
    talentos: acimaDe20 ? 0 : 1,
    talentoAncestral: NIVEIS_DE_TALENTO_ANCESTRAL.includes(nivel),
    talentoTexto: acimaDe20 ? 'ou 1 talento, no lugar da graduação' : '+1 talento',
    escolhaEntreGraduacaoOuTalento: acimaDe20,
  };
}

/** Quanto o personagem deve ter acumulado até o nível atual. */
export function orcamentoAte(nivel, forca = 0) {
  const total = {
    pontosAtributo: 0, graduacoes: 0, talentos: 0,
    talentosAncestrais: 0, vida: 0,
  };
  for (let n = 1; n <= nivel; n += 1) {
    const g = ganhosDoNivel(n, forca);
    total.pontosAtributo += g.pontosAtributo;
    total.graduacoes += g.graduacoes;
    total.talentos += g.talentos;
    total.vida += g.vida;
    if (g.talentoAncestral) total.talentosAncestrais += 1;
  }
  total.graduacoes += 1;                  // a graduação grátis da trilha inicial
  total.talentosTotais = total.talentos + total.talentosAncestrais;
  return total;
}

/** O que já está gasto na ficha, para comparar com o orçamento. */
export function gastoNaFicha(f) {
  const graduacoes = Object.values(f.pericias).reduce((s, v) => s + v, 0)
                   + Object.values(f.fluxos).reduce((s, v) => s + v, 0);
  return {
    pontosAtributo: ATRIBUTOS.reduce((s, a) => s + (f.atributos[a.id] || 0), 0),
    graduacoes,
    talentos: f.talentos.length,
  };
}
