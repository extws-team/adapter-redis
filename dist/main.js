import { ExtWS } from "@extws/server";
import { OutcomePayloadEventType } from "@extws/server/dev";
import { randomBytes } from "node:crypto";

//#region src/main.ts
const REDIS_PUBSUB_CHANNEL = "extws";
const REGEXP_PAYLOAD_SPLIT = /^(.{8})([0-2])([^%]+)?%/;
var RedisTarget = /* @__PURE__ */ function(RedisTarget$1) {
	RedisTarget$1["SOCKET"] = "0";
	RedisTarget$1["GROUP"] = "1";
	return RedisTarget$1;
}(RedisTarget || {});
var ExtWSRedisAdapter = class {
	sub_client;
	id;
	constructor(server, pub_client, write_only = false) {
		this.server = server;
		this.pub_client = pub_client;
		this.server = server;
		server.has_adapter = true;
		this.pub_client = pub_client;
		this.id = randomBytes(6).toString("base64url");
		if (!write_only) {
			this.sub_client = this.pub_client.duplicate();
			this.initSubClient().catch(console.error);
		}
		this.server.on(OutcomePayloadEventType.SOCKET, (event) => {
			this.publish(RedisTarget.SOCKET, event.socket_id, event.detail);
		});
		this.server.on(OutcomePayloadEventType.CHANNEL, (event) => {
			this.publish(RedisTarget.GROUP, event.channel_id, event.detail);
		});
	}
	async initSubClient() {
		await this.sub_client.connect();
		this.sub_client.subscribe(REDIS_PUBSUB_CHANNEL, (redis_message) => {
			this.onMessage(redis_message);
		});
		this.sub_client.on("error", console.error);
	}
	publish(type, channel, payload) {
		this.pub_client.PUBLISH(REDIS_PUBSUB_CHANNEL, `${this.id}${type}${channel}%${payload}`);
	}
	onMessage(redis_message) {
		const match = redis_message.match(REGEXP_PAYLOAD_SPLIT);
		if (match) {
			const [matched, adapter_id, type, dest_id] = match;
			if (adapter_id !== this.id) {
				const payload = redis_message.slice(matched.length);
				if (type === RedisTarget.SOCKET) {
					const client = this.server.clients.get(dest_id);
					if (client) client.sendPayload(payload);
				} else if (type === RedisTarget.GROUP) this.server.publish(dest_id, payload);
			}
		}
	}
};

//#endregion
export { ExtWSRedisAdapter };