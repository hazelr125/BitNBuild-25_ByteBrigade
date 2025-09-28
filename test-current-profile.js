// Test current login and profile directly
const https = require('https');
const http = require('http');

function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const client = urlObj.protocol === 'https:' ? https : http;
        
        const req = client.request({
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: options.headers || {}
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve({ status: res.statusCode, data: jsonData });
                } catch (error) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });
        
        req.on('error', reject);
        
        if (options.body) {
            req.write(options.body);
        }
        
        req.end();
    });
}

async function testCurrentProfile() {
    try {
        console.log('🔍 Testing current profile API...\n');
        
        // First, try to login with our test user
        console.log('1. Logging in with test user...');
        const loginResult = await makeRequest('http://localhost:5000/api/users/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'dashboard@test.com',
                password: 'test123'
            })
        });
        
        console.log('Login response:', loginResult);
        
        if (loginResult.status === 200 && loginResult.data.token) {
            console.log('✅ Login successful');
            console.log('User data from login:', loginResult.data.user);
            
            // Test profile endpoint
            console.log('\n2. Testing profile endpoint...');
            const profileResult = await makeRequest('http://localhost:5000/api/users/profile', {
                headers: {
                    'Authorization': `Bearer ${loginResult.data.token}`
                }
            });
            
            console.log('Profile response:', profileResult);
            
            if (profileResult.status === 200) {
                console.log('\n✅ Profile data:');
                console.log('   firstName:', profileResult.data.firstName);
                console.log('   lastName:', profileResult.data.lastName);
                console.log('   username:', profileResult.data.username);
                console.log('   email:', profileResult.data.email);
                
                const fullName = `${profileResult.data.firstName} ${profileResult.data.lastName}`.trim();
                console.log(`\n📋 Dashboard should show: "Welcome back, ${fullName}!"`);
                console.log(`📋 Navigation should show: "${fullName}"`);
            }
        } else {
            console.log('❌ Login failed:', loginResult.data);
        }
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

testCurrentProfile();