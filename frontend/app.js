const API_URL = 'https://pi-1-2026-1-trabalho-final.onrender.com';

const body = document.body;
const toggleThemeBtn = document.getElementById('toggle-theme');
const formCategoria = document.getElementById('form-categoria');
const formProduto = document.getElementById('form-produto');
const selectCategoria = document.getElementById('produto-categoria');
const listaProdutos = document.getElementById('lista-produtos');
const listaCategoriasTabela = document.getElementById('lista-categorias-tabela');
const sortSelect = document.getElementById('sort-select');
const offlineBanner = document.getElementById('offline-banner');

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

if (localStorage.getItem('theme') === 'dark') {
    body.classList.add('dark-theme');
}

toggleThemeBtn.addEventListener('click', () => {
    body.classList.toggle('dark-theme');
    const isDark = body.classList.contains('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
});

const savedSort = localStorage.getItem('sort_preference') || 'preco_asc';
sortSelect.value = savedSort;

// --- GERENCIAMENTO DE ESTADO E CACHE LOCAL (MODO OFFLINE) ---
let categoriasCache = [];
let produtosCache = [];

function salvarNoCacheLocal(chave, dados) {
    localStorage.setItem(chave, JSON.stringify(dados));
}

function carregarDoCacheLocal(chave) {
    const dados = localStorage.getItem(chave);
    return dados ? JSON.parse(dados) : [];
}

function atualizarStatusConexão(isOnline) {
    if (isOnline) {
        offlineBanner.style.display = 'none';
    } else {
        offlineBanner.style.display = 'block';
        showToast('Modo offline ativado. Usando dados locais.', 'warning');
    }
}

// --- REQUISIÇÕES DA API ---
async function carregarCategorias() {
    try {
        const res = await fetch(`${API_URL}/categorias`);
        if (!res.ok) throw new Error('Erro na API');
        categoriasCache = await res.json();
        salvarNoCacheLocal('categorias_cache', categoriasCache);
        atualizarStatusConexão(true);
    } catch (error) {
        categoriasCache = carregarDoCacheLocal('categorias_cache');
        atualizarStatusConexão(false);
    }
    renderizarCategorias();
}

async function carregarProdutos() {
    const ordenacao = sortSelect.value;
    localStorage.setItem('sort_preference', ordenacao);
    
    try {
        const res = await fetch(`${API_URL}/produtos?sort=${ordenacao}`);
        if (!res.ok) throw new Error('Erro na API');
        produtosCache = await res.json();
        salvarNoCacheLocal('produtos_cache', produtosCache);
        atualizarStatusConexão(true);
    } catch (error) {
        produtosCache = carregarDoCacheLocal('produtos_cache');
        // Aplica ordenação local simples caso a API esteja offline
        if (ordenacao === 'preco_asc') produtosCache.sort((a, b) => a.preco - b.preco);
        if (ordenacao === 'preco_desc') produtosCache.sort((a, b) => b.preco - a.preco);
        if (ordenacao === 'nome_asc') produtosCache.sort((a, b) => a.nome.localeCompare(b.nome));
        atualizarStatusConexão(false);
    }
    renderizarProdutos();
}

sortSelect.addEventListener('change', carregarProdutos);

// --- RENDERIZAÇÃO DA INTERFACE ---
function renderizarCategorias() {
    selectCategoria.innerHTML = '<option value="" disabled selected>Selecione uma categoria...</option>';
    listaCategoriasTabela.innerHTML = '';
    
    if (categoriasCache.length === 0) {
        listaCategoriasTabela.innerHTML = '<tr><td colspan="2" class="text-center text-muted">Nenhuma categoria cadastrada.</td></tr>';
        return;
    }

    categoriasCache.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.nome;
        selectCategoria.appendChild(option);

        const tr = document.createElement('tr');
        tr.className = 'animate-in';
        tr.innerHTML = `
            <td><strong>${cat.nome}</strong></td>
            <td class="text-center">
                <button class="btn btn-danger btn-sm" onclick="deletarCategoria(${cat.id})">Remover</button>
            </td>
        `;
        listaCategoriasTabela.appendChild(tr);
    });
}

