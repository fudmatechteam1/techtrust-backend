#!/bin/bash

# TechTrust Deployment Script for Huawei Cloud ECS
# This script automates the deployment process

set -e  # Exit on error

echo "=========================================="
echo "TechTrust Deployment Script"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/techtrust"
BACKEND_DIR="$APP_DIR/backend/techtrust-backend-main"
AI_DIR="$APP_DIR/AI-ML-main"
FRONTEND_DIR="$APP_DIR/frontend"

# Functions
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    print_error "Please do not run as root. Use a regular user with sudo privileges."
    exit 1
fi

# Step 1: Update System
print_info "Step 1: Updating system packages..."
sudo apt-get update -qq
sudo apt-get upgrade -y -qq
print_success "System updated"

# Step 2: Install Node.js
print_info "Step 2: Installing Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    print_success "Node.js installed"
else
    print_info "Node.js already installed: $(node --version)"
fi

# Step 3: Install PM2
print_info "Step 3: Installing PM2..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
    print_success "PM2 installed"
else
    print_info "PM2 already installed"
fi

# Step 4: Install Python and dependencies
print_info "Step 4: Installing Python..."
sudo apt-get install -y python3 python3-pip python3-venv build-essential
print_success "Python installed"

# Step 5: Install Nginx
print_info "Step 5: Installing Nginx..."
if ! command -v nginx &> /dev/null; then
    sudo apt-get install -y nginx
    print_success "Nginx installed"
else
    print_info "Nginx already installed"
fi

# Step 6: Create application directory
print_info "Step 6: Creating application directory..."
sudo mkdir -p $APP_DIR
sudo chown -R $USER:$USER $APP_DIR
print_success "Application directory created"

# Step 7: Setup Backend
print_info "Step 7: Setting up backend..."
if [ -d "$BACKEND_DIR" ]; then
    cd $BACKEND_DIR
    print_info "Installing backend dependencies..."
    npm install --production
    print_success "Backend dependencies installed"
    
    if [ ! -f ".env" ]; then
        print_info "Creating .env file template..."
        cat > .env << EOF
NODE_ENV=production
PORT=4000
HOST=0.0.0.0
MONGO_URI=your-mongodb-connection-string
JWT_SCRET=your-jwt-secret-key-minimum-32-characters
AI_SERVICE_URL=http://localhost:8000
FRONTEND_URL=http://localhost
DB_SSL=true
DB_AUTH_SOURCE=admin
SENDER_EMAIL=your-email@gmail.com
SENDER_PASSWORD=your-gmail-app-password
EOF
        print_info "Please edit $BACKEND_DIR/.env with your configuration"
    fi
else
    print_error "Backend directory not found at $BACKEND_DIR"
    print_info "Please upload backend files first"
fi

# Step 8: Setup AI Service
print_info "Step 8: Setting up AI service..."
if [ -d "$AI_DIR" ]; then
    cd $APP_DIR
    if [ ! -d "ai-service-env" ]; then
        python3 -m venv ai-service-env
        print_success "Python virtual environment created"
    fi
    
    source ai-service-env/bin/activate
    cd $AI_DIR
    
    print_info "Installing AI service dependencies..."
    pip install -q -r requirements.txt
    pip install -q mindspore fastapi uvicorn[standard]
    print_success "AI service dependencies installed"
    
    deactivate
else
    print_error "AI service directory not found at $AI_DIR"
    print_info "Please upload AI service files first"
fi

# Step 9: Setup Frontend
print_info "Step 9: Setting up frontend..."
if [ -d "$FRONTEND_DIR" ]; then
    sudo chown -R www-data:www-data $FRONTEND_DIR
    sudo chmod -R 755 $FRONTEND_DIR
    print_success "Frontend permissions set"
else
    print_error "Frontend directory not found at $FRONTEND_DIR"
    print_info "Please upload frontend files first"
fi

# Step 10: Start Services
print_info "Step 10: Starting services..."

# Start Backend
if [ -d "$BACKEND_DIR" ]; then
    cd $BACKEND_DIR
    pm2 start server.js --name techtrust-backend || pm2 restart techtrust-backend
    print_success "Backend service started"
fi

# Start AI Service
if [ -d "$AI_DIR" ]; then
    cd $AI_DIR
    source $APP_DIR/ai-service-env/bin/activate
    pm2 start "python3 api.py" --name techtrust-ai --interpreter python3 || pm2 restart techtrust-ai
    deactivate
    print_success "AI service started"
fi

# Save PM2 configuration
pm2 save
print_success "PM2 configuration saved"

# Step 11: Setup PM2 Startup
print_info "Step 11: Setting up PM2 startup..."
pm2 startup | grep -v PM2 | bash || true
print_success "PM2 startup configured"

# Step 12: Test Services
print_info "Step 12: Testing services..."

# Test Backend
if curl -s http://localhost:4000/health > /dev/null; then
    print_success "Backend health check passed"
else
    print_error "Backend health check failed"
fi

# Test AI Service
if curl -s http://localhost:8000/health > /dev/null; then
    print_success "AI service health check passed"
else
    print_error "AI service health check failed"
fi

# Summary
echo ""
echo "=========================================="
echo "Deployment Summary"
echo "=========================================="
echo ""
print_info "Application Directory: $APP_DIR"
print_info "Backend Directory: $BACKEND_DIR"
print_info "AI Service Directory: $AI_DIR"
print_info "Frontend Directory: $FRONTEND_DIR"
echo ""
print_info "Next Steps:"
echo "  1. Configure .env file: nano $BACKEND_DIR/.env"
echo "  2. Configure Nginx: sudo nano /etc/nginx/sites-available/techtrust"
echo "  3. Configure security groups in Huawei Cloud Console"
echo "  4. Test services: pm2 status"
echo ""
print_info "View logs:"
echo "  Backend: pm2 logs techtrust-backend"
echo "  AI Service: pm2 logs techtrust-ai"
echo ""
print_success "Deployment script completed!"
