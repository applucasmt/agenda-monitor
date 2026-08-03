// script.js
// Configuração
const USERS = {
    admin: { password: 'admin123', role: 'admin' },
    user: { password: 'user123', role: 'user' }
};

let currentUser = null;
let agendas = [];
let solicitacoes = [];

// Google Apps Script URL - Substitua pela sua URL
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx2yIR19t_Sn9VemtPjkkGDJdjZNZE5dnZoqy1kfEGDzvrsqp9493dWuT5p4jmgdgcq/exec';

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    // Verificar se já está logado
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        const user = JSON.parse(savedUser);
        if (user && user.username) {
            loginUser(user.username, user.role);
        }
    }
});

// Funções de Login
function login() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    
    if (!username || !password) {
        showToast('Por favor, preencha todos os campos', 'error');
        return;
    }
    
    const user = USERS[username];
    if (!user || user.password !== password) {
        showToast('Usuário ou senha inválidos', 'error');
        return;
    }
    
    loginUser(username, user.role);
}

function loginUser(username, role) {
    currentUser = { username, role };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    
    if (role === 'admin') {
        document.getElementById('adminScreen').classList.add('active');
        carregarAgendasAdmin();
        carregarSolicitacoes();
    } else {
        document.getElementById('userScreen').classList.add('active');
        carregarAgendasUsuario();
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('loginScreen').classList.add('active');
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}

// Navegação Admin
function showTab(tabId) {
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    const buttons = document.querySelectorAll('.nav-actions .nav-btn');
    const index = ['novaAgenda', 'listaAgendas', 'solicitacoes'].indexOf(tabId);
    if (index !== -1 && buttons[index]) {
        buttons[index].classList.add('active');
    }
    
    if (tabId === 'listaAgendas') {
        carregarAgendasAdmin();
    } else if (tabId === 'solicitacoes') {
        carregarSolicitacoes();
    }
}

// Funções de Agenda
async function criarAgenda(event) {
    event.preventDefault();
    
    const dados = {
        dia: document.getElementById('dia').value,
        horario: document.getElementById('horario').value,
        tipo: document.getElementById('tipo').value,
        participantes: document.getElementById('participantes').value,
        local: document.getElementById('local').value,
        endereco: document.getElementById('endereco').value,
        status: document.getElementById('status').value
    };
    
    try {
        const response = await fetch(`${SCRIPT_URL}?action=criarAgenda`, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dados)
        });
        
        showToast('Agenda criada com sucesso!', 'success');
        document.getElementById('agendaForm').reset();
        carregarAgendasAdmin();
    } catch (error) {
        showToast('Erro ao criar agenda', 'error');
    }
}

async function carregarAgendasAdmin() {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=listarAgendas`);
        const data = await response.json();
        agendas = data;
        renderizarTabelaAgendas(data);
    } catch (error) {
        showToast('Erro ao carregar agendas', 'error');
    }
}

function renderizarTabelaAgendas(agendas) {
    const tbody = document.getElementById('agendaTableBody');
    
    if (!agendas || agendas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-message">Nenhuma agenda encontrada</td></tr>`;
        return;
    }
    
    tbody.innerHTML = agendas.map(agenda => `
        <tr>
            <td>${formatDate(agenda.Dia)}</td>
            <td>${agenda.Horário}</td>
            <td><strong>${agenda.Tipo}</strong></td>
            <td>${agenda.Participantes}</td>
            <td>${agenda.Local}</td>
            <td><span class="status-badge status-${getStatusClass(agenda.Status)}">${agenda.Status}</span></td>
            <td>
                <button onclick="alterarStatus('${agenda.ID}', 'Realizada')" class="btn-small btn-success">
                    <i class="fas fa-check"></i>
                </button>
                <button onclick="alterarStatus('${agenda.ID}', 'Cancelada')" class="btn-small btn-danger">
                    <i class="fas fa-times"></i>
                </button>
                <button onclick="excluirAgenda('${agenda.ID}')" class="btn-small" style="background:#FF6B6B;color:white;">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

async function alterarStatus(id, novoStatus) {
    if (!confirm(`Deseja alterar o status para "${novoStatus}"?`)) return;
    
    try {
        await fetch(`${SCRIPT_URL}?action=atualizarStatus&id=${id}&status=${novoStatus}`, {
            method: 'POST',
            mode: 'no-cors'
        });
        showToast('Status atualizado com sucesso!', 'success');
        carregarAgendasAdmin();
    } catch (error) {
        showToast('Erro ao atualizar status', 'error');
    }
}

async function excluirAgenda(id) {
    if (!confirm('Tem certeza que deseja excluir esta agenda?')) return;
    
    try {
        await fetch(`${SCRIPT_URL}?action=excluirAgenda&id=${id}`, {
            method: 'POST',
            mode: 'no-cors'
        });
        showToast('Agenda excluída com sucesso!', 'success');
        carregarAgendasAdmin();
    } catch (error) {
        showToast('Erro ao excluir agenda', 'error');
    }
}

// Funções do Usuário
async function carregarAgendasUsuario() {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=listarAgendas`);
        const data = await response.json();
        agendas = data;
        renderizarCardsAgendas(data);
    } catch (error) {
        showToast('Erro ao carregar agendas', 'error');
    }
}

