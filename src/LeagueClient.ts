/// <reference types="npm:@types/ws" />
import WebSocket from "ws";

import { encodeBase64 } from "jsr:@std/encoding@1.0.10/base64";
import { RIOT_CERT } from "./riotgames.ts";
import { EventEmitter } from "node:events";
import { Buffer } from "node:buffer";

const PORT_REGEX = /--app-port=([0-9])*/g;
const TOKEN_REGEX = /--remoting-auth-token=[\w]*/g;
const LEAGUE_CLIENT = "LeagueClientUx.exe";

class LeagueEvents extends EventEmitter {
  #ws: WebSocket;

  constructor(_ws: WebSocket) {
    super();
    this.#ws = _ws;

    this.#ws.on("open", () => {
      this.#ws.send(
        JSON.stringify([5, "OnJsonApiEvent"]),
      );
    });

    this.#ws.on("message", (message: Buffer) => {
      // OnJsonApiEvent always sends the first item with the value 8?
      const payload = JSON.parse(message.toString());
      if (payload[0] === 8) {
        const { data, eventType, uri } = payload[2]; // third position has significant things
        this.emit(uri, { eventType, data });
      }
    });
  }

  override on(
    eventName: string | symbol,
    listener: (...args: any[]) => void,
  ): this {
    this.addListener(eventName, listener);
    return this;
  }
}

// Maybe expand the options in the future
/** The options to pass to the @class LeagueClient class*/
export interface ClientOptions {
  /** Path to your own cert.pem file */
  cert?: string;
}

/**
 * The LeagueClient main class
 *
 * @param options The options to configure the LeagueClient class
 */
export class LeagueClient {
  /**The port where the LeagueClientUx is listening */
  port: string;
  /**The token for what the client authenticates */
  token: string;
  /**options to configure the class */
  options: ClientOptions;

  #client: Deno.HttpClient;

  constructor(options: ClientOptions = { cert: "" }) {
    if (Deno.build.os !== "windows" && Deno.build.os !== "darwin") {
      throw new Error("ERROR: Only windows and mac platforms are accept");
    }
    this.options = options;

    const td = new TextDecoder();

    const command = new Deno.Command("wmic", {
      args: [
        "PROCESS",
        "WHERE",
        `name='${LEAGUE_CLIENT}'`,
        "GET",
        "commandline",
      ],
    });

    const out = td.decode(command.outputSync().stdout);

    const [appPort]: any = out.match(PORT_REGEX);
    const [authToken]: any = out.match(TOKEN_REGEX);

    const [, port] = appPort.split("=");
    const [, token] = authToken.split("=");

    this.port = port;
    this.token = token;

    let cert = "";
    if (this.options.cert !== "") {
      cert = this.#readPem();
    }
    this.#client = Deno.createHttpClient({
      caCerts: [cert || RIOT_CERT],
    });
  }

  #readPem(): string {
    try {
      const file = Deno.readFile(this.options.cert!);

      file.then((content) => {
        return content;
      });
      return "";
    } catch {
      throw new Error("ERROR: File not found");
    }
  }

  #parseUrl(url: string): string {
    if (!url.startsWith("/")) {
      const tmp = url.split("");
      tmp.unshift("/");
      url = tmp.join("");
    }
    return url;
  }

  async #generic_fetch(
    url: string,
    method: string,
    body: string = "",
  ): Promise<JSON> {
    const URL = `https://127.0.0.1:${this.port}${url}`;
    const key = `riot:${this.token}`;

    const response = await fetch(URL, {
      method,
      body: body || null,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${encodeBase64(key)}`,
      },
      client: this.#client,
    });

    return response.json();
  }

  /**
   * Method to make a GET request to the client
   *
   * @param url string for the request to be made
   * @returns JSON containing the response from the client
   *
   * @example
   * ```ts
   * import { LeagueClient } from "jsr:@wasix/gnar";
   * const client = new LeagueClient();
   * const response = await client.get("/lol-summoner/v1/current-summoner");
   * ```
   */
  async get(url: string): Promise<JSON> {
    url = this.#parseUrl(url);
    return await this.#generic_fetch(url, "GET");
  }

  /**
   * Method to make a POST request to the client
   *
   * @param url string for the request to be made
   * @param body object containing the body of the request
   * @returns JSON containing the response from the client
   *
   * @example
   * ```ts
   * import { LeagueClient } from "jsr:@wasix/gnar";
   * const customLobby = {
   *    "customGameLobby": {
   *        "configuration": {
   *            "gameMode": "PRACTICETOOL", "gameMutator": "", "gameServerRegion": "", "mapId": 11, "mutators": {"id": 1}, "spectatorPolicy": "AllAllowed", "teamSize": 5
   *        },
   *    "lobbyName": "Name",
   *    "lobbyPassword": null
   *    },
   *    "isCustom": true
   * }
   * const client = new LeagueClient();
   * const response = await client.post("/lol-lobby/v2/lobby", customLobby);
   * ```
   */
  async post(url: string, body: object = {}): Promise<JSON> {
    url = this.#parseUrl(url);
    return await this.#generic_fetch(url, "POST", JSON.stringify(body));
  }
  /**
   * Method to make a PUT request to the client
   *
   * @param url string for the request to be made
   * @param body object containing the body of the request
   * @returns JSON containing the response from the client
   */
  async put(url: string, body: object = {}): Promise<JSON> {
    url = this.#parseUrl(url);
    return await this.#generic_fetch(url, "PUT", JSON.stringify(body));
  }

  /**
   * Method to make a DELETE request to the client
   *
   * @param url string for the request to be made
   * @returns JSON containing the response from the client
   *
   * @example
   * ```ts
   * import { LeagueClient } from "jsr:@wasix/gnar";
   * const client = new LeagueClient();
   * const response = await client.delete("/lol-lobby/v2/lobby");
   * ```
   */
  async delete(url: string): Promise<JSON> {
    url = this.#parseUrl(url);
    return await this.#generic_fetch(url, "DELETE");
  }

  ws(): LeagueEvents {
    const URL = `wss://riot:${this.token}@127.0.0.1:${this.port}`;
    const ws = new WebSocket(URL, "wamp");

    return new LeagueEvents(ws);
  }
}
