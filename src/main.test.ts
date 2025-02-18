import {
	expect,
	test,
} from 'vitest';
import { ExtWSTest } from '../test/server.js';
import { ExtWSRedisAdapter } from '../src/main.js';
import { createClient } from 'redis';
import {
	CHANNEL_GROUP_PREFIX,
	CHANNEL_BROADCAST,
} from '@extws/server/dev';

const first_server = new ExtWSTest({});
const second_server = new ExtWSTest({});

const pub_client = createClient({
	url: 'redis://localhost:16379',
});
await pub_client.connect();

const _first_adapter = new ExtWSRedisAdapter(
	first_server,
	pub_client,
);

const _second_adapter = new ExtWSRedisAdapter(
	second_server,
	pub_client,
);

// let the sub_client connect
await new Promise((resolve) => {
	setTimeout(resolve, 100);
});

test('sendToSocket', async () => {
	second_server.open();
	const client_id = second_server.clients.keys().next().value;

	const promise = second_server.eventTarget.wait('test:publish:socket');
	first_server.sendToSocket(
		client_id,
		{
			foo: 'bar',
		},
	);

	const event = await promise;
	expect(event.detail.payload).toBe('4{"foo":"bar"}');
});

test('sendToGroup', async () => {
	const promise = second_server.eventTarget.wait('test:publish:channel');
	first_server.sendToGroup(
		'test',
		{
			foo: 'bar',
		},
	);

	const event = await promise;

	expect(event.detail.channel_id).toBe(`${CHANNEL_GROUP_PREFIX}test`);
	expect(event.detail.payload).toBe('4{"foo":"bar"}');
});

test('broadcast', async () => {
	const promise = second_server.eventTarget.wait('test:publish:channel');
	first_server.broadcast(
		{
			foo: 'bar',
		},
	);

	const event = await promise;

	expect(event.detail.channel_id).toBe(CHANNEL_BROADCAST);
	expect(event.detail.payload).toBe('4{"foo":"bar"}');
});
