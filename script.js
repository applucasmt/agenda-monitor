// script.js - Lógica da Aplicação

// Configuração
const CONFIG = {
    // Substitua pela URL do seu Web App do Google Apps Script
    API_URL: 'https://script.google.com/macros/s/SEU_SCRIPT_ID/exec',
    APP_VERSION: '1.0.0'
};

// Estado da Aplicação
const state = {
    isAdmin: false,
    agendas: [],
    selectedAgenda: null,
    currentFilter: 'all'
};

// DOM Elements
const elements = {
    adminPanel: document.getElementById('adminPanel'),
    userPanel: document.getElementById('userPanel'),
    adminToggle: document.getElementById('adminToggle'),
    addAgendaBtn: document.getElementById('addAgendaBtn'),
    agendaForm: document.getElementById('agendaForm'),
    agendaFormElement: document.getElementById('agendaFormElement'),
    cancelForm: document.getElementById('cancelForm'),
    adminAgendaList: document.getElementById('adminAgendaList'),
    userAgendaList: document.getElementById('userAgendaList'),
    statusFilter: document.getElementById('statusFilter'),
    rescheduleModal: document.getElementById('rescheduleModal'),
    rescheduleForm: document.getElementById('rescheduleForm'),
    modalClose: document.querySelectorAll('.modal-close'),
    agendaData: document.getElementById('agendaData'),
    agendaHorario: document.getElementById('agendaHorario'),
    agendaTipo: document.getElementById('agendaTipo'),
    agendaParticipantes: document.getElementById('agendaParticipantes'),
    agendaLocal: document.getElementById('agendaLocal'),
    agendaStatus: document.getElementById('agendaStatus'),
    novaData: document.getElementById('novaData'),
    novoHorario: document.getElementById('novoHorario')
};

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    loadAgendas();
    setupEventListeners();
    setupPWA();
});

// Carregar Agendas
async function loadAgendas() {
    try {
        const response = await fetch(`${CONFIG.API_URL}?action=getAgendas`);
        const result = await response.json();
        
        if (result.success) {
            state.agendas = result.data;
            renderAgendas();
        } else {
            showError('Erro ao carregar agendas: ' + result.error);
        }
    } catch (error) {
        showError('Erro de conexão: ' + error.message);
    }
}

// Renderizar Agendas
function renderAgendas() {
    const filteredAgendas = filterAgendas();
    
    // Renderizar para Admin
    if (state.isAdmin) {
        renderAdminAgendas(filteredAgendas);
    }
    
    // Renderizar para Usuário
    renderUserAgendas(filteredAgendas);
}

function filterAgendas() {
    const filter = state.currentFilter;
    let agendas = state.agendas;
    
    if (filter !== 'all') {
        agendas = agendas.filter(a => a.Status === filter);
    }
    
    // Filtrar para usuário (apenas agendas onde o usuário é participante)
    if (!state.isAdmin) {
        const userEmail = prompt('Digite seu email para ver suas agendas:');
        if (userEmail) {
            agendas = agendas.filter(a => 
                a.Participantes && a.Participantes.includes(userEmail)
            );
        }
    }
    
    return agendas;
}

function renderAdminAgendas(agendas) {
    if (agendas.length === 0) {
        elements.adminAgendaList.innerHTML = '<div class="loading">Nenhuma agenda encontrada</div>';
        return;
    }
    
    elements.adminAgendaList.innerHTML = agendas.map(agenda => `
        <div class="agenda-card">
            <div class="card-title">${agenda.Tipo || 'Sem título'}</div>
            <div class="card-detail">
                <span class="icon">📅</span>
                <span>${formatDate(agenda.Data)} às ${agenda.Horario}</span>
            </div>
            <div class="card-detail">
                <span class="icon">👥</span>
                <span>${agenda.Participantes || 'Sem participantes'}</span>
            </div>
            <div class="card-detail">
                <span class="icon">📍</span>
                <span>${agenda.Local || 'Sem local'}</span>
            </div>
            <div id="map-${agenda.ID}" class="agenda-map"></div>
            <span class="card-status status-${agenda.Status}">${agenda.Status || 'Pendente'}</span>
            <div class="card-actions">
                <button onclick="editAgenda('${agenda.ID}')" class="btn-warning">✏️ Editar</button>
                <button onclick="deleteAgenda('${agenda.ID}')" class="btn-danger">🗑️ Excluir</button>
            </div>
        </div>
    `).join('');
    
    // Inicializar mapas
    agendas.forEach(agenda => {
        if (agenda.Local) {
            initMap(`map-${agenda.ID}`, agenda.Local);
        }
    });
}

