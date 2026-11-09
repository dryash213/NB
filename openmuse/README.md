# OpenMuse

OpenMuse is a personal agent app for web, iOS, and Android. Ask it to research, work with mail and documents, watch web pages, or start longer tasks. The agent streams progress into the app; tasks, approvals, and results remain available in the workspace.

**This is the main setup and usage guide.** Start here; the smaller README files under `apps/` cover those packages only.

## Run locally

### Requirements

- Node.js 24 LTS and pnpm 11.19.0
- A CopilotKit Intelligence project key for chat threads in every mode
- Docker Desktop only for the optional browser worker or Linux computer

### First-time setup

From the repository root:

```powershell
pnpm install --frozen-lockfile
Copy-Item .env.example .env
npx copilotkit@latest login
npx copilotkit@latest project select
```

Put the generated `CPK_INTELLIGENCE_API_KEY` in `.env`. Keep `.env` private; it contains server credentials. The generated `CPK_TELEMETRY_ID` can stay in `.env` too.

The example configuration starts in `sample` mode with fictional mail and calendar data. To use a model, set `AGENT_BACKEND=model`, choose a supported `MODEL=provider/model-id`, and add the matching provider API key to `.env`.

### Start the API and web app

Use two terminals from the repository root:

```powershell
pnpm dev
```

```powershell
pnpm dev:web
```

