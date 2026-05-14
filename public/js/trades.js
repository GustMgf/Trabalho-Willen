(function () {
  async function renderTrades() {
    const user = BookSwap.requireAuth();
    const list = document.querySelector('[data-trades-list]');
    const count = document.querySelector('[data-trades-count]');

    if (!user || !list) {
      return;
    }

    try {
      const [trades, books, usersMap] = await Promise.all([
        apiRequest('/trocas'),
        apiRequest('/livros'),
        BookSwap.getUsersMap()
      ]);

      const myTrades = trades.filter((trade) => (
        Number(trade.solicitanteId ?? trade.requesterId) === Number(user.id)
        || Number(trade.donoId ?? trade.ownerId) === Number(user.id)
      ));

      if (count) {
        count.textContent = `${myTrades.length} trocas registradas`;
      }

      if (!myTrades.length) {
        list.innerHTML = `
          <div class="estado-vazio">
            <h3>Nenhuma troca registrada</h3>
            <p class="texto-suave">Propostas criadas a partir dos livros ou combinacoes aparecem neste historico.</p>
            <a class="botao" href="books.html">Ver livros</a>
          </div>
        `;
        return;
      }

      list.innerHTML = myTrades.map((trade, index) => {
        const requestedBook = books.find((book) => Number(book.id) === Number(trade.livroSolicitadoId ?? trade.requestedBookId)) || {};
        const offeredBook = books.find((book) => Number(book.id) === Number(trade.livroOferecidoId ?? trade.offeredBookId)) || {};
        const partnerId = Number(trade.solicitanteId ?? trade.requesterId) === Number(user.id)
          ? (trade.donoId ?? trade.ownerId)
          : (trade.solicitanteId ?? trade.requesterId);
        const partner = usersMap[Number(partnerId)];

        return `
          <article class="card-troca" data-trade-id="${BookSwap.escapeHtml(trade.id)}">
            <img src="${BookSwap.escapeHtml(BookSwap.getBookCover(requestedBook, index))}" alt="Livro da troca ${BookSwap.escapeHtml(requestedBook.titulo ?? requestedBook.title ?? '')}">
            <div>
              <p class="rotulo">${BookSwap.escapeHtml(BookSwap.formatDate(trade.criadoEm ?? trade.createdAt))}</p>
              <h3>${BookSwap.escapeHtml(requestedBook.titulo ?? requestedBook.title ?? 'Livro solicitado')}</h3>
              <p class="card-livro__autor">${BookSwap.escapeHtml(requestedBook.autor ?? requestedBook.author ?? '')}</p>
              <div class="metadados-livro">
                <span>Parceiro: ${BookSwap.escapeHtml(partner ? (partner.nome ?? partner.name) : 'Usuario')}</span>
                <span>Você oferece: ${BookSwap.escapeHtml(offeredBook.titulo ?? offeredBook.title ?? 'Livro do acervo')}</span>
                <span>Status: ${BookSwap.escapeHtml(BookSwap.formatStatus(trade.status))}</span>
              </div>
              <div class="acoes-linha">
                <a class="botao botao--vazado botao--pequeno" href="chat.html?trocaId=${BookSwap.escapeHtml(trade.id)}">Abrir chat</a>
                <select class="botao botao--vazado botao--pequeno" data-status-select="${BookSwap.escapeHtml(trade.id)}">
                  <option value="pendente" ${trade.status === 'pendente' || trade.status === 'pending' ? 'selected' : ''}>Pendente</option>
                  <option value="aceita" ${trade.status === 'aceita' || trade.status === 'accepted' ? 'selected' : ''}>Aceita</option>
                  <option value="recusada" ${trade.status === 'recusada' || trade.status === 'rejected' ? 'selected' : ''}>Recusada</option>
                  <option value="concluida" ${trade.status === 'concluida' || trade.status === 'completed' ? 'selected' : ''}>Concluída</option>
                  <option value="cancelada" ${trade.status === 'cancelada' || trade.status === 'cancelled' ? 'selected' : ''}>Cancelada</option>
                </select>
                <button class="botao botao--pequeno" type="button" data-update-trade="${BookSwap.escapeHtml(trade.id)}">Atualizar</button>
              </div>
            </div>
            <div class="card-troca__status">
              <span class="etiqueta-status">${BookSwap.escapeHtml(BookSwap.formatStatus(trade.status))}</span>
            </div>
          </article>
        `;
      }).join('');
    } catch (error) {
      list.innerHTML = `<div class="estado-vazio"><p>${BookSwap.escapeHtml(error.message)}</p></div>`;
    }
  }

  function bindTradeActions() {
    document.addEventListener('click', async (event) => {
      const botao = event.target.closest('[data-update-trade]');

      if (!botao) {
        return;
      }

      const tradeId = botao.dataset.updateTrade;
      const select = document.querySelector(`[data-status-select="${tradeId}"]`);

      if (!select) {
        return;
      }

      botao.disabled = true;

      try {
        await apiRequest(`/trocas/${tradeId}/status`, {
          method: 'PUT',
          body: {
            status: select.value
          }
        });

        BookSwap.showToast('Status da troca atualizado.');
        renderTrades();
      } catch (error) {
        BookSwap.showToast(error.message);
      } finally {
        botao.disabled = false;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (document.body.dataset.pagina !== 'trades') {
      return;
    }

    bindTradeActions();
    renderTrades();
  });
}());




