(function () {
  function bindLogin() {
    const form = document.querySelector('[data-login-form]');
    const mensagem = document.querySelector('[data-auth-mensagem]');

    if (!form) {
      return;
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      BookSwap.statusMessage(mensagem, '');

      const formData = new FormData(form);

      try {
        const response = await apiRequest('/autenticacao/entrar', {
          method: 'POST',
          body: {
            email: formData.get('email'),
            senha: formData.get('senha')
          }
        });

        BookSwap.setCurrentUser(response.usuario ?? response.user);
        window.location.href = 'books.html';
      } catch (error) {
        BookSwap.statusMessage(mensagem, error.message);
      }
    });
  }

  function bindRegister() {
    const form = document.querySelector('[data-register-form]');
    const mensagem = document.querySelector('[data-auth-mensagem]');

    if (!form) {
      return;
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      BookSwap.statusMessage(mensagem, '');

      const formData = new FormData(form);

      try {
        await apiRequest('/autenticacao/cadastro', {
          method: 'POST',
          body: {
            nome: formData.get('nome'),
            email: formData.get('email'),
            senha: formData.get('senha'),
            cidade: formData.get('cidade'),
            estado: formData.get('estado')
          }
        });

        BookSwap.statusMessage(mensagem, 'Cadastro realizado. Redirecionando para o login...', true);
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 800);
      } catch (error) {
        BookSwap.statusMessage(mensagem, error.message);
      }
    });
  }

  function bindLogout() {
    document.querySelectorAll('[data-logout]').forEach((botao) => {
      botao.addEventListener('click', () => {
        BookSwap.logout();
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    bindLogin();
    bindRegister();
    bindLogout();
  });
}());




