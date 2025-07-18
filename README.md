# Gnar

**Easy** to use Deno client api for the LCU (League Client Update)

```bash
$ deno add jsr:@wasix/gnar
```

## Usage

```typescript
import { LeagueClient } from "jsr:@wasix/gnar";

const client = new LeagueClient();

const summoner = await client.get("/lol-summoner/v1/current-summoner");
```

## WebSockets

> ⚠️ Due to limitations in Deno's WebSocket and certificate handling, you must run with the --unsafely-ignore-certificate-errors flag.

```typescript
import { LeagueClient } from "jsr:@wasix/gnar";

const client = new LeagueClient();
const ws = client.ws();

ws.on("/lol-chat/v1/conversations/active", ({ eventType, data } => {
    console.log(eventType, data)
}));
```

### To-Dos

- Mac support
- Tests

_pr's welcome_
