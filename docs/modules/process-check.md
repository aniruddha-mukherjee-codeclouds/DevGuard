# Module: processCheck

## Purpose

Check whether developer-selected background services are currently running on the host machine.

This module is intentionally simple: it checks for process-name presence in the OS process list. It does not verify ports, health, or ownership by the target project.

## Inputs

Receives `DevGuardConfig`.

Relevant fields:

| Field | Type | Meaning |
|---|---|---|
| `processes` | `string[]` | Process names selected in the UI or supplied through config |

Dependency injection:

- `exec`
- `platform`

## Current Product Usage

In the dashboard, the user can:

- choose from built-in process targets
- add custom comma-separated names

The selected values are sent to `/api/scan` and override config-driven process targets for that request.

Built-in options currently include:

- Docker
- Redis
- PostgreSQL
- MySQL
- MariaDB
- MongoDB
- SQL Server
- Oracle DB
- SQLite
- Elasticsearch
- OpenSearch
- Kafka
- Zookeeper
- RabbitMQ
- NATS
- Memcached
- MinIO
- LocalStack
- Vault
- Consul
- Keycloak
- Meilisearch
- Typesense
- MailHog
- Mailpit
- Nginx
- Apache
- Traefik
- Caddy
- Selenium

## Outputs

Typical details shape:

```ts
{
  running: string[];
  missing: string[];
  error?: string;
}
```

## Status Rules

| Status | Condition |
|---|---|
| `ok` | No processes were selected |
| `ok` | All selected processes were found |
| `warning` | One or more selected processes were not found |
| `error` | Process listing command failed |

## Matching Behavior

- Lowercase substring matching
- `redis` can match `redis-server`
- `docker` can match `Docker Desktop.exe` or related process output

## Notes

- Windows uses `tasklist`
- macOS and Linux use `ps aux`
- This check does not answer "is this process on the chosen target port?"
