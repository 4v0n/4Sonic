import { SubsonicAlbumResponse, SubsonicArtistResponse, SubsonicArtistsResponse, SubsonicIndexesResponse, SubsonicResponse, SubsonicResponseEnvelope, SubsonicSongResponse } from "../../types/subsonic";
import { normalizeServerUrl } from "./auth";

export interface SubsonicCredentials {
  serverUrl: string;
  username: string;
  token: string;
  salt: string;
  clientName?: string;
  apiVersion?: string;
}

const DEFAULT_CLIENT_NAME = "four-sonic-app";
const DEFAULT_API_VERSION = "1.16.1";

export class SubsonicClient {
  private readonly serverUrl: string;
  private readonly username: string;
  private readonly token: string;
  private readonly salt: string;
  private readonly clientName: string;
  private readonly apiVersion: string;

  public constructor(credentials: SubsonicCredentials) {
    this.serverUrl = normalizeServerUrl(credentials.serverUrl);
    this.username = credentials.username;
    this.token = credentials.token;
    this.salt = credentials.salt;
    this.clientName = credentials.clientName ?? DEFAULT_CLIENT_NAME;
    this.apiVersion = credentials.apiVersion ?? DEFAULT_API_VERSION;
  }

  public getServerUrl(): string {
    return this.serverUrl;
  }

  public getUsername(): string {
    return this.username;
  }

  public getCredentials(): SubsonicCredentials {
    return {
      serverUrl: this.serverUrl,
      username: this.username,
      token: this.token,
      salt: this.salt,
      clientName: this.clientName,
      apiVersion: this.apiVersion,
    };
  }

  public async ping(): Promise<void> {
    await this.request("ping");
  }

  public async getArtists(): Promise<SubsonicResponse<SubsonicArtistsResponse>> {
    return this.request<SubsonicArtistsResponse>("getArtists");
  }

  public async getIndexes(): Promise<SubsonicResponse<SubsonicIndexesResponse>> {
    return this.request<SubsonicIndexesResponse>("getIndexes");
  }

  public async getArtist(id: string): Promise<SubsonicResponse<SubsonicArtistResponse>> {
    return this.request<SubsonicArtistResponse>("getArtist", { id });
  }

  public async getAlbum(id: string): Promise<SubsonicResponse<SubsonicAlbumResponse>> {
    return this.request<SubsonicAlbumResponse>("getAlbum", { id });
  }

  public async getSong(id: string): Promise<SubsonicResponse<SubsonicSongResponse>> {
    return this.request<SubsonicSongResponse>("getSong", { id });
  }

  public getStreamUrl(id: string, options?: { maxBitRate?: number; format?: string; estimateContentLength?: boolean }): string {
    const url = new URL(`${this.serverUrl}/rest/stream.view`);
    const params = new URLSearchParams({
      u: this.username,
      t: this.token,
      s: this.salt,
      v: this.apiVersion,
      c: this.clientName,
      id,
    });

    if (typeof options?.maxBitRate === "number") {
      params.set("maxBitRate", String(options.maxBitRate));
    }
    if (options?.format) {
      params.set("format", options.format);
    }
    if (options?.estimateContentLength) {
      params.set("estimateContentLength", "true");
    }

    url.search = params.toString();
    return url.toString();
  }

  public getCoverArtUrl(id?: string, options?: { size?: number }): string | undefined {
    if (!id) {
      return undefined;
    }

    const url = new URL(`${this.serverUrl}/rest/getCoverArt.view`);
    const params = new URLSearchParams({
      u: this.username,
      t: this.token,
      s: this.salt,
      v: this.apiVersion,
      c: this.clientName,
      id,
    });

    if (options?.size) {
      params.set("size", String(options.size));
    }

    url.search = params.toString();
    return url.toString();
  }

  private async request<TPayload>(endpoint: string, params?: Record<string, string | number | undefined>): Promise<SubsonicResponse<TPayload>> {
    const url = new URL(`${this.serverUrl}/rest/${endpoint}.view`);
    const searchParams = new URLSearchParams({
      u: this.username,
      t: this.token,
      s: this.salt,
      v: this.apiVersion,
      c: this.clientName,
      f: "json",
    });

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (typeof value !== "undefined") {
          searchParams.set(key, String(value));
        }
      });
    }

    url.search = searchParams.toString();

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Subsonic request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as SubsonicResponseEnvelope<TPayload>;
    const body = payload["subsonic-response"];

    if (body.status === "failed") {
      throw new Error(body.error?.message ?? "Subsonic request failed");
    }

    return body;
  }
}
