const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const { createError } = require('../middlewares/errorHandler');
const { mapearUsuario } = require('../utils/mapeadoresBanco');

const pastaFotosPerfil = path.join(__dirname, '..', '..', 'public', 'img', 'uploads', 'perfis');
const caminhoPublicoUploadsPerfil = 'img/uploads/perfis';
const tiposFotoPermitidos = {
  jpeg: 'jpg',
  jpg: 'jpg',
  png: 'png',
  webp: 'webp'
};

const camposPermitidos = {
  nome: 'nome',
  name: 'nome',
  email: 'email',
  fotoPerfil: 'foto_perfil',
  imagemPerfil: 'foto_perfil',
  imagem_perfil: 'foto_perfil',
  profilePhoto: 'foto_perfil',
  profileImage: 'foto_perfil',
  foto: 'foto_perfil',
  avatar: 'foto_perfil',
  senha: 'senha',
  password: 'senha',
  cidade: 'cidade',
  city: 'cidade',
  estado: 'estado',
  state: 'estado'
};

let colunaFotoPerfilVerificada = false;

const caminhoSeguroFotoPerfil = (caminho) => {
  if (!caminho || !String(caminho).startsWith(`${caminhoPublicoUploadsPerfil}/`)) {
    return null;
  }

  const caminhoArquivo = path.resolve(__dirname, '..', '..', 'public', caminho);
  const pastaPermitida = path.resolve(pastaFotosPerfil);

  return caminhoArquivo.startsWith(pastaPermitida) ? caminhoArquivo : null;
};

const removerFotoPerfil = (fotoPerfil) => {
  const caminhoArquivo = caminhoSeguroFotoPerfil(fotoPerfil);

  if (caminhoArquivo && fs.existsSync(caminhoArquivo)) {
    fs.unlinkSync(caminhoArquivo);
  }
};

const salvarFotoPerfil = (fotoPerfil, usuarioId) => {
  if (fotoPerfil === null || fotoPerfil === '') {
    return null;
  }

  if (!fotoPerfil) {
    return undefined;
  }

  if (typeof fotoPerfil === 'string' && !fotoPerfil.startsWith('data:image/')) {
    return fotoPerfil;
  }

  const partes = String(fotoPerfil).match(/^data:image\/(png|jpe?g|webp);base64,(.+)$/);

  if (!partes) {
    throw createError(400, 'Foto de perfil invalida. Use PNG, JPG ou WEBP.');
  }

  const tipoImagem = partes[1].replace('jpeg', 'jpg');
  const extensao = tiposFotoPermitidos[tipoImagem];
  const buffer = Buffer.from(partes[2], 'base64');
  const tamanhoMaximo = 2 * 1024 * 1024;

  if (buffer.length > tamanhoMaximo) {
    throw createError(400, 'Foto de perfil deve ter no maximo 2MB.');
  }

  fs.mkdirSync(pastaFotosPerfil, { recursive: true });

  const nomeArquivo = `perfil-${usuarioId}-${Date.now()}.${extensao}`;
  fs.writeFileSync(path.join(pastaFotosPerfil, nomeArquivo), buffer);

  return `${caminhoPublicoUploadsPerfil}/${nomeArquivo}`;
};

const migrarFotosPerfilBase64 = async () => {
  const [linhas] = await pool.execute(
    'SELECT id, foto_perfil FROM usuarios WHERE foto_perfil LIKE ?',
    ['data:image/%']
  );

  for (const linha of linhas) {
    const fotoPerfil = salvarFotoPerfil(linha.foto_perfil, linha.id);
    await pool.execute('UPDATE usuarios SET foto_perfil = ? WHERE id = ?', [fotoPerfil, linha.id]);
  }
};