Open [http://localhost:8081](http://localhost:8081). The API health endpoint is [http://localhost:8787/api/health](http://localhost:8787/api/health).

### Try a first task

In Chat, send:

> Complete the sample permission slip. Use fictional values only. Ask me for any missing details, then show me the completed PDF and prepare the reply for review. Do not send anything.

Open **Activity** to follow the task and respond to questions. In sample mode, the mailbox and PDF are fictional; this sample flow does not send a real email.

Other useful starting points:

- **Mail:** search for the sample permission slip and open a result to see the thread.
- **Web research:** “Find the official CopilotKit React Native setup instructions and cite the sources.” This uses public web search.
- **Finance:** open **Delegate task → Finance → Try example transactions**.
- **Goals:** create a small goal or a watch for a page change.

## What’s included

| Area                       | What it does                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------- |
| Chat                       | Streamed agent replies, inline result cards, message queue, stop and retry.                             |
| Mail and Calendar          | Sample data by default; live Google access uses OAuth. Sending mail and changing events require review. |
| Browser                    | Reads public pages in a separate Chromium worker; you can take over a saved browser session.            |
| Documents                  | Reads supported PDFs, fills supported form fields, and prepares an email action for review.             |
| Activity                   | Tracks durable tasks, progress, questions, approvals, and receipts.                                     |
| Ideas, Goals, and Tracking | Saves suggestions and goals, and checks public pages for selected changes or conditions.                |
| Finance                    | Imports transaction CSV files and creates a spending summary. No bank connector is included.            |
| Agent computer             | Optional isolated Linux terminal and files in a Docker container.                                       |
| Conversations              | CopilotKit Intelligence saves the main conversation and side threads.                                   |

The full feature and limitation list is in [docs/FEATURES.md](docs/FEATURES.md).

## Add live Google access

Live mode uses real Google accounts and needs additional server-side secrets. In `.env`, configure:

```dotenv
WORKSPACE_MODE=live
OPENMUSE_ACCESS_KEY=your-random-secret-at-least-24-characters
TOKEN_ENCRYPTION_KEY=your-32-random-bytes-encoded-as-base64
GOOGLE_CLIENT_ID=your-oauth-client-id
GOOGLE_CLIENT_SECRET=your-oauth-client-secret
```

Register `PUBLIC_API_URL/api/google/callback` as the OAuth redirect URI in your Google project. Enable the Gmail and Calendar APIs, configure the consent screen, restart the API, then connect Google from **Apps**. The live workspace is protected by one shared access key; this is not multi-tenant authentication. Use HTTPS and restrict network access if you expose it beyond your computer.

## Optional services

### Browser worker

The browser runs separately from the API. Set a random `WORKER_TOKEN` (at least 32 characters) and `BROWSER_WORKER_URL=http://127.0.0.1:8790` in `.env`. Start Docker Desktop, then run:

```powershell
docker compose --env-file .env -f infra/compose.yaml up --build -d
```

Check `http://127.0.0.1:8790/health`. The same token must be used by the API and worker. Restart `pnpm dev` after changing server settings. Browser profiles store cookies and other site state, so keep the Docker volume private. See [apps/worker/README.md](apps/worker/README.md) for API details and network limits.

### Linux computer

Build the optional computer image and enable it in `.env`:

```powershell
docker build -t openmuse-computer:local apps/computer
```

```dotenv
COMPUTER_ENABLED=true
COMPUTER_IMAGE=openmuse-computer:local
```

Restart the API and open **Computer → Terminal → Start computer**. This is an isolated Linux container, not a full virtual machine. Its terminal has no network access.

## Deploy on Render

The [Render Blueprint](render.yaml) starts three services: the API, a static web app, and a private browser worker. In Render, provide your CopilotKit Intelligence key and telemetry ID, plus a model-provider key. Render generates the workspace access key, encryption key, and worker token. The API needs a paid plan with a persistent disk for its database and files. The Blueprint runs in live mode; Google OAuth and the optional Linux computer still need their own setup.

If you remove the private browser service, chat and workspace tasks can still run, but public-page reads, browser previews, and browser takeover will be unavailable. See [browser worker setup](apps/worker/README.md) for service boundaries.

## Background work and storage

The API runs the durable task worker by default and must stay online while tasks run. Local data is stored in PGlite and cannot be shared between multiple processes. For a separate task worker, configure PostgreSQL and shared `DATA_DIR` for both processes, set `TASK_WORKER_ENABLED=false` on the API, then run `pnpm dev:worker`. Use one API instance; workers coordinate with database leases.

If an external write has an uncertain outcome, OpenMuse does not silently replay it. Check the saved action receipt before trying again. Pausing or cancelling stops later task steps; an already approved in-flight provider request may still finish.

## Agent and UI setup

- Use `AGENT_BACKEND=model` for the built-in agent and OpenMuse tools such as mail search, calendar reads, tasks, and web search.
- `AGENT_BACKEND=agui` replaces the built-in agent with a remote AG-UI endpoint. The included Python bridge is a text-only example; it does not inherit OpenMuse’s mail/calendar tools or perform mail actions.
- `render_a2ui` currently uses OpenMuse’s own small component payload and React Native renderer. It is not full Google A2UI support. Buttons send a follow-up chat message; they do not perform an external action unless a matching server tool implements it.

See [the agent flow audit and expansion plan](docs/AGENTIC_FLOW_PLAN.md) for current integration gaps and the recommended path for a custom agent. Full protocol details and official references are in the short [AG-UI/A2UI note](A2UI_AGUI_INTEGRATION.md).

## Data and privacy

- `.env` contains server-only keys. Never commit it or share its contents.
- Local database, PDFs, and signing material are stored under `.openmuse/` by default. Set `DATA_DIR` to choose another private location.
- Browser profiles contain site cookies and state. Back up or delete them with the worker’s Docker volume controls.
- Chat conversations are persisted by CopilotKit Intelligence, a hosted service; do not treat sample mode as meaning that every piece of data remains on your machine.
- Preserve the `CPK_TELEMETRY_ID` generated by the CopilotKit CLI when deploying. Telemetry settings and opt-out options are in [docs/TELEMETRY.md](docs/TELEMETRY.md).
- Live Google credentials are encrypted at rest. Sending mail and calendar changes require a separate review.
- Public search sends model-generated queries and relevant conversation context to Parallel Search. Disable it with `WEB_SEARCH_ENABLED=false` on the API and any separate task worker.
- Keep local sample mode on loopback. Read [SECURITY.md](SECURITY.md) before deploying.

## Troubleshooting

| Symptom                         | Check                                                                                                                                          |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Chat cannot open a thread       | Confirm `CPK_INTELLIGENCE_API_KEY` is set on the API and restart `pnpm dev`.                                                               |
| “Agent not configured”        | For model mode, check `AGENT_BACKEND`, `MODEL`, and the matching provider key. For AG-UI mode, check `AGENT_URL` and the remote service. |
| Browser is offline              | Check Docker Desktop, `docker compose ... ps`, the worker health URL, and that API/worker `WORKER_TOKEN` values match.                     |
| Mail or Calendar is unavailable | Check workspace mode, Google OAuth settings, and the connection status in **Apps**. Sample mode uses fictional data.                     |
| Port 8787 or 8081 is busy       | Stop the process using the port or change the API/web port configuration and restart the affected process.                                     |

When asking for help, share the exact error and health-check results. Redact API keys, access keys, OAuth secrets, worker tokens, and signed URLs. Never share `.env`.

## Development

Useful checks from the repository root:

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build:server
pnpm build:web
```

Platform and container checks may require Xcode, Android tooling, Docker, or installed Chromium. See [docs/VERIFICATION.md](docs/VERIFICATION.md) for known coverage and limits.

### Where code lives

| Path                      | Purpose                                                                      |
| ------------------------- | ---------------------------------------------------------------------------- |
| `apps/mobile`           | Shared React Native, web, iOS, and Android interface.                        |
| `apps/server`           | API, CopilotKit runtime, agent tools, task engine, persistence, and reviews. |
| `apps/worker`           | Isolated Playwright browser service.                                         |
| `apps/computer`         | Optional isolated Linux computer image.                                      |
| `packages/domain`       | Shared types and validation schemas.                                         |
| `packages/integrations` | Google and other service adapters.                                           |
| `tests`                 | Workflow, API, persistence, and integration tests.                           |

## Further reading

- [Competitor research POC prompt](docs/POC-COMPETITOR-RADAR.md)
- [Agent workflow plan](docs/AGENTIC_FLOW_PLAN.md)
- [Feature inventory](docs/FEATURES.md) · [Roadmap](ROADMAP.md)
- [Mobile setup](apps/mobile/README.md) · [Browser worker](apps/worker/README.md) · [Linux computer](docs/COMPUTER.md)
- [All technical docs](docs/README.md) · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md)

MIT licensed. Built by CopilotKit.
