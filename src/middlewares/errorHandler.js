const createError = (codigoStatus, mensagem) => {
  const erro = new Error(mensagem);
  erro.statusCode = codigoStatus;
  return erro;
};

const notFound = (req, res, next) => {
  next(createError(404, 'Rota nao encontrada.'));
};

const errorHandler = (erro, req, res, next) => {
  const codigoStatus = erro.statusCode || 500;
  const mensagem = codigoStatus === 500 ? 'Erro interno do servidor.' : erro.message;

  res.status(codigoStatus).json({
    erro: mensagem,
    error: mensagem
  });
};

module.exports = {
  createError,
  notFound,
  errorHandler
};
