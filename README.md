# kobo-sync-api-proxy

## ⚠️ Disclaimer

This project is primarily for **learning and educational purposes**, aimed at understanding how the Kobo Sync API communicates. Please **do not** use this project for any activities that violate the Kobo Terms of Service (ToS).

If this project raises any copyright concerns, please contact me directly, and I will remove it as soon as possible. Thank you.

## 📖 Motivation

The main reason I started this project is that I wanted to automatically sync the EPUB ebooks I own to my Kobo e-reader using the Kobo Sync API. To achieve this, I first needed to figure out how the Kobo e-reader communicates with their servers so I could mock the API's behavior moving forward. This is how this proxy project came to be.

## 🚀 Deployment

1. **Clone the repository**
```bash
git pull https://github.com/LiaoAnn/kobo-sync-api-proxy
cd kobo-sync-api-proxy
```

2. **Set up environment variables**
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
- If you have an external PostgreSQL database you prefer to use, you can directly modify the `DATABASE_URL` in the `.env` file.
- If you don't have an extra database, you can **comment out the `DATABASE_URL` in the `.env` file**. By doing this, the application will automatically fall back to using the default default database and its connection string mapped in `docker-compose.yml`.

3. **Start the service**
```bash
docker compose up -d --build
```
Once started, the API is exposed on port `5678` by default. You can test it by calling:
```bash
curl http://localhost:5678/ping
```

4. **Access Drizzle Gateway (Optional)**
Drizzle Gateway is included in the deployment to visually manage your database:
   - Open your browser and navigate to `http://localhost:4983` (or your server's IP/domain with port 4983)
   - Enter the master password (set via `DRIZZLE_MASTERPASS` environment variable)
   - Select **PostgreSQL** as the database type
   - Enter your `DATABASE_URL` value from the `.env` file
   - Click connect to access the database management interface

## How to Use

### Configuring Your Kobo e-Reader

1. Connect your Kobo e-reader to your computer via USB.
2. Open the `.kobo/Kobo` directory on your e-reader using a text editor (such as VSCode or Cursor). *Note: The `.kobo` folder is usually hidden, so ensure your OS is set to display hidden files.*
3. You will find a configuration file named `Kobo eReader.conf`. Since we are going to modify it, it is highly recommended that you back it up first (e.g., copy it as `Kobo eReader.conf.bak`).
4. Inside `Kobo eReader.conf`, locate **all URLs** starting with `https://storeapi.kobo.com` and replace them with your deployed proxy URL. For example, change `api_endpoint=https://storeapi.kobo.com/` to something like `api_endpoint=http://kobo.yourdomain.com/`.
5. Safely eject the device from your computer, and then tap the "Sync" button on your Kobo e-reader. All your sync traffic will now route through your proxy.

### Reverting the Changes

If you no longer wish to use the proxy and want to restore the original settings:

1. Connect your Kobo e-reader to your computer and open the `.kobo/Kobo` directory again.
2. Replace the contents of `Kobo eReader.conf` with your backup (`Kobo eReader.conf.bak`).
3. Safely eject the device.

## 💻 Development Guide

This project provides a development environment configuration based on Dev Containers and Docker Compose.

### Prerequisites
- Install Docker Desktop or Docker Engine
- Install VS Code and the [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) extension

### Development Notes
1. This project is developed using devcontainer, so you can easily start and enter the project environment in VS Code using `Dev Containers: Reopen in Container` or `Rebuild and Reopen in Container`.
2. **`pnpm_store` Volume**: In `docker-compose.yml` or the devcontainer settings, I have mounted the `pnpm_store` to a corresponding path on the host machine to speed up dependency installation. If your computer doesn't have the corresponding folder or setup, please **remove this volume mount directly** to avoid mounting errors when starting the environment.

### Database Management with Drizzle Gateway

This project includes **Drizzle Gateway** for visual database administration. During development, access it at `http://localhost:4983`. For detailed setup and usage instructions, see the **Deployment** section above.

---
**Note**:
Currently, the application logs every proxy request/response into PostgreSQL. It will also automatically apply any unexecuted migrations in the `migrations/` folder upon startup. The recommended workflow is to run `pnpm db:generate` in your development environment first, and then push the new migration files to deploy so they are automatically applied when the service starts.