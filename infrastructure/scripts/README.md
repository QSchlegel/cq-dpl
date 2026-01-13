# Deployment Scripts

## deploy.sh

Deploys the cq-dpl application to an EC2 instance.

### Prerequisites

1. Rust/Cargo installed (for installing cq from crates.io)
2. Node.js and npm installed
3. SSH access to EC2 instance
4. EC2 instance must have:
   - Node.js installed
   - Rust/Cargo installed (for installing cq on remote server)
   - PM2 installed (or will be installed automatically)
   - Nginx installed (or will be installed automatically)

### Usage

```bash
./deploy.sh <ec2-ip-or-hostname> <ssh-key-path>
```

Example:
```bash
./deploy.sh 1.2.3.4 ~/.ssh/my-key.pem
```

### What it does

1. Installs the cq binary from crates.io using `cargo install cq`
2. Builds the Next.js application
3. Creates a deployment package
4. Copies files to EC2 instance
5. Installs cq binary on remote server (if needed)
6. Installs dependencies on remote server
7. Starts the application with PM2
8. Configures nginx as a reverse proxy

### Manual Deployment Steps

If you prefer to deploy manually:

1. Install cq binary:
   ```bash
   cargo install cq
   cp ~/.cargo/bin/cq cq-dpl/public/cq
   ```

2. Build Next.js app:
   ```bash
   cd cq-dpl
   npm ci
   npm run build
   ```

3. Copy files to EC2:
   ```bash
   scp -r . ec2-user@<ip>:/opt/cq-dpl/
   ```

4. On EC2, install cq and start the app:
   ```bash
   ssh ec2-user@<ip>
   cd /opt/cq-dpl
   cargo install cq  # If not already installed
   cp ~/.cargo/bin/cq public/cq
   npm ci --production
   pm2 start ecosystem.config.js
   ```
