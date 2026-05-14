const paraIso = (valor) => {
  if (!valor) {
    return valor;
  }

  return valor instanceof Date ? valor.toISOString() : valor;
};

const mapearUsuario = (linha) => ({
  id: linha.id,
  nome: linha.nome,
  email: linha.email,
  senha: linha.senha,
  fotoPerfil: linha.foto_perfil,
  imagemPerfil: linha.foto_perfil,
  imagem_perfil: linha.foto_perfil,
  cidade: linha.cidade,
  estado: linha.estado,
  criadoEm: paraIso(linha.criado_em),
  name: linha.nome,
  password: linha.senha,
  profilePhoto: linha.foto_perfil,
  profileImage: linha.foto_perfil,
  city: linha.cidade,
  state: linha.estado,
  createdAt: paraIso(linha.criado_em)
});

const mapearLivro = (linha) => ({
  id: linha.id,
  usuarioId: linha.usuario_id,
  titulo: linha.titulo,
  autor: linha.autor,
  genero: linha.genero,
  condicao: linha.condicao,
  descricao: linha.descricao,
  status: linha.status,
  capaImagem: linha.capa_imagem,
  criadoEm: paraIso(linha.criado_em),
  userId: linha.usuario_id,
  title: linha.titulo,
  author: linha.autor,
  genre: linha.genero,
  condition: linha.condicao,
  description: linha.descricao,
  coverImage: linha.capa_imagem,
  createdAt: paraIso(linha.criado_em)
});

const mapearLivroDesejado = (linha) => ({
  id: linha.id,
  usuarioId: linha.usuario_id,
  titulo: linha.titulo,
  autor: linha.autor,
  genero: linha.genero,
  criadoEm: paraIso(linha.criado_em),
  userId: linha.usuario_id,
  title: linha.titulo,
  author: linha.autor,
  genre: linha.genero,
  createdAt: paraIso(linha.criado_em)
});

const mapearTroca = (linha) => ({
  id: linha.id,
  solicitanteId: linha.solicitante_id,
  donoId: linha.dono_id,
  livroSolicitadoId: linha.livro_solicitado_id,
  livroOferecidoId: linha.livro_oferecido_id,
  status: linha.status,
  criadoEm: paraIso(linha.criado_em),
  requesterId: linha.solicitante_id,
  receiverId: linha.dono_id,
  ownerId: linha.dono_id,
  requestedBookId: linha.livro_solicitado_id,
  offeredBookId: linha.livro_oferecido_id,
  createdAt: paraIso(linha.criado_em)
});

const mapearMensagem = (linha) => ({
  id: linha.id,
  trocaId: linha.troca_id,
  remetenteId: linha.remetente_id,
  conteudo: linha.conteudo,
  criadoEm: paraIso(linha.criado_em),
  tradeId: linha.troca_id,
  senderId: linha.remetente_id,
  content: linha.conteudo,
  message: linha.conteudo,
  createdAt: paraIso(linha.criado_em)
});

module.exports = {
  mapearLivro,
  mapearLivroDesejado,
  mapearMensagem,
  mapearTroca,
  mapearUsuario
};
