import { UIElements } from './uiMng.js';

async function loadHistory() {
    UIElements.historyList.innerHTML = 'Loading history...';
    const historyData = await window.electronAPI.getHistory();

    if (!historyData || historyData.length === 0) {
        UIElements.historyList.innerHTML = 'No history found.';
        return;
    }

    // Group messages by date
    const groupedByDate = historyData.reduce((acc, msg) => {
        const date = new Date(msg.timestamp).toLocaleDateString(undefined, {
            year: 'numeric', month: 'long', day: 'numeric'
        });
        if (!acc[date]) acc[date] = [];
        acc[date].push(msg);
        return acc;
    }, {});

    UIElements.historyList.innerHTML = '';

    // Create collapsible day containers
    Object.keys(groupedByDate).reverse().forEach(date => {
        const dayContainer = document.createElement('div');
        dayContainer.className = 'history-day-container';
        
        const dayHeader = document.createElement('div');
        dayHeader.className = 'history-day-header';
        dayHeader.textContent = `Conversation from ${date}`;
        
        const messagesContainer = document.createElement('div');
        messagesContainer.className = 'history-messages';
        messagesContainer.style.display = 'none'; // Initially collapsed
        messagesContainer.innerHTML = groupedByDate[date].map(msg =>
            `<div class="chat-bubble ${msg.role === 'model' ? 'bot' : 'user'}"><strong>${msg.role}:</strong> ${msg.text} <em>(${new Date(msg.timestamp).toLocaleTimeString()})</em></div>`
        ).join('');

        // Toggle visibility on click
        dayHeader.addEventListener('click', () => {
            messagesContainer.style.display = messagesContainer.style.display === 'block' ? 'none' : 'block';
        });

        dayContainer.appendChild(dayHeader);
        dayContainer.appendChild(messagesContainer);
        UIElements.historyList.appendChild(dayContainer);
    });
}

// This function is called when the history tab is clicked
export function initHistory() {
    loadHistory();
}