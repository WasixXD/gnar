import { encodeBase64 } from "jsr:@std/encoding@1.0.10/base64";
import { RIOT_CERT } from "./riotgames.ts";

const PORT_REGEX = /--app-port=([0-9])*/g;
const TOKEN_REGEX = /--remoting-auth-token=[\w]*/g;
const LEAGUE_CLIENT = "LeagueClientUx.exe";

export interface ClientOptions {
  /** Path to your own cert.pem file */
  cert: string;
}

// TODO: MAC?
export class LeagueClient {
  port: string;
  token: string;
  options: ClientOptions;
  client: Deno.HttpClient;

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
    this.client = Deno.createHttpClient({
      caCerts: [cert || RIOT_CERT],
    });
  }

  #readPem(): string {
    try {
      const file = Deno.readFile(this.options.cert);

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
      client: this.client,
    });

    return response.json();
  }
  async get(url: string): Promise<JSON> {
    url = this.#parseUrl(url);
    return await this.#generic_fetch(url, "GET");
  }

  async post(url: string, body: object = {}): Promise<JSON> {
    url = this.#parseUrl(url);
    return await this.#generic_fetch(url, "POST", JSON.stringify(body));
  }

  async put(url: string, body: object = {}): Promise<JSON> {
    url = this.#parseUrl(url);
    return await this.#generic_fetch(url, "PUT", JSON.stringify(body));
  }

  async delete(url: string): Promise<JSON> {
    url = this.#parseUrl(url);
    return await this.#generic_fetch(url, "DELETE");
  }
}
