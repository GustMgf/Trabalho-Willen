const pool = require('../config/db');
const { createError } = require('../middlewares/errorHandler');
const { mapearUsuario } = require('../utils/mapeadoresBanco');

const camposObrigatorios = ['nome', 'email', 'senha', 'cidade', 'estado'];

const obterDadosUsuario = (corpo) => ({
  nome: corpo.nome ?? corpo.name,
  email: corpo.email,
  senha: corpo.senha ?? corpo.password,
  cidade: corpo.cidade ?? corpo.city,
  estado: corpo.estado ?? corpo.state
});

const validarCamposObrigatorios = (dados) => {
  const camposAusentes = camposObrigatorios.filter((campo) => !dados[campo]);

  if (camposAusentes.length) {
    throw createError(400, `Campos obrigatorios ausentes: ${camposAusentes.join(', ')}.`);
  }
};

const buscarUsuarioPorEmail = async (email) => {
  const [linhas] = await pool.execute('SELECT * FROM usuarios WHERE email = ? LIMIT 1', [email]);
  return linhas[0] ? mapearUsuario(linhas[0]) : null;
};

const buscarUsuarioPorId = async (id) => {
  const [linhas] = await pool.execute('SELECT * FROM usuarios WHERE id = ? LIMIT 1', [id]);
  return linhas[0] ? mapearUsuario(linhas[0]) : null;
};

const register = async (req, res, next) => {
  try {
    const dados = obterDadosUsuario(req.body);

    validarCamposObrigatorios(dados);

    const usuarioExistente = await buscarUsuarioPorEmail(dados.email);

    if (usuarioExistente) {
      throw createError(400, 'E-mail ja cadastrado.');
    }

    const [resultado] = await pool.execute(
      `INSERT INTO usuarios (nome, email, senha, cidade, estado)
       VALUES (?, ?, ?, ?, ?)`,
      [dados.nome, dados.email, dados.senha, dados.cidade, dados.estado]
    );

    const usuario = await buscarUsuarioPorId(resultado.insertId);

    res.status(201).json({
      mensagem: 'Usuario cadastrado com sucesso.',
      message: 'Usuario cadastrado com sucesso.',
      usuario,
      user: usuario
    });
  } catch (erro) {
    next(erro);
  }
};

const login = async (req, res, next) => {
  try {
    const email = req.body.email;
    const senha = req.body.senha ?? req.body.password;

    if (!email || !senha) {
      throw createError(400, 'E-mail e senha sao obrigatorios.');
    }

    const usuario = await buscarUsuarioPorEmail(email);

    if (!usuario || usuario.senha !== senha) {
      throw createError(400, 'E-mail ou senha invalidos.');
    }

    res.status(200).json({
      mensagem: 'Login realizado com sucesso.',
      message: 'Login realizado com sucesso.',
      usuario,
      user: usuario
    });
  } catch (erro) {
    next(erro);
  }
};

module.exports = {
  register,
  login
};
