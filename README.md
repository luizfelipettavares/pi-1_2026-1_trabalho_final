# Central de Estoque

Um painel web completo (Front-end e Back-end) para o gerenciamento de produtos e categorias de estoque. O sistema conta com alternância de tema visual, persistência de dados e suporte a cache local.

---

## Requisitos do Projeto (IFPI - Prof. Ely)

Abaixo está a documentação de como a aplicação atende aos critérios solicitados na disciplina:

### 1. Entidades e Relacionamento (1:N)
O sistema trabalha com duas entidades principais relacionadas de forma mestre-detalhe:
- **Categoria (Mestre):** Uma categoria pode conter múltiplos produtos vinculados.
- **Produto (Detalhe):** Cada produto pertence obrigatoriamente a uma única categoria.

### 2. Regras de Negócio e Validações
Conforme exigido, as validações ocorrem tanto no Cliente quanto no Servidor:
- **No Cliente (Front-end):** Validação de campos obrigatórios (HTML5 `required`) e bloqueio de envio de formulários incompletos antes de disparar a requisição via API.
- **No Servidor (Back-end/Express.js):** Validação do formato JSON recebido para garantir que campos obrigatórios não cheguem nulos ou vazios ao banco de dados.

### 3. Métodos HTTP Implementados
A API utiliza os métodos HTTP adequados para o ciclo completo das entidades:
- `GET /produtos` e `GET /categorias` - Listagem de dados.
- `POST /produtos` e `POST /categorias` - Cadastro de novos registros.
- `DELETE /produtos/:id` e `DELETE /categorias/:id` - Remoção de registros.
- `PUT` ou `PATCH` - Atualização e edição dos dados existentes.

### 4. Critérios de Ordenação no Servidor
O servidor possui rotas configuradas para retornar a listagem de produtos ordenando por:
- Menor Preço ↑ ou Maior Preço ↓.
- Ordem Alfabética (A-Z) do Nome do Produto ou da Categoria.

### 5. Uso de Local Storage (Persistência no Navegador)
O navegador armazena localmente as preferências para melhorar a experiência e dar suporte offline:
- Preferência de tema visual (*Light* ou *Dark Mode*).
- Última forma de ordenação selecionada na tabela.
- Cache local de entidades para leitura caso o usuário fique offline.

### 6. Persistência em Banco de Dados
Os dados da aplicação são salvos de forma definitiva em um banco de dados integrado ao servidor Express.js.

### 7. Hospedagem
Para hospedagem foi utilizado o Vercel (frontend) e o Render (backend).

- **Front-end:** https://pi-1-2026-1-trabalho-final.vercel.app/
- **Back-end:** https://pi-1-2026-1-trabalho-final.onrender.com/

---
### 8. Link do vídeo explicando o projeto
https://youtu.be/-QSv-VCXWiU?is=g1ohIDrDNvSyYlOS
---

## Tecnologias Utilizadas

- **Front-end:** HTML5, CSS3 (Flexbox, CSS Grid) e JavaScript nativo (Manipulação de D.O.M).
- **Back-end:** Node.js com Express.js para criação da API HTTP.
- **Banco de Dados:** SQLite.

---

# Desenvolvedores

- Alisson Gabriel
- Luiz Felipe
- Renato de Paiva
