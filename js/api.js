/**
 * API Client for Data Agents Backend
 * Handles all server communication
 */

const API = {
    // Configuration
    // Use relative path since frontend and backend are now served from same origin
    BASE_URL: '',

    // Get auth token from localStorage
    getToken() {
        return localStorage.getItem('dataAgentsToken');
    },

    // Set auth token
    setToken(token) {
        localStorage.setItem('dataAgentsToken', token);
    },

    // Clear auth token
    clearToken() {
        localStorage.removeItem('dataAgentsToken');
    },

    // Get current user info
    getUser() {
        const userStr = localStorage.getItem('dataAgentsUser');
        return userStr ? JSON.parse(userStr) : null;
    },

    // Set current user info
    setUser(user) {
        localStorage.setItem('dataAgentsUser', JSON.stringify(user));
    },

    // Clear user info
    clearUser() {
        localStorage.removeItem('dataAgentsUser');
    },

    // Generic API request
    async request(endpoint, options = {}) {
        const url = `${this.BASE_URL}${endpoint}`;
        const token = this.getToken();

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        // Add auth token if available
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    },

    // Check if server is online
    async checkServer() {
        try {
            await this.request('/health');
            return true;
        } catch {
            return false;
        }
    },

    // ==================== AUTH ENDPOINTS ====================

    async register(username, email, password) {
        return await this.request('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password })
        });
    },

    async login(username, password) {
        const data = await this.request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        // Save token and user info
        if (data.access_token) {
            this.setToken(data.access_token);
            this.setUser(data.user);
        }

        return data;
    },

    async logout() {
        this.clearToken();
        this.clearUser();
    },

    async getProfile() {
        return await this.request('/api/auth/profile');
    },

    async checkAuth() {
        try {
            return await this.request('/api/auth/check');
        } catch {
            return { authenticated: false };
        }
    },

    // ==================== SAVE ENDPOINTS ====================

    async listSaves() {
        return await this.request('/api/saves');
    },

    async getSave(saveId) {
        return await this.request(`/api/saves/${saveId}`);
    },

    async createSave(saveData) {
        return await this.request('/api/saves', {
            method: 'POST',
            body: JSON.stringify(saveData)
        });
    },

    async updateSave(saveId, saveData) {
        return await this.request(`/api/saves/${saveId}`, {
            method: 'PUT',
            body: JSON.stringify(saveData)
        });
    },

    async deleteSave(saveId) {
        return await this.request(`/api/saves/${saveId}`, {
            method: 'DELETE'
        });
    },

    // ==================== LEADERBOARD ENDPOINTS ====================

    async getLeaderboard(sortBy = 'score', limit = 100) {
        return await this.request(`/api/leaderboard?sort_by=${sortBy}&limit=${limit}`);
    },

    async submitScore(scoreData) {
        return await this.request('/api/leaderboard', {
            method: 'POST',
            body: JSON.stringify(scoreData)
        });
    },

    async getUserRank(userId) {
        return await this.request(`/api/leaderboard/user/${userId}`);
    },

    async getLeaderboardStats() {
        return await this.request('/api/leaderboard/stats');
    },

    // ==================== HELPER METHODS ====================

    isLoggedIn() {
        return !!this.getToken();
    },

    getCurrentUsername() {
        const user = this.getUser();
        return user ? user.username : null;
    },

    getCurrentUserId() {
        const user = this.getUser();
        return user ? user.id : null;
    }
};
