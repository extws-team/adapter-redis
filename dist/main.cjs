var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __moduleCache = /* @__PURE__ */ new WeakMap;
var __toCommonJS = (from) => {
  var entry = __moduleCache.get(from), desc;
  if (entry)
    return entry;
  entry = __defProp({}, "__esModule", { value: true });
  if (from && typeof from === "object" || typeof from === "function")
    __getOwnPropNames(from).map((key) => !__hasOwnProp.call(entry, key) && __defProp(entry, key, {
      get: () => from[key],
      enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
    }));
  __moduleCache.set(from, entry);
  return entry;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: (newValue) => all[name] = () => newValue
    });
};

// src/main.ts
var exports_main = {};
__export(exports_main, {
  ExtWSRedisAdapter: () => ExtWSRedisAdapter
});
module.exports = __toCommonJS(exports_main);
var import_dev = require("@extws/server/dev");
var import_node_crypto = require("node:crypto");
var REDIS_PUBSUB_CHANNEL = "extws";
var REGEXP_PAYLOAD_SPLIT = /^(.{8})([0-2])([^%]+)?%/;
class ExtWSRedisAdapter {
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
    this.id = import_node_crypto.randomBytes(6).toString("base64url");
    if (!write_only) {
      this.sub_client = this.pub_client.duplicate();
      this.initSubClient().catch(console.error);
    }
    this.server.on(import_dev.OutcomePayloadEventType.SOCKET, (event) => {
      this.publish("0" /* SOCKET */, event.socket_id, event.detail);
    });
    this.server.on(import_dev.OutcomePayloadEventType.GROUP, (event) => {
      this.publish("1" /* GROUP */, event.group_id, event.detail);
    });
    this.server.on(import_dev.OutcomePayloadEventType.BROADCAST, (event) => {
      this.publish("1" /* GROUP */, import_dev.GROUP_BROADCAST, event.detail);
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
      const [
        matched,
        adapter_id,
        type,
        dest_id
      ] = match;
      if (adapter_id !== this.id) {
        const payload = redis_message.slice(matched.length);
        if (type === "0" /* SOCKET */) {
          const client = this.server.clients.get(dest_id);
          if (client) {
            client.sendPayload(payload);
          }
        } else if (type === "1" /* GROUP */) {
          this.server.publish(dest_id, payload);
        }
      }
    }
  }
}
