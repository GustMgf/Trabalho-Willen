const normalizar = (valor = '') => {
  return String(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
};

const obterCampo = (objeto, campoPt, campoLegado) => objeto[campoPt] ?? objeto[campoLegado];

const calcularPontuacao = (livroDesejado, livro) => {
  const regras = [
    { pontos: 50, combina: normalizar(obterCampo(livroDesejado, 'titulo', 'title')) === normalizar(obterCampo(livro, 'titulo', 'title')) },
    { pontos: 25, combina: normalizar(obterCampo(livroDesejado, 'autor', 'author')) === normalizar(obterCampo(livro, 'autor', 'author')) },
    { pontos: 15, combina: normalizar(obterCampo(livroDesejado, 'genero', 'genre')) === normalizar(obterCampo(livro, 'genero', 'genre')) },
    { pontos: 10, combina: livro.status === 'disponivel' || livro.status === 'available' }
  ];

  return regras.reduce((total, regra) => total + (regra.combina ? regra.pontos : 0), 0);
};

const montarRespostaCombinacao = (livroDesejado, livroEncontrado, pontuacao) => ({
  livroDesejado: {
    id: livroDesejado.id,
    usuarioId: obterCampo(livroDesejado, 'usuarioId', 'userId'),
    titulo: obterCampo(livroDesejado, 'titulo', 'title'),
    autor: obterCampo(livroDesejado, 'autor', 'author'),
    genero: obterCampo(livroDesejado, 'genero', 'genre')
  },
  livroEncontrado: {
    id: livroEncontrado.id,
    usuarioId: obterCampo(livroEncontrado, 'usuarioId', 'userId'),
    titulo: obterCampo(livroEncontrado, 'titulo', 'title'),
    autor: obterCampo(livroEncontrado, 'autor', 'author'),
    genero: obterCampo(livroEncontrado, 'genero', 'genre'),
    status: livroEncontrado.status
  },
  donoId: obterCampo(livroEncontrado, 'usuarioId', 'userId'),
  pontuacao
});

const gerarCombinacoes = (livrosDesejados, livros) => {
  return livrosDesejados
    .flatMap((livroDesejado) => livros
      .filter((livro) => Number(obterCampo(livro, 'usuarioId', 'userId')) !== Number(obterCampo(livroDesejado, 'usuarioId', 'userId')))
      .map((livro) => ({
        livroDesejado,
        livro,
        pontuacao: calcularPontuacao(livroDesejado, livro)
      })))
    .filter((combinacao) => combinacao.pontuacao > 0)
    .map((combinacao) => montarRespostaCombinacao(combinacao.livroDesejado, combinacao.livro, combinacao.pontuacao))
    .sort((primeira, segunda) => segunda.pontuacao - primeira.pontuacao);
};

module.exports = {
  calcularPontuacao,
  gerarCombinacoes,
  calculateScore: calcularPontuacao,
  generateMatches: gerarCombinacoes
};
