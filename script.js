const API_BASE_URL = 'https://app-tqnwogs6oa-uc.a.run.app/api';

// Global variables
let newsData = [];
let currentSection = 'home';

// DOM Elements
const loadingScreen = document.getElementById('loading');
const newsGrid = document.getElementById('newsGrid');
const searchInput = document.getElementById('searchInput');
const refreshBtn = document.getElementById('refreshBtn');
const navLinks = document.querySelectorAll('.nav-link');
const newsSection = document.getElementById('news-section');
const hero = document.getElementById('hero');
const articleModal = document.getElementById('articleModal');
const modalContent = document.getElementById('modalContent');
const closeModal = document.querySelector('.close-modal');
const toast = document.getElementById('toast');

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    await loadNews();
    setupEventListeners();
    hideLoading();
});

// Setup event listeners
function setupEventListeners() {
    // Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            switchSection(section);
            
            // Update active nav link
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });

    // Search functionality
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        filterNews(searchTerm);
    });

    // Refresh button
    refreshBtn.addEventListener('click', async () => {
        refreshBtn.querySelector('i').classList.add('fa-spin');
        await loadNews();
        refreshBtn.querySelector('i').classList.remove('fa-spin');
        showToast('News refreshed successfully!');
    });

    // Modal close
    closeModal.addEventListener('click', () => {
        articleModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === articleModal) {
            articleModal.style.display = 'none';
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            articleModal.style.display = 'none';
        }
    });
}

// API Functions
async function fetchNews() {
    try {
        const response = await fetch(`${API_BASE_URL}/news`);
        const result = await response.json();
        
        if (result.success) {
            return result.data;
        } else {
            throw new Error(result.error || 'Failed to fetch news');
        }
    } catch (error) {
        console.error('Error fetching news:', error);
        showToast('Error loading news: ' + error.message, 'error');
        return [];
    }
}

async function fetchNewsById(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/news/${id}`);
        const result = await response.json();
        
        if (result.success) {
            return result.data;
        } else {
            throw new Error(result.error || 'News not found');
        }
    } catch (error) {
        console.error('Error fetching news by ID:', error);
        showToast('Error loading article: ' + error.message, 'error');
        return null;
    }
}

// UI Functions
async function loadNews() {
    showLoading();
    try {
        newsData = await fetchNews();
        renderNews(newsData);
    } catch (error) {
        console.error('Error loading news:', error);
        newsGrid.innerHTML = '<div class="error-message">Failed to load news. Please try again.</div>';
    } finally {
        hideLoading();
    }
}

function renderNews(articles) {
    if (!articles || articles.length === 0) {
        newsGrid.innerHTML = `
            <div class="no-news">
                <i class="fas fa-newspaper"></i>
                <h3>No news articles found</h3>
                <p>Check back later for updates!</p>
            </div>
        `;
        return;
    }

    newsGrid.innerHTML = articles.map(article => `
        <article class="news-card" onclick="openArticleModal('${article.id}')">
            <div class="news-image">
                ${article.imageUrl 
                    ? `<img src="${article.imageUrl}" alt="${article.title}" onerror="this.parentElement.innerHTML='<i class=\\"fas fa-image\\"></i>>`
                    : '<i class="fas fa-image"></i>'
                }
            </div>
            <div class="news-content">
                <h3 class="news-title">${escapeHtml(article.title || 'Untitled')}</h3>
                <p class="news-description">${escapeHtml(article.description || 'No description available.')}</p>
                <div class="news-meta">
                    <span class="news-source">${escapeHtml(article.source || 'Unknown Source')}</span>
                    <span class="news-time">${formatDate(article.time || article.createdAt)}</span>
                </div>
            </div>
        </article>
    `).join('');
}

function filterNews(searchTerm) {
    if (!searchTerm.trim()) {
        renderNews(newsData);
        return;
    }

    const filteredNews = newsData.filter(article => 
        (article.title && article.title.toLowerCase().includes(searchTerm)) ||
        (article.description && article.description.toLowerCase().includes(searchTerm)) ||
        (article.source && article.source.toLowerCase().includes(searchTerm))
    );

    renderNews(filteredNews);
}

function switchSection(section) {
    currentSection = section;
    
    // Hide all sections
    newsSection.style.display = 'none';
    hero.style.display = 'none';
    
    // Show relevant section
    switch(section) {
        case 'home':
            newsSection.style.display = 'block';
            hero.style.display = 'block';
            break;
        case 'latest':
            newsSection.style.display = 'block';
            break;
    }
}

async function openArticleModal(articleId) {
    try {
        showLoading();
        const article = await fetchNewsById(articleId);
        
        if (article) {
            modalContent.innerHTML = `
                <div class="modal-article">
                    ${article.imageUrl ? `
                        <div class="modal-image">
                            <img src="${article.imageUrl}" alt="${article.title}" style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 10px; margin-bottom: 1.5rem;">
                        </div>
                    ` : ''}
                    <h2 style="color: #333; margin-bottom: 1rem; line-height: 1.3;">${escapeHtml(article.title || 'Untitled')}</h2>
                    <div class="modal-meta" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid #eee;">
                        <span style="color: #667eea; font-weight: 500;">${escapeHtml(article.source || 'Unknown Source')}</span>
                        <span style="color: #999; font-style: italic;">${formatDate(article.time || article.createdAt)}</span>
                    </div>
                    <div class="modal-description" style="color: #555; line-height: 1.8; font-size: 1.1rem;">
                        ${escapeHtml(article.description || 'No description available.')}
                    </div>
                </div>
            `;
            
            articleModal.style.display = 'block';
        }
    } catch (error) {
        showToast('Error loading article: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Utility Functions
function showLoading() {
    if (loadingScreen) {
        loadingScreen.style.display = 'flex';
    }
}

function hideLoading() {
    if (loadingScreen) {
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }
}

function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function formatDate(dateString) {
    if (!dateString) return 'Unknown date';
    
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
        } else {
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        }
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Invalid date';
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Error handling for images
document.addEventListener('error', (e) => {
    if (e.target.tagName === 'IMG') {
        e.target.style.display = 'none';
        e.target.parentElement.innerHTML = '<i class="fas fa-image"></i>';
    }
}, true);

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
