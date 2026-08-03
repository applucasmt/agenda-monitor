// ==================== CONFIGURAÇÃO ====================
const USERS = {
    admin: { password: '123', role: 'admin' },
    user: { password: '123', role: 'user' }
};

const API_URL = '/api';
let currentUser = null;
let agendas = [];
let statusChart = null;

// ==================== INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', function() {
    // Esconder loading
    setTimeout(() => {
        document.getElementById('loadingScreen').classList.add('hidden');
    }, 800);
    
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        const user = JSON.parse(savedUser);
        if (user && user.username) {
            loginUser(user.username, user.role);
        }
    }
});

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
    showToast('Desconectado com sucesso', 'info');
}

// ==================== SIDEBAR ====================
function toggleSidebar() {
    document.getElementById('adminSidebar').classList.toggle('open');
}

function toggleSidebarUser() {
    document.getElementById('userSidebar').classList.toggle('open');
}

// ==================== ADMIN - NAVEGAÇÃO ====================
function switchAdminTab(tab) {
    // Esconder todos os tabs
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(t => t.classList.remove('active'));
    
    const tabMap = {
        'dashboard': 'adminDashboard',
        'nova': 'adminNova',
        'lista': 'adminLista',
        'solicitacoes': 'adminSolicitacoes'
    };
    
    const titleMap = {
        'dashboard': 'Dashboard',
        'nova': 'Nova Agenda',
        'lista': 'Todas as Agendas',
        'solicitacoes': 'Solicitações'
    };
    
    document.getElementById(tabMap[tab]).classList.add('active');
    document.getElementById('adminPageTitle').textContent = titleMap[tab];
    
    // Ativar nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        if (item.dataset.tab === tab) {
            item.classList.add('active');
        }
    });
    
    // Fechar sidebar mobile
    document.getElementById('adminSidebar').classList.remove('open');
    
    // Carregar dados
    if (tab === 'dashboard') {
        atualizarDashboard();
    } else if (tab === 'lista') {
        carregarAgendasAdmin();
    } else if (tab === 'solicitacoes') {
        carregarSolicitacoes();
    }
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
        document.getElementById('totalCount').textContent = total;
        
        // Atualizar gráfico
        atualizarGrafico(pendentes, realizadas, canceladas);
        
        // Próximas agendas
        renderizarProximasAgendas(data);
        
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
    }
}

function atualizarGrafico(pendentes, realizadas, canceladas) {
    const ctx = document.getElementById('statusChart').getContext('2d');
    
    if (statusChart) {
        statusChart.destroy();
    }
    
    statusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Pendentes', 'Realizadas', 'Canceladas'],
            datasets: [{
                data: [pendentes, realizadas, canceladas],
                backgroundColor: ['#F59E0B', '#10B981', '#EF4444'],
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        font: {
                            family: 'Inter',
                            size: 12
                        }
                    }
                }
            },
            cutout: '70%'
        }
    });
}