function renderUserAgendas(agendas) {
    const userAgendas = state.isAdmin ? agendas : agendas.filter(a => 
        a.Participantes && a.Participantes.includes(getUserEmail())
    );
    
    if (userAgendas.length === 0) {
        elements.userAgendaList.innerHTML = '<div class="loading">Nenhuma agenda para você</div>';
        return;
    }
    
    elements.userAgendaList.innerHTML = userAgendas.map(agenda => `
        <div class="agenda-card">
            <div class="card-title">${agenda.Tipo || 'Sem título'}</div>
            <div class="card-detail">
                <span class="icon">📅</span>
                <span>${formatDate(agenda.Data)} às ${agenda.Horario}</span>
            </div>
            <div class="card-detail">
                <span class="icon">👥</span>
                <span>${agenda.Participantes || 'Sem participantes'}</span>
            </div>
            <div class="card-detail">
                <span class="icon">📍</span>
                <span>${agenda.Local || 'Sem local'}</span>
            </div>
            <div id="user-map-${agenda.ID}" class="agenda-map"></div>
            <span class="card-status status-${agenda.Status}">${agenda.Status || 'Pendente'}</span>
            ${agenda.Status !== 'Realizada' && agenda.Status !== 'Cancelada' ? `
                <div class="card-actions">
                    <button onclick="finalizarAgenda('${agenda.ID}')" class="btn-success">✅ Finalizar</button>
                    <button onclick="cancelarAgenda('${agenda.ID}')" class="btn-danger">❌ Cancelar</button>
                    <button onclick="openRescheduleModal('${agenda.ID}')" class="btn-warning">⏰ Adiar</button>
                </div>
            ` : ''}
            ${agenda.SolicitacaoAdiamento === 'Solicitado' ? `
                <div class="card-detail" style="color: var(--warning);">
                    <span class="icon">⏳</span>
                    <span>Solicitação de adiamento pendente</span>
                </div>
            ` : ''}
        </div>
    `).join('');
    
    // Inicializar mapas
    userAgendas.forEach(agenda => {
        if (agenda.Local) {
            initMap(`user-map-${agenda.ID}`, agenda.Local);
        }
    });
}

