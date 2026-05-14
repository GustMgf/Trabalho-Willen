const pool = require('../config/db');
const { createError } = require('../middlewares/errorHandler');
const { mapearLivroDesejado } = require('../utils/mapeadoresBanco');

const camposObrigatorios = ['usuarioId', 'titulo', 'autor', 'genero'];

const obterDadosLivroDesejado = (corpo) => ({
  usuarioId: corpo.usuarioId ?? corpo.usuario_id ?? corpo.userId ?? corpo.user_id,
  titulo: corpo.titulo ?? corpo.title,
  autor: corpo.autor ?? corpo.author,
  genero: corpo.genero ?? corpo.genre
});

const validarCamposObrigatorios = (dados) => {
  const camposAusentes = camposObrigatorios.filter((campo) => dados[campo] === undefined || dados[campo] === '');

  if (camposAusentes.length) {
    throw createError(400, `Campos obrigatorios ausentes: ${camposAusentes.join(', ')}.`);
  }
};

const garantirUsuarioExiste = async (usuarioId) => {
  const [linhas] = await pool.execute('SELECT id FROM usuarios WHERE id = ? LIMIT 1', [usuarioId]);

  if (!linhas.length) {
    throw createError(400, 'Usuario informado em usuarioId nao existe.');
  }
};

const buscarLivroDesejadoPorId = async (id) => {
  const [linhas] = await pool.execute('SELECT * FROM livros_desejados WHERE id = ? LIMIT 1', [id]);

  if (!linhas.length) {
    throw createError(404, 'Livro desejado nao encontrado.');
  }

  return mapearLivroDesejado(linhas[0]);
};

const getWantedBooks = async (req, res, next) => {
  try {
    const [linhas] = await pool.execute('SELECT * FROM livros_desejados ORDER BY criado_em DESC, id DESC');
    res.status(200).json(linhas.map(mapearLivroDesejado));
  } catch (erro) {
    next(erro);
  }
};

const getWantedBookById = async (req, res, next) => {
  try {
    const livroDesejado = await buscarLivroDesejadoPorId(req.params.id);
    res.status(200).json(livroDesejado);
  } catch (erro) {
    next(erro);
  }
};

const createWantedBook = async (req, res, next) => {
  try {
    const dados = obterDadosLivroDesejado(req.body);

    validarCamposObrigatorios(dados);
    await garantirUsuarioExiste(dados.usuarioId);

    const [resultado] = await pool.execute(
      `INSERT INTO livros_desejados (usuario_id, titulo, autor, genero)
       VALUES (?, ?, ?, ?)`,
      [Number(dados.usuarioId), dados.titulo, dados.autor, dados.genero]
    );

    const livroDesejado = await buscarLivroDesejadoPorId(resultado.insertId);
    res.status(201).json(livroDesejado);
  } catch (erro) {
    next(erro);
  }
};

const updateWantedBook = async (req, res, next) => {
  try {
    const livroDesejado = await buscarLivroDesejadoPorId(req.params.id);
    const dados = obterDadosLivroDesejado(req.body);
    const atualizacoes = [];
    const valores = [];

    for (const campo of ['titulo', 'autor', 'genero']) {
      if (dados[campo] !== undefined) {
        atualizacoes.push(`${campo} = ?`);
        valores.push(dados[campo]);
      }
    }

    if (dados.usuarioId !== undefined) {
      await garantirUsuarioExiste(dados.usuarioId);
      atualizacoes.push('usuario_id = ?');
      valores.push(Number(dados.usuarioId));
    }

    if (!atualizacoes.length) {
      throw createError(400, 'Informe ao menos um campo valido para atualizar.');
    }

    await pool.execute(`UPDATE livros_desejados SET ${atualizacoes.join(', ')} WHERE id = ?`, [...valores, livroDesejado.id]);

    const livroDesejadoAtualizado = await buscarLivroDesejadoPorId(livroDesejado.id);
    res.status(200).json(livroDesejadoAtualizado);
  } catch (erro) {
    next(erro);
  }
};

const deleteWantedBook = async (req, res, next) => {
  try {
    const livroDesejado = await buscarLivroDesejadoPorId(req.params.id);

    await pool.execute('DELETE FROM livros_desejados WHERE id = ?', [livroDesejado.id]);
    res.status(200).json({
      mensagem: 'Livro desejado removido com sucesso.',
      message: 'Livro desejado removido com sucesso.'
    });
  } catch (erro) {
    next(erro);
  }
};

module.exports = {
  getWantedBooks,
  getWantedBookById,
  createWantedBook,
  updateWantedBook,
  deleteWantedBook
};
