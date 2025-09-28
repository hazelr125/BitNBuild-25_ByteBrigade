// Test script to verify services loading from index.html
console.log('🧪 Testing Services Page Loading...');

// Test 1: Direct API call
async function testAPIDirectly() {
    try {
        console.log('📡 Test 1: Direct API call...');
        const response = await fetch('http://localhost:5000/api/projects');
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ API Response OK:', data.projects?.length || 0, 'services');
            return true;
        } else {
            console.error('❌ API Response Failed:', response.status, response.statusText);
            return false;
        }
    } catch (error) {
        console.error('❌ API Call Error:', error.message);
        return false;
    }
}

// Test 2: Services page JavaScript functionality
async function testServicesPageJS() {
    try {
        console.log('🎯 Test 2: Services page JavaScript functionality...');
        
        // Navigate to services page
        window.location.href = '/services.html';
        
        // Wait for page load
        await new Promise(resolve => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });
        
        // Check if services grid exists
        const servicesGrid = document.getElementById('servicesGrid');
        if (servicesGrid) {
            console.log('✅ Services grid element found');
            
            // Wait for services to load (check after 2 seconds)
            setTimeout(() => {
                const serviceCards = servicesGrid.querySelectorAll('.service-card');
                if (serviceCards.length > 0) {
                    console.log('✅ Services loaded successfully:', serviceCards.length, 'service cards');
                } else {
                    console.warn('⚠️ No service cards found - check API loading');
                }
            }, 2000);
            
            return true;
        } else {
            console.error('❌ Services grid element not found');
            return false;
        }
    } catch (error) {
        console.error('❌ Services page test error:', error.message);
        return false;
    }
}

// Run tests
async function runTests() {
    console.log('🚀 Starting Services Loading Tests...\n');
    
    const apiTest = await testAPIDirectly();
    console.log('\n🔄 Running services page test in 3 seconds...');
    
    setTimeout(async () => {
        const pageTest = await testServicesPageJS();
        
        console.log('\n📊 Test Results:');
        console.log('API Direct Call:', apiTest ? '✅ PASS' : '❌ FAIL');
        console.log('Services Page Loading:', pageTest ? '✅ PASS' : '❌ FAIL');
        
        if (apiTest && pageTest) {
            console.log('\n🎉 All tests passed! Services loading is working correctly.');
        } else {
            console.log('\n⚠️ Some tests failed. Check CORS configuration and API connectivity.');
        }
    }, 3000);
}

// Auto-run tests
runTests();