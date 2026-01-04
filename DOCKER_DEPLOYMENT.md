# Docker Deployment Guide for Chess App

## Prerequisites
- Docker installed on your system
- Docker Compose (optional, but recommended)

## Building and Running with Docker

### Option 1: Using Docker directly

1. **Build the Docker image:**
   ```bash
   docker build -t chess-app .
   ```

2. **Run the container:**
   ```bash
   docker run -d -p 5000:5000 --name chess-app chess-app
   ```

3. **Access the application:**
   Open your browser and go to `http://localhost:5000`

### Option 2: Using Docker Compose (Recommended)

1. **Build and run:**
   ```bash
   docker-compose up -d
   ```

2. **View logs:**
   ```bash
   docker-compose logs -f
   ```

3. **Stop the application:**
   ```bash
   docker-compose down
   ```

## Deploying to EC2

### Step 1: Set up EC2 Instance

1. Launch an EC2 instance (Ubuntu 22.04 LTS recommended)
2. Configure security group to allow:
   - SSH (port 22) from your IP
   - HTTP (port 5000) from anywhere (or specific IPs)

### Step 2: Install Docker on EC2

SSH into your EC2 instance and run:

```bash
# Update system
sudo apt-get update

# Install Docker
sudo apt-get install -y docker.io docker-compose

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Add your user to docker group (optional, to avoid sudo)
sudo usermod -aG docker $USER
# Log out and back in for this to take effect
```

### Step 3: Transfer Files to EC2

Option A: Using SCP
```bash
scp -r . ec2-user@your-ec2-ip:/home/ec2-user/chess-app
```

Option B: Using Git (Recommended)
```bash
# On EC2
git clone <your-repo-url>
cd chess-app
```

### Step 4: Build and Run on EC2

```bash
# Build the image
docker build -t chess-app .

# Run the container
docker run -d -p 5000:5000 --name chess-app --restart unless-stopped chess-app

# Or using docker-compose
docker-compose up -d
```

### Step 5: Access Your Application

1. Get your EC2 public IP from AWS console
2. Access: `http://<your-ec2-ip>:5000`

## Using a Reverse Proxy (Nginx) - Recommended for Production

For production, use Nginx as a reverse proxy:

1. **Install Nginx:**
   ```bash
   sudo apt-get install -y nginx
   ```

2. **Create Nginx config** (`/etc/nginx/sites-available/chess-app`):
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:5000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

3. **Enable the site:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/chess-app /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

4. **Update security group** to allow port 80 (HTTP)

## Useful Docker Commands

```bash
# View running containers
docker ps

# View logs
docker logs chess-app
docker logs -f chess-app  # Follow logs

# Stop container
docker stop chess-app

# Start container
docker start chess-app

# Remove container
docker rm chess-app

# Remove image
docker rmi chess-app

# Rebuild after code changes
docker-compose up -d --build
```

## Environment Variables

You can customize the app using environment variables:

```bash
docker run -d -p 5000:5000 \
  -e FLASK_DEBUG=False \
  -e FLASK_HOST=0.0.0.0 \
  -e FLASK_PORT=5000 \
  --name chess-app \
  chess-app
```

## Troubleshooting

1. **Container won't start:**
   ```bash
   docker logs chess-app
   ```

2. **Port already in use:**
   Change the port mapping: `-p 8080:5000`

3. **Permission denied:**
   Make sure Docker is running: `sudo systemctl status docker`

4. **Can't access from browser:**
   - Check EC2 security group allows port 5000
   - Check container is running: `docker ps`
   - Check logs: `docker logs chess-app`

