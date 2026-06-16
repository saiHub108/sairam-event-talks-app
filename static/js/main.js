// Application State
let state = {
    notes: [], // Parsed notes from server
    selectedIds: new Set(), // Selected note item IDs
    activeFilter: 'all', // Filter: all, Feature, Issue, Changed, Deprecated, General
    searchQuery: '', // Search query keyword
    theme: 'dark' // Theme: dark, light
};

// DOM Elements
const elements = {
    themeCheckbox: document.getElementById('theme-checkbox'),
    exportCsvBtn: document.getElementById('export-csv-btn'),
    refreshBtn: document.getElementById('refresh-btn'),
    lastUpdatedTime: document.getElementById('last-updated-time'),
    cacheBadge: document.getElementById('cache-badge'),
    searchInput: document.getElementById('search-input'),
    clearSearchBtn: document.getElementById('clear-search-btn'),
    filterChips: document.querySelectorAll('.filter-chip'),
    loadingState: document.getElementById('loading-state'),
    errorState: document.getElementById('error-state'),
    errorMessage: document.getElementById('error-message'),
    retryBtn: document.getElementById('retry-btn'),
    emptyState: document.getElementById('empty-state'),
    resetFiltersBtn: document.getElementById('reset-filters-btn'),
    timelineContainer: document.getElementById('timeline-container'),
    selectionBar: document.getElementById('selection-bar'),
    selectionCount: document.getElementById('selection-count'),
    tweetSelectedBtn: document.getElementById('tweet-selected-btn'),
    clearSelectionBtn: document.getElementById('clear-selection-btn'),
    tweetModal: document.getElementById('tweet-modal'),
    tweetText: document.getElementById('tweet-text'),
    charCount: document.getElementById('char-count'),
    charWarning: document.getElementById('char-warning'),
    closeModalBtn: document.getElementById('close-modal-btn'),
    cancelTweetBtn: document.getElementById('cancel-tweet-btn'),
    publishTweetBtn: document.getElementById('publish-tweet-btn'),
    
    // Stat chips
    statAll: document.getElementById('stat-all').querySelector('.stat-count'),
    statFeature: document.getElementById('stat-feature').querySelector('.stat-count'),
    statIssue: document.getElementById('stat-issue').querySelector('.stat-count'),
    statChanged: document.getElementById('stat-changed').querySelector('.stat-count')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupEventListeners();
    fetchNotes(false);
});

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
}

function setTheme(theme) {
    state.theme = theme;
    localStorage.setItem('theme', theme);
    
    // Sync checkbox UI state
    if (elements.themeCheckbox) {
        elements.themeCheckbox.checked = (theme === 'light');
    }
    
    if (theme === 'dark') {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
    }
}

// Event Listeners Setup
function setupEventListeners() {
    // Theme Switch
    elements.themeCheckbox.addEventListener('change', (e) => {
        setTheme(e.target.checked ? 'light' : 'dark');
    });

    // Export CSV Button
    elements.exportCsvBtn.addEventListener('click', exportToCSV);

    // Refresh Button
    elements.refreshBtn.addEventListener('click', () => {
        fetchNotes(true);
    });

    // Retry Button (Error State)
    elements.retryBtn.addEventListener('click', () => {
        fetchNotes(true);
    });

    // Reset Filters
    elements.resetFiltersBtn.addEventListener('click', clearFilters);

    // Search Input
    elements.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.toLowerCase().trim();
        if (state.searchQuery) {
            elements.clearSearchBtn.style.display = 'block';
        } else {
            elements.clearSearchBtn.style.display = 'none';
        }
        renderNotes();
    });

    // Clear Search Input
    elements.clearSearchBtn.addEventListener('click', () => {
        elements.searchInput.value = '';
        state.searchQuery = '';
        elements.clearSearchBtn.style.display = 'none';
        renderNotes();
    });

    // Filter Chips
    elements.filterChips.forEach(chip => {
        chip.addEventListener('click', (e) => {
            elements.filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            state.activeFilter = chip.getAttribute('data-type');
            renderNotes();
        });
    });

    // Selection Bar Actions
    elements.clearSelectionBtn.addEventListener('click', clearSelection);
    elements.tweetSelectedBtn.addEventListener('click', handleTweetSelected);

    // Modal Actions
    elements.closeModalBtn.addEventListener('click', closeTweetModal);
    elements.cancelTweetBtn.addEventListener('click', closeTweetModal);
    elements.publishTweetBtn.addEventListener('click', publishTweet);
    
    elements.tweetText.addEventListener('input', (e) => {
        updateCharCount(e.target.value);
    });
}

