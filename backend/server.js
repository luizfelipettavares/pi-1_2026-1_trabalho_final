const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const dataDir = path.resolve(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco:', err.message);
    } else {
        console.log('Conectado ao banco SQLite com sucesso!');

        db.run('PRAGMA foreign_keys = ON;', (pragmaErr) => {
            if (pragmaErr) console.error('Erro ao ativar chaves estrangeiras:', pragmaErr.message);
        });
    }
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS categorias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL UNIQUE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS pratos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        preco REAL NOT NULL,
        categoria_id INTEGER,
        FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE
    )`);
});

app.get('/categorias', (req, res) => {
    db.all('SELECT * FROM categorias', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/categorias', (req, res) => {
    const { nome } = req.body;
    
    if (!nome || nome.trim() === '') {
        return res.status(400).json({ error: 'O nome da categoria é obrigatório.' });
    }
    
    db.run('INSERT INTO categorias (nome) VALUES (?)', [nome], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE')) {
                return res.status(400).json({ error: 'Esta categoria já existe.' });
            }
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ id: this.lastID, nome });
    });
});

app.get('/pratos', (req, res) => {
    const orderParam = req.query.order;
    let orderByClause = 'ORDER BY pratos.preco ASC'; // Padrão

    switch (orderParam) {
        case 'preco_desc':
            orderByClause = 'ORDER BY pratos.preco DESC';
            break;
        case 'nome_asc':
            orderByClause = 'ORDER BY pratos.nome ASC';
            break;
        case 'categoria_asc':
            orderByClause = 'ORDER BY categorias.nome ASC, pratos.nome ASC';
            break;
        default:
            orderByClause = 'ORDER BY pratos.preco ASC';
    }

    const query = `
        SELECT pratos.*, categorias.nome as categoria_nome 
        FROM pratos 
        JOIN categorias ON pratos.categoria_id = categorias.id
        ${orderByClause}
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/pratos', (req, res) => {
    const { nome, preco, categoria_id } = req.body;

    if (!nome || !preco || !categoria_id) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }

    const checkSql = 'SELECT id FROM pratos WHERE nome = ? AND categoria_id = ?';
    db.get(checkSql, [nome, categoria_id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) {
            return res.status(400).json({ error: 'Já existe um prato com este nome nesta categoria!' });
        }

        const insertSql = 'INSERT INTO pratos (nome, preco, categoria_id) VALUES (?, ?, ?)';
        db.run(insertSql, [nome, preco, categoria_id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ id: this.lastID, nome, preco, categoria_id });
        });
    });
});

app.put('/pratos/:id', (req, res) => {
    const { id } = req.params;
    const { nome, preco, categoria_id } = req.body;

    if (!nome || !preco || !categoria_id) {
        return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
    }

    const sql = 'UPDATE pratos SET nome = ?, preco = ?, categoria_id = ? WHERE id = ?';
    db.run(sql, [nome, preco, categoria_id, id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ message: 'Prato atualizado com sucesso!', updated: this.changes });
    });
});

app.delete('/pratos/:id', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM pratos WHERE id = ?', id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(204).send(); // Status 204 indica sucesso sem corpo de resposta
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});