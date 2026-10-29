import { randomBytes } from "node:crypto";
import { OutcomePayloadEventType, deliverToChannel, deliverToSocket } from "@extws/server/dev";
// src/main.ts
const REDIS_PUBSUB_CHANNEL = "extws";
const REGEXP_PAYLOAD_SPLIT = /^(?<adapter_id>.{8})(?<type>[0-2])(?<dest_id>[^%]+)?%/u;
var ExtWSRedisAdapter = class {
	server;
	pub_client;
	sub_client;
	id;
	server_listeners_off;
	constructor(server, pub_client, is_write_only = false) {
		this.server = server;
		this.pub_client = pub_client;
		server.has_adapter = true;
		this.id = randomBytes(6).toString("base64url");
		if (!is_write_only) {
			this.sub_client = this.pub_client.duplicate();
			this.initSubClient();
		}
		this.server_listeners_off = [this.server.on(OutcomePayloadEventType.SOCKET, (event) => {
			this.publish("0", event.socket_id, event.detail);
		}), this.server.on(OutcomePayloadEventType.CHANNEL, (event) => {
			this.publish("1", event.channel_id, event.detail);
		})];
	}
	/**
	* Detaches the adapter from the server and closes the connection receiving messages from other servers.
	* The Redis client passed to the adapter stays open.
	*/
	async close() {
		for (const off of this.server_listeners_off) off();
		this.server.has_adapter = false;
		if (this.sub_client?.isOpen) await this.sub_client.disconnect();
	}
	async initSubClient() {
		this.sub_client.on("error", console.error);
		try {
			await this.sub_client.connect();
			await this.sub_client.subscribe(REDIS_PUBSUB_CHANNEL, (redis_message) => {
				this.onMessage(redis_message);
			});
		} catch (error) {
			console.error(error);
		}
	}
	async publish(type, channel, payload) {
		try {
			await this.pub_client.PUBLISH(REDIS_PUBSUB_CHANNEL, `${this.id}${type}${channel}%${payload}`);
		} catch (error) {
			console.error(error);
		}
	}
	onMessage(redis_message) {
		const match = redis_message.match(REGEXP_PAYLOAD_SPLIT);
		if (match?.groups) {
			const { adapter_id, type, dest_id } = match.groups;
			if (adapter_id !== this.id) {
				const payload = redis_message.slice(match[0].length);
				if (type === "0") deliverToSocket(this.server, dest_id, payload);
				else if (type === "1") deliverToChannel(this.server, dest_id, payload);
			}
		}
	}
};
export { ExtWSRedisAdapter };
