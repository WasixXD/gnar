# Gnar

**Easy** to use Deno client api for the LCU (League Client Update)

## Usage

```typescript
import { LeagueClient } from "jsr:@wasix/gnar";

const client = new LeagueClient();

const summoner = await client.get("/lol-summoner/v1/current-summoner");
```

### To-Dos

- Mac support
- WebSocket connection

_pr's welcome_
