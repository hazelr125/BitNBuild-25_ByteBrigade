// Mobile Navigation Toggle
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
});

// Smooth Scrolling for Navigation Links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Navbar Background on Scroll
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.style.background = 'rgba(255, 255, 255, 0.98)';
        navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
    } else {
        navbar.style.background = 'rgba(255, 255, 255, 0.95)';
        navbar.style.boxShadow = 'none';
    }
});

// Intersection Observer for Animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe elements for animation
document.addEventListener('DOMContentLoaded', () => {
    const animatedElements = document.querySelectorAll('.service-card, .feature-item, .testimonial-card');
    
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
});

// Counter Animation for Stats
function animateCounter(element, target, duration = 2000) {
    let start = 0;
    const increment = target / (duration / 16);
    
    function updateCounter() {
        start += increment;
        if (start < target) {
            element.textContent = Math.floor(start);
            requestAnimationFrame(updateCounter);
        } else {
            element.textContent = target;
        }
    }
    
    updateCounter();
}

// Animate stats when they come into view
const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const statNumbers = entry.target.querySelectorAll('.stat h3');
            statNumbers.forEach(stat => {
                const target = parseInt(stat.textContent.replace(/[^\d]/g, ''));
                const suffix = stat.textContent.replace(/[\d]/g, '');
                animateCounter(stat, target);
                stat.textContent = target + suffix;
            });
            statsObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

const heroStats = document.querySelector('.hero-stats');
if (heroStats) {
    statsObserver.observe(heroStats);
}

// Parallax Effect for Hero Section
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const heroGraphic = document.querySelector('.hero-graphic');
    
    if (heroGraphic) {
        heroGraphic.style.transform = `translateY(${scrolled * 0.1}px)`;
    }
});

// Form Validation (if forms are added later)
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Loading Animation
window.addEventListener('load', () => {
    document.body.classList.add('loaded');
});

// Add loading styles
const style = document.createElement('style');
style.textContent = `
    body:not(.loaded) {
        overflow: hidden;
    }
    
    body:not(.loaded)::before {
        content: '';
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    body:not(.loaded)::after {
        content: 'GigCampus';
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: white;
        font-size: 2rem;
        font-weight: 700;
        z-index: 10000;
    }
`;
document.head.appendChild(style);

// Advanced Search Functionality
document.addEventListener('DOMContentLoaded', function() {
    // Search form handling
    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            performSearch();
        });
    }

    // Filter handling
    const filterInputs = document.querySelectorAll('#categoryFilter, #priceFilter, #ratingFilter, #locationFilter, #availabilityFilter');
    filterInputs.forEach(input => {
        input.addEventListener('change', performSearch);
    });

    // Clear filters
    const clearFiltersBtn = document.getElementById('clearFilters');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearFilters);
    }

    // Sort handling
    const sortSelect = document.getElementById('sortBy');
    if (sortSelect) {
        sortSelect.addEventListener('change', performSort);
    }
});

function performSearch() {
    const searchQuery = document.getElementById('searchQuery').value.toLowerCase();
    const category = document.getElementById('categoryFilter').value;
    const price = document.getElementById('priceFilter').value;
    const rating = document.getElementById('ratingFilter').value;
    const location = document.getElementById('locationFilter').value;
    
    const resultCards = document.querySelectorAll('.result-card');
    let visibleCount = 0;
    
    resultCards.forEach(card => {
        const cardCategory = card.dataset.category;
        const cardPrice = parseInt(card.dataset.price);
        const cardRating = parseFloat(card.dataset.rating);
        const cardLocation = card.dataset.location;
        const cardText = card.textContent.toLowerCase();
        
        let show = true;
        
        // Text search
        if (searchQuery && !cardText.includes(searchQuery)) {
            show = false;
        }
        
        // Category filter
        if (category && cardCategory !== category) {
            show = false;
        }
        
        // Price filter
        if (price) {
            const [min, max] = price.split('-').map(p => p === '+' ? Infinity : parseInt(p));
            if (cardPrice < min || (max !== Infinity && cardPrice > max)) {
                show = false;
            }
        }
        
        // Rating filter
        if (rating && cardRating < parseFloat(rating)) {
            show = false;
        }
        
        // Location filter
        if (location && location !== 'online' && cardLocation !== location) {
            show = false;
        }
        
        card.style.display = show ? 'block' : 'none';
        if (show) visibleCount++;
    });
    
    // Update results count
    const resultsCount = document.getElementById('resultsCount');
    if (resultsCount) {
        resultsCount.textContent = `Showing ${visibleCount} services`;
    }
}