function renderizarCardsAgendas(agendas) {
    const container = document.getElementById('cardsContainer');
    
    if (!agendas || agendas.length === 0) {
        container.innerHTML = `<div class="empty-message">Nenhuma agenda disponível</div>`;
        return;
    }
    
    container.innerHTML = agendas.map(agenda => `
        <div class="agenda-card" data-status="${agenda.Status}">
            <div class="card-title">${agenda.Tipo}</div>
            <div class="card-details">
                <div class="detail">
                    <i class="fas fa-calendar"></i>
                    <span>${formatDate(agenda.Dia)} às ${agenda.Horário}</span>
                </div>
                <div class="detail">
                    <i class="fas fa-users"></i>
                    <span>${agenda.Participantes}</span>
                </div>
                <div class="detail">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${agenda.Local}</span>
                </div>
                <div class="detail">
                    <i class="fas fa-map-pin"></i>
                    <span>${agenda.Endereço}</span>
                </div>
                <div class="detail">
                    <span class="status-badge status-${getStatusClass(agenda.Status)}">${agenda.Status}</span>
                </div>
                <div class="detail">
                    <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(agenda.Endereço)}" 
                       target="_blank" class="btn-small btn-info" style="text-decoration:none;color:white;">
                        <i class="fas fa-map"></i> Ver no Mapa
                    </a>
                </div>
            </div>
            <div class="card-actions">
                ${agenda.Status !== 'Realizada' && agenda.Status !== 'Cancelada' ? `
                    <button onclick="finalizarAgenda('${agenda.ID}')" class="btn-small btn-success">
                        <i class="fas fa-check"></i> Finalizar
                    </button>
                    <button onclick="cancelarAgenda('${agenda.ID}')" class="btn-small btn-danger">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                    <button onclick="abrirModalAdiar('${agenda.ID}')" class="btn-small btn-warning">
                        <i class="fas fa-clock"></i> Adiar
                    </button>
                ` : `
                    <span style="color:var(--gray-4);font-size:12px;">
                        ${agenda.Status === 'Realizada' ? '✅ Finalizada' : '❌ Cancelada'}
                    </span>
                `}
            </div>
        </div>
    `).join('');
}

function filterAgendas() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    
    let filtered = agendas;
    
    if (statusFilter !== 'all') {
        filtered = filtered.filter(a => a.Status === statusFilter);
    }
    
    if (searchTerm) {
        filtered = filtered.filter(a => 
            a.Tipo.toLowerCase().includes(searchTerm) ||
            a.Participantes.toLowerCase().includes(searchTerm) ||
            a.Local.toLowerCase().includes(searchTerm)
        );
    }
    
    renderizarCardsAgendas(filtered);
}

async function finalizarAgenda(id) {
    if (!confirm('Deseja finalizar esta agenda?')) return;
    await alterarStatus(id, 'Realizada');
    carregarAgendasUsuario();
}

async function cancelarAgenda(id) {
    if (!confirm('Deseja cancelar esta agenda?')) return;
    await alterarStatus(id, 'Cancelada');
    carregarAgendasUsuario();
}

function abrirModalAdiar(id) {
    document.getElementById('agendaIdAdiar').value = id;
    document.getElementById('modalAdiar').classList.add('active');
    document.getElementById('novaData').value = '';
    document.getElementById('novoHorario').value = '';
    document.getElementById('solicitante').value = '';
}

function fecharModal() {
    document.getElementById('modalAdiar').classList.remove('active');
}

async function solicitarAdiamento(event) {
    event.preventDefault();
    
    const dados = {
        agendaId: document.getElementById('agendaIdAdiar').value,
        novaData: document.getElementById('novaData').value,
        novoHorario: document.getElementById('novoHorario').value,
        solicitante: document.getElementById('solicitante').value
    };
    
    try {
        await fetch(`${SCRIPT_URL}?action=solicitarAdiamento`, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dados)
        });
        
        showToast('Solicitação enviada com sucesso! Aguarde autorização.', 'success');
        fecharModal();
        carregarAgendasUsuario();
    } catch (error) {
        showToast('Erro ao enviar solicitação', 'error');
    }
}

