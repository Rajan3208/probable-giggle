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

// Image handling function
function createImageElement(imageUrl, altText, fallbackIcon = 'fas fa-image') {
    if (!imageUrl) {
        return `<i class="${fallbackIcon}"></i>`;
    }
    
    const imageId = 'img_' + Math.random().toString(36).substr(2, 9);
    
    // Return image with proper error handling
    return `<img id="${imageId}" src="${imageUrl}" alt="${escapeHtml(altText)}" 
            onload="handleImageLoad('${imageId}')"
            onerror="handleImageError('${imageId}', '${fallbackIcon}')"
            style="width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity 0.3s ease;">`;
}

// Global image handling functions
window.handleImageLoad = function(imageId) {
    const img = document.getElementById(imageId);
    if (img) {
        img.style.opacity = '1';
    }
};

window.handleImageError = function(imageId, fallbackIcon = 'fas fa-image') {
    const img = document.getElementById(imageId);
    if (img && img.parentElement) {
        // Create fallback icon element
        const iconElement = document.createElement('i');
        iconElement.className = fallbackIcon;
        iconElement.style.cssText = 'font-size: 3rem; color: rgba(255, 255, 255, 0.7);';
        
        // Replace the image with the icon
        img.parentElement.replaceChild(iconElement, img);
    }
};

// UI Functions
async function loadNews() {
    showLoading();
    try {
        newsData = await fetchNews();
        renderNews(newsData);
    } catch (error) {
        console.error('Error loading news:', error);
        newsGrid.innerHTML = `
            <div class="error-message" style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: white;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.7;"></i>
                <h3>Failed to load news</h3>
                <p>Please try again later</p>
            </div>
        `;
    } finally {
        hideLoading();
    }
}

function renderNews(articles) {
    if (!articles || articles.length === 0) {
        newsGrid.innerHTML = `
            <div class="no-news" style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: white;">
                <i class="fas fa-newspaper" style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.7;"></i>
                <h3 style="margin-bottom: 1rem;">No news articles found</h3>
                <p style="opacity: 0.8;">Check back later for updates!</p>
            </div>
        `;
        return;
    }

    newsGrid.innerHTML = articles.map(article => {
        const imageContent = createImageElement(
            article.imageUrl, 
            article.title || 'News Image',
            'fas fa-newspaper'
        );
        
        return `
            <article class="news-card" onclick="openArticleModal('${article.id}')" 
                     style="cursor: pointer; transition: all 0.3s ease;">
                <div class="news-image">
                    ${imageContent}
                </div>
                <div class="news-content">
                    <h3 class="news-title">${escapeHtml(article.title || 'Untitled')}</h3>
                    <p class="news-description">${escapeHtml(truncateText(article.description || 'No description available.', 150))}</p>
                    <div class="news-meta">
                        <span class="news-source">${escapeHtml(article.source || 'Unknown Source')}</span>
                        <span class="news-time">${formatDate(article.time || article.createdAt)}</span>
                    </div>
                </div>
            </article>
        `;
    }).join('');
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
    
    // Show search results count
    if (filteredNews.length === 0) {
        showToast(`No results found for "${searchTerm}"`, 'error');
    } else {
        showToast(`Found ${filteredNews.length} article${filteredNews.length !== 1 ? 's' : ''}`);
    }
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
        case 'about':
            // Handle about section if needed
            break;
        case 'contact':
            // Handle contact section if needed
            break;
    }
}

async function openArticleModal(articleId) {
    try {
        showLoading();
        const article = await fetchNewsById(articleId);
        
        if (article) {
            const modalImageContent = article.imageUrl 
                ? `<div class="modal-image">
                     <img src="${article.imageUrl}" 
                          alt="${escapeHtml(article.title || 'Article Image')}" 
                          style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 10px; margin-bottom: 1.5rem;"
                          onerror="this.style.display='none';">
                   </div>`
                : '';
            
            modalContent.innerHTML = `
                <div class="modal-article">
                    ${modalImageContent}
                    <h2 style="color: #333; margin-bottom: 1rem; line-height: 1.3;">${escapeHtml(article.title || 'Untitled')}</h2>
                    <div class="modal-meta" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid #eee; flex-wrap: wrap; gap: 1rem;">
                        <span style="color: #667eea; font-weight: 500;">${escapeHtml(article.source || 'Unknown Source')}</span>
                        <span style="color: #999; font-style: italic;">${formatDate(article.time || article.createdAt)}</span>
                    </div>
                    <div class="modal-description" style="color: #555; line-height: 1.8; font-size: 1.1rem;">
                        ${escapeHtml(article.description || 'No description available.')}
                    </div>
                    ${article.url ? `
                        <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #eee;">
                            <a href="${article.url}" target="_blank" rel="noopener noreferrer" 
                               style="display: inline-flex; align-items: center; gap: 0.5rem; color: #667eea; text-decoration: none; font-weight: 500; transition: color 0.3s ease;">
                                Read full article <i class="fas fa-external-link-alt"></i>
                            </a>
                        </div>
                    ` : ''}
                </div>
            `;
            
            articleModal.style.display = 'block';
            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden';
        }
    } catch (error) {
        showToast('Error loading article: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Enhanced close modal function
function closeModalHandler() {
    articleModal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Update modal close events
if (closeModal) {
    closeModal.addEventListener('click', closeModalHandler);
}

window.addEventListener('click', (e) => {
    if (e.target === articleModal) {
        closeModalHandler();
    }
});

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
        }, 300);
    }
}

function showToast(message, type = 'success') {
    if (!toast) return;
    
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
        if (isNaN(date.getTime())) return 'Invalid date';
        
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
        const diffMinutes = Math.floor(diffTime / (1000 * 60));
        
        if (diffMinutes < 60) {
            return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
        } else if (diffHours < 24) {
            return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
        } else if (diffDays < 365) {
            const months = Math.floor(diffDays / 30);
            return `${months} month${months > 1 ? 's' : ''} ago`;
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

function truncateText(text, maxLength = 150) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
}

// Enhanced error handling for the entire application
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    showToast('An unexpected error occurred', 'error');
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
    showToast('Network error occurred', 'error');
    e.preventDefault();
});

// Network status handling
window.addEventListener('online', () => {
    showToast('Connection restored');
});

window.addEventListener('offline', () => {
    showToast('Connection lost. Some features may not work.', 'error');
});

// Service Worker Registration with enhanced error handling
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered successfully:', registration);
                
                // Listen for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            showToast('New version available! Refresh to update.');
                        }
                    });
                });
            })
            .catch((error) => {
                console.log('SW registration failed:', error);
            });
    });
}

// Performance monitoring
if ('performance' in window) {
    window.addEventListener('load', () => {
        setTimeout(() => {
            const perfData = performance.getEntriesByType('navigation')[0];
            console.log('Page load time:', perfData.loadEventEnd - perfData.loadEventStart, 'ms');
        }, 0);
    });
}