function clearFilters() {
    document.getElementById('searchQuery').value = '';
    document.getElementById('categoryFilter').value = '';
    document.getElementById('priceFilter').value = '';
    document.getElementById('ratingFilter').value = '';
    document.getElementById('locationFilter').value = '';
    document.getElementById('availabilityFilter').value = '';
    performSearch();
}

function performSort() {
    const sortBy = document.getElementById('sortBy').value;
    const resultsGrid = document.querySelector('.results-grid');
    const resultCards = Array.from(document.querySelectorAll('.result-card'));
    
    resultCards.sort((a, b) => {
        switch(sortBy) {
            case 'price-low':
                return parseInt(a.dataset.price) - parseInt(b.dataset.price);
            case 'price-high':
                return parseInt(b.dataset.price) - parseInt(a.dataset.price);
            case 'rating':
                return parseFloat(b.dataset.rating) - parseFloat(a.dataset.rating);
            case 'newest':
                return Math.random() - 0.5; // Random for demo
            default:
                return 0;
        }
    });
    
    resultCards.forEach(card => resultsGrid.appendChild(card));
}

// Chat Functionality
document.addEventListener('DOMContentLoaded', function() {
    // Conversation switching
    const conversationItems = document.querySelectorAll('.conversation-item');
    conversationItems.forEach(item => {
        item.addEventListener('click', function() {
            // Remove active class from all items
            conversationItems.forEach(i => i.classList.remove('active'));
            // Add active class to clicked item
            this.classList.add('active');
            
            // Update chat header with selected user
            const userName = this.querySelector('h4').textContent;
            const chatUserDetails = document.querySelector('.chat-user-details h3');
            if (chatUserDetails) {
                chatUserDetails.textContent = userName;
            }
        });
    });

    // Message sending
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    
    if (messageInput && sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
});

function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    
    if (message) {
        addMessage(message, 'sent');
        messageInput.value = '';
        
        // Simulate response after 1 second
        setTimeout(() => {
            const responses = [
                "Thanks for the message!",
                "I'll get back to you soon.",
                "That sounds great!",
                "Let me check my schedule.",
                "Perfect timing!"
            ];
            const randomResponse = responses[Math.floor(Math.random() * responses.length)];
            addMessage(randomResponse, 'received');
        }, 1000);
    }
}

function addMessage(text, type) {
    const chatMessages = document.getElementById('chatMessages');
    const messageGroup = chatMessages.querySelector('.message-group');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    if (type === 'sent') {
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-bubble">
                    <p>${text}</p>
                </div>
                <div class="message-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
            </div>
        `;
    } else {
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <div class="avatar-placeholder">
                    <i class="fas fa-user"></i>
                </div>
            </div>
            <div class="message-content">
                <div class="message-bubble">
                    <p>${text}</p>
                </div>
                <div class="message-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
            </div>
        `;
    }
    
    messageGroup.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Payment Form Handling
document.addEventListener('DOMContentLoaded', function() {
    const paymentForm = document.getElementById('paymentForm');
    if (paymentForm) {
        paymentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            processPayment();
        });
    }

    // Payment method switching
    const paymentMethods = document.querySelectorAll('input[name="paymentMethod"]');
    paymentMethods.forEach(method => {
        method.addEventListener('change', function() {
            updatePaymentDetails(this.value);
        });
    });
});

function updatePaymentDetails(method) {
    // Hide all payment details
    const allDetails = document.querySelectorAll('.payment-details');
    allDetails.forEach(detail => detail.style.display = 'none');
    
    // Show relevant details
    if (method === 'upi') {
        document.getElementById('upiDetails').style.display = 'block';
    } else if (method === 'card') {
        document.getElementById('cardDetails').style.display = 'block';
    }
}

function processPayment() {
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
    
    // Show loading state
    const paymentBtn = document.querySelector('.payment-btn');
    const originalText = paymentBtn.innerHTML;
    paymentBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    paymentBtn.disabled = true;
    
    // Simulate payment processing
    setTimeout(() => {
        // Show success message
        alert('Payment successful! You will be redirected to your dashboard.');
        window.location.href = 'dashboard.html';
    }, 2000);
}

