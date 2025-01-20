import {
	ExtWS,
	ExtWSClient,
} from '@extws/server';
import { IP } from '@kirick/ip';
import {
	type NeoEvent,
	NeoEventTarget,
} from 'neoevents';
import { ExtWSTestClient } from './client.js';

export class ExtWSTest extends ExtWS {
	eventTarget = new NeoEventTarget<{
		'test:publish:group': NeoEvent<{
			group_id: string,
			payload: string,
		}>,
		'test:publish:socket': NeoEvent<{
			payload: string,
		}>,
	}>();

	open() {
		const client = new ExtWSTestClient(
			this,
			{
				url: new URL('http://ws'),
				headers: new Map(),
				ip: new IP('::1'),
			},
		);

		this.onConnect(client);

		return client;
	}

	onMessage(client: ExtWSClient, payload: string): void {
		super.onMessage(client, payload);
	}

	protected publish(group_id: string, payload: string) {
		this.eventTarget.emit(
			'test:publish:group',
			{
				group_id,
				payload,
			},
		);
	}
}
