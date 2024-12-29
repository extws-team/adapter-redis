import { ExtWS } from '@extws/server';
import {
	OutcomePayloadEventType,
	type OutcomePayloadSocketEvent,
	type OutcomePayloadGroupEvent,
	type OutcomePayloadBroadcastEvent,
	GROUP_BROADCAST,
} from '@extws/server/dev';
import { randomBytes } from 'node:crypto';
import type {
	RedisClientType,
	RedisModules,
	RedisFunctions,
	RedisScripts,
} from 'redis';

const REDIS_PUBSUB_CHANNEL = 'extws';
const REGEXP_PAYLOAD_SPLIT = /^(.{8})([0-2])([^%]+)?%/; // adapter_id (8 symbols), target type (1 symbol), target_id (cannot contain "%", can be omitted), symbol "%", payload

type RedisClient = RedisClientType<RedisModules, RedisFunctions, RedisScripts>;

export enum RedisTarget {
	SOCKET = '0',
	GROUP = '1',
}

export class ExtWSRedisAdapter {
	private sub_client?: RedisClient;
	private id: string;

	constructor(
		private server: ExtWS,
		private pub_client: RedisClient,
		write_only: boolean = false,
	) {
		this.server = server;
		server.has_adapter = true;

		this.pub_client = pub_client;

		this.id = randomBytes(6).toString('base64url'); // 8 symbols

		if (!write_only) {
			this.sub_client = this.pub_client.duplicate();
			// eslint-disable-next-line no-console
			this.initSubClient().catch(console.error);
		}

		this.server.on<OutcomePayloadSocketEvent>(
			OutcomePayloadEventType.SOCKET,
			(event) => {
				this.publish(
					RedisTarget.SOCKET,
					event.socket_id,
					event.payload,
				);
			},
		);

		this.server.on<OutcomePayloadGroupEvent>(
			OutcomePayloadEventType.GROUP,
			(event) => {
				this.publish(
					RedisTarget.GROUP,
					event.group_id,
					event.payload,
				);
			},
		);

		this.server.on<OutcomePayloadBroadcastEvent>(
			OutcomePayloadEventType.BROADCAST,
			(event) => {
				this.publish(
					RedisTarget.GROUP,
					GROUP_BROADCAST,
					event.payload,
				);
			},
		);
	}

	private async initSubClient() {
		await this.sub_client!.connect();

		this.sub_client!.subscribe(
			REDIS_PUBSUB_CHANNEL,
			(redis_message) => {
				this.onMessage(redis_message);
			},
		);

		this.sub_client!.on(
			'error',
			// eslint-disable-next-line no-console
			console.error,
		);
	}

	publish(
		type: RedisTarget,
		channel: string,
		payload: string,
	) {
		this.pub_client.PUBLISH(
			REDIS_PUBSUB_CHANNEL,
			`${this.id}${type}${channel}%${payload}`,
		);
	}

	onMessage(redis_message: string) {
		const match = redis_message.match(REGEXP_PAYLOAD_SPLIT);
		if (match) {
			const [
				matched,
				adapter_id,
				type,
				dest_id,
			] = match;

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
					this.server.publish(
						dest_id,
						payload,
					);
				}
			}
		}
	}
}
