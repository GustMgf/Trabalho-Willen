const pool = require('../config/db');
const { createError } = require('../middlewares/errorHandler');
const { mapearMensagem, mapearTroca } = require('../utils/mapeadoresBanco');

const buscarTrocaPorId = async (trocaId) => {
  const [linhas] = await pool.execute('SELECT * FROM trocas WHERE id = ? LIMIT 1', [trocaId]);

  if (!linhas.length) {
    throw createError(404, 'Troca nao encontrada.');
  }

  return mapearTroca(linhas[0]);
};

const garantirRemetentePodeEnviar = async (troca, remetenteId) => {
  const [linhas] = await pool.execute('SELECT id FROM usuarios WHERE id = ? LIMIT 1', [remetenteId]);

  if (!linhas.length) {
    throw createError(400, 'Usuario informado em remetenteId nao existe.');
  }

  const participaDaTroca = [troca.solicitanteId, troca.donoId].map(Number).includes(Number(remetenteId));

  if (!participaDaTroca) {
    throw createError(400, 'remetenteId deve ser participante da troca.');
  }
};

const obterTrocaIdDaRota = (params) => params.trocaId ?? params.tradeId;

const getMessagesByTrade = async (req, res, next) => {
  try {
    const trocaId = obterTrocaIdDaRota(req.params);

    await buscarTrocaPorId(trocaId);

    const [linhas] = await pool.execute(
      'SELECT * FROM mensagens WHERE troca_id = ? ORDER BY criado_em ASC, id ASC',
      [trocaId]
    );

    res.status(200).json(linhas.map(mapearMensagem));
  } catch (erro) {
    next(erro);
  }
};

const createMessage = async (req, res, next) => {
  try {
    const trocaId = obterTrocaIdDaRota(req.params);
    const remetenteId = req.body.remetenteId ?? req.body.remetente_id ?? req.body.senderId ?? req.body.sender_id;
    const conteudo = req.body.conteudo ?? req.body.content ?? req.body.message;

    if (!remetenteId || !conteudo) {
      throw createError(400, 'remetenteId e conteudo sao obrigatorios.');
    }

    const troca = await buscarTrocaPorId(trocaId);
    await garantirRemetentePodeEnviar(troca, remetenteId);

    const [resultado] = await pool.execute(
      `INSERT INTO mensagens (troca_id, remetente_id, conteudo)
       VALUES (?, ?, ?)`,
      [Number(trocaId), Number(remetenteId), conteudo]
    );

    const [linhas] = await pool.execute('SELECT * FROM mensagens WHERE id = ? LIMIT 1', [resultado.insertId]);
    res.status(201).json(mapearMensagem(linhas[0]));
  } catch (erro) {
    next(erro);
  }
};

module.exports = {
  getMessagesByTrade,
  createMessage
};
