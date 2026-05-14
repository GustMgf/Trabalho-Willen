const pool = require('../config/db');

const normalizar = (valor = '') => {
  return String(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
};

const calcularPontuacao = (livroDesejado, livro) => {
  const regras = [
    { pontos: 50, combina: normalizar(livroDesejado.titulo) === normalizar(livro.titulo) },
    { pontos: 25, combina: normalizar(livroDesejado.autor) === normalizar(livro.autor) },
    { pontos: 15, combina: normalizar(livroDesejado.genero) === normalizar(livro.genero) },
    { pontos: 10, combina: livro.status === 'disponivel' }
  ];

  return regras.reduce((total, regra) => total + (regra.combina ? regra.pontos : 0), 0);
};

const montarRespostaCombinacao = (livroDesejado, livroEncontrado, pontuacao) => ({
  livroDesejado,
  livroEncontrado,
  donoId: livroEncontrado.usuarioId,
  pontuacao,
  wantedBook: {
    id: livroDesejado.id,
    userId: livroDesejado.usuarioId,
    title: livroDesejado.titulo,
    author: livroDesejado.autor,
    genre: livroDesejado.genero
  },
  matchedBook: {
    id: livroEncontrado.id,
    userId: livroEncontrado.usuarioId,
    title: livroEncontrado.titulo,
    author: livroEncontrado.autor,
    genre: livroEncontrado.genero,
    status: livroEncontrado.status
  },
  ownerId: livroEncontrado.usuarioId,
  score: pontuacao
});

const getMatches = async (req, res, next) => {
  try {
    const [linhas] = await pool.execute(`
      SELECT
        ld.id AS livro_desejado_id,
        ld.usuario_id AS livro_desejado_usuario_id,
        ld.titulo AS livro_desejado_titulo,
        ld.autor AS livro_desejado_autor,
        ld.genero AS livro_desejado_genero,
        l.id AS livro_id,
        l.usuario_id AS livro_usuario_id,
        l.titulo AS livro_titulo,
        l.autor AS livro_autor,
        l.genero AS livro_genero,
        l.status AS livro_status
      FROM livros_desejados ld
      JOIN livros l ON l.usuario_id <> ld.usuario_id
    `);

    const combinacoes = linhas
      .map((linha) => {
        const livroDesejado = {
          id: linha.livro_desejado_id,
          usuarioId: linha.livro_desejado_usuario_id,
          titulo: linha.livro_desejado_titulo,
          autor: linha.livro_desejado_autor,
          genero: linha.livro_desejado_genero
        };
        const livroEncontrado = {
          id: linha.livro_id,
          usuarioId: linha.livro_usuario_id,
          titulo: linha.livro_titulo,
          autor: linha.livro_autor,
          genero: linha.livro_genero,
          status: linha.livro_status
        };
        const pontuacao = calcularPontuacao(livroDesejado, livroEncontrado);

        return montarRespostaCombinacao(livroDesejado, livroEncontrado, pontuacao);
      })
      .filter((combinacao) => combinacao.pontuacao > 0)
      .sort((primeira, segunda) => segunda.pontuacao - primeira.pontuacao);

    res.status(200).json(combinacoes);
  } catch (erro) {
    next(erro);
  }
};

module.exports = {
  getMatches
};
