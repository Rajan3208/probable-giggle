// API Configuration
const API_BASE_URL = 'https://app-tqnwogs6oa-uc.a.run.app/api';

// Global variables
let newsData = [];
let currentSection = 'home';
let isEditing = false;
let currentEditId = null;

// DOM Elements
const loadingScreen = document.getElementById('loading');
const newsGrid = document.getElementById('newsGrid');
const searchInput = document.getElementById('searchInput');
const refreshBtn = document.getElementById('refreshBtn');
const navLinks = document.querySelectorAll('.nav-link');
const adminPanel = document.getElementById('admin-panel');
const newsSection = document.getElementById('news-section');
const hero = document.getElementById('hero');
const addNewsBtn = document.getElementById('addNewsBtn');
const newsForm = document.getElementById('newsForm');
const articleForm = document.getElementById('articleForm');
const cancelBtn = document.getElementById('cancelBtn');
const adminNewsList = document.getElementById('adminNewsList');
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

    // Admin panel buttons
    addNewsBtn.addEventListener('click', () => {
        showNewsForm();
    });

    cancelBtn.addEventListener('click', () => {
        hideNewsForm();
    });

    // Form submission
    articleForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleFormSubmission();
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
            hideNewsForm();
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

async function createNews(newsData) {
    try {
        const response = await fetch(`${API_BASE_URL}/news`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newsData),
        });
        
        const result = await response.json();
        
        if (result.success) {
            return result;
        } else {
            throw new Error(result.error || 'Failed to create news');
        }
    } catch (error) {
        console.error('Error creating news:', error);
        showToast('Error creating news: ' + error.message, 'error');
        throw error;
    }
}

async function updateNews(id, newsData) {
    try {
        const response = await fetch(`${API_BASE_URL}/news/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newsData),
        });
        
        const result = await response.json();
        
        if (result.success) {
            return result;
        } else {
            throw new Error(result.error || 'Failed to update news');
        }
    } catch (error) {
        console.error('Error updating news:', error);
        showToast('Error updating news: ' + error.message, 'error');
        throw error;
    }
}

async function deleteNews(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/news/${id}`, {
            method: 'DELETE',
        });
        
        const result = await response.json();
        
        if (result.success) {
            return result;
        } else {
            throw new Error(result.error || 'Failed to delete news');
        }
    } catch (error) {
        console.error('Error deleting news:', error);
        showToast('Error deleting news: ' + error.message, 'error');
        throw error;
    }
}

// UI Functions
async function loadNews() {
    showLoading();
    try {
        newsData = await fetchNews();
        renderNews(newsData);
        if (currentSection === 'admin') {
            renderAdminNews(newsData);
        }
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
                    ? `<img src="${article.imageUrl}" alt="${article.title}" onerror="this.parentElement.innerHTML='<i class=\\"fas fa-image\\"></i>'">`
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

function renderAdminNews(articles) {
    if (!articles || articles.length === 0) {
        adminNewsList.innerHTML = '<p>No news articles found.</p>';
        return;
    }

    adminNewsList.innerHTML = articles.map(article => `
        <div class="admin-news-item">
            <div class="admin-news-info">
                <h4>${escapeHtml(article.title || 'Untitled')}</h4>
                <p>${escapeHtml(article.description ? article.description.substring(0, 100) + '...' : 'No description')}</p>
                <small>Source: ${escapeHtml(article.source || 'Unknown')} | ${formatDate(article.time || article.createdAt)}</small>
            </div>
            <div class="admin-actions">
                <button class="edit-btn" onclick="editArticle('${article.id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="delete-btn" onclick="deleteArticle('${article.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
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
    adminPanel.style.display = 'none';
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
        case 'admin':
            adminPanel.style.display = 'block';
            renderAdminNews(newsData);
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

function showNewsForm(article = null) {
    isEditing = !!article;
    currentEditId = article ? article.id : null;
    
    if (article) {
        document.getElementById('articleId').value = article.id;
        document.getElementById('title').value = article.title || '';
        document.getElementById('description').value = article.description || '';
        document.getElementById('source').value = article.source || '';
        document.getElementById('imageUrl').value = article.imageUrl || '';
        document.querySelector('.submit-btn').innerHTML = '<i class="fas fa-save"></i> Update Article';
    } else {
        articleForm.reset();
        document.getElementById('articleId').value = '';
        document.querySelector('.submit-btn').innerHTML = '<i class="fas fa-save"></i> Save Article';
    }
    
    newsForm.style.display = 'block';
    newsForm.scrollIntoView({ behavior: 'smooth' });
}

function hideNewsForm() {
    newsForm.style.display = 'none';
    articleForm.reset();
    isEditing = false;
    currentEditId = null;
}

async function handleFormSubmission() {
    const formData = {
        title: document.getElementById('title').value.trim(),
        description: document.getElementById('description').value.trim(),
        source: document.getElementById('source').value.trim(),
        imageUrl: document.getElementById('imageUrl').value.trim(),
        time: new Date().toISOString()
    };

    if (!formData.title || !formData.description || !formData.source) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    try {
        showLoading();
        
        if (isEditing && currentEditId) {
            await updateNews(currentEditId, formData);
            showToast('Article updated successfully!');
        } else {
            await createNews(formData);
            showToast('Article created successfully!');
        }
        
        hideNewsForm();
        await loadNews();
        
    } catch (error) {
        console.error('Error submitting form:', error);
    } finally {
        hideLoading();
    }
}

async function editArticle(articleId) {
    try {
        showLoading();
        const article = await fetchNewsById(articleId);
        if (article) {
            showNewsForm({ ...article, id: articleId });
        }
    } catch (error) {
        console.error('Error loading article for editing:', error);
    } finally {
        hideLoading();
    }
}

async function deleteArticle(articleId) {
    if (!confirm('Are you sure you want to delete this article?')) {
        return;
    }

    try {
        showLoading();
        await deleteNews(articleId);
        showToast('Article deleted successfully!');
        await loadNews();
    } catch (error) {
        console.error('Error deleting article:', error);
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

// Service Worker Registration (Optional - for offline functionality)
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
