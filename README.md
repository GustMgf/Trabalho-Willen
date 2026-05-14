# BookSwap API

API REST em Node.js + Express para uma plataforma de troca de livros entre usuarios.

O backend usa MySQL local como banco de dados.

## Requisitos

- Node.js
- MySQL local
- HeidiSQL, MySQL Workbench ou cliente equivalente

## Banco de dados

Configuracao padrao:

```text
Host: 127.0.0.1
Port: 3306
User: root
Password: vazio
Database: bookswap
```

As configuracoes tambem podem ser alteradas por variaveis de ambiente:

```text
DB_HOST
DB_PORT
DB_USER
DB_PASSWORD
DB_NAME
```

## Como criar o banco no HeidiSQL

1. Abra o HeidiSQL e conecte no MySQL local.
2. Abra o arquivo `database.sql`.
3. Execute o script completo.
4. Confirme que o banco `bookswap` foi criado com as tabelas:
   `usuarios`, `livros`, `livros_desejados`, `combinacoes`, `trocas`, `mensagens`.

## Como instalar

```bash
npm install
```

Se ainda nao tiver a dependencia MySQL:

```bash
npm install mysql2
```

## Como rodar

```bash
npm start
```

Durante desenvolvimento:

```bash
npm run dev
```

API:

```text
http://localhost:3000/api
```

Frontend:

```text
http://localhost:3000/
```

## Rotas principais

As rotas antigas em ingles continuam funcionando para compatibilidade com o frontend e com colecoes do Postman.

### Autenticacao

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/autenticacao/register`
- `POST /api/autenticacao/login`
- `POST /api/autenticacao/cadastro`
- `POST /api/autenticacao/entrar`

### Usuarios

- `GET /api/users`
- `GET /api/users/:id`
- `PUT /api/users/:id`
- `DELETE /api/users/:id`
- `GET /api/usuarios`
- `GET /api/usuarios/:id`
- `PUT /api/usuarios/:id`
- `DELETE /api/usuarios/:id`

### Livros

- `GET /api/books`
- `GET /api/books/:id`
- `POST /api/books`
- `PUT /api/books/:id`
- `DELETE /api/books/:id`
- `GET /api/livros`
- `GET /api/livros/:id`
- `POST /api/livros`
- `PUT /api/livros/:id`
- `DELETE /api/livros/:id`

### Livros desejados

- `GET /api/wanted-books`
- `GET /api/wanted-books/:id`
- `POST /api/wanted-books`
- `PUT /api/wanted-books/:id`
- `DELETE /api/wanted-books/:id`
- `GET /api/livros-desejados`
- `GET /api/livros-desejados/:id`
- `POST /api/livros-desejados`
- `PUT /api/livros-desejados/:id`
- `DELETE /api/livros-desejados/:id`

### Combinacoes

- `GET /api/matches`
- `GET /api/combinacoes`

### Trocas

- `GET /api/trades`
- `GET /api/trades/:id`
- `POST /api/trades`
- `PUT /api/trades/:id/status`
- `DELETE /api/trades/:id`
- `GET /api/trocas`
- `GET /api/trocas/:id`
- `POST /api/trocas`
- `PUT /api/trocas/:id/status`
- `DELETE /api/trocas/:id`

### Mensagens

- `GET /api/trades/:tradeId/messages`
- `POST /api/trades/:tradeId/messages`
- `GET /api/trocas/:trocaId/mensagens`
- `POST /api/trocas/:trocaId/mensagens`

## Testes no Postman

Use a base URL:

```text
http://localhost:3000/api
```

Para `POST` e `PUT`, use `Body > raw > JSON`.

### 1. Cadastrar usuario

`POST /api/auth/register`

```json
{
  "nome": "Julia",
  "email": "julia@email.com",
  "senha": "123456",
  "cidade": "Lages",
  "estado": "SC"
}
```

### 2. Login

`POST /api/auth/login`

```json
{
  "email": "julia@email.com",
  "senha": "123456"
}
```

### 3. Criar livro

`POST /api/livros`

```json
{
  "usuarioId": 1,
  "titulo": "A Sociedade do Anel",
  "autor": "J.R.R. Tolkien",
  "genero": "Fantasia",
  "condicao": "Bom",
  "descricao": "Livro bem conservado",
  "status": "disponivel"
}
```

Status aceitos para livros:

- `disponivel`
- `reservado`
- `trocado`

Tambem sao aceitos como alias: `available`, `reserved`, `exchanged`, `trocando`.

### 4. Listar livros

`GET /api/livros`

### 5. Criar livro desejado

`POST /api/livros-desejados`

```json
{
  "usuarioId": 1,
  "titulo": "Harry Potter",
  "autor": "J.K. Rowling",
  "genero": "Fantasia"
}
```

### 6. Criar troca

Crie pelo menos dois usuarios e um livro para cada usuario antes deste teste.

`POST /api/trocas`

```json
{
  "solicitanteId": 1,
  "donoId": 2,
  "livroOferecidoId": 1,
  "livroSolicitadoId": 2
}
```

### 7. Atualizar status da troca

`PUT /api/trocas/1/status`

```json
{
  "status": "aceita"
}
```

Status aceitos para trocas:

- `pendente`
- `aceita`
- `recusada`
- `concluida`
- `cancelada`

Tambem sao aceitos como alias: `pending`, `accepted`, `rejected`, `completed`, `cancelled`, `canceled`.

### 8. Enviar mensagem

`POST /api/trocas/1/mensagens`

```json
{
  "remetenteId": 1,
  "conteudo": "Ola, aceita trocar?"
}
```

### 9. Listar mensagens

`GET /api/trocas/1/mensagens`