// Fetch Notes from API
async function fetchNotes(forceRefresh = false) {
    showLoading(true);
    showError(false);
    
    // Spinner rotation
    const spinner = elements.refreshBtn.querySelector('.spinner-icon');
    spinner.classList.add('loading');
    elements.refreshBtn.disabled = true;

    try {
        const response = await fetch(`/api/release-notes?refresh=${forceRefresh}`);
        const data = await response.json();
        
        if (!response.ok || data.error) {
            throw new Error(data.error || 'Server error occurred');
        }

        state.notes = data.notes;
        
        // Update meta info
        elements.lastUpdatedTime.textContent = data.last_updated || 'Just now';
        
        if (data.cached) {
            elements.cacheBadge.style.display = 'inline-block';
            elements.cacheBadge.textContent = 'Cached';
            elements.cacheBadge.className = 'badge badge-cache';
        } else {
            elements.cacheBadge.style.display = 'inline-block';
            elements.cacheBadge.textContent = 'Fresh';
            elements.cacheBadge.className = 'badge';
            elements.cacheBadge.style.background = 'rgba(16, 185, 129, 0.15)';
            elements.cacheBadge.style.color = 'var(--color-feature)';
            elements.cacheBadge.style.border = '1px solid rgba(16, 185, 129, 0.2)';
        }

        // Show warning if failed to refresh but returned cache
        if (data.warning) {
            console.warn(data.warning);
            // Optionally could show a small toast or warning banner
        }

        // Clear previous selections on refresh
        clearSelection();
        
        // Calculate and update dashboard stats
        updateStats();
        
        // Render timeline
        renderNotes();
        
    } catch (err) {
        console.error('Error fetching notes:', err);
        elements.errorMessage.textContent = err.message || 'Could not fetch release notes feed.';
        showError(true);
    } finally {
        showLoading(false);
        spinner.classList.remove('loading');
        elements.refreshBtn.disabled = false;
    }
}

// Stats Calculation
function updateStats() {
    let total = 0;
    let features = 0;
    let issues = 0;
    let changed = 0;

    state.notes.forEach(day => {
        day.items.forEach(item => {
            total++;
            const type = item.type.toLowerCase();
            if (type.includes('feature')) features++;
            else if (type.includes('issue') || type.includes('breaking') || type.includes('security')) issues++;
            else if (type.includes('change') || type.includes('update')) changed++;
        });
    });

    elements.statAll.textContent = total;
    elements.statFeature.textContent = features;
    elements.statIssue.textContent = issues;
    elements.statChanged.textContent = changed;
}

