import { ExtWS } from '@extws/server';
import type { RedisClientType, RedisModules, RedisFunctions, RedisScripts } from 'redis';
type RedisClient = RedisClientType<RedisModules, RedisFunctions, RedisScripts>;
export declare class ExtWSRedisAdapter {
    private server;
    private pub_client;
    private sub_client?;
    private id;
    constructor(server: ExtWS, pub_client: RedisClient, write_only?: boolean);
    private initSubClient;
    private publish;
    private onMessage;
}
export {};
