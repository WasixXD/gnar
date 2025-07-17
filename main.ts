import { LeagueClient } from "jsr:@wasix/gnar";

const client = new LeagueClient();

const response = await client.get("/lol-summoner/v1/current-summoner");
console.log(response);
