import { LeagueClient } from "jsr:@wasix/gnar";

const client = new LeagueClient();

// const response = await client.get("/lol-summoner/v1/current-summoner");

const ws = client.ws();

ws.on("/lol-chat/v1/conversations/active", ({ eventType, data }) => {
  console.log(eventType, data);
});
