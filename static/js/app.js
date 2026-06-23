// State management
let allUpdates = [];
let activeFilters = {
    search: '',
    type: 'all',
    sort: 'desc'
};

// DOM Elements
const refreshBtn = document.getElementById('refresh-btn');
const refreshSpinner = document.getElementById('refresh-spinner');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');
const typeFilter = document.getElementById('type-filter');
const sortSelect = document.getElementById('sort-select');
const loadingState = document.getElementById('loading-state');
const emptyState = document.getElementById('empty-state');
const resetFiltersBtn = document.getElementById('reset-filters-btn');
const releasesContainer = document.getElementById('releases-container');
const updateCountEl = document.getElementById('update-count');
const toastContainer = document.getElementById('toast-container');

// Modal Elements
const tweetModal = document.getElementById('tweet-modal');
const closeModalBtn = document.getElementById('close-modal');
const cancelTweetBtn = document.getElementById('cancel-tweet-btn');
const confirmTweetBtn = document.getElementById('confirm-tweet-btn');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCounter = document.getElementById('char-counter');
const previewDate = document.getElementById('preview-date');
const previewType = document.getElementById('preview-type');
const previewDesc = document.getElementById('preview-desc');

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    fetchReleases();
    setupEventListeners();
});

// Event Listeners Setup
function setupEventListeners() {
    refreshBtn.addEventListener('click', fetchReleases);
    
    searchInput.addEventListener('input', (e) => {
        activeFilters.search = e.target.value;
        clearSearchBtn.style.display = e.target.value ? 'flex' : 'none';
        renderReleases();
    });
    
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        activeFilters.search = '';
        clearSearchBtn.style.display = 'none';
        renderReleases();
    });
    
    typeFilter.addEventListener('change', (e) => {
        activeFilters.type = e.target.value;
        renderReleases();
    });
    
    sortSelect.addEventListener('change', (e) => {
        activeFilters.sort = e.target.value;
        renderReleases();
    });
    
    resetFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        typeFilter.value = 'all';
        sortSelect.value = 'desc';
        activeFilters = {
            search: '',
            type: 'all',
            sort: 'desc'
        };
        clearSearchBtn.style.display = 'none';
        renderReleases();
    });

    // Modal Close events
    closeModalBtn.addEventListener('click', closeTweetModal);
    cancelTweetBtn.addEventListener('click', closeTweetModal);
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) closeTweetModal();
    });
    
    // Character counter validation on input
    tweetTextarea.addEventListener('input', () => {
        validateTweetLength();
    });
}

// Fetch BQ release notes from Flask API
async function fetchReleases() {
    // Show spinner & disable button
    refreshSpinner.style.display = 'inline-block';
    refreshSpinner.classList.add('spinning');
    refreshBtn.disabled = true;
    
    // Show skeleton, hide content/empty state
    loadingState.style.display = 'grid';
    releasesContainer.style.display = 'none';
    emptyState.style.display = 'none';
    
    try {
        const response = await fetch('/api/releases');
        const data = await response.json();
        
        if (data.success && data.entries) {
            processEntries(data.entries);
            renderReleases();
            showToast('Release notes successfully updated.', 'success');
        } else {
            throw new Error(data.error || 'Failed to retrieve release notes.');
        }
    } catch (error) {
        console.error('Error fetching release notes:', error);
        showToast(error.message || 'An error occurred while fetching update feeds.', 'error');
        releasesContainer.style.display = 'grid';
        if (allUpdates.length === 0) {
            emptyState.style.display = 'flex';
        }
    } finally {
        // Hide spinner & enable button
        refreshSpinner.style.display = 'none';
        refreshSpinner.classList.remove('spinning');
        refreshBtn.disabled = false;
        
        // Hide skeleton
        loadingState.style.display = 'none';
    }
}

// Process XML feed entries and split grouped daily updates by <h3> headings
function processEntries(entries) {
    allUpdates = [];
    
    entries.forEach(entry => {
        const parsed = parseReleaseContent(entry);
        allUpdates.push(...parsed);
    });
}

// Parse HTML contents of each entry
function parseReleaseContent(entry) {
    const parser = new DOMParser();
    // Wrap entry.content to ensure proper root node context parsing
    const doc = parser.parseFromString(`<div>${entry.content}</div>`, 'text/html');
    const root = doc.body.firstChild;
    
    const updates = [];
    let currentType = 'Other';
    let currentHTML = '';
    
    Array.from(root.childNodes).forEach(node => {
        // If we hit an <h3> tag, it marks a new segment (e.g. Feature, Change, Deprecated)
        if (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === 'h3') {
            if (currentHTML.trim()) {
                updates.push(createUpdateObject(entry, updates.length, currentType, currentHTML));
            }
            currentType = node.textContent.trim();
            currentHTML = '';
        } else {
            currentHTML += node.outerHTML || node.textContent;
        }
    });
    
    // Add the remaining segment
    if (currentHTML.trim()) {
        updates.push(createUpdateObject(entry, updates.length, currentType, currentHTML));
    }
    
    // Fallback if the release entry doesn't contain any h3 tags
    if (updates.length === 0) {
        updates.push(createUpdateObject(entry, 0, 'Other', entry.content));
    }
    
    return updates;
}

function createUpdateObject(entry, index, type, htmlContent) {
    return {
        id: `${entry.id || entry.date}-${index}`,
        date: entry.date,
        rawDate: entry.updated ? new Date(entry.updated) : new Date(),
        originalLink: entry.link || 'https://cloud.google.com/bigquery/docs/release-notes',
        type: type,
        normalizedType: getNormalizedType(type),
        contentHTML: htmlContent.trim(),
        plainText: stripHtml(htmlContent)
    };
}

