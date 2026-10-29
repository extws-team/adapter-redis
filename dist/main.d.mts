import { ExtWS } from "@extws/server";
import { RedisClientType, RedisFunctions, RedisModules, RedisScripts } from "redis";
type RedisClient = RedisClientType<RedisModules, RedisFunctions, RedisScripts>;
export declare class ExtWSRedisAdapter {
  private server;
  private pub_client;
  private sub_client?;
  private id;
  constructor(server: ExtWS<Record<string, unknown> | undefined>, pub_client: RedisClient, is_write_only?: boolean);
  private initSubClient;
  private publish;
  private onMessage;
}
export {};