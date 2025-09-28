// Authentication Handler
class AuthHandler {
    constructor() {
        this.init();
    }

    init() {
        // Handle sign-in form
        const signinForm = document.getElementById('signinForm');
        if (signinForm) {
            signinForm.addEventListener('submit', (e) => this.handleSignIn(e));
        }

        // Handle sign-up form  
        const signupForm = document.getElementById('signupForm');
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => this.handleSignUp(e));
        }

        // Handle logout buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('.logout-btn, [data-action="logout"]')) {
                e.preventDefault();
                this.handleLogout();
            }
        });

        // Check authentication status on page load
        this.checkAuthStatus();
    }

    async handleSignIn(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        
        const credentials = {
            email: formData.get('email'),
            password: formData.get('password')
        };

        // Validate form data
        if (!this.validateSignInForm(credentials)) {
            return;
        }

        try {
            showLoading(true);
            
            const response = await api.login(credentials);
            
            showLoading(false);
            showNotification('Sign in successful!', 'success');
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = '/templates/dashboard.html';
            }, 1000);
            
        } catch (error) {
            showLoading(false);
            showNotification(error.message || 'Sign in failed', 'error');
        }
    }

    async handleSignUp(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        
        const userData = {
            username: formData.get('email').split('@')[0], // Generate username from email
            email: formData.get('email'),
            password: formData.get('password'),
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            university: formData.get('university'),
            course: formData.get('major'),
            isStudent: true
        };

        // Validate form data
        if (!this.validateSignUpForm(formData)) {
            return;
        }

        try {
            showLoading(true);
            
            const response = await api.register(userData);
            
            showLoading(false);
            showNotification('Account created successfully!', 'success');
            
            // Auto-login after registration
            if (response.user) {
                const loginResponse = await api.login({
                    email: userData.email,
                    password: userData.password
                });
                
                // Redirect to dashboard
                setTimeout(() => {
                    window.location.href = '/templates/dashboard.html';
                }, 1000);
            } else {
                // Redirect to sign in page
                setTimeout(() => {
                    window.location.href = '/templates/signin.html';
                }, 2000);
            }
            
        } catch (error) {
            showLoading(false);
            showNotification(error.message || 'Registration failed', 'error');
        }
    }

    async handleLogout() {
        try {
            await api.logout();
            showNotification('Signed out successfully', 'success');
        } catch (error) {
            console.error('Logout error:', error);
            // Force logout even if API call fails
            api.clearToken();
            window.location.href = '/templates/index.html';
        }
    }

    validateSignInForm(credentials) {
        if (!credentials.email) {
            showNotification('Email is required', 'error');
            return false;
        }

        if (!this.isValidEmail(credentials.email)) {
            showNotification('Please enter a valid email address', 'error');
            return false;
        }

        if (!credentials.password) {
            showNotification('Password is required', 'error');
            return false;
        }

        return true;
    }

    validateSignUpForm(formData) {
        const email = formData.get('email');
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');
        const firstName = formData.get('firstName');
        const lastName = formData.get('lastName');
        const university = formData.get('university');
        const major = formData.get('major');
        const terms = formData.get('terms');

        if (!firstName || !lastName) {
            showNotification('First name and last name are required', 'error');
            return false;
        }

        if (!email) {
            showNotification('Email is required', 'error');
            return false;
        }

        if (!this.isValidEmail(email)) {
            showNotification('Please enter a valid email address', 'error');
            return false;
        }

        if (!university) {
            showNotification('Please select your university', 'error');
            return false;
        }

        if (!major) {
            showNotification('Major/Field of study is required', 'error');
            return false;
        }

        if (!password) {
            showNotification('Password is required', 'error');
            return false;
        }

        if (password.length < 6) {
            showNotification('Password must be at least 6 characters long', 'error');
            return false;
        }

        if (password !== confirmPassword) {
            showNotification('Passwords do not match', 'error');
            return false;
        }

        if (!terms) {
            showNotification('Please accept the terms of service', 'error');
            return false;
        }

        return true;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    checkAuthStatus() {
        const isAuthenticated = api.isAuthenticated();
        const currentPath = window.location.pathname;
        
        // Redirect authenticated users away from auth pages
        if (isAuthenticated && (currentPath.includes('signin') || currentPath.includes('getstarted'))) {
            window.location.href = '/templates/dashboard.html';
            return;
        }
        
        // Redirect non-authenticated users to sign in for protected pages
        const protectedPages = ['dashboard', 'profile', 'my-services', 'bookings', 'earnings', 'settings'];
        const isProtectedPage = protectedPages.some(page => currentPath.includes(page));
        
        if (!isAuthenticated && isProtectedPage) {
            showNotification('Please sign in to access this page', 'warning');
            setTimeout(() => {
                window.location.href = '/templates/signin.html';
            }, 2000);
            return;
        }

        // Update navigation for authenticated users
        if (isAuthenticated) {
            this.updateNavigation();
        }
    }

    updateNavigation() {
        const navButtons = document.querySelector('.nav-buttons');
        if (!navButtons) return;

        // Get user info from localStorage (stored during login)
        let userName = 'User';
        try {
            const cachedUserInfo = localStorage.getItem('userInfo');
            if (cachedUserInfo) {
                const userInfo = JSON.parse(cachedUserInfo);
                // Build full name from firstName + lastName
                const firstName = userInfo.firstName || userInfo.first_name || '';
                const lastName = userInfo.lastName || userInfo.last_name || '';
                
                if (firstName && lastName) {
                    userName = `${firstName} ${lastName}`.trim();
                } else if (firstName) {
                    userName = firstName;
                } else if (userInfo.username) {
                    userName = userInfo.username;
                } else {
                    userName = 'User';
                }
                
                console.log('✅ Navigation user name set to:', userName);
            }
        } catch (error) {
            console.log('Could not get cached user info:', error);
        }

        navButtons.innerHTML = `
            <div class="user-menu">
                <button class="user-menu-btn">
                    <i class="fas fa-user-circle"></i>
                    <span>${userName}</span>
                    <i class="fas fa-chevron-down"></i>
                </button>
                <div class="user-dropdown">
                    <a href="/templates/dashboard.html"><i class="fas fa-tachometer-alt"></i> Dashboard</a>
                    <a href="/templates/profile.html"><i class="fas fa-user"></i> Profile</a>
                    <a href="/templates/my-services.html"><i class="fas fa-briefcase"></i> My Services</a>
                    <a href="/templates/bookings.html"><i class="fas fa-calendar"></i> Bookings</a>
                    <a href="/templates/earnings.html"><i class="fas fa-dollar-sign"></i> Earnings</a>
                    <a href="/templates/settings.html"><i class="fas fa-cog"></i> Settings</a>
                    <hr>
                    <button class="logout-btn"><i class="fas fa-sign-out-alt"></i> Sign Out</button>
                </div>
            </div>
        `;

        // Add dropdown functionality
        this.setupUserMenu();
        this.addUserMenuStyles();
    }

    setupUserMenu() {
        const userMenuBtn = document.querySelector('.user-menu-btn');
        const userDropdown = document.querySelector('.user-dropdown');

        if (userMenuBtn && userDropdown) {
            userMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                userDropdown.classList.toggle('show');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', () => {
                userDropdown.classList.remove('show');
            });
        }
    }

    addUserMenuStyles() {
        if (document.querySelector('#user-menu-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'user-menu-styles';
        styles.textContent = `
            .user-menu {
                position: relative;
            }
            
            .user-menu-btn {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 16px;
                background: #6366f1;
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                transition: background 0.2s;
            }
            
            .user-menu-btn:hover {
                background: #5855eb;
            }
            
            .user-dropdown {
                position: absolute;
                top: 100%;
                right: 0;
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
                min-width: 200px;
                padding: 8px 0;
                opacity: 0;
                visibility: hidden;
                transform: translateY(-10px);
                transition: all 0.2s ease;
                z-index: 1000;
            }
            
            .user-dropdown.show {
                opacity: 1;
                visibility: visible;
                transform: translateY(0);
            }
            
            .user-dropdown a,
            .user-dropdown button {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 12px 16px;
                color: #374151;
                text-decoration: none;
                border: none;
                background: none;
                width: 100%;
                text-align: left;
                cursor: pointer;
                transition: background 0.2s;
            }
            
            .user-dropdown a:hover,
            .user-dropdown button:hover {
                background: #f3f4f6;
            }
            
            .user-dropdown hr {
                margin: 8px 0;
                border: none;
                border-top: 1px solid #e5e7eb;
            }
            
            .logout-btn {
                color: #dc2626 !important;
            }
        `;
        document.head.appendChild(styles);
    }
}

// Initialize authentication handler when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.authHandler = new AuthHandler();
});

// Export for use in other files
window.AuthHandler = AuthHandler;