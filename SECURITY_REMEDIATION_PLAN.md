# Security Remediation Plan

**Project**: Sapi3D  
**Date**: 2025-12-31  
**Total Issues**: 25 (5 Critical, 7 High, 8 Medium, 5 Low)  
**Risk Score**: 8.5/10 - **NOT PRODUCTION READY**

---

## 📋 Quick Reference Table

| # | Issue | Severity | File(s) | Est. Time |
|---|-------|----------|---------|-----------|
| 1 | Missing JWT Secret | 🔴 Critical | `.env.prod` | 5 min |
| 2 | Hardcoded DB Credentials | 🔴 Critical | `docker-compose.prod.yml` | 30 min |
| 3 | Database Port Exposed | 🔴 Critical | `docker-compose.prod.yml` | 5 min |
| 4 | API Docs in Production | 🔴 Critical | `backend/app/main.py` | 15 min |
| 5 | Hardcoded Frontend URL | 🔴 Critical | `frontend/src/services/api.js` | 10 min |
| 6 | No Rate Limiting | 🟡 High | Nginx/Backend | 1 hour |
| 7 | JWT Expiration Not Set | 🟡 High | `.env.prod` | 5 min |
| 8 | No HTTPS/TLS | 🟡 High | Nginx | 2 hours |
| 9 | CORS Localhost | 🟡 High | `.env.prod` | 5 min |
| 10 | No Security Headers | 🟡 High | `frontend/nginx.conf` | 30 min |
| 11 | Containers Run as Root | 🟡 High | `backend/Dockerfile` | 30 min |
| 12 | No Resource Limits | 🟡 High | `docker-compose.prod.yml` | 15 min |

**Total Critical/High Fix Time**: ~6 hours

---

## 🔴 CRITICAL FIXES (Do First)

### #1: Generate JWT Secret

**Problem**: JWT_SECRET missing from `.env.prod`

**Solution**:
```bash
# Generate a strong secret (32+ characters)
openssl rand -hex 32
# Output example: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0
```

**Update `.env.prod`**:
```bash
# Add these lines
JWT_SECRET=<your-generated-secret-here>
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=60
```

**Verification**:
```bash
# Check if secret is set
grep JWT_SECRET .env.prod
```

---

### #2: Implement Docker Secrets

**Problem**: Database password hardcoded in plain text

**Step 1: Create secrets directory**
```bash
mkdir -p .secrets
echo "your-strong-db-password-here" > .secrets/db_password.txt
echo "your-jwt-secret-here" > .secrets/jwt_secret.txt
chmod 600 .secrets/*
```

**Step 2: Update `.gitignore`**
```bash
echo ".secrets/" >> .gitignore
```

**Step 3: Update `docker-compose.prod.yml`**
```yaml
services:
  db:
    image: postgres:16-alpine
    container_name: sapi3d-db
    secrets:
      - db_password
    environment:
      POSTGRES_USER: sapi3d
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password  # Changed
      POSTGRES_DB: sapi3d
    # Remove ports mapping (see #3)
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - sapi3d-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: sapi3d-backend
    secrets:
      - db_password
      - jwt_secret
    environment:
      - DATABASE_URL=postgresql+asyncpg://sapi3d:$(cat /run/secrets/db_password)@db:5432/sapi3d
      - JWT_SECRET_FILE=/run/secrets/jwt_secret
    # ... rest of config

secrets:
  db_password:
    file: .secrets/db_password.txt
  jwt_secret:
    file: .secrets/jwt_secret.txt
```

**Step 4: Update `backend/app/core/config.py`**
```python
from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    # ... existing settings ...
    
    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Read from Docker secret if available
        jwt_secret_file = os.getenv("JWT_SECRET_FILE")
        if jwt_secret_file and os.path.exists(jwt_secret_file):
            with open(jwt_secret_file) as f:
                self.jwt_secret = f.read().strip()
        
        # Validate critical secrets
        if not self.jwt_secret:
            raise ValueError("JWT_SECRET must be set!")
```

