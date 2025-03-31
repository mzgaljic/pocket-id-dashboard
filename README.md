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

2. **Configure a new OIDC client in Pocket ID**

Create a new OIDC client in pocket ID, name it something like `Pocket ID Dashboard`.

Then apply these settings (example) to the new OIDC client:
```
callback url(s):         https://pocket-id-dashboard.mydomain.com/auth/callback
                         http://localhost:3000/auth/callback  <-- if testing locally
                         
logout callback url(s):  https://pocket-id-dashboard.mydomain.com
                         http://localhost:3000  <-- if testing locally

PKCE: true

Public Client: true
```


3. **Configure environment variables**

Create a `.env` file based on the sample:

```bash
cp local-dev-sample.env .env
```

Edit the `.env` file and set at minimum these required variables:

```
# Required configuration
OIDC_CLIENT_ID=your_client_id
OIDC_REDIRECT_URI=https://your-domain.com/auth/callback
OIDC_POST_LOGOUT_REDIRECT_URI=https://your-domain.com
POCKET_ID_BASE_URL=https://your-pocket-id-instance
POCKET_ID_API_KEY=your_api_key
SESSION_SECRET=your_secure_session_secret  # Run 'npm run generate-secret' to generate one
```
> Note: The Docker Compose configuration uses this .env file directly via the env_file option, so all your configuration will be applied to the container automatically.

4. **Run with Docker Compose**

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


## License

[MIT License](LICENSE)