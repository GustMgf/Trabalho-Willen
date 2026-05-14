(function () {
  let usuarioAtual = null;
  let fotoSelecionada = null;

  function campoUsuario(usuario, campoPt, campoEn) {
    return usuario ? (usuario[campoPt] ?? usuario[campoEn] ?? '') : '';
  }

  function iniciais(nome) {
    const partes = String(nome || 'BookSwap')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);

    return partes.map((parte) => parte[0]).join('').toUpperCase() || 'BS';
  }

  function fotoPerfil(usuario) {
    return campoUsuario(usuario, 'fotoPerfil', 'profilePhoto');
  }

  function renderizarAvatar(usuario) {
    const imagem = document.querySelector('[data-profile-photo]');
    const texto = document.querySelector('[data-profile-initials]');
    const foto = fotoSelecionada !== null ? fotoSelecionada : fotoPerfil(usuario);

    if (!imagem || !texto) {
      return;
    }

    if (foto) {
      imagem.src = foto;
      imagem.hidden = false;
      texto.hidden = true;
      return;
    }

    imagem.removeAttribute('src');
    imagem.hidden = true;
    texto.textContent = iniciais(campoUsuario(usuario, 'nome', 'name'));
    texto.hidden = false;
  }

  function preencherTexto(seletor, valor) {
    const elemento = document.querySelector(seletor);

    if (elemento) {
      elemento.textContent = valor;
    }
  }

  function preencherFormulario(usuario) {
    const formulario = document.querySelector('[data-profile-form]');

    if (!formulario) {
      return;
    }

    formulario.elements.nome.value = campoUsuario(usuario, 'nome', 'name');
    formulario.elements.email.value = campoUsuario(usuario, 'email', 'email');
    formulario.elements.cidade.value = campoUsuario(usuario, 'cidade', 'city');
    formulario.elements.estado.value = campoUsuario(usuario, 'estado', 'state');
  }

  function renderizarResumo(usuario) {
    const nome = campoUsuario(usuario, 'nome', 'name');
    const cidade = campoUsuario(usuario, 'cidade', 'city');
    const estado = campoUsuario(usuario, 'estado', 'state');
    const localizacao = [cidade, estado].filter(Boolean).join(', ') || 'Localizacao nao informada';

    preencherTexto('[data-profile-title]', nome ? `Olá, ${nome}` : 'Perfil');
    preencherTexto('[data-profile-location]', localizacao);
    preencherTexto('[data-profile-name]', nome || 'Nome nao informado');
    preencherTexto('[data-profile-email]', campoUsuario(usuario, 'email', 'email') || 'Email nao informado');
    preencherTexto('[data-profile-place]', localizacao);
    preencherTexto('[data-profile-created]', BookSwap.formatDate(campoUsuario(usuario, 'criadoEm', 'createdAt')));
    renderizarAvatar(usuario);
    preencherFormulario(usuario);
  }

  async function carregarEstatisticas(usuarioId) {
    const [livros, desejos, trocas] = await Promise.all([
      apiRequest('/livros').catch(() => []),
      apiRequest('/livros-desejados').catch(() => []),
      apiRequest('/trocas').catch(() => [])
    ]);

    const meusLivros = livros.filter((livro) => Number(livro.usuarioId ?? livro.userId) === Number(usuarioId));
    const meusDesejos = desejos.filter((livro) => Number(livro.usuarioId ?? livro.userId) === Number(usuarioId));
    const minhasTrocas = trocas.filter((troca) => (
      Number(troca.solicitanteId ?? troca.requesterId) === Number(usuarioId)
      || Number(troca.donoId ?? troca.ownerId) === Number(usuarioId)
    ));

    preencherTexto('[data-profile-books]', meusLivros.length);
    preencherTexto('[data-profile-wishes]', meusDesejos.length);
    preencherTexto('[data-profile-trades]', minhasTrocas.length);
  }

  function lerArquivoImagem(arquivo) {
    if (!arquivo) {
      return Promise.resolve(null);
    }

    if (!arquivo.type.startsWith('image/')) {
      return Promise.reject(new Error('Selecione uma imagem valida para o perfil.'));
    }

    if (arquivo.size > 2 * 1024 * 1024) {
      return Promise.reject(new Error('A foto de perfil deve ter no maximo 2MB.'));
    }

    return new Promise((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onload = () => resolve(leitor.result);
      leitor.onerror = () => reject(new Error('Nao foi possivel ler a imagem selecionada.'));
      leitor.readAsDataURL(arquivo);
    });
  }

  async function carregarPerfil() {
    const usuarioLocal = BookSwap.requireAuth();

    if (!usuarioLocal) {
      return;
    }

    try {
      usuarioAtual = await apiRequest(`/usuarios/${usuarioLocal.id}`);
      BookSwap.setCurrentUser(usuarioAtual);
      renderizarResumo(usuarioAtual);
      await carregarEstatisticas(usuarioAtual.id);
    } catch (error) {
      BookSwap.showToast(error.message);
      renderizarResumo(usuarioLocal);
    }
  }

  function vincularUploadFoto() {
    const input = document.querySelector('[data-profile-photo-input]');
    const label = document.querySelector('[data-profile-photo-label]');
    const mensagem = document.querySelector('[data-profile-message]');

    if (!input) {
      return;
    }

    input.addEventListener('change', async () => {
      BookSwap.statusMessage(mensagem, '');

      try {
        fotoSelecionada = await lerArquivoImagem(input.files[0]);
        if (label) {
          label.textContent = input.files.length ? input.files[0].name : 'Escolher foto';
        }
        renderizarAvatar(usuarioAtual);
      } catch (error) {
        input.value = '';
        fotoSelecionada = null;
        if (label) {
          label.textContent = 'Escolher foto';
        }
        BookSwap.statusMessage(mensagem, error.message);
      }
    });
  }

  function vincularFormularioPerfil() {
    const formulario = document.querySelector('[data-profile-form]');
    const mensagem = document.querySelector('[data-profile-message]');

    if (!formulario) {
      return;
    }

    formulario.addEventListener('submit', async (event) => {
      event.preventDefault();
      BookSwap.statusMessage(mensagem, '');

      const dados = new FormData(formulario);
      const payload = {
        nome: dados.get('nome'),
        email: dados.get('email'),
        cidade: dados.get('cidade'),
        estado: String(dados.get('estado') || '').toUpperCase()
      };

      if (fotoSelecionada !== null) {
        payload.fotoPerfil = fotoSelecionada;
      }

      try {
        const usuario = await apiRequest(`/usuarios/${usuarioAtual.id}`, {
          method: 'PUT',
          body: payload
        });

        usuarioAtual = usuario;
        fotoSelecionada = null;
        BookSwap.setCurrentUser(usuario);
        renderizarResumo(usuario);
        BookSwap.statusMessage(mensagem, 'Perfil atualizado com sucesso.', true);
      } catch (error) {
        BookSwap.statusMessage(mensagem, error.message);
      }
    });
  }

  function vincularRemoverFoto() {
    const botao = document.querySelector('[data-remove-profile-photo]');
    const input = document.querySelector('[data-profile-photo-input]');
    const label = document.querySelector('[data-profile-photo-label]');
    const mensagem = document.querySelector('[data-profile-message]');

    if (!botao) {
      return;
    }

    botao.addEventListener('click', async () => {
      BookSwap.statusMessage(mensagem, '');
      fotoSelecionada = '';
      if (input) {
        input.value = '';
      }
      if (label) {
        label.textContent = 'Escolher foto';
      }
      renderizarAvatar(usuarioAtual);

      try {
        const usuario = await apiRequest(`/usuarios/${usuarioAtual.id}`, {
          method: 'PUT',
          body: {
            fotoPerfil: ''
          }
        });

        usuarioAtual = usuario;
        fotoSelecionada = null;
        BookSwap.setCurrentUser(usuario);
        renderizarResumo(usuario);
        BookSwap.statusMessage(mensagem, 'Foto removida com sucesso.', true);
      } catch (error) {
        fotoSelecionada = null;
        renderizarAvatar(usuarioAtual);
        BookSwap.statusMessage(mensagem, error.message);
      }
    });
  }

  function vincularFormularioSenha() {
    const formulario = document.querySelector('[data-password-form]');
    const mensagem = document.querySelector('[data-password-message]');

    if (!formulario) {
      return;
    }

    formulario.addEventListener('submit', async (event) => {
      event.preventDefault();
      BookSwap.statusMessage(mensagem, '');

      const dados = new FormData(formulario);
      const senhaAtual = dados.get('senhaAtual');
      const novaSenha = String(dados.get('novaSenha') || '');
      const confirmarSenha = dados.get('confirmarSenha');
      const senhaRegistrada = campoUsuario(usuarioAtual, 'senha', 'password');

      if (senhaAtual !== senhaRegistrada) {
        BookSwap.statusMessage(mensagem, 'A senha atual nao confere.');
        return;
      }

      if (novaSenha.length < 6) {
        BookSwap.statusMessage(mensagem, 'A nova senha deve ter pelo menos 6 caracteres.');
        return;
      }

      if (novaSenha !== confirmarSenha) {
        BookSwap.statusMessage(mensagem, 'A confirmacao da senha nao confere.');
        return;
      }

      try {
        const usuario = await apiRequest(`/usuarios/${usuarioAtual.id}`, {
          method: 'PUT',
          body: {
            senha: novaSenha
          }
        });

        usuarioAtual = usuario;
        BookSwap.setCurrentUser(usuario);
        formulario.reset();
        BookSwap.statusMessage(mensagem, 'Senha atualizada com sucesso.', true);
      } catch (error) {
        BookSwap.statusMessage(mensagem, error.message);
      }
    });
  }

  function vincularLogout() {
    const botao = document.querySelector('[data-logout-profile]');

    if (!botao) {
      return;
    }

    botao.addEventListener('click', () => {
      BookSwap.logout();
    });
  }

  function vincularExcluirConta() {
    const botao = document.querySelector('[data-delete-account]');
    const mensagem = document.querySelector('[data-delete-account-message]');

    if (!botao) {
      return;
    }

    botao.addEventListener('click', async () => {
      if (!usuarioAtual || !usuarioAtual.id) {
        BookSwap.statusMessage(mensagem, 'Usuario nao encontrado para exclusao.');
        return;
      }

      const confirmado = window.confirm('Tem certeza que deseja excluir sua conta? Esta acao nao pode ser desfeita.');

      if (!confirmado) {
        return;
      }

      BookSwap.statusMessage(mensagem, '');
      botao.disabled = true;

      try {
        await apiRequest(`/usuarios/${usuarioAtual.id}`, {
          method: 'DELETE'
        });

        BookSwap.logout('index.html');
      } catch (error) {
        botao.disabled = false;
        BookSwap.statusMessage(mensagem, error.message);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (document.body.dataset.pagina !== 'profile') {
      return;
    }

    vincularUploadFoto();
    vincularFormularioPerfil();
    vincularFormularioSenha();
    vincularRemoverFoto();
    vincularLogout();
    vincularExcluirConta();
    carregarPerfil();
  });
}());
