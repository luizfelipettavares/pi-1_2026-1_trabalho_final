const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// Salvando o banco de dados na pasta /tmp do Linux para evitar erros de permissão de escrita na Render
const dataDir = '/tmp/data';
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco:', err.message);
    } else {
        console.log('Conectado ao banco SQLite com sucesso em:', dbPath);

        db.run('PRAGMA foreign_keys = ON;', (pragmaErr) => {
            if (pragmaErr) console.error('Erro ao ativar chaves estrangeiras:', pragmaErr.message);
        });
    }
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS categoria (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL UNIQUE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS produto (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        preco REAL NOT NULL,
        categoria_id INTEGER,
        FOREIGN KEY (categoria_id) REFERENCES categoria(id) ON DELETE RESTRICT
    )`);
});

// --- ENDPOINTS DE CATEGORIA (ESTRITAMENTE SINGULAR) ---

app.get('/categoria', (req, res) => {
    db.all('SELECT * FROM categoria', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/categoria', (req, res) => {
    const { nome } = req.body;
    
    if (!nome || nome.trim() === '') {
        return res.status(400).json({ error: 'O nome da categoria é obrigatório.' });
    }
    
    db.run('INSERT INTO categoria (nome) VALUES (?)', [nome], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE')) {
                return res.status(400).json({ error: 'Esta categoria já existe.' });
            }
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ id: this.lastID, nome });
    });
});

app.put('/categoria/:id', (req, res) => {
    const { id } = req.params;
    const { nome } = req.body;

    if (!nome || nome.trim() === '') {
        return res.status(400).json({ error: 'O nome da categoria é obrigatório.' });
    }

    const sql = 'UPDATE categoria SET nome = ? WHERE id = ?';
    db.run(sql, [nome, id], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE')) {
                return res.status(400).json({ error: 'Já existe uma categoria com este nome.' });
            }
            return res.status(500).json({ error: err.message });
        }
        res.status(200).json({ message: 'Categoria atualizada com sucesso!', updated: this.changes });
    });
});

app.delete('/categoria/:id', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM categoria WHERE id = ?', id, function(err) {
        if (err) {
            if (err.message.includes('FOREIGN KEY constraint failed')) {
                return res.status(400).json({ error: 'Não é possível excluir esta categoria pois existem produtos vinculados a ela.' });
            }
            return res.status(500).json({ error: err.message });
        }
        res.status(204).send(); 
    });
});

// --- ENDPOINTS DE PRODUTO (ESTRITAMENTE SINGULAR) ---

app.get('/produto', (req, res) => {
    const orderParam = req.query.order;
    let orderByClause = 'ORDER BY produto.preco ASC'; 

    switch (orderParam) {
        case 'preco_desc':
            orderByClause = 'ORDER BY produto.preco DESC';
            break;
        case 'nome_asc':
            orderByClause = 'ORDER BY produto.nome ASC';
            break;
        case 'categoria_asc':
            orderByClause = 'ORDER BY categoria.nome ASC, produto.nome ASC';
            break;
        default:
            orderByClause = 'ORDER BY produto.preco ASC';
    }

    const query = `
        SELECT produto.*, categoria.nome as categoria_nome 
        FROM produto 
        JOIN categoria ON produto.categoria_id = categoria.id
        ${orderByClause}
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/produto', (req, res) => {
    const { nome, preco, categoria_id } = req.body;

    if (!nome || !preco || !categoria_id) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }

    const checkSql = 'SELECT id FROM produto WHERE nome = ? AND categoria_id = ?';
    db.get(checkSql, [nome, categoria_id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) {
            return res.status(400).json({ error: 'Já existe um produto com este nome nesta categoria!' });
        }

        const insertSql = 'INSERT INTO produto (nome, preco, categoria_id) VALUES (?, ?, ?)';
        db.run(insertSql, [nome, preco, categoria_id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ id: this.lastID, nome, preco, categoria_id });
        });
    });
});

app.put('/produto/:id', (req, res) => {
    const { id } = req.params;
    const { nome, preco, categoria_id } = req.body;

    if (!nome || !preco || !categoria_id) {
        return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
    }

    const sql = 'UPDATE produto SET nome = ?, preco = ?, categoria_id = ? WHERE id = ?';
    db.run(sql, [nome, preco, categoria_id, id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ message: 'Produto atualizado com sucesso!', updated: this.changes });
    });
});

app.delete('/produto/:id', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM produto WHERE id = ?', id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(204).send(); 
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor da Central de Estoque rodando na porta ${PORT}`);
});