// Funções de Mapa
function initMap(elementId, address) {
    setTimeout(() => {
        const container = document.getElementById(elementId);
        if (!container) return;
        
        // Usando Leaflet com OpenStreetMap
        const map = L.map(container).setView([-23.5505, -46.6333], 13);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(map);
        
        // Geocodificar endereço
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`)
            .then(response => response.json())
            .then(data => {
                if (data && data.length > 0) {
                    const lat = parseFloat(data[0].lat);
                    const lon = parseFloat(data[0].lon);
                    map.setView([lat, lon], 15);
                    L.marker([lat, lon])
                        .addTo(map)
                        .bindPopup(address)
                        .openPopup();
                }
            })
            .catch(() => {
                // Fallback: mostrar localização padrão
                L.marker([-23.5505, -46.6333])
                    .addTo(map)
                    .bindPopup('Localização aproximada');
            });
            
        // Redimensionar mapa após renderização
        setTimeout(() => {
            map.invalidateSize();
        }, 300);
    }, 100);
}

// Funções de Agenda
async function addAgenda(data) {
    try {
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'addAgenda',
                ...data
            })
        });
        
        const result = await response.json();
        if (result.success) {
            showSuccess('Agenda criada com sucesso!');
            loadAgendas();
            closeForm();
        } else {
            showError('Erro ao criar agenda: ' + result.error);
        }
    } catch (error) {
        showError('Erro de conexão: ' + error.message);
    }
}

async function updateAgenda(id, data) {
    try {
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'updateAgenda',
                id: id,
                ...data
            })
        });
        
        const result = await response.json();
        if (result.success) {
            showSuccess('Agenda atualizada com sucesso!');
            loadAgendas();
        } else {
            showError('Erro ao atualizar agenda: ' + result.error);
        }
    } catch (error) {
        showError('Erro de conexão: ' + error.message);
    }
}

async function deleteAgenda(id) {
    if (!confirm('Tem certeza que deseja excluir esta agenda?')) return;
    
    try {
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'deleteAgenda',
                id: id
            })
        });
        
        const result = await response.json();
        if (result.success) {
            showSuccess('Agenda excluída com sucesso!');
            loadAgendas();
        } else {
            showError('Erro ao excluir agenda: ' + result.error);
        }
    } catch (error) {
        showError('Erro de conexão: ' + error.message);
    }
}

async function finalizarAgenda(id) {
    if (!confirm('Marcar esta agenda como realizada?')) return;
    await updateAgenda(id, { Status: 'Realizada' });
}

async function cancelarAgenda(id) {
    if (!confirm('Cancelar esta agenda?')) return;
    await updateAgenda(id, { Status: 'Cancelada' });
}

async function solicitarAdiamento(id, novaData, novoHorario) {
    try {
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'requestReschedule',
                id: id,
                novaData: novaData,
                novoHorario: novoHorario,
                usuario: getUserEmail() || 'Usuário'
            })
        });
        
        const result = await response.json();
        if (result.success) {
            showSuccess('Solicitação de adiamento enviada!');
            loadAgendas();
            closeRescheduleModal();
        } else {
            showError('Erro ao solicitar adiamento: ' + result.error);
        }
    } catch (error) {
        showError('Erro de conexão: ' + error.message);
    }
}

// Event Listeners
function setupEventListeners() {
    // Admin toggle
    elements.adminToggle.addEventListener('click', () => {
        state.isAdmin = !state.isAdmin;
        elements.adminToggle.textContent = state.isAdmin ? '👤 Usuário' : '👤 Admin';
        elements.adminPanel.classList.toggle('hidden', !state.isAdmin);
        elements.userPanel.classList.toggle('hidden', state.isAdmin);
        
        if (state.isAdmin) {
            elements.userPanel.classList.add('hidden');
            elements.adminPanel.classList.remove('hidden');
        } else {
            elements.adminPanel.classList.add('hidden');
            elements.userPanel.classList.remove('hidden');
        }
        
        renderAgendas();
    });
    
    // Add agenda
    elements.addAgendaBtn.addEventListener('click', () => {
        elements.agendaForm.classList.toggle('hidden');
        if (!elements.agendaForm.classList.contains('hidden')) {
            elements.agendaData.value = new Date().toISOString().split('T')[0];
        }
    });
    
    // Cancel form
    elements.cancelForm.addEventListener('click', closeForm);
    
    // Agenda form submit
    elements.agendaFormElement.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const data = {
            data: elements.agendaData.value,
            horario: elements.agendaHorario.value,
            tipo: elements.agendaTipo.value,
            participantes: elements.agendaParticipantes.value,
            local: elements.agendaLocal.value,
            status: elements.agendaStatus.value,
            usuario: 'Admin'
        };
        
        addAgenda(data);
    });
    
    // Status filter
    elements.statusFilter.addEventListener('change', (e) => {
        state.currentFilter = e.target.value;
        renderAgendas();
    });
    
    // Reschedule form submit
    elements.rescheduleForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = state.selectedAgenda;
        const novaData = elements.novaData.value;
        const novoHorario = elements.novoHorario.value;
        
        if (id && novaData && novoHorario) {
            solicitarAdiamento(id, novaData, novoHorario);
        }
    });
    
    // Modal close
    elements.modalClose.forEach(btn => {
        btn.addEventListener('click', closeRescheduleModal);
    });
    
    // Close modal on outside click
    elements.rescheduleModal.addEventListener('click', (e) => {
        if (e.target === elements.rescheduleModal) {
            closeRescheduleModal();
        }
    });
}

// Funções auxiliares
function openRescheduleModal(id) {
    state.selectedAgenda = id;
    elements.rescheduleModal.classList.remove('hidden');
    elements.novaData.value = new Date().toISOString().split('T')[0];
    elements.novoHorario.value = '14:00';
}

function closeRescheduleModal() {
    elements.rescheduleModal.classList.add('hidden');
    state.selectedAgenda = null;
}

function closeForm() {
    elements.agendaForm.classList.add('hidden');
    elements.agendaFormElement.reset();
}

function formatDate(dateString) {
    if (!dateString) return 'Data não definida';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

function getUserEmail() {
    return localStorage.getItem('userEmail') || null;
}

function showSuccess(message) {
    alert('✅ ' + message);
}

function showError(message) {
    alert('❌ ' + message);
}

// PWA Setup
function setupPWA() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('ServiceWorker registrado com sucesso!');
            })
            .catch(error => {
                console.log('Erro no ServiceWorker:', error);
            });
    }
}

// Expor funções globalmente
window.editAgenda = function(id) {
    const agenda = state.agendas.find(a => a.ID === id);
    if (!agenda) return;
    
    // Preencher formulário com dados da agenda
    elements.agendaData.value = agenda.Data || '';
    elements.agendaHorario.value = agenda.Horario || '';
    elements.agendaTipo.value = agenda.Tipo || '';
    elements.agendaParticipantes.value = agenda.Participantes || '';
    elements.agendaLocal.value = agenda.Local || '';
    elements.agendaStatus.value = agenda.Status || 'Pendente';
    
    // Mostrar formulário
    elements.agendaForm.classList.remove('hidden');
    elements.agendaFormElement.querySelector('h3').textContent = 'Editar Agenda';
    
    // Substituir submit handler
    elements.agendaFormElement.onsubmit = function(e) {
        e.preventDefault();
        const data = {
            data: elements.agendaData.value,
            horario: elements.agendaHorario.value,
            tipo: elements.agendaTipo.value,
            participantes: elements.agendaParticipantes.value,
            local: elements.agendaLocal.value,
            status: elements.agendaStatus.value,
            usuario: 'Admin'
        };
        updateAgenda(id, data);
        elements.agendaFormElement.onsubmit = null;
        elements.agendaFormElement.querySelector('h3').textContent = 'Nova Agenda';
    };
};

window.deleteAgenda = deleteAgenda;
window.finalizarAgenda = finalizarAgenda;
window.cancelarAgenda = cancelarAgenda;
window.openRescheduleModal = openRescheduleModal;
window.solicitarAdiamento = solicitarAdiamento;

// Atualizar a cada 30 segundos
setInterval(loadAgendas, 30000);