// Render Timeline Notes
function renderNotes() {
    elements.timelineContainer.innerHTML = '';
    
    let renderedCount = 0;

    state.notes.forEach(day => {
        // Filter items within this date
        const filteredItems = day.items.filter(item => {
            // Type Filter
            const typeMatches = state.activeFilter === 'all' || 
                                item.type.toLowerCase() === state.activeFilter.toLowerCase();
            
            // Search Query Filter (checks type name, body HTML, date string)
            const textToSearch = `${item.type} ${item.body} ${day.date}`.toLowerCase();
            const searchMatches = !state.searchQuery || textToSearch.includes(state.searchQuery);
            
            return typeMatches && searchMatches;
        });

        if (filteredItems.length > 0) {
            renderedCount += filteredItems.length;
            
            // Create Date Group Container
            const dateGroup = document.createElement('div');
            dateGroup.className = 'date-group';
            
            // Date Title
            const dateTitle = document.createElement('h3');
            dateTitle.className = 'date-heading';
            dateTitle.textContent = day.date;
            dateGroup.appendChild(dateTitle);
            
            // Cards List Container
            const cardsList = document.createElement('div');
            cardsList.className = 'cards-list';
            
            filteredItems.forEach(item => {
                const isSelected = state.selectedIds.has(item.id);
                
                const card = document.createElement('div');
                card.className = `note-card ${isSelected ? 'selected' : ''}`;
                card.setAttribute('data-type', item.type);
                card.setAttribute('id', item.id);
                
                // Construct card HTML
                card.innerHTML = `
                    <div class="card-selector">
                        <label class="custom-checkbox">
                            <input type="checkbox" class="note-checkbox" data-id="${item.id}" ${isSelected ? 'checked' : ''}>
                            <span class="checkmark"></span>
                        </label>
                    </div>
                    <div class="card-main">
                        <div class="card-header">
                            <span class="type-badge">${item.type}</span>
                            <div class="card-actions">
                                <button class="action-btn copy-btn" title="Copy Content">
                                    <i class="fa-regular fa-copy"></i>
                                </button>
                                <button class="action-btn tweet-btn" title="Tweet This Update">
                                    <i class="fa-brands fa-x-twitter"></i>
                                </button>
                            </div>
                        </div>
                        <div class="card-body">
                            ${item.body}
                        </div>
                    </div>
                `;
                
                // Add event listeners on card items
                const checkbox = card.querySelector('.note-checkbox');
                checkbox.addEventListener('change', (e) => {
                    handleCheckboxChange(item.id, e.target.checked);
                });
                
                const copyBtn = card.querySelector('.copy-btn');
                copyBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    copyNote(day.date, item.type, item.body, copyBtn);
                });
                
                const tweetBtn = card.querySelector('.tweet-btn');
                tweetBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    handleTweetSingle(day.date, item.type, item.body);
                });
                
                // Clicking the card itself toggles selection, except when clicking links/buttons
                card.addEventListener('click', (e) => {
                    if (e.target.tagName !== 'A' && 
                        e.target.tagName !== 'INPUT' && 
                        !e.target.closest('.action-btn') && 
                        !e.target.closest('.checkmark')) {
                        checkbox.checked = !checkbox.checked;
                        handleCheckboxChange(item.id, checkbox.checked);
                    }
                });

                cardsList.appendChild(card);
            });
            
            dateGroup.appendChild(cardsList);
            elements.timelineContainer.appendChild(dateGroup);
        }
    });

    // Handle Empty States
    if (renderedCount === 0) {
        elements.timelineContainer.style.display = 'none';
        elements.emptyState.style.display = 'flex';
    } else {
        elements.emptyState.style.display = 'none';
        elements.timelineContainer.style.display = 'flex';
    }
}

// Checkbox Selection Logic
function handleCheckboxChange(id, checked) {
    const card = document.getElementById(id);
    
    if (checked) {
        state.selectedIds.add(id);
        if (card) card.classList.add('selected');
    } else {
        state.selectedIds.delete(id);
        if (card) card.classList.remove('selected');
    }
    
    updateSelectionBar();
}

function updateSelectionBar() {
    const count = state.selectedIds.size;
    elements.selectionCount.textContent = count;
    
    if (count > 0) {
        elements.selectionBar.classList.add('active');
    } else {
        elements.selectionBar.classList.remove('active');
    }
}

function clearSelection() {
    state.selectedIds.clear();
    
    // Uncheck all checkboxes in UI
    const checkboxes = document.querySelectorAll('.note-checkbox');
    checkboxes.forEach(cb => cb.checked = false);
    
    // Remove selected class from all cards
    const cards = document.querySelectorAll('.note-card');
    cards.forEach(card => card.classList.remove('selected'));
    
    updateSelectionBar();
}

function clearFilters() {
    elements.searchInput.value = '';
    state.searchQuery = '';
    elements.clearSearchBtn.style.display = 'none';
    
    elements.filterChips.forEach(c => c.classList.remove('active'));
    document.querySelector('.filter-chip[data-type="all"]').classList.add('active');
    state.activeFilter = 'all';
    
    renderNotes();
}

// HTML to Plain Text Converter for Clipboard / Tweet
function stripHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
}

// Copy to Clipboard
function copyNote(date, type, bodyHtml, btnElement) {
    const textContent = stripHtml(bodyHtml).trim();
    const copyText = `Google Cloud BigQuery Update (${date}) [${type}]:\n${textContent}`;
    
    navigator.clipboard.writeText(copyText).then(() => {
        // Change icon to show success
        const icon = btnElement.querySelector('i');
        icon.className = 'fa-solid fa-check';
        icon.style.color = 'var(--color-feature)';
        
        btnElement.style.borderColor = 'var(--color-feature)';
        btnElement.style.background = 'var(--bg-feature)';
        
        setTimeout(() => {
            icon.className = 'fa-regular fa-copy';
            icon.style.color = '';
            btnElement.style.borderColor = '';
            btnElement.style.background = '';
        }, 2000);
    }).catch(err => {
        console.error('Could not copy text: ', err);
    });
}

