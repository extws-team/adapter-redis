import {
	expect,
	test,
} from 'vitest';
import {
	ExtWSTest,
	TestPublishEvent,
} from '../test/server.js';
import {
	ExtWSRedisAdapter,
} from '../src/main.js';
import { createClient } from 'redis';
import {
	GROUP_BROADCAST,
} from '@extws/server/dev';
import { TestClientPublishEvent } from '../test/client.js';

const first_server = new ExtWSTest();
const second_server = new ExtWSTest();

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

	const promise = second_server.wait<TestClientPublishEvent>(TestClientPublishEvent.type);
	first_server.sendToSocket(
		client_id,
		{
			foo: 'bar',
		},
	);

	const event = await promise;
	expect(event.type).toBe(TestClientPublishEvent.type);
	expect(event.payload).toBe('4{"foo":"bar"}');
});

test('sendToGroup', async () => {
	const promise = second_server.wait<TestPublishEvent>(TestPublishEvent.type);
	first_server.sendToGroup(
		'p-test',
		{
			foo: 'bar',
		},
	);

	const event = await promise;

	expect(event.type).toBe(TestPublishEvent.type);
	expect(event.group_id).toBe('p-test');
	expect(event.payload).toBe('4{"foo":"bar"}');
});

test('broadcast', async () => {
	const promise = second_server.wait<TestPublishEvent>(TestPublishEvent.type);
	first_server.broadcast(
		{
			foo: 'bar',
		},
	);

	const event = await promise;

	expect(event.type).toBe(TestPublishEvent.type);
	expect(event.group_id).toBe(GROUP_BROADCAST);
	expect(event.payload).toBe('4{"foo":"bar"}');
});
