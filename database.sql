CREATE DATABASE IF NOT EXISTS bookswap
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE bookswap;

CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  senha VARCHAR(255) NOT NULL,
  foto_perfil VARCHAR(255),
  cidade VARCHAR(100) NOT NULL,
  estado VARCHAR(2) NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS livros (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  titulo VARCHAR(180) NOT NULL,
  autor VARCHAR(160) NOT NULL,
  genero VARCHAR(100) NOT NULL,
  condicao VARCHAR(80) NOT NULL,
  descricao TEXT NOT NULL,
  status ENUM('disponivel', 'reservado', 'trocado') NOT NULL DEFAULT 'disponivel',
  capa_imagem VARCHAR(255),
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_livros_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS livros_desejados (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  titulo VARCHAR(180) NOT NULL,
  autor VARCHAR(160) NOT NULL,
  genero VARCHAR(100) NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_livros_desejados_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS combinacoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  livro_id INT NOT NULL,
  pontuacao_match INT NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_combinacoes_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_combinacoes_livro
    FOREIGN KEY (livro_id) REFERENCES livros(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS trocas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  solicitante_id INT NOT NULL,
  dono_id INT NOT NULL,
  livro_solicitado_id INT NOT NULL,
  livro_oferecido_id INT NOT NULL,
  status ENUM('pendente', 'aceita', 'recusada', 'concluida', 'cancelada') NOT NULL DEFAULT 'pendente',
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_trocas_solicitante
    FOREIGN KEY (solicitante_id) REFERENCES usuarios(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_trocas_dono
    FOREIGN KEY (dono_id) REFERENCES usuarios(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_trocas_livro_solicitado
    FOREIGN KEY (livro_solicitado_id) REFERENCES livros(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_trocas_livro_oferecido
    FOREIGN KEY (livro_oferecido_id) REFERENCES livros(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mensagens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  troca_id INT NOT NULL,
  remetente_id INT NOT NULL,
  conteudo TEXT NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mensagens_troca
    FOREIGN KEY (troca_id) REFERENCES trocas(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_mensagens_remetente
    FOREIGN KEY (remetente_id) REFERENCES usuarios(id)
    ON DELETE CASCADE
);
