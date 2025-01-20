/* eslint-disable class-methods-use-this */

import { ExtWSClient } from '@extws/server';
import { ExtWSTest } from './server.js';

export class ExtWSTestClient extends ExtWSClient {
	declare server: ExtWSTest;

	protected sendPayload(payload: string) {
		this.server.eventTarget.emit(
			'test:publish:socket',
			{
				payload,
			},
		);
	}

	protected addToGroup(_group_id: string) {
		// do nothing
	}

	protected removeFromGroup(_group_id: string) {
		// do nothing
	}
}
