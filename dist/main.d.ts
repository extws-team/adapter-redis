import { ExtWS } from "@extws/server";
import { RedisClientType, RedisFunctions, RedisModules, RedisScripts } from "redis";

//#region src/main.d.ts
type RedisClient = RedisClientType<RedisModules, RedisFunctions, RedisScripts>;
declare class ExtWSRedisAdapter {
  private server;
  private pub_client;
  private sub_client?;
  private id;
  constructor(server: ExtWS, pub_client: RedisClient, write_only?: boolean);
  private initSubClient;
  private publish;
  private onMessage;
}
//#endregion
export { ExtWSRedisAdapter };