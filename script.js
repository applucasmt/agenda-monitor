// ==================== CONFIGURAÇÃO ====================
const USERS = {
    admin: { password: '123', role: 'admin' },
    user: { password: '123', role: 'user' }
};

const API_URL = '/api';
let currentUser = null;
let agendas = [];

// ==================== LOGIN ====================
function togglePassword() {
    const input = document.getElementById('password');
    const icon = document.querySelector('.toggle-password i');
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    
    if (!username || !password) {
        showToast('Preencha todos os campos', 'error');
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
        atualizarDashboard();
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
    showToast('Desconectado', 'info');
}

// ==================== ADMIN - NAVEGAÇÃO ====================
function switchAdminTab(tab) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
    
    const tabMap = {
        'dashboard': 'adminDashboard',
        'nova': 'adminNova',
        'lista': 'adminLista',
        'solicitacoes': 'adminSolicitacoes'
    };
    
    document.getElementById(tabMap[tab]).classList.add('active');
    
    document.querySelectorAll('.tab-item').forEach(item => {
        const icon = item.querySelector('i');
        if (icon && icon.className.includes('chart-pie') && tab === 'dashboard') item.classList.add('active');
        else if (icon && icon.className.includes('plus-circle') && tab === 'nova') item.classList.add('active');
        else if (icon && icon.className.includes('list-ul') && tab === 'lista') item.classList.add('active');
        else if (icon && icon.className.includes('bell') && tab === 'solicitacoes') item.classList.add('active');
    });
    
    if (tab === 'dashboard') atualizarDashboard();
    else if (tab === 'lista') carregarAgendasAdmin();
    else if (tab === 'solicitacoes') carregarSolicitacoes();
}

// ==================== ADMIN - DASHBOARD ====================
async function atualizarDashboard() {
    try {
        const response = await fetch(`${API_URL}/agendas`);
        const data = await response.json();
        agendas = data;
        
        const total = data.length;
        const pendentes = data.filter(a => a.Status === 'Pendente').length;
        const realizadas = data.filter(a => a.Status === 'Realizada').length;
        const canceladas = data.filter(a => a.Status === 'Cancelada').length;
        
        document.getElementById('statTotal').textContent = total;
        document.getElementById('statPendentes').textContent = pendentes;
        document.getElementById('statRealizadas').textContent = realizadas;
        document.getElementById('statCanceladas').textContent = canceladas;
        document.getElementById('adminCount').textContent = total;
        
        renderizarProximas(data);
    } catch (error) {
        console.error('Erro:', error);
    }
}

function renderizarProximas(agendas) {
    const container = document.getElementById('proximasAgendas');
    const proximas = agendas
        .filter(a => a.Status === 'Pendente')
        .sort((a, b) => new Date(a.Dia) - new Date(b.Dia))
        .slice(0, 5);
    
    if (proximas.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-plus"></i>
                <p>Nenhuma agenda próxima</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = proximas.map(a => `
        <div class="list-item">
            <div class="list-item-content">
                <div class="list-item-title">${a.Tipo || 'Agenda'}</div>
                <div class="list-item-sub">${formatDate(a.Dia)} às ${a.Horário || '--:--'} • ${a.Local || ''}</div>
            </div>
            <span class="status-badge status-${getStatusClass(a.Status)}">${a.Status || 'Pendente'}</span>
        </div>
    `).join('');
}

// ==================== ADMIN - AGENDAS ====================
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
        const response = await fetch(`${API_URL}/agendas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });
        
        const result = await response.json();
        if (result.success) {
            showToast('Agenda criada!', 'success');
            document.getElementById('agendaForm').reset();
            carregarAgendasAdmin();
            atualizarDashboard();
        } else {
            showToast('Erro ao criar', 'error');
        }
    } catch (error) {
        showToast('Erro ao criar', 'error');
    }
}

async function carregarAgendasAdmin() {
    try {
        const response = await fetch(`${API_URL}/agendas`);
        const data = await response.json();
        agendas = data;
        renderizarListaAdmin(data);
        document.getElementById('totalAgendas').textContent = data.length || 0;
    } catch (error) {
        showToast('Erro ao carregar', 'error');
    }
}

function renderizarListaAdmin(agendas) {
    const container = document.getElementById('adminTableBody');
    
    if (!agendas || agendas.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>Nenhuma agenda</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = agendas.map(a => `
        <div class="list-item">
            <div class="list-item-content">
                <div class="list-item-title">${a.Tipo || 'Agenda'}</div>
                <div class="list-item-sub">
                    ${formatDate(a.Dia)} às ${a.Horário || '--:--'} • ${a.Participantes || ''}
                </div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;">
                <span class="status-badge status-${getStatusClass(a.Status)}">${a.Status || 'Pendente'}</span>
                <button onclick="alterarStatus('${a.ID}', 'Realizada')" class="btn-small btn-success">
                    <i class="fas fa-check"></i>
                </button>
                <button onclick="excluirAgenda('${a.ID}')" class="btn-small btn-danger">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

async function alterarStatus(id, novoStatus) {
    if (!confirm(`Alterar para "${novoStatus}"?`)) return;
    
    try {
        const response = await fetch(`${API_URL}/atualizarStatus`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status: novoStatus })
        });
        
        const result = await response.json();
        if (result.success) {
            showToast('Status atualizado!', 'success');
            carregarAgendasAdmin();
            atualizarDashboard();
        }
    } catch (error) {
        showToast('Erro ao atualizar', 'error');
    }
}