function renderizarProximasAgendas(agendas) {
    const container = document.getElementById('proximasAgendas');
    const hoje = new Date();
    const proximas = agendas
        .filter(a => a.Status === 'Pendente')
        .sort((a, b) => new Date(a.Dia) - new Date(b.Dia))
        .slice(0, 5);
    
    if (proximas.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding:20px;">
                <i class="fas fa-calendar-check" style="font-size:24px;"></i>
                <p style="font-size:14px;">Nenhuma agenda próxima</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = proximas.map(a => `
        <div class="proxima-item">
            <span class="proxima-time">${a.Horário || '--:--'}</span>
            <div class="proxima-info">
                <h4>${a.Tipo || 'Agenda'}</h4>
                <p>${a.Local || 'Local não informado'}</p>
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
            showToast('✅ Agenda criada com sucesso!', 'success');
            document.getElementById('agendaForm').reset();
            carregarAgendasAdmin();
            atualizarDashboard();
        } else {
            showToast('❌ Erro: ' + (result.error || 'Erro desconhecido'), 'error');
        }
    } catch (error) {
        showToast('❌ Erro ao criar agenda', 'error');
        console.error(error);
    }
}

async function carregarAgendasAdmin() {
    try {
        const response = await fetch(`${API_URL}/agendas`);
        const data = await response.json();
        agendas = data;
        renderizarTabelaAdmin(data);
        document.getElementById('totalAgendas').textContent = `${data.length || 0} agendas`;
        document.getElementById('totalCount').textContent = data.length || 0;
    } catch (error) {
        showToast('❌ Erro ao carregar agendas', 'error');
        console.error(error);
    }
}

function renderizarTabelaAdmin(agendas) {
    const tbody = document.getElementById('adminTableBody');
    
    if (!agendas || agendas.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <p>Nenhuma agenda cadastrada</p>
                        <span class="empty-hint">Clique em "Nova Agenda" para começar</span>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = agendas.map(a => `
        <tr>
            <td><strong>${formatDate(a.Dia)}</strong></td>
            <td>${a.Horário || '--:--'}</td>
            <td><span style="font-weight:600;">${a.Tipo || '--'}</span></td>
            <td>${a.Participantes || '--'}</td>
            <td>${a.Local || '--'}</td>
            <td><span class="status-badge status-${getStatusClass(a.Status)}">${a.Status || 'Pendente'}</span></td>
            <td>
                <div style="display:flex;gap:4px;flex-wrap:wrap;">
                    <button onclick="alterarStatus('${a.ID}', 'Realizada')" class="btn-small btn-success" title="Finalizar">
                        <i class="fas fa-check"></i>
                    </button>
                    <button onclick="alterarStatus('${a.ID}', 'Cancelada')" class="btn-small btn-danger" title="Cancelar">
                        <i class="fas fa-times"></i>
                    </button>
                    <button onclick="excluirAgenda('${a.ID}')" class="btn-small" style="background:#FEE2E2;color:#991B1B;" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function alterarStatus(id, novoStatus) {
    if (!confirm(`Deseja alterar o status para "${novoStatus}"?`)) return;
    
    try {
        const response = await fetch(`${API_URL}/atualizarStatus`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status: novoStatus })
        });
        
        const result = await response.json();
        if (result.success) {
            showToast('✅ Status atualizado!', 'success');
            carregarAgendasAdmin();
            atualizarDashboard();
        } else {
            showToast('❌ Erro ao atualizar status', 'error');
        }
    } catch (error) {
        showToast('❌ Erro ao atualizar status', 'error');
        console.error(error);
    }
}

