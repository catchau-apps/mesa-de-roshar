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

const consultar = (tabela, valor) => (tabela.find(([teto]) => valor <= teto) || tabela.at(-1))[1];

export const movimento    = (velocidade) => consultar(TABELA_MOVIMENTO, velocidade);
export const dadoRecuperacao = (vontade) => consultar(TABELA_RECUPERACAO, vontade);
export const sentidos     = (consciencia) => consultar(TABELA_SENTIDOS, consciencia);

/* --- fórmulas da ficha --------------------------------------------------
   Vida = 10 + FOR e Foco = 2 + VON (p.23).
   Cada defesa = 10 + os dois atributos do reino (p.24).
   Modificador de perícia = atributo + graduações (p.56).                  */
export const patamar   = (f) => Math.min(5, Math.ceil((f.nivel || 1) / 5));
export const gradMaxima = (f) => Math.min(5, patamar(f) + 1);
export const vidaMaxima = (f) => 10 + (f.atributos.for || 0) + (Number(f.ajusteVida) || 0);
export const focoMaximo = (f) => 2 + (f.atributos.von || 0) + (Number(f.ajusteFoco) || 0);

export const defesaFisica     = (f) => 10 + (f.atributos.for || 0) + (f.atributos.vel || 0);
export const defesaCognitiva  = (f) => 10 + (f.atributos.int || 0) + (f.atributos.von || 0);
export const defesaEspiritual = (f) => 10 + (f.atributos.con || 0) + (f.atributos.pre || 0);

export function modificador(ficha, pericia) {
  const base = ficha.atributos[pericia.atributo] || 0;
  const grad = pericia.reino === 'fluxo'
    ? (ficha.fluxos[pericia.nome] || 0)
    : (ficha.pericias[pericia.nome] || 0);
  return base + grad;
}

export const periciasDe = (ficha) => ficha.radiante ? [...PERICIAS, ...FLUXOS] : PERICIAS;

/* --- limites da criação de personagem (p.18) --- */
export const CRIACAO = {
  pontosAtributo: 12,
  atributoMaximo: 3,
  graduacoes: 4,
  graduacaoMaxima: 2,
  especialidadesCulturais: 2,
};

/* --- condições (p.293–295) — nomes e efeito resumido em palavras próprias --- */
export const CONDICOES = [
  ['Afligido', 'Sofre o dano indicado no fim de cada turno seu.'],
  ['Aprimorado', 'Ganha o bônus de atributo indicado; não muda defesas nem os máximos.'],
  ['Atordoado', 'Ganha duas ações a menos e nenhuma reação no seu turno.'],
  ['Desorientado', 'Sem reações; testes de sentidos com desvantagem.'],
  ['Determinado', 'Ao falhar um teste, pode somar uma Oportunidade e perder a condição.'],
  ['Exausto', 'Penalidade cumulativa nos testes; cai 1 a cada descanso longo.'],
  ['Focado', 'Habilidades custam 1 de foco a menos.'],
  ['Imobilizado', 'Movimento zero; não se move nem é movido.'],
  ['Inconsciente', 'Movimento zero e Prostrado; não age nem reage.'],
  ['Lento', 'Movimento pela metade.'],
  ['Potencializado', 'Vantagem em tudo e Investidura cheia no início de cada turno seu.'],
  ['Prostrado', 'Caído e Lento; corpo a corpo contra você ganha vantagem.'],
  ['Restringido', 'Movimento zero e desvantagem, exceto para escapar.'],
  ['Surpreendido', 'Sem reação inicial, sem turno rápido e uma ação a menos.'],
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

export const ANCESTRALIDADES = ['Humano', 'Cantor'];