function getNormalizedType(typeStr) {
    const t = typeStr.toLowerCase().trim();
    if (t.includes('feature')) return 'feature';
    if (t.includes('change')) return 'change';
    if (t.includes('deprecat')) return 'deprecated';
    if (t.includes('fix') || t.includes('resolv')) return 'fixed';
    return 'other';
}

function stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    
    // Prepend bullet symbols for list items to make it clean readable plain text
    tmp.querySelectorAll('li').forEach(li => {
        li.prepend('• ');
    });
    
    return tmp.textContent || tmp.innerText || '';
}

// Render parsed release updates to DOM
function renderReleases() {
    releasesContainer.innerHTML = '';
    
    // Apply search filter
    let filtered = allUpdates.filter(item => {
        // Type filter
        if (activeFilters.type !== 'all' && item.normalizedType !== activeFilters.type) {
            return false;
        }
        
        // Search filter
        if (activeFilters.search) {
            const query = activeFilters.search.toLowerCase();
            const textMatch = item.plainText.toLowerCase().includes(query);
            const dateMatch = item.date.toLowerCase().includes(query);
            const typeMatch = item.type.toLowerCase().includes(query);
            return textMatch || dateMatch || typeMatch;
        }
        
        return true;
    });
    
    // Apply sorting
    filtered.sort((a, b) => {
        const timeA = a.rawDate.getTime();
        const timeB = b.rawDate.getTime();
        return activeFilters.sort === 'desc' ? timeB - timeA : timeA - timeB;
    });
    
    // Update stats count
    updateCountEl.textContent = `${filtered.length} Update${filtered.length !== 1 ? 's' : ''}`;
    
    if (filtered.length === 0) {
        releasesContainer.style.display = 'none';
        emptyState.style.display = 'flex';
        return;
    }
    
    emptyState.style.display = 'none';
    releasesContainer.style.display = 'grid';
    
    // Render update cards
    filtered.forEach(item => {
        const card = document.createElement('article');
        card.className = `release-card type-${item.normalizedType}`;
        card.setAttribute('aria-label', `${item.type} update on ${item.date}`);
        
        card.innerHTML = `
            <div class="card-header">
                <span class="release-date">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    ${item.date}
                </span>
                <span class="badge badge-${item.normalizedType}">${item.type}</span>
            </div>
            
            <div class="card-body">
                ${item.contentHTML}
            </div>
            
            <div class="card-footer">
                <button class="card-tweet-btn" data-id="${item.id}">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    Tweet Update
                </button>
            </div>
        `;
        
        // Tweet button handler
        card.querySelector('.card-tweet-btn').addEventListener('click', () => {
            openTweetModal(item);
        });
        
        releasesContainer.appendChild(card);
    });
}

// Modal handling
function openTweetModal(item) {
    // Fill Preview details
    previewDate.textContent = item.date;
    previewType.textContent = item.type;
    previewType.className = `preview-type-badge type-${item.normalizedType}`;
    previewDesc.textContent = item.plainText.substring(0, 120) + (item.plainText.length > 120 ? '...' : '');

    // Auto-generate tweet contents
    let tweetPrefix = `BigQuery Release Alert 🚀\n📅 ${item.date} | [${item.type}]\n\n`;
    let plainContent = item.plainText.trim().replace(/\s+/g, ' ');
    
    // Construct links and hashtags
    const linkStr = `\n\nRead more: ${item.originalLink}`;
    const hashtagsStr = `\n#BigQuery #GCP #GoogleCloud`;
    
    const availableLength = 280 - (tweetPrefix.length + linkStr.length + hashtagsStr.length);
    
    if (plainContent.length > availableLength) {
        plainContent = plainContent.substring(0, availableLength - 3) + '...';
    }
    
    const initialTweetText = `${tweetPrefix}${plainContent}${linkStr}${hashtagsStr}`;
    
    tweetTextarea.value = initialTweetText;
    validateTweetLength();
    
    tweetModal.classList.add('active');
    tweetModal.setAttribute('aria-hidden', 'false');
    tweetTextarea.focus();
    
    // Store current sharing details in the publish button
    confirmTweetBtn.onclick = () => {
        const text = tweetTextarea.value;
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(twitterUrl, '_blank', 'width=550,height=420');
        closeTweetModal();
        showToast('Redirected to X composer.', 'success');
    };
}

function closeTweetModal() {
    tweetModal.classList.remove('active');
    tweetModal.setAttribute('aria-hidden', 'true');
}

function validateTweetLength() {
    const text = tweetTextarea.value;
    const len = text.length;
    const remaining = 280 - len;
    
    charCounter.textContent = remaining;
    
    if (remaining < 0) {
        charCounter.className = 'char-counter danger';
        confirmTweetBtn.disabled = true;
    } else if (remaining <= 30) {
        charCounter.className = 'char-counter warning';
        confirmTweetBtn.disabled = false;
    } else {
        charCounter.className = 'char-counter';
        confirmTweetBtn.disabled = false;
    }
}

// Toast Notifications System
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'success' ? 
        `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-feature)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
         </svg>` : 
        `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-deprecated)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
         </svg>`;
         
    toast.innerHTML = `
        ${icon}
        <span class="toast-message">${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto-remove toast after 3.5s
    setTimeout(() => {
        toast.style.animation = 'slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse forwards';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3500);
}
