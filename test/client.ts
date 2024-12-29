/* eslint-disable class-methods-use-this */
/* eslint-disable no-warning-comments */

import { ExtWSClient } from '@extws/server';

// TODO: remove when drop support for nodejs <23
export class TestClientPublishEvent extends Event {
	static type = 'test:client:publish';

	constructor(public payload: string) {
		super(TestClientPublishEvent.type);
	}
}

export class ExtWSTestClient extends ExtWSClient {
	protected sendPayload(payload: string) {
		this.server.dispatchEvent(
			// TODO: replace with CustomEvent when drop support for nodejs <23
			new TestClientPublishEvent(payload),
		);
	}

	protected addToGroup(_group_id: string) {
		// do nothing
	}

	protected removeFromGroup(_group_id: string) {
		// do nothing
	}
}
