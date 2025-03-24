# Pocket ID Dashboard

A web application that provides [Pocket ID](https://github.com/pocket-id/pocket-id) users with a centralized dashboard to access their authorized OIDC applications.

## Features

- Single sign-on with OIDC (PKCE flow)
- View and launch authorized applications
- Request access to new applications
- Email notifications for access requests
- Dark/light mode support


## Quick Start

### Prerequisites

- Docker and Docker Compose
- [Pocket ID](https://github.com/pocket-id/pocket-id) set up and running
- SMTP server for email notifications (optional)

### Setup and Deployment

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/pocket-id-dashboard.git
cd pocket-id-dashboard
```

2. **Configure environment variables**

Create a `.env` file based on the sample:

```bash
cp local-dev-sample.env .env
```

Edit the `.env` file and set at minimum these required variables:

```
# Required configuration
OIDC_CLIENT_ID=your_client_id
OIDC_CLIENT_SECRET=your_client_secret
OIDC_DISCOVERY_URL=https://your-oidc-provider/.well-known/openid-configuration
OIDC_REDIRECT_URI=https://your-domain.com/auth/callback
OIDC_POST_LOGOUT_REDIRECT_URI=https://your-domain.com
POCKET_ID_BASE_URL=https://your-pocket-id-instance
POCKET_ID_API_KEY=your_api_key
SESSION_SECRET=your_secure_session_secret  # Run 'npm run generate-secret' to generate one
```
> Note: The Docker Compose configuration uses this .env file directly via the env_file option, so all your configuration will be applied to the container automatically.

3. **Run with Docker Compose**

```bash
docker compose up -d
```

The application will be available at http://localhost:3000

### Development

For local development:

```bash
# Install dependencies
npm install
cd client && npm install
cd ..

# Run in development mode
npm run dev
```

## Configuration

See [DATABASE.md](DATABASE.md) for database configuration options.

Key environment variables:

| Variable | Description                               | Default |
|----------|-------------------------------------------|---------|
| PORT | Server port                               | 3000 |
| DB_CLIENT | Database client (better-sqlite3/pg)       | better-sqlite3 |
| DB_FILENAME | SQLite database path                      | ./data/pocket-id-dashboard.db |
| ADMIN_EMAIL | Email for access request notifications    | - |
| APP_TITLE | Custom title for the dashboard            | Pocket ID Dashboard |
| APP_SSO_PROVIDER_NAME | Custom provider text for the sign-in link | Pocket ID |


## License

[MIT License](LICENSE)