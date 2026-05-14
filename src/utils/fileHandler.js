const persistenciaJsonDesativada = () => {
  const erro = new Error('Persistencia em JSON desativada. Use os controllers com MySQL.');
  erro.status = 500;
  throw erro;
};

const calcularProximoId = (itens) => {
  return itens.reduce((maiorId, item) => Math.max(maiorId, Number(item.id) || 0), 0) + 1;
};

const buscarPorId = (itens, id) => {
  return itens.find((item) => Number(item.id) === Number(id));
};

const removerPorId = (itens, id) => {
  const idNumerico = Number(id);
  return itens.filter((item) => Number(item.id) !== idNumerico);
};

module.exports = {
  readData: persistenciaJsonDesativada,
  writeData: persistenciaJsonDesativada,
  getNextId: calcularProximoId,
  findById: buscarPorId,
  removeById: removerPorId
};
