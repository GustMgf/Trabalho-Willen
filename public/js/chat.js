(function () {
  let trocaAtivaId = null;

  async function obterTrocaAtiva(usuario) {
    const trocas = await apiRequest('/trocas');
    const params = new URLSearchParams(window.location.search);
    const trocaSolicitadaId = params.get('trocaId') || params.get('tradeId');
    const minhasTrocas = trocas.filter((troca) => (
      Number(troca.solicitanteId ?? troca.requesterId) === Number(usuario.id)
      || Number(troca.donoId ?? troca.ownerId ?? troca.receiverId) === Number(usuario.id)
    ));

    if (!minhasTrocas.length) {
      return { troca: null, trocas };
    }

    const troca = trocaSolicitadaId
      ? minhasTrocas.find((item) => Number(item.id) === Number(trocaSolicitadaId))
      : minhasTrocas[0];

    return { troca: troca || minhasTrocas[0], trocas };
  }

  async function renderizarChat() {
    const usuario = BookSwap.requireAuth();
    const resumo = document.querySelector('[data-resumo-chat]');
    const listaMensagens = document.querySelector('[data-lista-mensagens]');
    const formulario = document.querySelector('[data-formulario-chat]');

    if (!usuario || !resumo || !listaMensagens) {
      return;
    }

    try {
      const [{ troca }, livros, usuariosMap] = await Promise.all([
        obterTrocaAtiva(usuario),
        apiRequest('/livros'),
        BookSwap.getUsersMap()
      ]);

      if (!troca) {
        trocaAtivaId = null;
        resumo.innerHTML = '';
        listaMensagens.innerHTML = `
          <div class="estado-vazio">
            <h3>Nenhuma conversa ativa</h3>
            <p class="texto-suave">Quando uma troca for proposta, o chat dela fica disponivel aqui.</p>
            <a class="botao" href="matches.html">Ver combinacoes</a>
          </div>
        `;

        if (formulario) {
          formulario.style.display = 'none';
        }

        return;
      }

      trocaAtivaId = troca.id;
      const solicitanteId = troca.solicitanteId ?? troca.requesterId;
      const donoId = troca.donoId ?? troca.ownerId ?? troca.receiverId;
      const parceiroId = Number(solicitanteId) === Number(usuario.id) ? donoId : solicitanteId;
      const parceiro = usuariosMap[Number(parceiroId)];
      const livroSolicitadoId = troca.livroSolicitadoId ?? troca.requestedBookId;
      const livroSolicitado = livros.find((livro) => Number(livro.id) === Number(livroSolicitadoId)) || {};
      const mensagens = await apiRequest(`/trocas/${troca.id}/mensagens`);

      resumo.innerHTML = `
        <img src="${BookSwap.escapeHtml(BookSwap.getBookCover(livroSolicitado, 0))}" alt="Livro negociado">
        <div>
          <p class="rotulo">Negociacao em curso</p>
          <h1 class="titulo-secao">${BookSwap.escapeHtml(parceiro ? (parceiro.nome ?? parceiro.name) : 'Chat da troca')}</h1>
          <p class="texto-suave">${BookSwap.escapeHtml(livroSolicitado.titulo ?? livroSolicitado.title ?? 'Proposta de troca')} - ${BookSwap.escapeHtml(BookSwap.formatStatus(troca.status))}</p>
        </div>
        <a class="botao botao--pequeno" href="trades.html">Ver proposta</a>
      `;

      if (!mensagens.length) {
        listaMensagens.innerHTML = `
          <div class="estado-vazio">
            <h3>Conversa ainda vazia</h3>
            <p class="texto-suave">Envie a primeira mensagem para combinar os detalhes da troca.</p>
          </div>
        `;
      } else {
        listaMensagens.innerHTML = mensagens.map((mensagem) => {
          const souEu = Number(mensagem.remetenteId ?? mensagem.senderId) === Number(usuario.id);
          const conteudo = mensagem.conteudo ?? mensagem.content ?? mensagem.message ?? '';
          const criadoEm = mensagem.criadoEm ?? mensagem.createdAt;

          return `
            <article class="mensagem ${souEu ? 'sou-eu' : ''}">
              <div class="mensagem__balao">${BookSwap.escapeHtml(conteudo)}</div>
              <span class="mensagem__hora">${BookSwap.escapeHtml(BookSwap.formatTime(criadoEm))}</span>
            </article>
          `;
        }).join('');
      }

      if (formulario) {
        formulario.style.display = '';
      }
    } catch (error) {
      resumo.innerHTML = '';
      listaMensagens.innerHTML = `<div class="estado-vazio"><p>${BookSwap.escapeHtml(error.message)}</p></div>`;
    }
  }

  function vincularFormularioChat() {
    const formulario = document.querySelector('[data-formulario-chat]');

    if (!formulario) {
      return;
    }

    formulario.addEventListener('submit', async (event) => {
      event.preventDefault();
      const usuario = BookSwap.requireAuth();
      const campo = formulario.querySelector('[name="conteudo"]');
      const conteudo = campo.value.trim();

      if (!usuario || !trocaAtivaId || !conteudo) {
        return;
      }

      try {
        await apiRequest(`/trocas/${trocaAtivaId}/mensagens`, {
          method: 'POST',
          body: {
            remetenteId: Number(usuario.id),
            conteudo
          }
        });

        campo.value = '';
        renderizarChat();
      } catch (error) {
        BookSwap.showToast(error.message);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (document.body.dataset.pagina !== 'chat') {
      return;
    }

    vincularFormularioChat();
    renderizarChat();
  });
}());
