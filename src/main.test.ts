import { CHANNEL_BROADCAST, CHANNEL_GROUP_PREFIX } from '@extws/server/dev';
import { createClient } from 'redis';
import { expect, test, vi } from 'vitest';
import { ExtWSRedisAdapter } from '../src/main.js';
import { ExtWSTest } from '../test/server.js';

const first_server = new ExtWSTest();
const second_server = new ExtWSTest();

const pub_client = createClient({
	url: 'redis://localhost:16379',
});
await pub_client.connect();

const _first_adapter = new ExtWSRedisAdapter(first_server, pub_client);

const second_adapter = new ExtWSRedisAdapter(second_server, pub_client);

// let the sub_client connect
await new Promise((resolve) => {
	setTimeout(resolve, 100);
});

test('sendToSocket', async () => {
	second_server.open();
	const client_id = second_server.clients.keys().next().value;
	if (client_id === undefined) {
		throw new Error('No client ID found on the server.');
	}

	const promise = second_server.eventTarget.wait('test:publish:socket');
	first_server.sendToSocket(client_id, {
		foo: 'bar',
	});

	const event = await promise;
	expect(event.detail.payload).toBe('4{"foo":"bar"}');
});

test('sendToGroup', async () => {
	const promise = second_server.eventTarget.wait('test:publish:channel');
	first_server.sendToGroup('test', {
		foo: 'bar',
	});

	const event = await promise;

	expect(event.detail.channel_id).toBe(`${CHANNEL_GROUP_PREFIX}test`);
	expect(event.detail.payload).toBe('4{"foo":"bar"}');
});

test('broadcast', async () => {
	const promise = second_server.eventTarget.wait('test:publish:channel');
	first_server.broadcast({
		foo: 'bar',
	});

	const event = await promise;

	expect(event.detail.channel_id).toBe(CHANNEL_BROADCAST);
	expect(event.detail.payload).toBe('4{"foo":"bar"}');
});

test('failed publish is logged instead of crashing the process', async () => {
	const closed_client = createClient({
		url: 'redis://localhost:16379',
	});
	await closed_client.connect();
	await closed_client.disconnect();

	const server = new ExtWSTest();
	const adapter = new ExtWSRedisAdapter(server, closed_client, true);
	const console_error = vi.spyOn(console, 'error').mockImplementation(() => {
		// the error is expected
	});

	server.broadcast({
		foo: 'bar',
	});
	await new Promise((resolve) => {
		setTimeout(resolve, 100);
	});

	expect(console_error).toHaveBeenCalled();
	console_error.mockRestore();
	await adapter.close();
});

test('close', async () => {
	await second_adapter.close();
	expect(second_server.has_adapter).toBe(false);

	let is_received = false;
	second_server.eventTarget.once('test:publish:channel', () => {
		is_received = true;
	});

	first_server.broadcast({
		foo: 'bar',
	});
	await new Promise((resolve) => {
		setTimeout(resolve, 200);
	});

	expect(is_received).toBe(false);
});