async function excluirAgenda(id) {
    if (!confirm('Excluir esta agenda?')) return;
    
    try {
        const response = await fetch(`${API_URL}/agendas/${id}`, { method: 'DELETE' });
        const result = await response.json();
        if (result.success) {
            showToast('Agenda excluída!', 'success');
            carregarAgendasAdmin();
            atualizarDashboard();
        }
    } catch (error) {
        showToast('Erro ao excluir', 'error');
    }
}

// ==================== ADMIN - SOLICITAÇÕES ====================
async function carregarSolicitacoes() {
    try {
        const response = await fetch(`${API_URL}/agendas`);
        const data = await response.json();
        
        const solicitacoes = data
            .filter(a => a.Status === 'Aguardando Autorização')
            .map(a => ({
                ID: a.ID,
                'Agenda ID': a.ID,
                Solicitante: 'Usuário',
                'Nova Data': a.Dia,
                'Novo Horário': a.Horário,
                Status: 'Pendente'
            }));
        
        renderizarSolicitacoes(solicitacoes);
        document.getElementById('solicitacoesCount').textContent = solicitacoes.length || 0;
        document.getElementById('adminBadge').textContent = solicitacoes.length || 0;
    } catch (error) {
        showToast('Erro ao carregar', 'error');
    }
}