const garantirColunaFotoPerfil = async () => {
  if (colunaFotoPerfilVerificada) {
    return;
  }

  try {
    await pool.execute('ALTER TABLE usuarios ADD COLUMN foto_perfil VARCHAR(255)');
  } catch (erro) {
    if (erro.code !== 'ER_DUP_FIELDNAME') {
      throw erro;
    }
  }

  await migrarFotosPerfilBase64();

  try {
    await pool.execute('ALTER TABLE usuarios MODIFY COLUMN foto_perfil VARCHAR(255)');
  } catch (erro) {
    if (erro.code !== 'ER_DATA_TOO_LONG') {
      throw erro;
    }
  }

  colunaFotoPerfilVerificada = true;
};

const buscarUsuarioPorId = async (id) => {
  const [linhas] = await pool.execute('SELECT * FROM usuarios WHERE id = ? LIMIT 1', [id]);

  if (!linhas.length) {
    throw createError(404, 'Usuario nao encontrado.');
  }

  return mapearUsuario(linhas[0]);
};

const getUsers = async (req, res, next) => {
  try {
    const [linhas] = await pool.execute('SELECT * FROM usuarios ORDER BY id');
    res.status(200).json(linhas.map(mapearUsuario));
  } catch (erro) {
    next(erro);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const usuario = await buscarUsuarioPorId(req.params.id);
    res.status(200).json(usuario);
  } catch (erro) {
    next(erro);
  }
};

const garantirEmailDisponivel = async (email, usuarioAtualId) => {
  if (!email) {
    return;
  }

  const [linhas] = await pool.execute(
    'SELECT id FROM usuarios WHERE email = ? AND id <> ? LIMIT 1',
    [email, usuarioAtualId]
  );

  if (linhas.length) {
    throw createError(400, 'E-mail ja cadastrado para outro usuario.');
  }
};

const montarAtualizacoesUsuario = async (corpo, usuarioAtual) => {
  const atualizacoes = [];
  const valores = [];
  const colunasUsadas = new Set();

  for (const [campo, coluna] of Object.entries(camposPermitidos)) {
    if (corpo[campo] !== undefined && !colunasUsadas.has(coluna)) {
      if (coluna === 'foto_perfil') {
        await garantirColunaFotoPerfil();
        const [linhasFotoAtual] = await pool.execute(
          'SELECT foto_perfil FROM usuarios WHERE id = ? LIMIT 1',
          [usuarioAtual.id]
        );
        const fotoPerfilAtual = linhasFotoAtual[0]?.foto_perfil ?? usuarioAtual.fotoPerfil;
        const novaFotoPerfil = salvarFotoPerfil(corpo[campo], usuarioAtual.id);

        if (novaFotoPerfil !== fotoPerfilAtual) {
          removerFotoPerfil(fotoPerfilAtual);
        }

        atualizacoes.push(`${coluna} = ?`);
        valores.push(novaFotoPerfil);
        colunasUsadas.add(coluna);
        continue;
      }

      atualizacoes.push(`${coluna} = ?`);
      valores.push(corpo[campo]);
      colunasUsadas.add(coluna);
    }
  }

  return { atualizacoes, valores };
};

const updateUser = async (req, res, next) => {
  try {
    const usuario = await buscarUsuarioPorId(req.params.id);
    const { atualizacoes, valores } = await montarAtualizacoesUsuario(req.body, usuario);

    if (!atualizacoes.length) {
      throw createError(400, 'Informe ao menos um campo valido para atualizar.');
    }

    await garantirEmailDisponivel(req.body.email, usuario.id);
    await pool.execute(`UPDATE usuarios SET ${atualizacoes.join(', ')} WHERE id = ?`, [...valores, usuario.id]);

    const usuarioAtualizado = await buscarUsuarioPorId(usuario.id);
    res.status(200).json(usuarioAtualizado);
  } catch (erro) {
    next(erro);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const usuario = await buscarUsuarioPorId(req.params.id);

    removerFotoPerfil(usuario.fotoPerfil);
    await pool.execute('DELETE FROM usuarios WHERE id = ?', [usuario.id]);
    res.status(200).json({
      mensagem: 'Usuario removido com sucesso.',
      message: 'Usuario removido com sucesso.'
    });
  } catch (erro) {
    next(erro);
  }
};

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  deleteUser
};
