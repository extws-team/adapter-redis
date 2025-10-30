import { ExtWSClient } from '@extws/server';
import { ExtWSTest } from './server.js';

export class ExtWSTestClient extends ExtWSClient {
	declare server: ExtWSTest;

	protected override sendPayload(payload: string): void {
		this.server.eventTarget.emit('test:publish:socket', {
			payload,
		});
	}

	// oxlint-disable-next-line class-methods-use-this
	protected override addToChannel(_channel_id: string): void {
		// do nothing
	}

	// oxlint-disable-next-line class-methods-use-this
	protected override removeFromChannel(_channel_id: string): void {
		// do nothing
	}
}
