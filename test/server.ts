import { ExtWS, ExtWSClient } from '@extws/server';
import { IP } from '@kirick/ip';
import { type NeoEvent, NeoEventTarget } from 'neoevents';
import { ExtWSTestClient } from './client.js';

export class ExtWSTest extends ExtWS {
	eventTarget = new NeoEventTarget<{
		'test:publish:channel': NeoEvent<{
			channel_id: string;
			payload: string;
		}>;
		'test:publish:socket': NeoEvent<{
			payload: string;
		}>;
	}>();

	open() {
		const client = new ExtWSTestClient(this, {
			url: new URL('http://ws'),
			headers: new Headers(),
			ip: new IP('::1'),
		});

		this.onConnect(client);

		return client;
	}

	override onMessage(client: ExtWSClient, payload: string): void {
		super.onMessage(client, payload);
	}

	protected override publish(channel_id: string, payload: string): void {
		this.eventTarget.emit('test:publish:channel', {
			channel_id,
			payload,
		});
	}
}
