const pool = require('../config/db');
const { createError } = require('../middlewares/errorHandler');
const { mapearLivro, mapearTroca } = require('../utils/mapeadoresBanco');

const statusValidos = ['pendente', 'aceita', 'recusada', 'concluida', 'cancelada'];
const camposObrigatorios = ['solicitanteId', 'donoId', 'livroOferecidoId', 'livroSolicitadoId'];
const aliasesStatus = {
  pending: 'pendente',
  pendente: 'pendente',
  accepted: 'aceita',
  aceita: 'aceita',
  rejected: 'recusada',
  recusada: 'recusada',
  completed: 'concluida',
  concluida: 'concluida',
  cancelled: 'cancelada',
  canceled: 'cancelada',
  cancelada: 'cancelada'
};

const obterDadosTroca = (corpo) => ({
  solicitanteId: corpo.solicitanteId ?? corpo.solicitante_id ?? corpo.requesterId ?? corpo.requester_id,
  donoId: corpo.donoId ?? corpo.dono_id ?? corpo.receiverId ?? corpo.receiver_id ?? corpo.ownerId ?? corpo.owner_id,
  livroOferecidoId: corpo.livroOferecidoId ?? corpo.livro_oferecido_id ?? corpo.offeredBookId ?? corpo.offered_book_id ?? corpo.bookOfferedId ?? corpo.book_offered_id,
  livroSolicitadoId: corpo.livroSolicitadoId ?? corpo.livro_solicitado_id ?? corpo.requestedBookId ?? corpo.requested_book_id ?? corpo.bookRequestedId ?? corpo.book_requested_id
});

const normalizarStatus = (status) => aliasesStatus[String(status || '').trim().toLowerCase()];

const validarCamposObrigatorios = (corpo) => {
  const dados = obterDadosTroca(corpo);
  const camposAusentes = camposObrigatorios.filter((campo) => dados[campo] === undefined || dados[campo] === '');

  if (camposAusentes.length) {
    throw createError(400, `Campos obrigatorios ausentes: ${camposAusentes.join(', ')}.`);
  }
};

const buscarTrocaPorId = async (id, banco = pool) => {
  const [linhas] = await banco.execute('SELECT * FROM trocas WHERE id = ? LIMIT 1', [id]);

  if (!linhas.length) {
    throw createError(404, 'Troca nao encontrada.');
  }

  return mapearTroca(linhas[0]);
};

const garantirUsuarioExiste = async (usuarioId, nomeCampo) => {
  const [linhas] = await pool.execute('SELECT id FROM usuarios WHERE id = ? LIMIT 1', [usuarioId]);

  if (!linhas.length) {
    throw createError(400, `Usuario informado em ${nomeCampo} nao existe.`);
  }
};

const buscarLivroPorId = async (livroId, nomeCampo) => {
  const [linhas] = await pool.execute('SELECT * FROM livros WHERE id = ? LIMIT 1', [livroId]);

  if (!linhas.length) {
    throw createError(400, `Livro informado em ${nomeCampo} nao existe.`);
  }

  return mapearLivro(linhas[0]);
};

const validarLivrosDaTroca = ({ solicitanteId, donoId, livroOferecido, livroSolicitado }) => {
  if (livroOferecido.status === 'trocado' || livroSolicitado.status === 'trocado') {
    throw createError(400, 'Livros com status trocado nao podem entrar em uma troca.');
  }

  if (Number(livroOferecido.usuarioId) !== Number(solicitanteId)) {
    throw createError(400, 'livroOferecidoId deve pertencer ao solicitanteId.');
  }

  if (Number(livroSolicitado.usuarioId) !== Number(donoId)) {
    throw createError(400, 'livroSolicitadoId deve pertencer ao donoId.');
  }
};

const obterStatusDosLivros = (statusTroca) => {
  const mapaStatus = {
    aceita: 'reservado',
    concluida: 'trocado',
    recusada: 'disponivel',
    cancelada: 'disponivel',
    pendente: 'disponivel'
  };

  return mapaStatus[statusTroca];
};

const getTrades = async (req, res, next) => {
  try {
    const [linhas] = await pool.execute('SELECT * FROM trocas ORDER BY criado_em DESC, id DESC');
    res.status(200).json(linhas.map(mapearTroca));
  } catch (erro) {
    next(erro);
  }
};

const getTradeById = async (req, res, next) => {
  try {
    const troca = await buscarTrocaPorId(req.params.id);
    res.status(200).json(troca);
  } catch (erro) {
    next(erro);
  }
};

const createTrade = async (req, res, next) => {
  try {
    validarCamposObrigatorios(req.body);

    const dados = obterDadosTroca(req.body);
    const solicitanteId = Number(dados.solicitanteId);
    const donoId = Number(dados.donoId);
    const livroOferecidoId = Number(dados.livroOferecidoId);
    const livroSolicitadoId = Number(dados.livroSolicitadoId);

    await garantirUsuarioExiste(solicitanteId, 'solicitanteId');
    await garantirUsuarioExiste(donoId, 'donoId');

    const livroOferecido = await buscarLivroPorId(livroOferecidoId, 'livroOferecidoId');
    const livroSolicitado = await buscarLivroPorId(livroSolicitadoId, 'livroSolicitadoId');

    validarLivrosDaTroca({
      solicitanteId,
      donoId,
      livroOferecido,
      livroSolicitado
    });

    const [resultado] = await pool.execute(
      `INSERT INTO trocas (solicitante_id, dono_id, livro_solicitado_id, livro_oferecido_id, status)
       VALUES (?, ?, ?, ?, 'pendente')`,
      [solicitanteId, donoId, livroSolicitadoId, livroOferecidoId]
    );

    const troca = await buscarTrocaPorId(resultado.insertId);
    res.status(201).json(troca);
  } catch (erro) {
    next(erro);
  }
};

const updateTradeStatus = async (req, res, next) => {
  let conexao;

  try {
    const status = normalizarStatus(req.body.status);

    if (!status || !statusValidos.includes(status)) {
      throw createError(400, `Status de troca invalido. Use: ${statusValidos.join(', ')}.`);
    }

    conexao = await pool.getConnection();
    await conexao.beginTransaction();

    const troca = await buscarTrocaPorId(req.params.id, conexao);

    await conexao.execute('UPDATE trocas SET status = ? WHERE id = ?', [status, troca.id]);
    await conexao.execute(
      'UPDATE livros SET status = ? WHERE id IN (?, ?)',
      [obterStatusDosLivros(status), troca.livroOferecidoId, troca.livroSolicitadoId]
    );

    const trocaAtualizada = await buscarTrocaPorId(troca.id, conexao);

    await conexao.commit();
    res.status(200).json(trocaAtualizada);
  } catch (erro) {
    if (conexao) {
      await conexao.rollback();
    }
    next(erro);
  } finally {
    if (conexao) {
      conexao.release();
    }
  }
};

const deleteTrade = async (req, res, next) => {
  try {
    const troca = await buscarTrocaPorId(req.params.id);

    await pool.execute('DELETE FROM trocas WHERE id = ?', [troca.id]);
    res.status(200).json({
      mensagem: 'Troca removida com sucesso.',
      message: 'Troca removida com sucesso.'
    });
  } catch (erro) {
    next(erro);
  }
};

module.exports = {
  getTrades,
  getTradeById,
  createTrade,
  updateTradeStatus,
  deleteTrade
};
