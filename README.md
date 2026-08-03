# 📅 Agenda Monitor

Sistema completo de monitoramento de agendas com PWA e integração com Google Sheets.

## 🚀 Funcionalidades

- ✅ Painel Administrativo completo
- ✅ Visualização de agendas em cards
- ✅ Integração com Google Maps
- ✅ Solicitação de adiamento
- ✅ Notificações para admin
- ✅ Design responsivo (iOS 26)
- ✅ PWA (Progressive Web App)

## 📋 Pré-requisitos

- Google Account
- GitHub Account
- Vercel Account

## 🔧 Passo a Passo

### 1. Configuração do Google Sheets

1. Acesse [Google Sheets](https://sheets.google.com)
2. Crie uma nova planilha
3. Anote o ID da planilha (na URL: `https://docs.google.com/spreadsheets/d/SEU_ID_AQUI/edit`)
4. Abra o Editor de Scripts: Extensões → Apps Script
5. Cole o conteúdo do `code.gs`
6. Execute a função `executarInicializacao()` para criar as abas
7. Publique como Web App:
   - Implantar → Nova implantação
   - Tipo: Web App
   - Executar como: Eu
   - Quem tem acesso: Qualquer pessoa
   - Copie a URL do Web App

### 2. Configuração do Frontend

1. No `script.js`, substitua `API_URL` pela URL do seu Web App
2. No `code.gs`, substitua `SPREADSHEET_ID` pelo ID da sua planilha

### 3. Deploy no GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/seu-usuario/agenda-monitor.git
git push -u origin main