// Dashboard Statistics Animation
document.addEventListener('DOMContentLoaded', function() {
    const statNumbers = document.querySelectorAll('.stat-content h3');
    
    statNumbers.forEach(stat => {
        const target = parseInt(stat.textContent.replace(/[^\d]/g, ''));
        const suffix = stat.textContent.replace(/[\d]/g, '');
        
        if (target) {
            animateCounter(stat, target, suffix);
        }
    });
});

function animateCounter(element, target, suffix = '') {
    let current = 0;
    const increment = target / 50;
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        element.textContent = Math.floor(current) + suffix;
    }, 30);
}

// Mobile Responsiveness Enhancements
function handleMobileLayout() {
    const isMobile = window.innerWidth <= 768;
    
    // Dashboard grid adjustment
    const dashboardGrid = document.querySelector('.dashboard-grid');
    if (dashboardGrid) {
        if (isMobile) {
            dashboardGrid.style.gridTemplateColumns = '1fr';
        } else {
            dashboardGrid.style.gridTemplateColumns = '250px 1fr';
        }
    }
    
    // Chat container adjustment
    const chatContainer = document.querySelector('.chat-container');
    if (chatContainer) {
        if (isMobile) {
            chatContainer.style.gridTemplateColumns = '1fr';
            chatContainer.style.height = 'calc(100vh - 80px)';
        } else {
            chatContainer.style.gridTemplateColumns = '350px 1fr';
            chatContainer.style.height = 'calc(100vh - 120px)';
        }
    }
    
    // Payment grid adjustment
    const paymentGrid = document.querySelector('.payment-grid');
    if (paymentGrid) {
        if (isMobile) {
            paymentGrid.style.gridTemplateColumns = '1fr';
        } else {
            paymentGrid.style.gridTemplateColumns = '1fr 1fr';
        }
    }
}

// Initialize mobile layout
handleMobileLayout();
window.addEventListener('resize', handleMobileLayout);

// Enhanced Mobile Navigation
document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
        
        // Close menu when clicking on links
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }
});

// Dashboard Image Loading and Layout Fixes
document.addEventListener('DOMContentLoaded', function() {
    // Fix avatar placeholders
    const avatarPlaceholders = document.querySelectorAll('.avatar-placeholder');
    avatarPlaceholders.forEach(placeholder => {
        if (!placeholder.querySelector('img')) {
            placeholder.innerHTML = '<i class="fas fa-user"></i>';
        }
    });
    
    // Fix image placeholders
    const imagePlaceholders = document.querySelectorAll('.image-placeholder');
    imagePlaceholders.forEach(placeholder => {
        if (!placeholder.querySelector('img')) {
            placeholder.innerHTML = '<i class="fas fa-image"></i>';
        }
    });
    
    // Fix cover placeholders
    const coverPlaceholders = document.querySelectorAll('.cover-placeholder');
    coverPlaceholders.forEach(placeholder => {
        if (!placeholder.querySelector('img')) {
            placeholder.innerHTML = '<i class="fas fa-image"></i>';
        }
    });
    
    // Dashboard tab functionality
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const targetTab = this.dataset.tab;
            
            // Remove active class from all tabs and contents
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            this.classList.add('active');
            const targetContent = document.getElementById(targetTab);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
    
    // Dashboard filter functionality
    const filterTabs = document.querySelectorAll('.filter-tab');
    filterTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const filter = this.dataset.filter;
            
            // Remove active class from all filter tabs
            filterTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Filter items based on data attribute
            const items = document.querySelectorAll('[data-status]');
            items.forEach(item => {
                if (filter === 'all' || item.dataset.status === filter) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    });
});

// Add mobile navigation styles
const mobileNavStyle = document.createElement('style');
mobileNavStyle.textContent = `
    @media (max-width: 768px) {
        .nav-menu.active {
            display: flex;
            position: fixed;
            top: 70px;
            left: 0;
            width: 100%;
            background: white;
            flex-direction: column;
            padding: 2rem;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            z-index: 1000;
        }
        
        .hamburger.active span:nth-child(1) {
            transform: rotate(45deg) translate(5px, 5px);
        }
        
        .hamburger.active span:nth-child(2) {
            opacity: 0;
        }
        
        .hamburger.active span:nth-child(3) {
            transform: rotate(-45deg) translate(7px, -6px);
        }
    }
`;
document.head.appendChild(mobileNavStyle);