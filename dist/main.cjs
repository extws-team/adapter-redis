Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
let node_crypto = require("node:crypto");
let _extws_server_dev = require("@extws/server/dev");
// src/main.ts
const REDIS_PUBSUB_CHANNEL = "extws";
const REGEXP_PAYLOAD_SPLIT = /^(?<adapter_id>.{8})(?<type>[0-2])(?<dest_id>[^%]+)?%/u;
var ExtWSRedisAdapter = class {
	server;
	pub_client;
	sub_client;
	id;
	constructor(server, pub_client, is_write_only = false) {
		this.server = server;
		this.pub_client = pub_client;
		server.has_adapter = true;
		this.id = (0, node_crypto.randomBytes)(6).toString("base64url");
		if (!is_write_only) {
			this.sub_client = this.pub_client.duplicate();
			this.initSubClient();
		}
		this.server.on(_extws_server_dev.OutcomePayloadEventType.SOCKET, (event) => {
			this.publish("0", event.socket_id, event.detail);
		});
		this.server.on(_extws_server_dev.OutcomePayloadEventType.CHANNEL, (event) => {
			this.publish("1", event.channel_id, event.detail);
		});
	}
	async initSubClient() {
		try {
			await this.sub_client.connect();
			this.sub_client.subscribe(REDIS_PUBSUB_CHANNEL, (redis_message) => {
				this.onMessage(redis_message);
			});
			this.sub_client.on("error", console.error);
		} catch (error) {
			console.error(error);
		}
	}
	publish(type, channel, payload) {
		this.pub_client.PUBLISH(REDIS_PUBSUB_CHANNEL, `${this.id}${type}${channel}%${payload}`);
	}
	onMessage(redis_message) {
		const match = redis_message.match(REGEXP_PAYLOAD_SPLIT);
		if (match?.groups) {
			const { adapter_id, type, dest_id } = match.groups;
			if (adapter_id !== this.id) {
				const payload = redis_message.slice(match[0].length);
				if (type === "0") (0, _extws_server_dev.deliverToSocket)(this.server, dest_id, payload);
				else if (type === "1") (0, _extws_server_dev.deliverToChannel)(this.server, dest_id, payload);
			}
		}
	}
};
exports.ExtWSRedisAdapter = ExtWSRedisAdapter;
