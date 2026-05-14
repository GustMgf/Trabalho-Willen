const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const { createError } = require('../middlewares/errorHandler');
const { mapearLivro } = require('../utils/mapeadoresBanco');

const pastaUploads = path.join(__dirname, '..', '..', 'public', 'img', 'uploads');
const statusValidos = ['disponivel', 'reservado', 'trocado'];
const camposObrigatorios = ['usuarioId', 'titulo', 'autor', 'genero', 'condicao', 'descricao'];
const tiposCapaPermitidos = {
  jpeg: 'jpg',
  jpg: 'jpg',
  png: 'png',
  webp: 'webp'
};
const aliasesStatus = {
  available: 'disponivel',
  disponivel: 'disponivel',
  reserved: 'reservado',
  reservado: 'reservado',
  trocando: 'reservado',
  exchanged: 'trocado',
  trocado: 'trocado'
};

const obterDadosLivro = (corpo) => ({
  usuarioId: corpo.usuarioId ?? corpo.usuario_id ?? corpo.userId ?? corpo.user_id,
  titulo: corpo.titulo ?? corpo.title,
  autor: corpo.autor ?? corpo.author,
  genero: corpo.genero ?? corpo.genre,
  condicao: corpo.condicao ?? corpo.condition,
  descricao: corpo.descricao ?? corpo.description,
  status: corpo.status,
  capaImagem: corpo.capaImagem ?? corpo.capa_imagem ?? corpo.coverImage ?? corpo.cover_image
});

const normalizarStatus = (status) => {
  if (!status) {
    return status;
  }

  return aliasesStatus[String(status).trim().toLowerCase()] || String(status).trim().toLowerCase();
};

const validarCamposObrigatorios = (dados) => {
  const camposAusentes = camposObrigatorios.filter((campo) => dados[campo] === undefined || dados[campo] === '');

  if (camposAusentes.length) {
    throw createError(400, `Campos obrigatorios ausentes: ${camposAusentes.join(', ')}.`);
  }
};

const validarStatus = (status) => {
  if (status && !statusValidos.includes(status)) {
    throw createError(400, `Status de livro invalido. Use: ${statusValidos.join(', ')}.`);
  }
};

const garantirUsuarioExiste = async (usuarioId) => {
  const [linhas] = await pool.execute('SELECT id FROM usuarios WHERE id = ? LIMIT 1', [usuarioId]);

  if (!linhas.length) {
    throw createError(400, 'Usuario informado em usuarioId nao existe.');
  }
};

const buscarLivroPorId = async (id) => {
  const [linhas] = await pool.execute('SELECT * FROM livros WHERE id = ? LIMIT 1', [id]);

  if (!linhas.length) {
    throw createError(404, 'Livro nao encontrado.');
  }

  return mapearLivro(linhas[0]);
};

const salvarCapa = (capaImagem, chave) => {
  if (!capaImagem) {
    return undefined;
  }

  if (typeof capaImagem === 'string' && !capaImagem.startsWith('data:image/')) {
    return capaImagem;
  }

  const partes = String(capaImagem).match(/^data:image\/(png|jpe?g|webp);base64,(.+)$/);

  if (!partes) {
    throw createError(400, 'Imagem de capa invalida. Use PNG, JPG ou WEBP.');
  }

  const tipoImagem = partes[1].replace('jpeg', 'jpg');
  const extensao = tiposCapaPermitidos[tipoImagem];
  const buffer = Buffer.from(partes[2], 'base64');
  const tamanhoMaximo = 5 * 1024 * 1024;

  if (buffer.length > tamanhoMaximo) {
    throw createError(400, 'Imagem de capa deve ter no maximo 5MB.');
  }

  fs.mkdirSync(pastaUploads, { recursive: true });

  const nomeArquivo = `livro-${chave}-${Date.now()}.${extensao}`;
  fs.writeFileSync(path.join(pastaUploads, nomeArquivo), buffer);

  return `img/uploads/${nomeArquivo}`;
};

