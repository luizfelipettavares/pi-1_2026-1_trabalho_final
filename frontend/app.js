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

const savedSort = localStorage.getItem('lastSort') || 'preco_asc';
sortSelect.value = savedSort;

sortSelect.addEventListener('change', () => {
    localStorage.setItem('lastSort', sortSelect.value);
    carregarProdutos();
});

function setSubmitting(buttonId, isSubmitting, activeText) {
    const btn = document.getElementById(buttonId);
    if (btn) {
        btn.disabled = isSubmitting;
        btn.innerText = isSubmitting ? 'Processando...' : activeText;
    }
}

async function carregarCategorias() {
    try {
        const res = await fetch(`${API_URL}/categoria`);
        if (!res.ok) throw new Error();
        const categoria = await res.json();
        
        localStorage.setItem('cache_categoria', JSON.stringify(categoria));
        renderizarCategorias(categoria);
        offlineBanner.style.display = 'none';
    } catch (err) {
        offlineBanner.style.display = 'block';
        const localData = JSON.parse(localStorage.getItem('cache_categoria')) || [];
        renderizarCategorias(localData);
    }
}

function renderizarCategorias(categoria) {
    selectCategoria.innerHTML = '<option value="">Selecione uma Categoria</option>';
    listaCategoriasTabela.innerHTML = '';

    if (categoria.length === 0) {
        listaCategoriasTabela.innerHTML = `<tr><td colspan="2" style="text-align:center; color:var(--text-muted);">Nenhuma categoria.</td></tr>`;
        return;
    }

    categoria.forEach(cat => {
        selectCategoria.innerHTML += `<option value="${cat.id}">${cat.nome}</option>`;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${cat.nome}</strong></td>
            <td class="text-center">
                <div class="table-actions">
                    <button type="button" class="btn-table-edit" onclick="editarCategoria(${cat.id}, '${cat.nome}')">Editar</button>
                    <button type="button" class="btn-table-delete" onclick="deletarCategoria(${cat.id})">Excluir</button>
                </div>
            </td>
        `;
        listaCategoriasTabela.appendChild(tr);
    });
}

formCategoria.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('categoria-id').value;
    const nome = document.getElementById('cat-nome').value.trim();

    if (!nome) return showToast('O nome da categoria é obrigatório!', 'warning');

    const payload = { nome };
    const url = id ? `${API_URL}/categoria/${id}` : `${API_URL}/categoria`;
    const method = id ? 'PUT' : 'POST';

    setSubmitting('btn-salvar-categoria', true);

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        if (res.ok) {
            showToast(id ? 'Categoria atualizada com sucesso!' : 'Categoria cadastrada com sucesso!', 'success');
            resetarFormCategoria();
            await carregarCategorias();
            await carregarProdutos(); 
        } else { 
            showToast(data.error || 'Erro ao processar.', 'error'); 
        }
    } catch (err) {
        showToast('Ação indisponível devido ao estado offline.', 'error');
    } finally {
        const btnText = document.getElementById('categoria-id').value ? 'Atualizar Categoria' : 'Salvar Categoria';
        setSubmitting('btn-salvar-categoria', false, btnText);
    }
});

window.editarCategoria = (id, nome) => {
    document.getElementById('categoria-id').value = id;
    document.getElementById('cat-nome').value = nome;
    
    document.getElementById('btn-salvar-categoria').innerText = 'Atualizar Categoria';
    document.getElementById('btn-cancelar-categoria').style.display = 'inline-block';
    document.getElementById('cat-nome').focus();
};

document.getElementById('btn-cancelar-categoria').addEventListener('click', resetarFormCategoria);

function resetarFormCategoria() {
    formCategoria.reset();
    document.getElementById('categoria-id').value = '';
    document.getElementById('btn-salvar-categoria').innerText = 'Salvar Categoria';
    document.getElementById('btn-cancelar-categoria').style.display = 'none';
}

window.deletarCategoria = async (id) => {
    if (!confirm('Deseja realmente remover esta categoria?')) return;

    try {
        const res = await fetch(`${API_URL}/categoria/${id}`, { method: 'DELETE' });
        
        if (res.status === 204 || res.ok) {
            showToast('Categoria removida com sucesso!', 'success');
            await carregarCategorias();
        } else {
            const data = await res.json();
            showToast(data.error || 'Erro ao tentar deletar.', 'error');
        }
    } catch (err) {
        showToast('Erro de rede. Ação bloqueada em modo offline.', 'error');
    }
};

async function carregarProdutos() {
    const ordenacao = sortSelect.value; 
    try {
        const res = await fetch(`${API_URL}/produto?order=${ordenacao}`);
        if (!res.ok) throw new Error();
        const produto = await res.json();
        
        localStorage.setItem('cache_produto', JSON.stringify(produto));
        renderizarProdutos(produto);
        offlineBanner.style.display = 'none';
    } catch (err) {
        offlineBanner.style.display = 'block';
        const cacheLocal = JSON.parse(localStorage.getItem('cache_produto')) || [];
        renderizarProdutos(cacheLocal);
        showToast('Modo de visualização offline ativo.', 'warning');
    }
}

function renderizarProdutos(produto) {
    listaProdutos.innerHTML = ''; 
    if (produto.length === 0) {
        listaProdutos.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 30px;">
                    Nenhum produto disponível.
                </td>
            </tr>`;
        return;
    }

    produto.forEach(prod => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${prod.nome}</strong></td>
            <td><span style="background: var(--bg-global); padding: 4px 8px; border-radius: 4px; font-size: 0.85rem; border: 1px solid var(--border-color);">${prod.categoria_nome || 'Sem categoria'}</span></td>
            <td class="text-right" style="font-weight: 600; color: var(--primary);">R$ ${prod.preco.toFixed(2)}</td>
            <td class="text-center">
                <div class="table-actions">
                    <button class="btn-table-edit" onclick="editarProduto(${prod.id}, '${prod.nome}', ${prod.preco}, ${prod.categoria_id})">Editar</button>
                    <button class="btn-table-delete" onclick="deletarProduto(${prod.id})">Excluir</button>
                </div>
            </td>
        `;
        listaProdutos.appendChild(tr);
    });
}

formProduto.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('produto-id').value;
    const nome = document.getElementById('produto-nome').value.trim();
    const preco = parseFloat(document.getElementById('produto-preco').value);
    const categoria_id = document.getElementById('produto-categoria').value;

    if (!nome || isNaN(preco) || !categoria_id) {
        return showToast('Por favor, valide todos os campos antes de enviar.', 'warning');
    }

    const payload = { nome, preco, categoria_id };
    const url = id ? `${API_URL}/produto/${id}` : `${API_URL}/produto`;
    const method = id ? 'PUT' : 'POST'; 

    setSubmitting('btn-salvar-produto', true);

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.status === 204 || res.ok) {
            showToast(id ? 'Produto atualizado!' : 'Novo produto adicionado com sucesso!', 'success');
            resetarFormProduto();
            await carregarProdutos();
        } else {
            const data = await res.json();
            showToast(data.error || 'Erro interno no servidor.', 'error');
        }
    } catch (err) {
        showToast('Operação bloqueada. Verifique a conexão com a API.', 'error');
    } finally {
        const btnText = document.getElementById('produto-id').value ? 'Atualizar Produto' : 'Salvar Produto';
        setSubmitting('btn-salvar-produto', false, btnText);
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
    } catch (err) {
        showToast('Ação indisponível em modo offline.', 'error');
    }
};

carregarCategorias();
carregarProdutos();