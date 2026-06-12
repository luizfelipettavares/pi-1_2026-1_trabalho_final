const API_URL = 'http://localhost:3000';

// Elementos do DOM
const body = document.body;
const toggleThemeBtn = document.getElementById('toggle-theme');
const formCategoria = document.getElementById('form-categoria');
const formPrato = document.getElementById('form-prato');
const selectCategoria = document.getElementById('prato-categoria');
const listaPratos = document.getElementById('lista-pratos');
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
    body.classList.add('dark-theme'); // [cite: 21]
}

toggleThemeBtn.addEventListener('click', () => {
    body.classList.toggle('dark-theme');
    const isDark = body.classList.contains('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light'); // [cite: 19, 21]
});

const savedSort = localStorage.getItem('lastSort') || 'preco_asc';
sortSelect.value = savedSort;

sortSelect.addEventListener('change', () => {
    localStorage.setItem('lastSort', sortSelect.value); // [cite: 19, 23]
    carregarPratos();
});

function setSubmitting(buttonId, isSubmitting, activeText) {
    const btn = document.getElementById(buttonId);
    if (isSubmitting) {
        btn.disabled = true;
        btn.innerText = 'Processando...';
    } else {
        btn.disabled = false;
        btn.innerText = activeText;
    }
}

async function carregarCategorias() {
    try {
        const res = await fetch(`${API_URL}/categorias`);
        if (!res.ok) throw new Error();
        const categorias = await res.json();
        
        localStorage.setItem('cache_categorias', JSON.stringify(categorias));
        renderizarCategorias(categorias);
        offlineBanner.style.display = 'none';
    } catch (err) {
        offlineBanner.style.display = 'block';
        const localData = JSON.parse(localStorage.getItem('cache_categorias')) || [];
        renderizarCategorias(localData);
    }
}

function renderizarCategorias(categorias) {
    selectCategoria.innerHTML = '<option value="">Selecione uma Categoria</option>';
    categorias.forEach(cat => {
        selectCategoria.innerHTML += `<option value="${cat.id}">${cat.nome}</option>`;
    });
}

formCategoria.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = document.getElementById('cat-nome').value.trim();

    if (!nome) return showToast('O nome da categoria é obrigatório!', 'warning'); // [cite: 11]

    setSubmitting('btn-salvar-categoria', true);

    try {
        const res = await fetch(`${API_URL}/categorias`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome })
        });
        
        const data = await res.json();
        if (res.ok) {
            showToast('Categoria cadastrada com sucesso!', 'success');
            formCategoria.reset();
            await carregarCategorias();
        } else { 
            showToast(data.error || 'Erro ao processar.', 'error'); 
        }
    } catch (err) {
        showToast('Não foi possível salvar em modo offline.', 'error');
    } finally {
        setSubmitting('btn-salvar-categoria', false, 'Salvar Categoria');
    }
});

async function carregarPratos() {
    const ordenacao = sortSelect.value; 
    try {
        const res = await fetch(`${API_URL}/pratos?order=${ordenacao}`);
        if (!res.ok) throw new Error();
        const pratos = await res.json();
        
        localStorage.setItem('cache_pratos', JSON.stringify(pratos));
        renderizarPratos(pratos);
        offlineBanner.style.display = 'none';
    } catch (err) {
        offlineBanner.style.display = 'block';

        const cacheLocal = JSON.parse(localStorage.getItem('cache_pratos')) || [];
        renderizarPratos(cacheLocal);
        showToast('Modo de visualização offline ativo.', 'warning');
    }
}

function renderizarPratos(pratos) {
    listaPratos.innerHTML = ''; 
    if (pratos.length === 0) {
        listaPratos.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 30px;">
                    Nenhum prato disponível.
                </td>
            </tr>`;
        return;
    }

    pratos.forEach(prato => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${prato.nome}</strong></td>
            <td><span style="background: var(--bg-global); padding: 4px 8px; border-radius: 4px; font-size: 0.85rem; border: 1px solid var(--border-color);">${prato.categoria_nome || 'Sem categoria'}</span></td>
            <td class="text-right" style="font-weight: 600; color: var(--primary);">R$ ${prato.preco.toFixed(2)}</td>
            <td class="text-center">
                <div class="table-actions">
                    <button class="btn-table-edit" onclick="editarPrato(${prato.id}, '${prato.nome}', ${prato.preco}, ${prato.categoria_id})">Editar</button>
                    <button class="btn-table-delete" onclick="deletarPrato(${prato.id})">Excluir</button>
                </div>
            </td>
        `;
        listaPratos.appendChild(tr);
    });
}

formPrato.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('prato-id').value;
    const nome = document.getElementById('prato-nome').value.trim();
    const preco = parseFloat(document.getElementById('prato-preco').value);
    const categoria_id = document.getElementById('prato-categoria').value;

    if (!nome || isNaN(preco) || !categoria_id) {
        return showToast('Por favor, valide todos os campos antes de enviar.', 'warning');
    }

    const payload = { nome, preco, categoria_id };
    const url = id ? `${API_URL}/pratos/${id}` : `${API_URL}/pratos`;
    const method = id ? 'PUT' : 'POST'; 

    setSubmitting('btn-salvar-prato', true);

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.status === 204 || res.ok) {
            showToast(id ? 'Prato atualizado!' : 'Novo prato adicionado com sucesso!', 'success');
            resetarFormPrato();
            await carregarPratos();
        } else {
            const data = await res.json();
            showToast(data.error || 'Erro interno no servidor.', 'error');
        }
    } catch (err) {
        showToast('Operação bloqueada. Verifique a conexão com a API.', 'error');
    } finally {
        setSubmitting('btn-salvar-prato', false, id ? 'Atualizar Prato' : 'Salvar Prato');
    }
});

window.editarPrato = (id, nome, preco, categoria_id) => {
    document.getElementById('prato-id').value = id;
    document.getElementById('prato-nome').value = nome;
    document.getElementById('prato-preco').value = preco;
    document.getElementById('prato-categoria').value = categoria_id;
    
    const btnSalvar = document.getElementById('btn-salvar-prato');
    btnSalvar.innerText = 'Atualizar Prato';
    document.getElementById('btn-cancelar').style.display = 'inline-block';
    document.getElementById('prato-nome').focus();
};

document.getElementById('btn-cancelar').addEventListener('click', resetarFormPrato);

function resetarFormPrato() {
    formPrato.reset();
    document.getElementById('prato-id').value = '';
    document.getElementById('btn-salvar-prato').innerText = 'Salvar Prato';
    document.getElementById('btn-cancelar').style.display = 'none';
}

window.deletarPrato = async (id) => {
    if (!confirm('Deseja realmente remover este item?')) return;
    
    try {
        const res = await fetch(`${API_URL}/pratos/${id}`, { method: 'DELETE' });
        if (res.status === 204 || res.ok) {
            showToast('Item removido com sucesso!', 'success');
            await carregarPratos();
        } else {
            showToast('Erro interno ao tentar deletar.', 'error');
        }
    } catch (err) {
        showToast('Ação indisponível em modo offline.', 'error');
    }
};

carregarCategorias();
carregarPratos();