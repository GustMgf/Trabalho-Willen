(function () {
  let usersMap = {};
  let allBooks = [];

  async function loadBooksContext() {
    const [books, mappedUsers] = await Promise.all([
      apiRequest('/livros'),
      BookSwap.getUsersMap()
    ]);

    allBooks = books;
    usersMap = mappedUsers;
    return { books, usersMap };
  }

  function tradeAction(book) {
    const user = BookSwap.getCurrentUser();
    const isMine = user && Number(user.id) === Number(book.usuarioId ?? book.userId);

    if (isMine) {
      return '<button class="botao botao--vazado botao--pequeno" type="button" disabled>No seu acervo</button>';
    }

    return `<button class="botao botao--pequeno" type="button" data-trade-book="${BookSwap.escapeHtml(book.id)}">Quero trocar</button>`;
  }

  function renderGrid(container, books, options = {}) {
    if (!container) {
      return;
    }

    if (!books.length) {
      container.innerHTML = `
        <div class="estado-vazio">
          <h3>Nenhum livro encontrado</h3>
          <p class="texto-suave">Quando novos exemplares entrarem no acervo, eles aparecem por aqui.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = books.map((book, index) => {
      const actions = options.actions ? options.actions(book) : tradeAction(book);
      return BookSwap.bookCardTemplate(book, usersMap, index, actions);
    }).join('');
  }

  function readImageFile(file) {
    if (!file) {
      return Promise.resolve(null);
    }

    if (file.size > 5 * 1024 * 1024) {
      return Promise.reject(new Error('A imagem deve ter no maximo 5MB.'));
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Nao foi possivel ler a imagem selecionada.'));
      reader.readAsDataURL(file);
    });
  }

  async function renderHome() {
    const container = document.querySelector('[data-home-books]');

    if (!container) {
      return;
    }

    try {
      const { books } = await loadBooksContext();
      renderGrid(container, books.slice(0, 4));
    } catch (error) {
      container.innerHTML = `<div class="estado-vazio"><p>${BookSwap.escapeHtml(error.message)}</p></div>`;
    }
  }

  async function renderBooksPage() {
    const container = document.querySelector('[data-books-grid]');
    const count = document.querySelector('[data-books-count]');

    if (!container) {
      return;
    }

    try {
      const { books } = await loadBooksContext();
      renderGrid(container, books);

      if (count) {
        count.textContent = `${books.length} volumes disponiveis`;
      }
    } catch (error) {
      container.innerHTML = `<div class="estado-vazio"><p>${BookSwap.escapeHtml(error.message)}</p></div>`;
    }
  }

  async function renderExplorePage() {
    const container = document.querySelector('[data-explore-grid]');
    const search = document.querySelector('[data-book-search]');

    if (!container) {
      return;
    }

    try {
      const { books } = await loadBooksContext();
      renderGrid(container, books);

      if (search) {
        search.addEventListener('input', () => {
          const term = search.value.trim().toLowerCase();
          const filtered = books.filter((book) => {
            return [book.titulo ?? book.title, book.autor ?? book.author, book.genero ?? book.genre, book.condicao ?? book.condition]
              .some((value) => String(value || '').toLowerCase().includes(term));
          });

          renderGrid(container, filtered);
        });
      }
    } catch (error) {
      container.innerHTML = `<div class="estado-vazio"><p>${BookSwap.escapeHtml(error.message)}</p></div>`;
    }
  }

  async function renderMyBooks() {
    const user = BookSwap.requireAuth();
    const container = document.querySelector('[data-my-books-grid]');
    const count = document.querySelector('[data-my-books-count]');
    const search = document.querySelector('[data-my-book-search]');

    if (!user || !container) {
      return;
    }

    try {
      const { books } = await loadBooksContext();
      const myBooks = books.filter((book) => Number(book.usuarioId ?? book.userId) === Number(user.id));

      if (count) {
        count.textContent = `${myBooks.length} volumes catalogados`;
      }

      const render = (items) => {
        renderGrid(container, items, {
          actions: (book) => `
            <button class="botao botao--vazado botao--pequeno" type="button" data-edit-book="${BookSwap.escapeHtml(book.id)}">Editar</button>
            <button class="botao botao--perigo botao--pequeno" type="button" data-delete-book="${BookSwap.escapeHtml(book.id)}">Excluir</button>
          `
        });
      };

      render(myBooks);

      if (search) {
        search.addEventListener('input', () => {
          const term = search.value.trim().toLowerCase();
          const filtered = myBooks.filter((book) => {
            return [book.titulo ?? book.title, book.autor ?? book.author, book.genero ?? book.genre].some((value) => (
              String(value || '').toLowerCase().includes(term)
            ));
          });

          render(filtered);
        });
      }
    } catch (error) {
      container.innerHTML = `<div class="estado-vazio"><p>${BookSwap.escapeHtml(error.message)}</p></div>`;
    }
  }

  function ensureEditModal() {
    let modal = document.querySelector('[data-edit-modal]');

    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'modal';
      modal.setAttribute('data-edit-modal', '');
      document.body.appendChild(modal);
    }

    return modal;
  }

  function openEditModal(book) {
    const modal = ensureEditModal();

    modal.innerHTML = `
      <form class="cartao-modal" data-edit-book-form>
        <button class="fechar-modal" type="button" data-close-modal aria-label="Fechar">&times;</button>
        <h2>Editar livro</h2>
        <div class="grade-formulario">
          <div class="campo">
            <label for="editar-titulo">Título</label>
            <input id="editar-titulo" name="titulo" value="${BookSwap.escapeHtml(book.titulo ?? book.title)}" required>
          </div>
          <div class="campo">
            <label for="editar-autor">Autor</label>
            <input id="editar-autor" name="autor" value="${BookSwap.escapeHtml(book.autor ?? book.author)}" required>
          </div>
          <div class="campo">
            <label for="editar-genero">Gênero</label>
            <input id="editar-genero" name="genero" value="${BookSwap.escapeHtml(book.genero ?? book.genre)}" required>
          </div>
          <div class="campo">
            <label for="editar-condicao">Condição</label>
            <input id="editar-condicao" name="condicao" value="${BookSwap.escapeHtml(book.condicao ?? book.condition)}" required>
          </div>
          <div class="campo ocupa-2">
            <label for="editar-descricao">Descrição</label>
            <textarea id="editar-descricao" name="descricao" required>${BookSwap.escapeHtml(book.descricao ?? book.description)}</textarea>
          </div>
          <div class="campo ocupa-2">
            <label for="editar-capa">Capa do livro</label>
            <input id="editar-capa" name="capaImagem" type="file" accept="image/png,image/jpeg,image/webp">
          </div>
          <div class="campo ocupa-2">
            <label for="editar-status">Status</label>
            <select id="editar-status" name="status">
              <option value="disponivel" ${book.status === 'disponivel' || book.status === 'available' ? 'selected' : ''}>Disponível</option>
              <option value="reservado"  ${book.status === 'reservado' || book.status === 'reserved' ? 'selected' : ''}>Reservado</option>
              <option value="trocado"    ${book.status === 'trocado' || book.status === 'exchanged' ? 'selected' : ''}>Trocado</option>
            </select>
          </div>
        </div>
        <p class="mensagem-status" data-edit-mensagem></p>
        <button class="botao botao--inteiro" type="submit">Salvar alteracoes</button>
      </form>
    `;

    modal.classList.add('is-open');

    modal.querySelector('[data-close-modal]').addEventListener('click', () => {
      modal.classList.remove('is-open');
    });

    modal.querySelector('[data-edit-book-form]').addEventListener('submit', async (event) => {
      event.preventDefault();
      const mensagem = modal.querySelector('[data-edit-mensagem]');
      const formData = new FormData(event.currentTarget);
      const coverInput = event.currentTarget.querySelector('[name="capaImagem"]');

      try {
        const coverImage = await readImageFile(coverInput && coverInput.files[0]);
        const payload = {
          titulo: formData.get('titulo'),
          autor: formData.get('autor'),
          genero: formData.get('genero'),
          condicao: formData.get('condicao'),
          descricao: formData.get('descricao'),
          status: formData.get('status')
        };

        if (coverImage) {
          payload.capaImagem = coverImage;
        }

        await apiRequest(`/livros/${book.id}`, {
          method: 'PUT',
          body: payload
        });

        modal.classList.remove('is-open');
        BookSwap.showToast('Livro atualizado.');
        renderMyBooks();
      } catch (error) {
        BookSwap.statusMessage(mensagem, error.message);
      }
    });
  }

  function bindBookActions() {
    document.addEventListener('click', async (event) => {
      const tradeButton = event.target.closest('[data-trade-book]');
      const deleteButton = event.target.closest('[data-delete-book]');
      const editButton = event.target.closest('[data-edit-book]');

      if (tradeButton) {
        tradeButton.disabled = true;

        try {
          await BookSwap.proposeTradeForBook(tradeButton.dataset.tradeBook);
        } catch (error) {
          BookSwap.showToast(error.message);
        } finally {
          tradeButton.disabled = false;
        }
      }

      if (deleteButton) {
        const shouldDelete = window.confirm('Excluir este livro do seu acervo?');

        if (!shouldDelete) {
          return;
        }

        try {
          await apiRequest(`/livros/${deleteButton.dataset.deleteBook}`, { method: 'DELETE' });
          BookSwap.showToast('Livro excluido.');
          renderMyBooks();
        } catch (error) {
          BookSwap.showToast(error.message);
        }
      }

      if (editButton) {
        const book = allBooks.find((item) => Number(item.id) === Number(editButton.dataset.editBook));

        if (book) {
          openEditModal(book);
        }
      }
    });
  }

  function bindAddBook() {
    const user = BookSwap.requireAuth();
    const form = document.querySelector('[data-add-book-form]');
    const mensagem = document.querySelector('[data-add-book-mensagem]');
    const upload = document.querySelector('[data-upload-capa]');
    const uploadLabel = document.querySelector('[data-cover-file-name]');
    const modal = document.querySelector('[data-book-added-modal]');

    if (!user || !form) {
      return;
    }

    if (upload && uploadLabel) {
      upload.addEventListener('change', () => {
        uploadLabel.textContent = upload.files.length ? upload.files[0].name : 'Upload da capa';
      });
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      BookSwap.statusMessage(mensagem, '');
      const formData = new FormData(form);

      try {
        const coverImage = await readImageFile(upload && upload.files[0]);
        const payload = {
          usuarioId: Number(user.id),
          titulo: formData.get('titulo'),
          autor: formData.get('autor'),
          genero: formData.get('genero'),
          condicao: formData.get('condicao'),
          descricao: formData.get('descricao'),
          status: formData.get('status')
        };

        if (coverImage) {
          payload.capaImagem = coverImage;
        }

        const book = await apiRequest('/livros', {
          method: 'POST',
          body: payload
        });

        form.reset();
        if (uploadLabel) {
          uploadLabel.textContent = 'Upload da capa';
        }

        if (modal) {
          modal.querySelector('[data-added-title]').textContent = book.titulo ?? book.title;
          modal.classList.add('is-open');
        }
      } catch (error) {
        BookSwap.statusMessage(mensagem, error.message);
      }
    });

    document.querySelectorAll('[data-close-added-modal]').forEach((botao) => {
      botao.addEventListener('click', () => {
        modal.classList.remove('is-open');
      });
    });
  }

  async function renderWantedBooks() {
    const user = BookSwap.requireAuth();
    const form = document.querySelector('[data-wanted-form]');
    const list = document.querySelector('[data-wanted-list]');
    const mensagem = document.querySelector('[data-wanted-mensagem]');
    const submitButton = document.querySelector('[data-wanted-submit]');
    const cancelEditButton = document.querySelector('[data-cancel-wanted-edit]');
    let wantedEditingId = null;

    if (!user || !list) {
      return;
    }

    const load = async () => {
      const wantedBooks = await apiRequest('/livros-desejados');
      const mine = wantedBooks.filter((book) => Number(book.usuarioId ?? book.userId) === Number(user.id));

      if (!mine.length) {
        list.innerHTML = `
          <div class="estado-vazio">
            <h3>Lista de desejos vazia</h3>
            <p class="texto-suave">Cadastre livros desejados para destravar combinacoes mais precisas.</p>
          </div>
        `;
        return;
      }

      list.innerHTML = mine.map((book) => `
        <article class="card-desejo">
          <div>
            <p class="rotulo">${BookSwap.escapeHtml(book.genero ?? book.genre)}</p>
            <h3>${BookSwap.escapeHtml(book.titulo ?? book.title)}</h3>
            <p class="card-desejo__autor">${BookSwap.escapeHtml(book.autor ?? book.author)}</p>
          </div>
          <div class="card-desejo__acoes">
            <button class="botao botao--vazado botao--pequeno" type="button" data-edit-wanted="${BookSwap.escapeHtml(book.id)}">Editar</button>
            <button class="botao botao--perigo botao--pequeno" type="button" data-delete-wanted="${BookSwap.escapeHtml(book.id)}">Excluir</button>
          </div>
        </article>
      `).join('');
    };

    const setEditingMode = (book = null) => {
      wantedEditingId = book ? Number(book.id) : null;

      if (form && book) {
        form.elements.titulo.value = book.titulo ?? book.title ?? '';
        form.elements.autor.value = book.autor ?? book.author ?? '';
        form.elements.genero.value = book.genero ?? book.genre ?? '';
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      if (!book && form) {
        form.reset();
      }

      if (submitButton) {
        submitButton.textContent = book ? 'Salvar desejo' : 'Adicionar desejo';
      }

      if (cancelEditButton) {
        cancelEditButton.hidden = !book;
      }
    };

    try {
      await load();
    } catch (error) {
      list.innerHTML = `<div class="estado-vazio"><p>${BookSwap.escapeHtml(error.message)}</p></div>`;
    }

    if (form) {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        BookSwap.statusMessage(mensagem, '');
        const formData = new FormData(form);

        try {
          const isEditing = Boolean(wantedEditingId);
          const endpoint = isEditing ? `/livros-desejados/${wantedEditingId}` : '/livros-desejados';
          const method = isEditing ? 'PUT' : 'POST';

          await apiRequest(endpoint, {
            method,
            body: {
              usuarioId: Number(user.id),
              titulo: formData.get('titulo'),
              autor: formData.get('autor'),
              genero: formData.get('genero')
            }
          });

          setEditingMode(null);
          BookSwap.statusMessage(mensagem, isEditing ? 'Livro desejado atualizado.' : 'Livro desejado adicionado.', true);
          await load();
        } catch (error) {
          BookSwap.statusMessage(mensagem, error.message);
        }
      });
    }

    if (cancelEditButton) {
      cancelEditButton.addEventListener('click', () => {
        BookSwap.statusMessage(mensagem, '');
        setEditingMode(null);
      });
    }

    document.addEventListener('click', async (event) => {
      const editButton = event.target.closest('[data-edit-wanted]');
      const botao = event.target.closest('[data-delete-wanted]');

      if (editButton) {
        try {
          const wantedBook = await apiRequest(`/livros-desejados/${editButton.dataset.editWanted}`);
          setEditingMode(wantedBook);
          BookSwap.statusMessage(mensagem, '');
        } catch (error) {
          BookSwap.showToast(error.message);
        }

        return;
      }

      if (!botao) {
        return;
      }

      try {
        await apiRequest(`/livros-desejados/${botao.dataset.deleteWanted}`, { method: 'DELETE' });
        BookSwap.showToast('Livro removido dos desejos.');
        await load();
      } catch (error) {
        BookSwap.showToast(error.message);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const pagina = document.body.dataset.pagina;

    bindBookActions();

    if (pagina === 'home') {
      renderHome();
    }

    if (pagina === 'books') {
      renderBooksPage();
    }

    if (pagina === 'explore') {
      renderExplorePage();
    }

    if (pagina === 'my-books') {
      renderMyBooks();
    }

    if (pagina === 'add-book') {
      bindAddBook();
    }

    if (pagina === 'wanted-books') {
      renderWantedBooks();
    }
  });
}());