async function excluirAgenda(id) {
    if (!confirm('Tem certeza que deseja excluir esta agenda?')) return;
    
    try {
        const response = await fetch(`${API_URL}/agendas/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        if (result.success) {
            showToast('✅ Agenda excluída!', 'success');
            carregarAgendasAdmin();
            atualizarDashboard();
        } else {
            showToast('❌ Erro ao excluir agenda', 'error');
        }
    } catch (error) {
        showToast('❌ Erro ao excluir agenda', 'error');
        console.error(error);
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
        atualizarBadgeAdmin(solicitacoes);
        document.getElementById('solicitacoesCount').textContent = 
            `${solicitacoes.filter(s => s.Status === 'Pendente').length} pendentes`;
        
    } catch (error) {
        showToast('❌ Erro ao carregar solicitações', 'error');
        console.error(error);
    }
}

function renderizarSolicitacoes(solicitacoes) {
    const container = document.getElementById('solicitacoesList');
    const pendentes = solicitacoes.filter(s => s.Status === 'Pendente');
    
    if (pendentes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-check-circle"></i>
                <p>Nenhuma solicitação pendente</p>
                <span class="empty-hint">Todas as solicitações foram resolvidas</span>
            </div>
        `;
        return;
    }
    
    container.innerHTML = pendentes.map(s => `
        <div class="solicitacao-item" style="background:var(--gray-50);border-radius:var(--radius);padding:16px;margin-bottom:12px;border-left:4px solid var(--warning);">
            <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:12px;">
                <div>
                    <h4 style="font-size:15px;font-weight:600;margin-bottom:4px;display:flex;align-items:center;gap:8px;">
                        <i class="fas fa-clock" style="color:var(--warning);"></i>
                        Solicitação de Adiamento
                    </h4>
                    <p style="font-size:13px;color:var(--gray-600);">
                        <strong>Solicitante:</strong> ${s.Solicitante || 'Não informado'}
                    </p>
                    <p style="font-size:13px;color:var(--gray-600);">
                        <strong>Nova Data:</strong> ${formatDate(s['Nova Data'])} às ${s['Novo Horário']}
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

function atualizarBadgeAdmin(solicitacoes) {
    const pendentes = solicitacoes.filter(s => s.Status === 'Pendente');
    const badge = document.getElementById('adminBadge');
    if (pendentes.length > 0) {
        badge.textContent = pendentes.length;
        badge.style.display = 'inline';
    } else {
        badge.style.display = 'none';
    }
}

async function autorizarAdiamento(id) {
    if (!confirm('Deseja autorizar este adiamento?')) return;
    
    try {
        const response = await fetch(`${API_URL}/autorizarAdiamento`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        
        const result = await response.json();
        if (result.success) {
            showToast('✅ Adiamento autorizado!', 'success');
            carregarSolicitacoes();
            carregarAgendasAdmin();
            atualizarDashboard();
        } else {
            showToast('❌ Erro ao autorizar', 'error');
        }
    } catch (error) {
        showToast('❌ Erro ao autorizar', 'error');
        console.error(error);
    }
}

async function rejeitarAdiamento(id) {
    if (!confirm('Deseja rejeitar este adiamento?')) return;
    
    try {
        const response = await fetch(`${API_URL}/rejeitarAdiamento`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        
        const result = await response.json();
        if (result.success) {
            showToast('✅ Adiamento rejeitado!', 'success');
            carregarSolicitacoes();
            carregarAgendasAdmin();
        } else {
            showToast('❌ Erro ao rejeitar', 'error');
        }
    } catch (error) {
        showToast('❌ Erro ao rejeitar', 'error');
        console.error(error);
    }
}

// ==================== USUÁRIO ====================
function switchUserTab(tab) {
    document.querySelectorAll('.user-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(t => t.classList.remove('active'));
    
    document.getElementById(`user${tab.charAt(0).toUpperCase() + tab.slice(1)}`).classList.add('active');
    
    const titleMap = {
        'minhas': 'Minhas Agendas',
        'historico': 'Histórico'
    };
    document.getElementById('userPageTitle').textContent = titleMap[tab];
    
    document.querySelectorAll('.nav-item').forEach(item => {
        if (item.dataset.tab === tab) {
            item.classList.add('active');
        }
    });
    
    document.getElementById('userSidebar').classList.remove('open');
    
    if (tab === 'minhas') carregarAgendasUsuario();
    if (tab === 'historico') carregarHistorico();
}

async function carregarAgendasUsuario() {
    try {
        const response = await fetch(`${API_URL}/agendas`);
        const data = await response.json();
        agendas = data;
        renderizarCardsUsuario(data);
        document.getElementById('userCount').textContent = data.length || 0;
    } catch (error) {
        showToast('❌ Erro ao carregar agendas', 'error');
        console.error(error);
    }
}

function renderizarCardsUsuario(agendas) {
    const container = document.getElementById('cardsContainer');
    
    if (!agendas || agendas.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1;">
                <i class="fas fa-calendar-plus"></i>
                <p>Nenhuma agenda disponível</p>
                <span class="empty-hint">As agendas serão exibidas aqui quando criadas</span>
            </div>
        `;
        return;
    }
    
    container.innerHTML = agendas.map(a => `
        <div class="agenda-card" data-status="${a.Status}">
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
                <div class="detail">
                    <i class="fas fa-map-pin"></i>
                    <span>${a.Endereço || 'Endereço não informado'}</span>
                </div>
                <div class="detail">
                    <span class="status-badge status-${getStatusClass(a.Status)}">${a.Status || 'Pendente'}</span>
                </div>
                <div class="detail">
                    <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.Endereço || '')}" 
                       target="_blank" class="btn-small btn-info" style="text-decoration:none;color:#1E40AF;">
                        <i class="fas fa-map"></i> Ver no Mapa
                    </a>
                </div>
            </div>
            <div class="card-actions">
                ${a.Status !== 'Realizada' && a.Status !== 'Cancelada' ? `
                    <button onclick="finalizarAgenda('${a.ID}')" class="btn-small btn-success">
                        <i class="fas fa-check"></i> Finalizar
                    </button>
                    <button onclick="cancelarAgenda('${a.ID}')" class="btn-small btn-danger">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                    <button onclick="abrirModalAdiar('${a.ID}')" class="btn-small btn-warning">
                        <i class="fas fa-clock"></i> Adiar
                    </button>
                ` : `
                    <span style="color:var(--gray-500);font-size:13px;width:100%;text-align:center;padding:8px 0;">
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
    const dateFilter = document.getElementById('dateFilter').value;
    
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
    
    if (dateFilter) {
        filtered = filtered.filter(a => a.Dia === dateFilter);
    }
    
    renderizarCardsUsuario(filtered);
}

async function finalizarAgenda(id) {
    if (!confirm('Deseja finalizar esta agenda?')) return;
    await alterarStatus(id, 'Realizada');
    carregarAgendasUsuario();
    showToast('✅ Agenda finalizada!', 'success');
}

async function cancelarAgenda(id) {
    if (!confirm('Deseja cancelar esta agenda?')) return;
    await alterarStatus(id, 'Cancelada');
    carregarAgendasUsuario();
    showToast('✅ Agenda cancelada!', 'success');
}

function refreshAgendas() {
    carregarAgendasUsuario();
    showToast('🔄 Agendas atualizadas!', 'info');
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
                <p>Nenhum histórico disponível</p>
                <span class="empty-hint">Agendas finalizadas ou canceladas aparecerão aqui</span>
            </div>
        `;
        return;
    }
    
    container.innerHTML = historico.map(a => `
        <div style="background:var(--gray-50);border-radius:var(--radius);padding:16px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
            <div>
                <h4 style="font-size:15px;font-weight:600;">${a.Tipo || 'Agenda'}</h4>
                <p style="font-size:13px;color:var(--gray-600);">
                    <i class="fas fa-calendar"></i> ${formatDate(a.Dia)} às ${a.Horário || '--:--'}
                </p>
                <p style="font-size:13px;color:var(--gray-600);">
                    <i class="fas fa-users"></i> ${a.Participantes || 'Sem participantes'}
                </p>
            </div>
            <span class="status-badge status-${getStatusClass(a.Status)}">${a.Status || 'Pendente'}</span>
        </div>
    `).join('');
}

// ==================== MODAL ADIAR ====================
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
            showToast('✅ Solicitação enviada! Aguarde autorização.', 'success');
            fecharModal();
            carregarAgendasUsuario();
        } else {
            showToast('❌ Erro ao enviar solicitação', 'error');
        }
    } catch (error) {
        showToast('❌ Erro ao enviar solicitação', 'error');
        console.error(error);
    }
}

// ==================== EXPORTAR ====================
function exportarDados() {
    if (!agendas || agendas.length === 0) {
        showToast('Nenhum dado para exportar', 'warning');
        return;
    }
    
    const headers = ['ID', 'Dia', 'Horário', 'Tipo', 'Participantes', 'Local', 'Endereço', 'Status'];
    const csv = [
        headers.join(','),
        ...agendas.map(a => 
            [a.ID, a.Dia, a.Horário, a.Tipo, a.Participantes, a.Local, a.Endereço, a.Status].join(',')
        )
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agendas_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('✅ Dados exportados com sucesso!', 'success');
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
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas ${icons[type] || icons.info}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ==================== EVENTOS GLOBAIS ====================
// Fechar sidebar ao clicar fora
document.addEventListener('click', function(event) {
    const adminSidebar = document.getElementById('adminSidebar');
    const userSidebar = document.getElementById('userSidebar');
    const menuToggle = document.querySelector('.menu-toggle');
    
    if (adminSidebar && adminSidebar.classList.contains('open')) {
        if (!adminSidebar.contains(event.target) && !menuToggle?.contains(event.target)) {
            adminSidebar.classList.remove('open');
        }
    }
    
    if (userSidebar && userSidebar.classList.contains('open')) {
        if (!userSidebar.contains(event.target) && !menuToggle?.contains(event.target)) {
            userSidebar.classList.remove('open');
        }
    }
});

// Fechar modal com ESC
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') fecharModal();
});

console.log('🚀 Sistema Agenda Pro carregado com sucesso!');