---

### #3: Remove Database Port Exposure

**Problem**: PostgreSQL accessible from host

**Solution**: Remove port mapping in `docker-compose.prod.yml`
```yaml
services:
  db:
    image: postgres:16-alpine
    container_name: sapi3d-db
    # REMOVE THIS LINE:
    # ports:
    #   - "5432:5432"
    # Database now only accessible via internal Docker network
```

**Verification**:
```bash
# After restart, this should fail (good!)
psql -h localhost -U sapi3d -d sapi3d
# Connection should be refused
```

---

### #4: Disable API Docs in Production

**Problem**: Swagger UI exposed in production

**Solution**: Update `backend/app/main.py`
```python
from core.config import settings

# Conditionally set docs URLs
docs_url = "/docs" if settings.debug else None
redoc_url = "/redoc" if settings.debug else None
openapi_url = "/openapi.json" if settings.debug else None

app = FastAPI(
    lifespan=lifespan,
    title=settings.api_title,
    version=settings.api_version,
    description=settings.api_description,
    docs_url=docs_url,      # None in production
    redoc_url=redoc_url,    # None in production
    openapi_url=openapi_url, # None in production
)
```

**Update `backend/app/core/config.py`**:
```python
class Settings(BaseSettings):
    # Add debug flag
    debug: bool = False  # Default to False for safety
```

**Update `.env.prod`**:
```bash
DEBUG=false
```

**Verification**:
```bash
# Should return 404 in production
curl http://localhost:8000/docs
curl http://localhost:8000/redoc
```

---

### #5: Fix Hardcoded Frontend URL

**Problem**: Frontend uses hardcoded localhost URL

**Solution**: Update `frontend/src/services/api.js`
```javascript
import axios from "axios";

// Use environment variable instead of hardcoded URL
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
});

// Token interceptor (keep as is)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

**Update `.env.prod`** (already exists, verify):
```bash
VITE_API_URL=http://localhost:8000  # Change to production URL when deploying
```

**For production deployment**, update to actual domain:
```bash
VITE_API_URL=https://api.yourdomain.com
```

---

## 🟡 HIGH PRIORITY FIXES

### #6: Add Rate Limiting

**Option A: Nginx Rate Limiting (Recommended)**

Create `nginx/nginx.conf`:
```nginx
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/m;

server {
    listen 80;
    server_name localhost;
    
    # Auth endpoints - strict limit
    location ~ ^/api/(auth|login|register) {
        limit_req zone=auth_limit burst=10 nodelay;
        proxy_pass http://backend:8000;
        # ... proxy headers ...
    }
    
    # General API - moderate limit
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://backend:8000/;
        # ... proxy headers ...
    }
}
```

**Option B: FastAPI Middleware**

Install slowapi:
```bash
# Add to backend/pyproject.toml
dependencies = [
    # ... existing ...
    "slowapi>=0.1.9",
]
```

Update `backend/app/main.py`:
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Apply to auth endpoints
@app.post("/auth/login")
@limiter.limit("5/minute")
async def login(...):
    ...
```

---

### #7: Set JWT Expiration

**Already covered in #1**, but verify:

`.env.prod`:
```bash
JWT_EXPIRE_MINUTES=60  # Tokens expire after 1 hour
```

Consider adding refresh token mechanism for better UX.

---

### #8: Add HTTPS/TLS

**Step 1: Create Nginx reverse proxy**

Create `nginx/Dockerfile`:
```dockerfile
FROM nginx:alpine

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy SSL certificates (when available)
# COPY certs/ /etc/nginx/certs/

EXPOSE 80 443
```