function renderizarSolicitacoes(solicitacoes) {
    const container = document.getElementById('solicitacoesList');
    const pendentes = solicitacoes.filter(s => s.Status === 'Pendente');
    
    if (pendentes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-check-circle"></i>
                <p>Nenhuma solicitação</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = pendentes.map(s => `
        <div class="solicitacao-item">
            <div class="solicitacao-header">
                <div>
                    <div class="solicitacao-title">
                        <i class="fas fa-clock" style="color:var(--warning);"></i> Solicitação de Adiamento
                    </div>
                    <div class="solicitacao-info">
                        <strong>Solicitante:</strong> ${s.Solicitante || 'Não informado'}
                    </div>
                    <div class="solicitacao-info">
                        <strong>Nova Data:</strong> ${formatDate(s['Nova Data'])} às ${s['Novo Horário']}
                    </div>
                </div>
                <div class="solicitacao-actions">
                    <button onclick="autorizarAdiamento('${s.ID}')" class="btn-small btn-success">
                        <i class="fas fa-check"></i>
                    </button>
                    <button onclick="rejeitarAdiamento('${s.ID}')" class="btn-small btn-danger">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

async function autorizarAdiamento(id) {
    if (!confirm('Autorizar adiamento?')) return;
    try {
        await fetch(`${API_URL}/autorizarAdiamento`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        showToast('Adiamento autorizado!', 'success');
        carregarSolicitacoes();
        carregarAgendasAdmin();
        atualizarDashboard();
    } catch (error) {
        showToast('Erro ao autorizar', 'error');
    }
}

async function rejeitarAdiamento(id) {
    if (!confirm('Rejeitar adiamento?')) return;
    try {
        await fetch(`${API_URL}/rejeitarAdiamento`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        showToast('Adiamento rejeitado!', 'success');
        carregarSolicitacoes();
        carregarAgendasAdmin();
    } catch (error) {
        showToast('Erro ao rejeitar', 'error');
    }
}

// ==================== USUÁRIO ====================
function switchUserTab(tab) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
    
    document.getElementById(`user${tab.charAt(0).toUpperCase() + tab.slice(1)}`).classList.add('active');
    
    document.querySelectorAll('.tab-item').forEach(item => {
        const icon = item.querySelector('i');
        if (icon && icon.className.includes('calendar-alt') && tab === 'minhas') item.classList.add('active');
        else if (icon && icon.className.includes('history') && tab === 'historico') item.classList.add('active');
    });
    
    if (tab === 'historico') carregarHistorico();
}

async function carregarAgendasUsuario() {
    try {
        const response = await fetch(`${API_URL}/agendas`);
        const data = await response.json();
        agendas = data;
        renderizarCards(data);
        document.getElementById('userCount').textContent = data.length || 0;
    } catch (error) {
        showToast('Erro ao carregar', 'error');
    }
}

function renderizarCards(agendas) {
    const container = document.getElementById('cardsContainer');
    
    if (!agendas || agendas.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-plus"></i>
                <p>Nenhuma agenda</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = agendas.map(a => `
        <div class="agenda-card">
            <div class="card-title">${a.Tipo || 'Agenda'}</div>
            <div class="card-details">
                <div class="detail">
                    <i class="fas fa-calendar"></i>
                    <span>${formatDate(a.Dia)} às ${a.Horário || '--:--'}</span>
                </div>
                <div class="detail">
                    <i class="fas fa-users"></i>
                    <span>${a.Participantes || 'Sem participantes'}</span>
                </div>
                <div class="detail">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${a.Local || 'Local não informado'}</span>
                </div>
                <div class="detail" style="justify-content:space-between;">
                    <span class="status-badge status-${getStatusClass(a.Status)}">${a.Status || 'Pendente'}</span>
                    <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.Endereço || '')}" 
                       target="_blank" class="btn-small btn-info" style="text-decoration:none;color:white;">
                        <i class="fas fa-map"></i> Mapa
                    </a>
                </div>
            </div>
            <div class="card-actions">
                ${a.Status !== 'Realizada' && a.Status !== 'Cancelada' ? `
                    <button onclick="finalizarAgenda('${a.ID}')" class="btn-small btn-success">
                        <i class="fas fa-check"></i> Finalizar
                    </button>
                    <button onclick="abrirModalAdiar('${a.ID}')" class="btn-small btn-warning">
                        <i class="fas fa-clock"></i> Adiar
                    </button>
                ` : `
                    <span style="color:var(--gray-500);font-size:13px;text-align:center;width:100%;padding:4px 0;">
                        ${a.Status === 'Realizada' ? '✅ Finalizada' : '❌ Cancelada'}
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
            (a.Tipo || '').toLowerCase().includes(searchTerm) ||
            (a.Participantes || '').toLowerCase().includes(searchTerm) ||
            (a.Local || '').toLowerCase().includes(searchTerm)
        );
    }
    
    renderizarCards(filtered);
}

async function finalizarAgenda(id) {
    if (!confirm('Finalizar esta agenda?')) return;
    await alterarStatus(id, 'Realizada');
    carregarAgendasUsuario();
    showToast('Agenda finalizada!', 'success');
}

function carregarHistorico() {
    const container = document.getElementById('historicoList');
    const historico = agendas.filter(a => 
        a.Status === 'Realizada' || a.Status === 'Cancelada'
    );
    
    if (historico.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-history"></i>
                <p>Nenhum histórico</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = historico.map(a => `
        <div class="list-item">
            <div class="list-item-content">
                <div class="list-item-title">${a.Tipo || 'Agenda'}</div>
                <div class="list-item-sub">
                    ${formatDate(a.Dia)} às ${a.Horário || '--:--'} • ${a.Participantes || ''}
                </div>
            </div>
            <span class="status-badge status-${getStatusClass(a.Status)}">${a.Status}</span>
        </div>
    `).join('');
}

// ==================== MODAL ====================
function abrirModalAdiar(id) {
    document.getElementById('agendaIdAdiar').value = id;
    document.getElementById('modalAdiar').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function fecharModal() {
    document.getElementById('modalAdiar').classList.remove('active');
    document.body.style.overflow = '';
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
        const response = await fetch(`${API_URL}/solicitarAdiamento`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });
        
        const result = await response.json();
        if (result.success) {
            showToast('Solicitação enviada!', 'success');
            fecharModal();
            carregarAgendasUsuario();
        } else {
            showToast('Erro ao enviar', 'error');
        }
    } catch (error) {
        showToast('Erro ao enviar', 'error');
    }
}

// ==================== UTILITÁRIOS ====================
function formatDate(dateStr) {
    if (!dateStr) return '--/--/----';
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
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==================== EVENTOS ====================
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') fecharModal();
});

// Fechar modal ao clicar no backdrop
document.querySelector('.modal-backdrop')?.addEventListener('click', fecharModal);

console.log('📱 Studio Dashboard - Apple iOS 26');