function renderizarProdutos() {
    listaProdutos.innerHTML = '';
    
    if (produtosCache.length === 0) {
        listaProdutos.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Nenhum produto em estoque.</td></tr>';
        return;
    }

    produtosCache.forEach(prod => {
        const tr = document.createElement('tr');
        tr.className = 'animate-in';
        tr.innerHTML = `
            <td>
                <div class="product-name-cell">
                    <span class="product-bullet"></span>
                    <div>
                        <span class="font-semibold">${prod.nome}</span>
                        <span class="product-id-tag">ID: #00${prod.id}</span>
                    </div>
                </div>
            </td>
            <td><span class="badge-category">${prod.categoria_nome || 'Sem categoria'}</span></td>
            <td class="text-right font-mono font-semibold text-primary">R$ ${Number(prod.preco).toFixed(2)}</td>
            <td class="text-center">
                <div class="actions-wrapper">
                    <button class="btn btn-secondary btn-sm" onclick="editarProduto(${prod.id}, '${prod.nome}', ${prod.preco}, ${prod.categoria_id})">Editar</button>
                    <button class="btn btn-danger btn-sm" onclick="deletarProduto(${prod.id})">Excluir</button>
                </div>
            </td>
        `;
        listaProdutos.appendChild(tr);
    });
}

// --- SUBMISSÃO DOS FORMULÁRIOS ---
formCategoria.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nomeInput = document.getElementById('categoria-nome');
    const nome = nomeInput.value.trim();
    
    if (!nome) return;

    try {
        const res = await fetch(`${API_URL}/categoria`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome })
        });
        
        const data = await res.json();
        
        if (res.status === 201) {
            showToast('Categoria criada com sucesso!', 'success');
            nomeInput.value = '';
            await carregarCategorias();
        } else {
            showToast(data.error || 'Erro ao salvar categoria.', 'error');
        }
    } catch (error) {
        showToast('Não foi possível salvar. Você está desconectado.', 'error');
    }
});

formProduto.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('produto-id').value;
    const nome = document.getElementById('produto-nome').value.trim();
    const preco = document.getElementById('produto-preco').value;
    const categoria_id = document.getElementById('produto-categoria').value;

    if (!nome || !preco || !categoria_id) {
        showToast('Por favor, preencha todos os campos.', 'warning');
        return;
    }

    const produtoDados = { nome, preco: parseFloat(preco), categoria_id: parseInt(categoria_id) };
    
    try {
        let res;
        if (id) {
            res = await fetch(`${API_URL}/produto/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(produtoDados)
            });
        } else {
            res = await fetch(`${API_URL}/produto`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(produtoDados)
            });
        }

        const data = await res.json();

        if (res.ok) {
            showToast(id ? 'Produto atualizado com sucesso!' : 'Produto cadastrado com sucesso!', 'success');
            resetarFormProduto();
            await carregarProdutos();
        } else {
            showToast(data.error || 'Erro ao processar requisição.', 'error');
        }
    } catch (error) {
        showToast('Sem conexão com o servidor. Operação abortada.', 'error');
    }
});

window.editarProduto = (id, nome, preco, categoria_id) => {
    document.getElementById('produto-id').value = id;
    document.getElementById('produto-nome').value = nome;
    document.getElementById('produto-preco').value = preco;
    document.getElementById('produto-categoria').value = categoria_id;
    
    const btnSalvar = document.getElementById('btn-salvar-produto');
    btnSalvar.innerText = 'Atualizar Produto';
    document.getElementById('btn-cancelar-produto').style.display = 'inline-block';
    document.getElementById('produto-nome').focus();
};

document.getElementById('btn-cancelar-produto').addEventListener('click', resetarFormProduto);

function resetarFormProduto() {
    formProduto.reset();
    document.getElementById('produto-id').value = '';
    document.getElementById('btn-salvar-produto').innerText = 'Salvar Produto';
    document.getElementById('btn-cancelar-produto').style.display = 'none';
}

window.deletarProduto = async (id) => {
    if (!confirm('Deseja realmente remover este produto?')) return;
    
    try {
        const res = await fetch(`${API_URL}/produto/${id}`, { method: 'DELETE' });
        if (res.status === 204 || res.ok) {
            showToast('Produto removido com sucesso!', 'success');
            await carregarProdutos();
        } else {
            showToast('Erro interno ao tentar deletar.', 'error');
        }
    } catch (error) {
        showToast('Erro de rede. Não foi possível remover.', 'error');
    }
};

window.deletarCategoria = async (id) => {
    if (!confirm('Deseja remover esta categoria? Atenção: isso desvinculará os produtos associados.')) return;

    try {
        const res = await fetch(`${API_URL}/categoria/${id}`, { method: 'DELETE' });
        const data = await res.json();
        
        if (res.ok) {
            showToast('Categoria removida com sucesso!', 'success');
            await carregarCategorias();
            await carregarProdutos();
        } else {
            showToast(data.error || 'Erro ao remover categoria.', 'error');
        }
    } catch (error) {
        showToast('Erro de conexão ao tentar remover categoria.', 'error');
    }
};

// --- INICIALIZAÇÃO DA APLICAÇÃO ---
async function inicializar() {
    await carregarCategorias();
    await carregarProdutos();
}

inicializar();