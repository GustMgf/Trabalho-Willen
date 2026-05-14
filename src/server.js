const express = require('express');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const bookRoutes = require('./routes/bookRoutes');
const wantedBookRoutes = require('./routes/wantedBookRoutes');
const matchRoutes = require('./routes/matchRoutes');
const tradeRoutes = require('./routes/tradeRoutes');
const messageRoutes = require('./routes/messageRoutes');
const { errorHandler, notFound } = require('./middlewares/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '8mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api', (req, res) => {
  res.status(200).json({
    mensagem: 'API BookSwap',
    message: 'BookSwap API',
    version: '1.0.0'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/autenticacao', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/usuarios', userRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/livros', bookRoutes);
app.use('/api/wanted-books', wantedBookRoutes);
app.use('/api/livros-desejados', wantedBookRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/combinacoes', matchRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/trades', messageRoutes);
app.use('/api/trocas', tradeRoutes);
app.use('/api/trocas', messageRoutes);

app.use(notFound);
app.use(errorHandler);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`BookSwap API rodando em http://localhost:${PORT}`);
  });
}

module.exports = app;
