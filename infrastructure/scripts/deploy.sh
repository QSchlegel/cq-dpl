#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CQ_DPL_DIR="${PROJECT_ROOT}/cq-dpl"
REMOTE_USER="ec2-user"
REMOTE_DIR="/opt/cq-dpl"

# Check for required arguments
if [ $# -lt 2 ]; then
    echo -e "${RED}Usage: $0 <ec2-ip-or-hostname> <ssh-key-path>${NC}"
    echo "Example: $0 1.2.3.4 ~/.ssh/my-key.pem"
    exit 1
fi

EC2_HOST="$1"
SSH_KEY="$2"

# Validate SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}Error: SSH key not found at $SSH_KEY${NC}"
    exit 1
fi

echo -e "${GREEN}Starting deployment to $EC2_HOST${NC}"

# Step 1: Install cq binary
echo -e "${YELLOW}Step 1: Installing cq binary from crates.io...${NC}"

if ! command -v cargo &> /dev/null; then
    echo -e "${RED}Error: Rust/Cargo not found. Please install Rust first.${NC}"
    exit 1
fi

# Install cq if not already installed, or force reinstall
cargo install cq --force

# Find the installed binary (usually in ~/.cargo/bin)
CQ_BINARY="${HOME}/.cargo/bin/cq"

# Fallback to checking PATH
if [ ! -f "$CQ_BINARY" ]; then
    CQ_BINARY=$(which cq 2>/dev/null || echo "")
fi

if [ -z "$CQ_BINARY" ] || [ ! -f "$CQ_BINARY" ]; then
    echo -e "${RED}Error: cq binary not found after installation${NC}"
    echo -e "${YELLOW}Expected location: ~/.cargo/bin/cq${NC}"
    exit 1
fi

echo -e "${GREEN}✓ cq binary installed successfully at $CQ_BINARY${NC}"

# Step 2: Prepare deployment package
echo -e "${YELLOW}Step 2: Preparing deployment package...${NC}"
cd "$CQ_DPL_DIR"

# Create temporary directory for deployment
TEMP_DIR=$(mktemp -d)
DEPLOY_DIR="${TEMP_DIR}/cq-dpl"

mkdir -p "${DEPLOY_DIR}/public"
mkdir -p "${DEPLOY_DIR}/.next"

# Copy cq binary
cp "$CQ_BINARY" "${DEPLOY_DIR}/public/cq"
chmod +x "${DEPLOY_DIR}/public/cq"

# Copy Next.js files
cp -r package.json package-lock.json next.config.js tsconfig.json .eslintrc.json "${DEPLOY_DIR}/"
cp -r app lib components "${DEPLOY_DIR}/"

# Build Next.js app
echo -e "${YELLOW}Step 3: Building Next.js application...${NC}"
npm ci
npm run build

# Copy build output
cp -r .next "${DEPLOY_DIR}/"

# Copy node_modules (for production dependencies)
cp -r node_modules "${DEPLOY_DIR}/"

# Create .env.production if it doesn't exist
if [ ! -f "${DEPLOY_DIR}/.env.production" ]; then
    cat > "${DEPLOY_DIR}/.env.production" << EOF
NODE_ENV=production
CQ_BINARY_PATH=/opt/cq-dpl/public/cq
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
MCP_ENABLED=true
PORT=3000
EOF
fi

# Create PM2 ecosystem file
cat > "${DEPLOY_DIR}/ecosystem.config.js" << 'EOF'
module.exports = {
  apps: [{
    name: 'cq-dpl',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '/opt/cq-dpl',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    error_file: '/var/log/cq-dpl/error.log',
    out_file: '/var/log/cq-dpl/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
  }],
};
EOF

# Create systemd service file
cat > "${DEPLOY_DIR}/cq-dpl.service" << 'EOF'
[Unit]
Description=cq-dpl Next.js Application
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/opt/cq-dpl
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

echo -e "${GREEN}✓ Deployment package prepared${NC}"

# Step 4: Deploy to EC2
echo -e "${YELLOW}Step 4: Deploying to EC2...${NC}"

# Create remote directory
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$REMOTE_USER@$EC2_HOST" \
    "sudo mkdir -p $REMOTE_DIR && sudo chown $REMOTE_USER:$REMOTE_USER $REMOTE_DIR && mkdir -p /var/log/cq-dpl"

# Copy files
echo -e "${YELLOW}  Copying files...${NC}"
scp -i "$SSH_KEY" -r "${DEPLOY_DIR}"/* "$REMOTE_USER@$EC2_HOST:$REMOTE_DIR/"

# Install dependencies and setup on remote
echo -e "${YELLOW}  Setting up application on remote server...${NC}"
ssh -i "$SSH_KEY" "$REMOTE_USER@$EC2_HOST" << 'REMOTE_SCRIPT'
set -e
cd /opt/cq-dpl

# Install cq binary if not present or if cargo is available
if [ ! -f "public/cq" ] && command -v cargo &> /dev/null; then
    echo "Installing cq binary on remote server..."
    cargo install cq --force
    # Copy from cargo bin to public directory
    if [ -f ~/.cargo/bin/cq ]; then
        cp ~/.cargo/bin/cq public/cq
    elif command -v cq &> /dev/null; then
        cp "$(which cq)" public/cq
    else
        echo "Error: cq binary not found after installation"
        exit 1
    fi
fi

# Make cq binary executable
chmod +x public/cq

# Install production dependencies
npm ci --production

# Setup PM2
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi

# Stop existing instance if running
pm2 stop cq-dpl || true
pm2 delete cq-dpl || true

# Start application with PM2
pm2 start ecosystem.config.js
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd -u ec2-user --hp /home/ec2-user || true

echo "✓ Application deployed and started"
REMOTE_SCRIPT

# Step 5: Setup nginx reverse proxy (optional)
echo -e "${YELLOW}Step 5: Setting up nginx reverse proxy...${NC}"
ssh -i "$SSH_KEY" "$REMOTE_USER@$EC2_HOST" << 'NGINX_SCRIPT'
set -e

# Install nginx if not installed
if ! command -v nginx &> /dev/null; then
    sudo dnf install -y nginx
    sudo systemctl enable nginx
fi

# Create nginx config
sudo tee /etc/nginx/conf.d/cq-dpl.conf > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Test and reload nginx
sudo nginx -t && sudo systemctl restart nginx

echo "✓ Nginx configured"
NGINX_SCRIPT

# Cleanup
rm -rf "$TEMP_DIR"

echo -e "${GREEN}✓ Deployment completed successfully!${NC}"
echo -e "${GREEN}Application should be available at http://$EC2_HOST${NC}"