Create `nginx/nginx.conf`:
```nginx
# HTTP server - redirect to HTTPS
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    # SSL certificates
    ssl_certificate /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Security headers (see #10)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Frontend
    location / {
        proxy_pass http://frontend:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://backend:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Step 2: Update `docker-compose.prod.yml`**
```yaml
services:
  nginx:
    build:
      context: ./nginx
      dockerfile: Dockerfile
    container_name: sapi3d-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/certs:/etc/nginx/certs:ro
    depends_on:
      - backend
      - frontend
    networks:
      - sapi3d-network
    restart: unless-stopped

  backend:
    # Remove ports exposure
    # ports:
    #   - "8000:8000"
    
  frontend:
    # Already internal (port 80 inside container)
```

**Step 3: Obtain SSL Certificate**

Using Let's Encrypt:
```bash
# Install certbot
sudo apt-get install certbot

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com

# Copy to nginx/certs/
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/certs/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/certs/
```

---

### #9: Update CORS for Production

**Update `.env.prod`**:
```bash
# Replace localhost with actual domain
CORS_ORIGINS=["https://yourdomain.com"]
```

**For multiple domains**:
```bash
CORS_ORIGINS=["https://yourdomain.com","https://www.yourdomain.com"]
```

---

### #10: Add Security Headers

**Update `frontend/nginx.conf`**:
```nginx
server {
    listen 80;
    server_name localhost;
    
    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' http://localhost:8000;" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
    
    # Serve React app
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
        
        # Cache control
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
    
    # Proxy API requests
    location /api/ {
        proxy_pass http://backend:8000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 90;
        
        # Request size limit
        client_max_body_size 10M;
    }
}
```

**Test headers**:
```bash
curl -I https://yourdomain.com
# Should see all security headers
```

---

### #11: Run Containers as Non-Root

**Update `backend/Dockerfile`**:
```dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies and UV
RUN apt-get update && apt-get install -y curl \
    && rm -rf /var/lib/apt/lists/* \
    && curl -LsSf https://astral.sh/uv/install.sh | sh

ENV PATH="/root/.local/bin:$PATH"

# Copy and install dependencies
COPY pyproject.toml .
RUN uv pip install --system -r pyproject.toml 

# Copy application code
COPY app/ ./
COPY tests/ ./tests/
COPY static/ ./static/

# Create non-root user
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Verify**:
```bash
# Check user inside container
docker exec sapi3d-backend whoami
# Should output: appuser
```

---

### #12: Add Resource Limits

**Update `docker-compose.prod.yml`**:
```yaml
services:
  db:
    image: postgres:16-alpine
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
    restart: unless-stopped

  backend:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
    restart: unless-stopped

  frontend:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
    restart: unless-stopped
```

---

## 🟢 MEDIUM PRIORITY FIXES

### #13: Strengthen Password Policy
Add validation in `backend/app/schemas/user.py`:
```python
from pydantic import field_validator
import re

class UserCreate(BaseModel):
    password: str = Field(..., min_length=12, max_length=100)
    
    @field_validator('password')
    def validate_password_strength(cls, v):
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain digit')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain special character')
        return v
```

### #14: Account Lockout
Implement failed login tracking (requires new database table or Redis).

### #15: Implement CSRF Protection

**Problem**: No CSRF protection for state-changing operations

**Impact**: Application vulnerable to Cross-Site Request Forgery attacks

**Solution**: Add CSRF protection middleware

**Option A: FastAPI CSRF Middleware (Recommended)**

Install dependency:
```bash
# Add to backend/pyproject.toml
dependencies = [
    # ... existing ...
    "fastapi-csrf-protect>=0.3.0",
]
```

Update `backend/app/main.py`:
```python
from fastapi_csrf_protect import CsrfProtect
from fastapi_csrf_protect.exceptions import CsrfProtectError
from pydantic import BaseModel

class CsrfSettings(BaseModel):
    secret_key: str = settings.jwt_secret  # Reuse JWT secret
    cookie_samesite: str = "lax"
    cookie_secure: bool = True  # Set to True in production with HTTPS

@CsrfProtect.load_config
def get_csrf_config():
    return CsrfSettings()

# Add exception handler
@app.exception_handler(CsrfProtectError)
def csrf_protect_exception_handler(request, exc):
    return JSONResponse(
        status_code=403,
        content={"detail": "CSRF token validation failed"}
    )
```

Apply to state-changing endpoints:
```python
from fastapi_csrf_protect import CsrfProtect

@router.post("/auth/register")
async def register_user(
    user_data: UserCreate,
    csrf_protect: CsrfProtect = Depends(),
    db: AsyncSession = Depends(get_db)
):
    await csrf_protect.validate_csrf(request)
    service = AuthService(db)
    return await service.register(user_data)
```

**Option B: Double Submit Cookie Pattern**

Implement custom middleware for CSRF token validation using double-submit cookie pattern.

**Frontend Changes Required**:
```javascript
// frontend/src/services/api.js
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  const csrfToken = getCookie("csrf_token");
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (csrfToken && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(config.method.toUpperCase())) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});
```

### #16: Document SQL Injection Protection

**Status**: ✅ **PROTECTED** (Documentation Update)

**Current Protection**: Application uses SQLAlchemy ORM with parameterized queries throughout

**Evidence**:
- All database queries use `select()`, `update()`, `delete()` with `.where()` clauses
- No raw SQL or string concatenation found
- Proper use of SQLAlchemy 2.0 async patterns

**Example from `backend/app/repositories/user_repository.py`**:
```python
# Safe parameterized query
result = await self.db.execute(
    select(User).where(User.username == username)
)
```

**Recommendation**: No changes needed. SQLAlchemy ORM provides built-in protection against SQL injection.

**Verification**:
```bash
# Search for unsafe patterns (should return no results)
grep -r "execute.*%" backend/app/
grep -r "execute.*format" backend/app/
grep -r "execute.*f\"" backend/app/
```

### #17: Fix npm Dependency Vulnerabilities

**Problem**: Frontend has 3 npm vulnerabilities (1 High, 2 Moderate)

**High Severity**:
- `qs` package: arrayLimit bypass allows DoS via memory exhaustion

**Solution**:
```bash
cd frontend
npm audit fix
# If automatic fix doesn't work:
npm audit fix --force
# Or update specific package:
npm update qs
```

**Verification**:
```bash
npm audit
# Should show 0 vulnerabilities
```

### #18: Fix XSS Vulnerability in Metrics Display

**Problem**: Use of `innerHTML` in `frontend/src/components/three/Metrics.js`

**Location**: Line 36-40
```javascript
this.extraMetrics.innerHTML = `
  Tri: ${triangles.toLocaleString()}<br>
  Draw: ${calls.toLocaleString()}<br>
  Mem: ${memoryMB} MB (Max: ${this.maxMemoryMB.toFixed(1)})
`;
```

**Risk**: Low (data comes from renderer.info, not user input), but still bad practice

**Solution**: Use `textContent` or create elements safely
```javascript
// Option 1: Use textContent (loses <br> tags)
this.extraMetrics.textContent = `Tri: ${triangles.toLocaleString()} | Draw: ${calls.toLocaleString()} | Mem: ${memoryMB} MB (Max: ${this.maxMemoryMB.toFixed(1)})`;

// Option 2: Create elements safely (recommended)
this.extraMetrics.innerHTML = ''; // Clear
const lines = [
  `Tri: ${triangles.toLocaleString()}`,
  `Draw: ${calls.toLocaleString()}`,
  `Mem: ${memoryMB} MB (Max: ${this.maxMemoryMB.toFixed(1)})`
];
lines.forEach((line, i) => {
  const text = document.createTextNode(line);
  this.extraMetrics.appendChild(text);
  if (i < lines.length - 1) {
    this.extraMetrics.appendChild(document.createElement('br'));
  }
});
```

### #19: Add Input Sanitization

**Problem**: Limited input sanitization beyond Pydantic validation

**Solution**: Add HTML/script tag sanitization for text fields

Update `backend/app/schemas/user.py`:
```python
from pydantic import field_validator
import re

class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=100)
    role_id: int = Field(default=2)
    
    @field_validator('username', 'email')
    def sanitize_input(cls, v):
        # Remove HTML tags and script content
        if isinstance(v, str):
            v = re.sub(r'<[^>]*>', '', v)
            v = re.sub(r'javascript:', '', v, flags=re.IGNORECASE)
        return v
```

### #20: Filter Sensitive Data from Logs

**Problem**: No filtering of sensitive data in logs

**Solution**: Update `backend/app/core/logging.py`

```python
import logging
import re

class SensitiveDataFilter(logging.Filter):
    """Filter to redact sensitive data from logs."""
    
    SENSITIVE_PATTERNS = [
        (re.compile(r'"password"\s*:\s*"[^"]*"'), '"password": "***REDACTED***"'),
        (re.compile(r'"pasw_hash"\s*:\s*"[^"]*"'), '"pasw_hash": "***REDACTED***"'),
        (re.compile(r'Bearer\s+[A-Za-z0-9\-._~+/]+=*'), 'Bearer ***REDACTED***'),
        (re.compile(r'"access_token"\s*:\s*"[^"]*"'), '"access_token": "***REDACTED***"'),
    ]
    
    def filter(self, record):
        if isinstance(record.msg, str):
            for pattern, replacement in self.SENSITIVE_PATTERNS:
                record.msg = pattern.sub(replacement, record.msg)
        return True

# Add filter to logger
logger.addFilter(SensitiveDataFilter())
```

---

## ⚪ LOW PRIORITY FIXES (Summary)

### #21-25: Informational Items
- Add .dockerignore files
- Implement audit logging
- Add health check auth
- See PRODUCTION_CHECKLIST.md for details

---

## 📅 Implementation Order

### Phase 1: Immediate (Day 1)
1. ✅ Generate JWT secret (#1)
2. ✅ Set JWT expiration (#7)
3. ✅ Remove DB port exposure (#3)
4. ✅ Disable API docs (#4)
5. ✅ Fix frontend URL (#5)
6. ✅ Update CORS (#9)

**Time**: ~1 hour

### Phase 2: Critical Security (Day 1-2)
7. ✅ Implement Docker Secrets (#2)
8. ✅ Add resource limits (#12)
9. ✅ Run as non-root (#11)

**Time**: ~2 hours

### Phase 3: Infrastructure (Day 2-3)
10. ✅ Add Nginx reverse proxy (#8)
11. ✅ Configure SSL/TLS (#8)
12. ✅ Add security headers (#10)
13. ✅ Implement rate limiting (#6)

**Time**: ~4 hours

### Phase 4: Application Hardening (Week 1)
14. ✅ Strengthen password policy (#13)
15. ✅ Add account lockout (#14)
16. ✅ Other medium priority items

**Time**: ~8 hours

---

## ✅ Verification Checklist

After implementing fixes:

- [ ] JWT authentication works with new secret
- [ ] Database not accessible from host
- [ ] API docs return 404 in production
- [ ] Frontend connects to correct backend URL
- [ ] HTTPS redirects working
- [ ] Security headers present (check with curl -I)
- [ ] Rate limiting blocks excessive requests
- [ ] Containers run as non-root (check with `docker exec`)
- [ ] Resource limits enforced
- [ ] All services restart properly

---

## 🔗 Related Documents

- [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md) - Complete checklist with all 25 issues
- [docker-compose.prod.yml](docker-compose.prod.yml) - Production Docker configuration
- [.env.prod](.env.prod) - Production environment variables

---

## 📞 Support

For questions or issues during implementation:
1. Review this document
2. Check PRODUCTION_CHECKLIST.md
3. Consult docs/development-guide.md
4. Test in development environment first

**Last Updated**: 2025-12-31