const removerCapaEnviada = (capaImagem) => {
  if (!capaImagem || !String(capaImagem).startsWith('img/uploads/')) {
    return;
  }

  const caminhoArquivo = path.join(__dirname, '..', '..', 'public', capaImagem);

  if (fs.existsSync(caminhoArquivo)) {
    fs.unlinkSync(caminhoArquivo);
  }
};

const getBooks = async (req, res, next) => {
  try {
    const [linhas] = await pool.execute('SELECT * FROM livros ORDER BY criado_em DESC, id DESC');
    res.status(200).json(linhas.map(mapearLivro));
  } catch (erro) {
    next(erro);
  }
};

const getBookById = async (req, res, next) => {
  try {
    const livro = await buscarLivroPorId(req.params.id);
    res.status(200).json(livro);
  } catch (erro) {
    next(erro);
  }
};

const createBook = async (req, res, next) => {
  try {
    const dados = obterDadosLivro(req.body);

    validarCamposObrigatorios(dados);

    const usuarioId = Number(dados.usuarioId);
    const status = normalizarStatus(dados.status) || 'disponivel';

    validarStatus(status);
    await garantirUsuarioExiste(usuarioId);

    const capaImagem = salvarCapa(dados.capaImagem, 'novo');
    const [resultado] = await pool.execute(
      `INSERT INTO livros (usuario_id, titulo, autor, genero, condicao, descricao, status, capa_imagem)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        usuarioId,
        dados.titulo,
        dados.autor,
        dados.genero,
        dados.condicao,
        dados.descricao,
        status,
        capaImagem || null
      ]
    );

    const livro = await buscarLivroPorId(resultado.insertId);
    res.status(201).json(livro);
  } catch (erro) {
    next(erro);
  }
};

const montarAtualizacoesLivro = async (corpo, livroAtual) => {
  const dados = obterDadosLivro(corpo);
  const atualizacoes = [];
  const valores = [];
  const campos = [
    ['titulo', 'titulo'],
    ['autor', 'autor'],
    ['genero', 'genero'],
    ['condicao', 'condicao'],
    ['descricao', 'descricao']
  ];

  for (const [campo, coluna] of campos) {
    if (dados[campo] !== undefined) {
      atualizacoes.push(`${coluna} = ?`);
      valores.push(dados[campo]);
    }
  }

  if (dados.usuarioId !== undefined) {
    await garantirUsuarioExiste(dados.usuarioId);
    atualizacoes.push('usuario_id = ?');
    valores.push(Number(dados.usuarioId));
  }

  if (dados.status !== undefined) {
    const status = normalizarStatus(dados.status);
    validarStatus(status);
    atualizacoes.push('status = ?');
    valores.push(status);
  }

  if (dados.capaImagem !== undefined) {
    removerCapaEnviada(livroAtual.capaImagem);
    atualizacoes.push('capa_imagem = ?');
    valores.push(salvarCapa(dados.capaImagem, livroAtual.id) || null);
  }

  return { atualizacoes, valores };
};

const updateBook = async (req, res, next) => {
  try {
    const livro = await buscarLivroPorId(req.params.id);
    const { atualizacoes, valores } = await montarAtualizacoesLivro(req.body, livro);

    if (!atualizacoes.length) {
      throw createError(400, 'Informe ao menos um campo valido para atualizar.');
    }

    await pool.execute(`UPDATE livros SET ${atualizacoes.join(', ')} WHERE id = ?`, [...valores, livro.id]);

    const livroAtualizado = await buscarLivroPorId(livro.id);
    res.status(200).json(livroAtualizado);
  } catch (erro) {
    next(erro);
  }
};

const deleteBook = async (req, res, next) => {
  try {
    const livro = await buscarLivroPorId(req.params.id);

    removerCapaEnviada(livro.capaImagem);
    await pool.execute('DELETE FROM livros WHERE id = ?', [livro.id]);

    res.status(200).json({
      mensagem: 'Livro removido com sucesso.',
      message: 'Livro removido com sucesso.'
    });
  } catch (erro) {
    next(erro);
  }
};

module.exports = {
  getBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook
};
