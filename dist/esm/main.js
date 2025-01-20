import { OutcomePayloadEventType, GROUP_BROADCAST, } from '@extws/server/dev';
import { randomBytes } from 'node:crypto';
const REDIS_PUBSUB_CHANNEL = 'extws';
const REGEXP_PAYLOAD_SPLIT = /^(.{8})([0-2])([^%]+)?%/; // adapter_id (8 symbols), target type (1 symbol), target_id (cannot contain "%", can be omitted), symbol "%", payload
var RedisTarget;
(function (RedisTarget) {
    RedisTarget["SOCKET"] = "0";
    RedisTarget["GROUP"] = "1";
})(RedisTarget || (RedisTarget = {}));
export class ExtWSRedisAdapter {
    server;
    pub_client;
    sub_client;
    id;
    constructor(server, pub_client, write_only = false) {
        this.server = server;
        this.pub_client = pub_client;
        this.server = server;
        server.has_adapter = true;
        this.pub_client = pub_client;
        this.id = randomBytes(6).toString('base64url'); // 8 symbols
        if (!write_only) {
            this.sub_client = this.pub_client.duplicate();
            // eslint-disable-next-line no-console
            this.initSubClient().catch(console.error);
        }
        this.server.on(OutcomePayloadEventType.SOCKET, (event) => {
            this.publish(RedisTarget.SOCKET, event.socket_id, event.detail);
        });
        this.server.on(OutcomePayloadEventType.GROUP, (event) => {
            this.publish(RedisTarget.GROUP, event.group_id, event.detail);
        });
        this.server.on(OutcomePayloadEventType.BROADCAST, (event) => {
            this.publish(RedisTarget.GROUP, GROUP_BROADCAST, event.detail);
        });
    }
    async initSubClient() {
        await this.sub_client.connect();
        this.sub_client.subscribe(REDIS_PUBSUB_CHANNEL, (redis_message) => {
            this.onMessage(redis_message);
        });
        this.sub_client.on('error', 
        // eslint-disable-next-line no-console
        console.error);
    }
    publish(type, channel, payload) {
        this.pub_client.PUBLISH(REDIS_PUBSUB_CHANNEL, `${this.id}${type}${channel}%${payload}`);
    }
    onMessage(redis_message) {
        const match = redis_message.match(REGEXP_PAYLOAD_SPLIT);
        if (match) {
            const [matched, adapter_id, type, dest_id,] = match;
            if (adapter_id !== this.id) {
                const payload = redis_message.slice(matched.length);
                if (type === RedisTarget.SOCKET) {
                    const client = this.server.clients.get(dest_id);
                    if (client) {
                        // @ts-expect-error Protected property
                        client.sendPayload(payload);
                    }
                }
                else if (type === RedisTarget.GROUP) {
                    // @ts-expect-error Protected property
                    this.server.publish(dest_id, payload);
                }
            }
        }
    }
}
