// Test API login and profile endpoints directly
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

async function testLoginAndProfile() {
    try {
        console.log('🔍 Testing login and profile API...\n');
        
        // Test with the known test user
        console.log('1. Testing login...');
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
            console.log('Token:', loginResult.data.token.substring(0, 20) + '...');
            
            // Test profile endpoint
            console.log('\n2. Testing profile...');
            const profileResult = await makeRequest('http://localhost:5000/api/users/profile', {
                headers: {
                    'Authorization': `Bearer ${loginResult.data.token}`
                }
            });
            
            console.log('Profile response:', profileResult);
            
            if (profileResult.status === 200) {
                console.log('✅ Profile API working');
                console.log('User data:', {
                    firstName: profileResult.data.firstName,
                    lastName: profileResult.data.lastName,
                    username: profileResult.data.username,
                    email: profileResult.data.email
                });
                
                // Test what the dashboard should show
                const displayName = profileResult.data.firstName || profileResult.data.username || 'User';
                console.log(`\n📋 Dashboard should show: "Welcome back, ${displayName}!"`);
            } else {
                console.log('❌ Profile API failed');
            }
        } else {
            console.log('❌ Login failed');
            
            // Try a different user
            console.log('\nTrying with Hazel user...');
            const hazelLogin = await makeRequest('http://localhost:5000/api/users/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: 'crce.hazel@gmail.com',
                    password: 'password123'
                })
            });
            
            console.log('Hazel login response:', hazelLogin);
        }
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

testLoginAndProfile();