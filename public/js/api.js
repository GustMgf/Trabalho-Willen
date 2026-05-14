(function () {
  const API_BASE_URL = 'http://localhost:3000/api';

  const coverImages = [
    'img/references/books-feed-1.jpg',
    'img/references/books-feed-2.jpg',
    'img/references/books-feed-3.jpg',
    'img/references/books-feed-4.jpg',
    'img/references/explore-books-1.jpg',
    'img/references/explore-books-2.jpg',
    'img/references/suggestions-main.jpg',
    'img/references/home-books-section.jpg',
    'img/references/home-books-extended.jpg',
    'img/references/my-collection-list.jpg',
    'img/references/my-collection-grid-variation.jpg',
    'img/references/matches-main.jpg'
  ];

  async function apiRequest(endpoint, options = {}) {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const config = {
      method: options.method || 'GET',
      headers: {
        ...(options.headers || {})
      }
    };

    if (options.body !== undefined) {
      const isTextBody = typeof options.body === 'string' || options.body instanceof FormData;

      config.body = isTextBody ? options.body : JSON.stringify(options.body);

      if (!(options.body instanceof FormData)) {
        config.headers['Content-Type'] = config.headers['Content-Type'] || 'application/json';
      }
    }

    const response = await fetch(url, config);
    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json') ? await response.json() : await response.text();

    if (!response.ok) {
      const mensagem = payload && (payload.mensagem || payload.erro || payload.error)
        ? (payload.mensagem || payload.erro || payload.error)
        : 'Não foi possível completar a requisição.';
      throw new Error(mensagem);
    }

    return payload;
  }

  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem('bookswap:user')) || null;
    } catch (error) {
      return null;
    }
  }

  function setCurrentUser(user) {
    localStorage.setItem('bookswap:user', JSON.stringify(user));
  }

  function clearCurrentUser() {
    [
      'bookswap:user',
      'bookswap:token',
      'bookswap:auth',
      'bookswap:currentUser',
      'token',
      'auth',
      'jwt',
      'currentUser',
      'user'
    ].forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  }

  function logout(redirectTo = 'login.html') {
    clearCurrentUser();
    window.location.href = redirectTo;
  }

  function requireAuth() {
    const user = getCurrentUser();

    if (!user) {
      window.location.href = 'login.html';
      return null;
    }

    return user;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatStatus(status) {
    const labels = {
      disponivel: 'Disponível',
      reservado: 'Reservado',
      trocado: 'Trocado',
      pendente: 'Pendente',
      aceita: 'Aceita',
      recusada: 'Recusada',
      concluida: 'Concluída',
      cancelada: 'Cancelada',
      available: 'Disponível',
      reserved: 'Reservado',
      exchanged: 'Trocado',
      pending: 'Pendente',
      accepted: 'Aceita',
      rejected: 'Recusada',
      completed: 'Concluída',
      cancelled: 'Cancelada'
    };

    return labels[status] || status || 'Sem status';
  }

  function apiBookStatus(label) {
    const statuses = {
      Disponivel: 'disponivel',
      Disponível: 'disponivel',
      Trocando: 'reservado',
      Reservado: 'reservado',
      Trocado: 'trocado'
    };

    return statuses[label] || label || 'disponivel';
  }

  function getBookCover(book, index = 0) {
    if (book && (book.capaImagem || book.coverImage || book.cover_url)) {
      return book.capaImagem || book.coverImage || book.cover_url;
    }

    const seed = Number(book && book.id ? book.id : index + 1);
    return coverImages[Math.abs(seed) % coverImages.length];
  }

  function ownerLabel(book, usersMap = {}) {
    const owner = usersMap[Number(book.usuarioId ?? book.userId)];

    if (!owner) {
      return 'Origem: acervo comunitario';
    }

    const place = [owner.cidade ?? owner.city, owner.estado ?? owner.state].filter(Boolean).join(', ');
    return `Origem: acervo de ${owner.nome ?? owner.name}${place ? ` - ${place}` : ''}`;
  }

  async function getUsersMap() {
    const users = await apiRequest('/usuarios');
    return users.reduce((map, user) => {
      map[Number(user.id)] = user;
      return map;
    }, {});
  }

  function statusMessage(element, mensagem, isSuccess = false) {
    if (!element) {
      return;
    }

    element.textContent = mensagem || '';
    element.classList.toggle('sucesso', Boolean(isSuccess));
  }

  let avisoTimer;

  function showToast(mensagem) {
    let aviso = document.querySelector('.aviso');

    if (!aviso) {
      aviso = document.createElement('div');
      aviso.className = 'aviso';
      document.body.appendChild(aviso);
    }

    aviso.textContent = mensagem;
    aviso.classList.add('visivel');
    clearTimeout(avisoTimer);
    avisoTimer = setTimeout(() => aviso.classList.remove('visivel'), 3400);
  }

  function formatDate(value) {
    if (!value) {
      return 'Data nao informada';
    }

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(new Date(value));
  }

  function formatTime(value) {
    if (!value) {
      return '';
    }

    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value));
  }

  function bookCardTemplate(book, usersMap = {}, index = 0, extraActions = '') {
    return `
      <article class="card-livro" data-book-id="${escapeHtml(book.id)}">
        <div class="card-livro__imagem">
          <img src="${escapeHtml(getBookCover(book, index))}" alt="Capa editorial de ${escapeHtml(book.titulo ?? book.title)}">
          <span class="card-livro__status">${escapeHtml(formatStatus(book.status))}</span>
        </div>
        <div>
          <p class="rotulo">${escapeHtml(book.genero ?? book.genre ?? 'Literatura')}</p>
          <h3>${escapeHtml(book.titulo ?? book.title)}</h3>
          <p class="card-livro__autor">${escapeHtml(book.autor ?? book.author)}</p>
          <div class="metadados-livro">
            <span>Estado: ${escapeHtml(book.condicao ?? book.condition ?? 'Nao informado')}</span>
            <span>${escapeHtml(ownerLabel(book, usersMap))}</span>
          </div>
          ${(book.descricao ?? book.description) ? `<p class="texto-suave">${escapeHtml(book.descricao ?? book.description)}</p>` : ''}
          <div class="card-livro__acoes">${extraActions}</div>
        </div>
      </article>
    `;
  }

  async function proposeTradeForBook(bookId) {
    const user = requireAuth();

    if (!user) {
      return;
    }

    const books = await apiRequest('/livros');
    const requestedBook = books.find((book) => Number(book.id) === Number(bookId));

    if (!requestedBook) {
      showToast('Livro nao encontrado para troca.');
      return;
    }

    if (Number(requestedBook.usuarioId ?? requestedBook.userId) === Number(user.id)) {
      showToast('Este livro ja esta no seu acervo.');
      return;
    }

    const offeredBook = books.find((book) => (
      Number(book.usuarioId ?? book.userId) === Number(user.id)
      && Number(book.id) !== Number(bookId)
      && book.status !== 'trocado'
    ));

    if (!offeredBook) {
      showToast('Adicione um livro ao seu acervo antes de propor uma troca.');
      return;
    }

    await apiRequest('/trocas', {
      method: 'POST',
      body: {
        solicitanteId: Number(user.id),
        donoId: Number(requestedBook.usuarioId ?? requestedBook.userId),
        livroOferecidoId: Number(offeredBook.id),
        livroSolicitadoId: Number(requestedBook.id)
      }
    });

    showToast('Proposta de troca enviada.');
  }

  function initShell() {
    if (document.body.dataset.noShell === 'true') {
      return;
    }

    const currentPage = document.body.dataset.pagina || '';
    const user = getCurrentUser();
    const headerTarget = document.querySelector('[data-shell="header"]');
    const bottomTarget = document.querySelector('[data-shell="navegacao-inferior"]');

    if (headerTarget) {
      headerTarget.innerHTML = `
        <header class="barra-topo">
          <div class="barra-topo__esquerda">
            <button class="botao-icone botao-menu-mobile" type="button" aria-label="Abrir menu" aria-expanded="false" aria-controls="menu-mobile" data-menu-toggle>
              <span class="icone-menu"><span></span></span>
            </button>
            <nav class="links-topo" aria-label="Navegacao principal">
              <a href="books.html"   class="${currentPage === 'books' ? 'ativo' : ''}">Livros</a>
              <a href="explore.html" class="${currentPage === 'explore' ? 'ativo' : ''}">Explorar</a>
              <a href="matches.html" class="${currentPage === 'matches' ? 'ativo' : ''}">Combinações</a>
              <a href="chat.html"    class="${currentPage === 'chat' ? 'ativo' : ''}">Conversas</a>
            </nav>
            <nav id="menu-mobile" class="menu-mobile" aria-label="Menu principal mobile" aria-hidden="true" data-menu-mobile>
              <a href="books.html"   class="${currentPage === 'books' ? 'ativo' : ''}">Livros</a>
              <a href="explore.html" class="${currentPage === 'explore' ? 'ativo' : ''}">Explorar</a>
              <a href="matches.html" class="${currentPage === 'matches' ? 'ativo' : ''}">Combinações</a>
              <a href="chat.html"    class="${currentPage === 'chat' ? 'ativo' : ''}">Conversas</a>
              ${user ? '<button class="menu-mobile__sair" type="button" data-logout>Sair da conta</button>' : ''}
            </nav>
          </div>
          <a class="marca" href="index.html">BOOKSWAP</a>
          <div class="barra-topo__direita">
            <a class="botao-icone" href="explore.html" aria-label="Pesquisar"><span class="icone-busca"></span></a>
            ${user ? `
              <div class="menu-perfil" data-profile-menu>
                <button class="botao-icone" type="button" aria-label="Abrir menu do perfil" aria-expanded="false" aria-controls="dropdown-perfil" data-profile-toggle>
                  <img class="icone-navegacao" src="img/icons/user_8370837.svg" alt="">
                </button>
                <div id="dropdown-perfil" class="dropdown-perfil" aria-hidden="true" data-profile-dropdown>
                  <a href="profile.html">Perfil</a>
                  <a href="profile.html#configuracoes">Configurações</a>
                  <button type="button" data-logout>Sair da conta</button>
                </div>
              </div>
            ` : `
              <a class="botao-icone" href="login.html" aria-label="Perfil">
                <img class="icone-navegacao" src="img/icons/user_8370837.svg" alt="Perfil">
              </a>
            `}
          </div>
        </header>
      `;

      const menuButton = headerTarget.querySelector('[data-menu-toggle]');
      const mobileMenu = headerTarget.querySelector('[data-menu-mobile]');
      const profileButton = headerTarget.querySelector('[data-profile-toggle]');
      const profileDropdown = headerTarget.querySelector('[data-profile-dropdown]');

      if (menuButton && mobileMenu) {
        const setMenuOpen = (isOpen) => {
          menuButton.setAttribute('aria-expanded', String(isOpen));
          mobileMenu.setAttribute('aria-hidden', String(!isOpen));
          mobileMenu.classList.toggle('is-open', isOpen);
        };

        menuButton.addEventListener('click', (event) => {
          event.stopPropagation();
          setMenuOpen(menuButton.getAttribute('aria-expanded') !== 'true');
        });

        mobileMenu.querySelectorAll('a').forEach((link) => {
          link.addEventListener('click', () => setMenuOpen(false));
        });

        mobileMenu.querySelectorAll('[data-logout]').forEach((button) => {
          button.addEventListener('click', () => logout());
        });

        document.addEventListener('click', (event) => {
          if (!mobileMenu.contains(event.target) && !menuButton.contains(event.target)) {
            setMenuOpen(false);
          }
        });

        document.addEventListener('keydown', (event) => {
          if (event.key === 'Escape') {
            setMenuOpen(false);
          }
        });
      }

      if (profileButton && profileDropdown) {
        const setProfileOpen = (isOpen) => {
          profileButton.setAttribute('aria-expanded', String(isOpen));
          profileDropdown.setAttribute('aria-hidden', String(!isOpen));
          profileDropdown.classList.toggle('is-open', isOpen);
        };

        profileButton.addEventListener('click', (event) => {
          event.stopPropagation();
          setProfileOpen(profileButton.getAttribute('aria-expanded') !== 'true');
        });

        profileDropdown.querySelectorAll('a').forEach((link) => {
          link.addEventListener('click', () => setProfileOpen(false));
        });

        profileDropdown.querySelectorAll('[data-logout]').forEach((button) => {
          button.addEventListener('click', () => logout());
        });

        document.addEventListener('click', (event) => {
          if (!profileDropdown.contains(event.target) && !profileButton.contains(event.target)) {
            setProfileOpen(false);
          }
        });

        document.addEventListener('keydown', (event) => {
          if (event.key === 'Escape') {
            setProfileOpen(false);
          }
        });
      }
    }

    if (bottomTarget) {
      document.body.classList.add('com-navegacao-inferior');
      bottomTarget.innerHTML = `
        <nav class="navegacao-inferior" aria-label="Menu inferior">
          <a href="books.html" class="${currentPage === 'books' || currentPage === 'explore' ? 'ativo' : ''}">
            <img class="icone-navegacao" src="img/icons/book_10446347.svg" alt="Livros">
            Livros
          </a>
          <a href="matches.html" class="${currentPage === 'matches' ? 'ativo' : ''}">
            <img class="icone-navegacao" src="img/icons/quebra.svg" alt="Livros">
            Combinações
          </a>
          <a href="trades.html" class="${currentPage === 'trades' ? 'ativo' : ''}">
            <img class="icone-navegacao" src="img/icons/left-right_11862618.svg" alt="Livros">
            Trocas
          </a>
          <a href="wanted-books.html" class="${currentPage === 'wanted-books' ? 'ativo' : ''}">
            <img class="icone-navegacao" src="img/icons/estrela.svg" alt="Livros">
            Desejos
          </a>
          <a href="my-books.html" class="${currentPage === 'my-books' ? 'ativo' : ''}">
            <img class="icone-navegacao" src="img/icons/book_10446347.svg" alt="Acervo">
            Acervo
          </a>
          <a href="profile.html" class="${currentPage === 'profile' ? 'ativo' : ''}">
            <img class="icone-navegacao" src="img/icons/user_8370837.svg" alt="Perfil">
            Perfil
          </a>
        </nav>
      `;
    }
  }

  window.apiRequest = apiRequest;
  window.BookSwap = {
    apiBookStatus,
    apiRequest,
    bookCardTemplate,
    clearCurrentUser,
    coverImages,
    escapeHtml,
    formatDate,
    formatStatus,
    formatTime,
    getBookCover,
    getCurrentUser,
    getUsersMap,
    ownerLabel,
    proposeTradeForBook,
    requireAuth,
    logout,
    setCurrentUser,
    showToast,
    statusMessage
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initShell);
  } else {
    initShell();
  }
}());
