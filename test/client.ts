import { ExtWSClient } from '@extws/server';
import { ExtWSTest } from './server.js';

export class ExtWSTestClient extends ExtWSClient {
	declare server: ExtWSTest;

	sendPayload(payload: string): void {
		this.server.eventTarget.emit('test:publish:socket', {
			payload,
		});
	}

	// oxlint-disable-next-line class-methods-use-this
	addToChannel(_channel_id: string): void {
		// do nothing
	}

	// oxlint-disable-next-line class-methods-use-this
	removeFromChannel(_channel_id: string): void {
		// do nothing
	}
}
