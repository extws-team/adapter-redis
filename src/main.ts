import { randomBytes } from 'node:crypto';
import type { ExtWS } from '@extws/server';
import {
	deliverToChannel,
	deliverToSocket,
	OutcomePayloadEventType,
} from '@extws/server/dev';
import type {
	RedisClientType,
	RedisFunctions,
	RedisModules,
	RedisScripts,
} from 'redis';

const REDIS_PUBSUB_CHANNEL = 'extws';
const REGEXP_PAYLOAD_SPLIT =
	/^(?<adapter_id>.{8})(?<type>[0-2])(?<dest_id>[^%]+)?%/u; // adapter_id (8 symbols), target type (1 symbol), target_id (cannot contain "%", can be omitted), symbol "%", payload

type RedisClient = RedisClientType<RedisModules, RedisFunctions, RedisScripts>;

enum RedisTarget {
	SOCKET = '0',
	GROUP = '1',
}

export class ExtWSRedisAdapter {
	private sub_client?: RedisClient;
	private id: string;
	private server_listeners_off: (() => void)[];

	constructor(
		private server: ExtWS<Record<string, unknown> | undefined>,
		private pub_client: RedisClient,
		is_write_only = false,
	) {
		server.has_adapter = true;

		this.id = randomBytes(6).toString('base64url'); // 8 symbols

		if (!is_write_only) {
			this.sub_client = this.pub_client.duplicate();
			this.initSubClient();
		}

		this.server_listeners_off = [
			this.server.on(OutcomePayloadEventType.SOCKET, (event) => {
				this.publish(RedisTarget.SOCKET, event.socket_id, event.detail);
			}),
			this.server.on(OutcomePayloadEventType.CHANNEL, (event) => {
				this.publish(RedisTarget.GROUP, event.channel_id, event.detail);
			}),
		];
	}

	/**
	 * Detaches the adapter from the server and closes the connection receiving messages from other servers.
	 * The Redis client passed to the adapter stays open.
	 */
	async close(): Promise<void> {
		for (const off of this.server_listeners_off) {
			off();
		}

		this.server.has_adapter = false;

		if (this.sub_client?.isOpen) {
			await this.sub_client.disconnect();
		}
	}

	private async initSubClient() {
		// listen before connecting, an `error` event without a listener crashes the process
		this.sub_client!.on(
			'error',
			// oxlint-disable-next-line no-console
			console.error,
		);

		try {
			await this.sub_client!.connect();

			await this.sub_client!.subscribe(
				REDIS_PUBSUB_CHANNEL,
				(redis_message) => {
					this.onMessage(redis_message);
				},
			);
		} catch (error) {
			// oxlint-disable-next-line no-console
			console.error(error);
		}
	}

	private async publish(type: RedisTarget, channel: string, payload: string) {
		try {
			await this.pub_client.PUBLISH(
				REDIS_PUBSUB_CHANNEL,
				`${this.id}${type}${channel}%${payload}`,
			);
		} catch (error) {
			// nobody awaits this call, so a rejection would crash the process
			// oxlint-disable-next-line no-console
			console.error(error);
		}
	}

	private onMessage(redis_message: string) {
		const match = redis_message.match(REGEXP_PAYLOAD_SPLIT);
		if (match?.groups) {
			const { adapter_id, type, dest_id } = match.groups;

			if (adapter_id !== this.id) {
				const payload = redis_message.slice(match[0].length);

				if (type === RedisTarget.SOCKET) {
					deliverToSocket(this.server, dest_id!, payload);
				} else if (type === RedisTarget.GROUP) {
					deliverToChannel(this.server, dest_id!, payload);
				}
			}
		}
	}
}
