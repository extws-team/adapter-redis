import { ExtWS } from "@extws/server";
import { RedisClientType, RedisFunctions, RedisModules, RedisScripts } from "redis";
type RedisClient = RedisClientType<RedisModules, RedisFunctions, RedisScripts>;
export declare class ExtWSRedisAdapter {
  private server;
  private pub_client;
  private sub_client?;
  private id;
  private server_listeners_off;
  constructor(server: ExtWS<Record<string, unknown> | undefined>, pub_client: RedisClient, is_write_only?: boolean);
  /**
   * Detaches the adapter from the server and closes the connection receiving messages from other servers.
   * The Redis client passed to the adapter stays open.
   */
  close(): Promise<void>;
  private initSubClient;
  private publish;
  private onMessage;
}
export {};