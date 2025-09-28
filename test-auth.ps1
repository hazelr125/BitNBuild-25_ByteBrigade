# Test Registration and Login
# PowerShell script to test the GigCampus authentication system

Write-Host "Testing GigCampus Authentication System..." -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green

# Test 1: Health Check
Write-Host "`n1. Testing API Health..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri 'http://localhost:5000/api/health' -Method GET
    Write-Host "✅ API is healthy: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "❌ API health check failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: User Registration
Write-Host "`n2. Testing User Registration..." -ForegroundColor Yellow
$userData = @{
    username = "johndoe123"
    email = "john.doe@mit.edu"
    password = "securepass123"
    firstName = "John"
    lastName = "Doe"
    university = "MIT"
    course = "Computer Science"
    isStudent = $true
} | ConvertTo-Json

try {
    $registration = Invoke-RestMethod -Uri 'http://localhost:5000/api/users/register' -Method POST -Body $userData -ContentType 'application/json'
    Write-Host "✅ Registration successful!" -ForegroundColor Green
    Write-Host "   User ID: $($registration.user.id)" -ForegroundColor Cyan
    Write-Host "   Username: $($registration.user.username)" -ForegroundColor Cyan
    Write-Host "   Email: $($registration.user.email)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Registration failed: $($_.Exception.Message)" -ForegroundColor Red
    
    # Try to get more details from the response
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Response: $responseBody" -ForegroundColor Red
    }
}

# Test 3: User Login
Write-Host "`n3. Testing User Login..." -ForegroundColor Yellow
$loginData = @{
    email = "john.doe@mit.edu"
    password = "securepass123"
} | ConvertTo-Json

try {
    $login = Invoke-RestMethod -Uri 'http://localhost:5000/api/users/login' -Method POST -Body $loginData -ContentType 'application/json'
    Write-Host "✅ Login successful!" -ForegroundColor Green
    Write-Host "   Token received: $($login.token.Substring(0, 20))..." -ForegroundColor Cyan
    Write-Host "   User: $($login.user.first_name) $($login.user.last_name)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    
    # Try to get more details from the response
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Response: $responseBody" -ForegroundColor Red
    }
}

Write-Host "`n✨ Authentication test completed!" -ForegroundColor Green