// Funções de Solicitações
async function carregarSolicitacoes() {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=listarSolicitacoes`);
        const data = await response.json();
        solicitacoes = data;
        renderizarSolicitacoes(data);
        atualizarBadge(data);
    } catch (error) {
        showToast('Erro ao carregar solicitações', 'error');
    }
}

function renderizarSolicitacoes(solicitacoes) {
    const container = document.getElementById('solicitacoesList');
    
    const pendentes = solicitacoes.filter(s => s.Status === 'Pendente');
    
    if (pendentes.length === 0) {
        container.innerHTML = `<p class="empty-message">Nenhuma solicitação pendente</p>`;
        return;
    }
    
    container.innerHTML = pendentes.map(s => `
        <div class="card" style="border-left:4px solid var(--warning);">
            <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:10px;">
                <div>
                    <h3 style="font-size:16px;margin-bottom:5px;">
                        Solicitação de Adiamento
                    </h3>
                    <p style="font-size:14px;color:var(--gray-4);">
                        <strong>Solicitante:</strong> ${s.Solicitante}
                    </p>
                    <p style="font-size:14px;color:var(--gray-4);">
                        <strong>Nova Data:</strong> ${formatDate(s['Nova Data'])} às ${s['Novo Horário']}
                    </p>
                    <p style="font-size:14px;color:var(--gray-4);">
                        <strong>Agenda ID:</strong> ${s['Agenda ID']}
                    </p>
                </div>
                <div style="display:flex;gap:8px;">
                    <button onclick="autorizarAdiamento('${s.ID}')" class="btn-small btn-success">
                        <i class="fas fa-check"></i> Autorizar
                    </button>
                    <button onclick="rejeitarAdiamento('${s.ID}')" class="btn-small btn-danger">
                        <i class="fas fa-times"></i> Rejeitar
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function atualizarBadge(solicitacoes) {
    const pendentes = solicitacoes.filter(s => s.Status === 'Pendente');
    const badge = document.getElementById('solicitacaoBadge');
    if (pendentes.length > 0) {
        badge.textContent = pendentes.length;
        badge.style.display = 'inline-block';
    } else {
        badge.style.display = 'none';
    }
}

async function autorizarAdiamento(id) {
    if (!confirm('Deseja autorizar este adiamento?')) return;
    
    try {
        await fetch(`${SCRIPT_URL}?action=autorizarAdiamento&id=${id}`, {
            method: 'POST',
            mode: 'no-cors'
        });
        showToast('Adiamento autorizado com sucesso!', 'success');
        carregarSolicitacoes();
        carregarAgendasAdmin();
    } catch (error) {
        showToast('Erro ao autorizar adiamento', 'error');
    }
}

async function rejeitarAdiamento(id) {
    if (!confirm('Deseja rejeitar este adiamento?')) return;
    
    try {
        await fetch(`${SCRIPT_URL}?action=rejeitarAdiamento&id=${id}`, {
            method: 'POST',
            mode: 'no-cors'
        });
        showToast('Adiamento rejeitado!', 'success');
        carregarSolicitacoes();
        carregarAgendasAdmin();
    } catch (error) {
        showToast('Erro ao rejeitar adiamento', 'error');
    }
}

function refreshAgendas() {
    carregarAgendasUsuario();
    showToast('Agendas atualizadas!', 'success');
}

// Funções Utilitárias
function formatDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
}

function getStatusClass(status) {
    const map = {
        'Pendente': 'pendente',
        'Realizada': 'realizada',
        'Cancelada': 'cancelada',
        'Aguardando Autorização': 'aguardando'
    };
    return map[status] || 'pendente';
}

function showToast(message, type = 'info') {
    // Criar toast
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 12px 24px;
        border-radius: var(--radius-sm);
        background: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : 'var(--primary)'};
        color: white;
        font-weight: 500;
        z-index: 9999;
        box-shadow: var(--shadow);
        max-width: 90%;
        animation: slideUp 0.3s ease;
        text-align: center;
        font-size: 14px;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Fechar modal clicando fora
window.onclick = function(event) {
    const modal = document.getElementById('modalAdiar');
    if (event.target === modal) {
        fecharModal();
    }
}

// Fechar modal com ESC
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        fecharModal();
    }
});
