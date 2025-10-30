//#region rolldown:runtime
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));

//#endregion
let node_crypto = require("node:crypto");
node_crypto = __toESM(node_crypto);
let __extws_server_dev = require("@extws/server/dev");
__extws_server_dev = __toESM(__extws_server_dev);

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
		server.has_adapter = true;
		this.id = (0, node_crypto.randomBytes)(6).toString("base64url");
		if (!write_only) {
			this.sub_client = this.pub_client.duplicate();
			this.initSubClient().catch(console.error);
		}
		this.server.on(__extws_server_dev.OutcomePayloadEventType.SOCKET, (event) => {
			this.publish(RedisTarget.SOCKET, event.socket_id, event.detail);
		});
		this.server.on(__extws_server_dev.OutcomePayloadEventType.CHANNEL, (event) => {
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
exports.ExtWSRedisAdapter = ExtWSRedisAdapter;