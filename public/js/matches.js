(function () {
  async function renderMatches() {
    const user = BookSwap.requireAuth();
    const list = document.querySelector('[data-matches-list]');
    const count = document.querySelector('[data-matches-count]');

    if (!user || !list) {
      return;
    }

    try {
      const [matches, books, usersMap] = await Promise.all([
        apiRequest('/combinacoes'),
        apiRequest('/livros'),
        BookSwap.getUsersMap()
      ]);

      const relevantMatches = matches.filter((match) => {
        const livroDesejado = match.livroDesejado ?? match.wantedBook;
        return Number(livroDesejado.usuarioId ?? livroDesejado.userId) === Number(user.id);
      });

      if (count) {
        count.textContent = `${relevantMatches.length} sugestoes encontradas`;
      }

      if (!relevantMatches.length) {
        list.innerHTML = `
          <div class="estado-vazio">
            <h3>Nenhuma combinacao por enquanto</h3>
            <p class="texto-suave">Adicione livros desejados para encontrar compatibilidades no acervo da comunidade.</p>
            <a class="botao" href="wanted-books.html">Cadastrar desejos</a>
          </div>
        `;
        return;
      }

      list.innerHTML = relevantMatches.map((match, index) => {
        const livroEncontrado = match.livroEncontrado ?? match.matchedBook;
        const livroDesejado = match.livroDesejado ?? match.wantedBook;
        const fullBook = books.find((book) => Number(book.id) === Number(livroEncontrado.id)) || livroEncontrado;
        const owner = usersMap[Number(match.donoId ?? match.ownerId)];
        const pontuacao = match.pontuacao ?? match.score;

        return `
          <article class="card-combinacao">
            <div class="card-combinacao__imagem">
              <img src="${BookSwap.escapeHtml(BookSwap.getBookCover(fullBook, index))}" alt="Livro compatível ${BookSwap.escapeHtml(fullBook.titulo ?? fullBook.title)}">
              <span class="selo-pontuacao">${BookSwap.escapeHtml(pontuacao)}% compatibilidade</span>
            </div>
            <div>
              <p class="rotulo">Você procura: ${BookSwap.escapeHtml(livroDesejado.titulo ?? livroDesejado.title)}</p>
              <h3 class="titulo-secao">${BookSwap.escapeHtml(fullBook.titulo ?? fullBook.title)}</h3>
              <p class="card-livro__autor">${BookSwap.escapeHtml(fullBook.autor ?? fullBook.author)}</p>
              <div class="metadados-livro">
                <span>${BookSwap.escapeHtml(fullBook.genero ?? fullBook.genre)}</span>
                <span>${BookSwap.escapeHtml(BookSwap.formatStatus(fullBook.status))}</span>
                <span>${BookSwap.escapeHtml(owner ? `Acervo de ${owner.nome ?? owner.name}` : 'Acervo comunitário')}</span>
              </div>
              <button class="botao botao--inteiro" type="button" data-match-trade="${BookSwap.escapeHtml(fullBook.id)}">Propor troca</button>
            </div>
          </article>
        `;
      }).join('');
    } catch (error) {
      list.innerHTML = `<div class="estado-vazio"><p>${BookSwap.escapeHtml(error.message)}</p></div>`;
    }
  }

  function bindMatchActions() {
    document.addEventListener('click', async (event) => {
      const botao = event.target.closest('[data-match-trade]');

      if (!botao) {
        return;
      }

      botao.disabled = true;

      try {
        await BookSwap.proposeTradeForBook(botao.dataset.matchTrade);
      } catch (error) {
        BookSwap.showToast(error.message);
      } finally {
        botao.disabled = false;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (document.body.dataset.pagina !== 'matches') {
      return;
    }

    bindMatchActions();
    renderMatches();
  });
}());




