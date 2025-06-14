/* eslint-disable class-methods-use-this */

import { ExtWSClient } from '@extws/server';
import { ExtWSTest } from './server.js';

export class ExtWSTestClient extends ExtWSClient {
	declare server: ExtWSTest;

	protected override sendPayload(payload: string): void {
		this.server.eventTarget.emit(
			'test:publish:socket',
			{
				payload,
			},
		);
	}

	protected override addToChannel(_channel_id: string): void {
		// do nothing
	}

	protected override removeFromChannel(_channel_id: string): void {
		// do nothing
	}
}