// Single Tweet Action
function handleTweetSingle(date, type, bodyHtml) {
    const textContent = stripHtml(bodyHtml).trim();
    
    // Format text beautifully
    let tweetMessage = `BigQuery Update (${date})\n\n[${type}] ${textContent}`;
    
    // Append tags and truncate if necessary
    const tags = "\n\n#BigQuery #GoogleCloud";
    
    // If text exceeds limit, truncate nicely
    if ((tweetMessage + tags).length > 280) {
        const availableSpace = 280 - tags.length - 4; // -4 for "..."
        tweetMessage = tweetMessage.substring(0, availableSpace) + "...";
    }
    
    tweetMessage += tags;
    
    openTweetModal(tweetMessage);
}

// Multi Tweet Action
function handleTweetSelected() {
    if (state.selectedIds.size === 0) return;
    
    let tweetMessage = "Google Cloud #BigQuery Updates:\n\n";
    
    // Gather selected items
    const selectedItems = [];
    state.notes.forEach(day => {
        day.items.forEach(item => {
            if (state.selectedIds.has(item.id)) {
                selectedItems.push({
                    date: day.date,
                    type: item.type,
                    text: stripHtml(item.body).trim()
                });
            }
        });
    });
    
    // Format each update
    selectedItems.forEach((item, index) => {
        const prefix = `• [${item.type}] `;
        const content = item.text;
        
        // Append update item
        tweetMessage += prefix + content + "\n\n";
    });
    
    // Append tag
    tweetMessage = tweetMessage.trim() + "\n\n#GoogleCloud";
    
    openTweetModal(tweetMessage);
}

// Modal management
function openTweetModal(text) {
    elements.tweetText.value = text;
    updateCharCount(text);
    elements.tweetModal.classList.add('active');
    
    // Auto-focus text area and select all
    setTimeout(() => {
        elements.tweetText.focus();
        elements.tweetText.setSelectionRange(elements.tweetText.value.length, elements.tweetText.value.length);
    }, 100);
}

function closeTweetModal() {
    elements.tweetModal.classList.remove('active');
}

function updateCharCount(text) {
    const count = text.length;
    elements.charCount.textContent = count;
    
    if (count > 280) {
        elements.charCount.classList.add('danger');
        elements.charWarning.style.display = 'flex';
    } else {
        elements.charCount.classList.remove('danger');
        elements.charWarning.style.display = 'none';
    }
}

function publishTweet() {
    const text = elements.tweetText.value;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
    closeTweetModal();
}

// Loading and Error State Helpers
function showLoading(show) {
    elements.loadingState.style.display = show ? 'flex' : 'none';
    if (show) {
        elements.timelineContainer.style.display = 'none';
        elements.errorState.style.display = 'none';
        elements.emptyState.style.display = 'none';
    }
}

function showError(show) {
    elements.errorState.style.display = show ? 'flex' : 'none';
    if (show) {
        elements.timelineContainer.style.display = 'none';
        elements.loadingState.style.display = 'none';
        elements.emptyState.style.display = 'none';
    }
}

// Export CSV Logic
function escapeCSVValue(val) {
    if (val === null || val === undefined) return '';
    let formatted = val.toString().replace(/"/g, '""');
    if (formatted.includes(',') || formatted.includes('\n') || formatted.includes('"')) {
        formatted = `"${formatted}"`;
    }
    return formatted;
}

function exportToCSV() {
    if (!state.notes || state.notes.length === 0) {
        alert("No release notes available to export.");
        return;
    }

    let csvContent = "Date,Type,Update Description\r\n";
    let exportCount = 0;

    state.notes.forEach(day => {
        day.items.forEach(item => {
            // Check filters
            const typeMatches = state.activeFilter === 'all' || 
                                item.type.toLowerCase() === state.activeFilter.toLowerCase();
            const textToSearch = `${item.type} ${item.body} ${day.date}`.toLowerCase();
            const searchMatches = !state.searchQuery || textToSearch.includes(state.searchQuery);
            
            if (typeMatches && searchMatches) {
                const plainTextBody = stripHtml(item.body).trim();
                csvContent += `${escapeCSVValue(day.date)},${escapeCSVValue(item.type)},${escapeCSVValue(plainTextBody)}\r\n`;
                exportCount++;
            }
        });
    });

    if (exportCount === 0) {
        alert("No release notes match the current filters to export.");
        return;
    }

    // Download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    
    const dateStr = new Date().toISOString().slice(0, 10);
    const filterSuffix = state.activeFilter !== 'all' ? `_${state.activeFilter.toLowerCase()}` : '';
    link.setAttribute("download", `bigquery_release_notes_${dateStr}${filterSuffix}.csv`);
    
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


