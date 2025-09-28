// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';

// API Helper Class
class GigCampusAPI {
    constructor() {
        this.baseURL = API_BASE_URL;
        this.token = localStorage.getItem('authToken');
    }

    // Set authentication token
    setToken(token) {
        this.token = token;
        localStorage.setItem('authToken', token);
    }

    // Remove authentication token
    clearToken() {
        this.token = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('userInfo');
    }

    // Get authentication headers
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        return headers;
    }

    // Generic API request method
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: this.getHeaders(),
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Authentication Methods
    async register(userData) {
        return this.request('/users/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    async login(credentials) {
        const response = await this.request('/users/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
        
        if (response.token) {
            this.setToken(response.token);
            
            // Also store user info for dashboard
            if (response.user) {
                localStorage.setItem('userInfo', JSON.stringify(response.user));
                console.log('✅ Stored user info in localStorage:', response.user);
            }
        }
        
        return response;
    }

    async logout() {
        this.clearToken();
        // Redirect to home page
        window.location.href = '/templates/index.html';
    }

    // User Profile Methods
    async getProfile() {
        return this.request('/users/me');
    }

    async getUserStats() {
        return this.request('/users/me/stats');
    }

    async updateProfile(profileData) {
        return this.request('/users/me', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
    }

    // Project Methods
    async getProjects(filters = {}) {
        const queryParams = new URLSearchParams(filters);
        return this.request(`/projects?${queryParams}`);
    }

    async getProject(id) {
        return this.request(`/projects/${id}`);
    }

    async createProject(projectData) {
        return this.request('/projects', {
            method: 'POST',
            body: JSON.stringify(projectData)
        });
    }

    async updateProject(id, projectData) {
        return this.request(`/projects/${id}`, {
            method: 'PUT',
            body: JSON.stringify(projectData)
        });
    }

    async deleteProject(id) {
        return this.request(`/projects/${id}`, {
            method: 'DELETE'
        });
    }

    // Bid Methods
    async createBid(bidData) {
        return this.request('/bids', {
            method: 'POST',
            body: JSON.stringify(bidData)
        });
    }

    async getProjectBids(projectId) {
        return this.request(`/bids/project/${projectId}`);
    }

    async getMyBids() {
        return this.request('/bids/my-bids');
    }

    // Message Methods
    async sendMessage(messageData) {
        return this.request('/messages', {
            method: 'POST',
            body: JSON.stringify(messageData)
        });
    }

    async getProjectMessages(projectId) {
        return this.request(`/messages/project/${projectId}`);
    }

    async getConversations() {
        return this.request('/messages/conversations');
    }

    // Rating Methods
    async createRating(ratingData) {
        return this.request('/ratings', {
            method: 'POST',
            body: JSON.stringify(ratingData)
        });
    }

    async getUserRatings(userId) {
        return this.request(`/ratings/user/${userId}`);
    }

    // Utility Methods
    async healthCheck() {
        return this.request('/health');
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.token;
    }

    // Get user data from token (basic decode - for demo purposes)
    getCurrentUser() {
        if (!this.token) return null;
        
        try {
            // Basic JWT decode (in production, verify signature)
            const payload = JSON.parse(atob(this.token.split('.')[1]));
            return payload;
        } catch (error) {
            console.error('Error decoding token:', error);
            this.clearToken();
            return null;
        }
    }
}

// Create global API instance
const api = new GigCampusAPI();

// Global error handler for unauthorized requests
window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.message && event.reason.message.includes('401')) {
        // Token expired or invalid
        api.clearToken();
        showNotification('Session expired. Please sign in again.', 'error');
        setTimeout(() => {
            window.location.href = '/templates/signin.html';
        }, 2000);
    }
});

// Notification system
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button class="notification-close">&times;</button>
    `;

    // Add styles if not already present
    if (!document.querySelector('#notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 8px;
                color: white;
                font-weight: 500;
                z-index: 10000;
                display: flex;
                align-items: center;
                gap: 10px;
                min-width: 300px;
                animation: slideIn 0.3s ease;
            }
            
            .notification-info { background: #3b82f6; }
            .notification-success { background: #10b981; }
            .notification-error { background: #ef4444; }
            .notification-warning { background: #f59e0b; }
            
            .notification-close {
                background: none;
                border: none;
                color: white;
                font-size: 18px;
                cursor: pointer;
                padding: 0;
                margin-left: auto;
            }
            
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(styles);
    }

    // Add notification to DOM
    document.body.appendChild(notification);

    // Add close functionality
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => notification.remove());

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// Loading spinner utility
function showLoading(show = true) {
    let loader = document.querySelector('.loading-spinner');
    
    if (show && !loader) {
        loader = document.createElement('div');
        loader.className = 'loading-spinner';
        loader.innerHTML = '<div class="spinner"></div>';
        
        // Add spinner styles if not present
        if (!document.querySelector('#spinner-styles')) {
            const styles = document.createElement('style');
            styles.id = 'spinner-styles';
            styles.textContent = `
                .loading-spinner {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10001;
                }
                
                .spinner {
                    width: 50px;
                    height: 50px;
                    border: 5px solid #f3f3f3;
                    border-top: 5px solid #6366f1;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(styles);
        }
        
        document.body.appendChild(loader);
    } else if (!show && loader) {
        loader.remove();
    }
}

// Export API instance for use in other files
window.GigCampusAPI = api;