# @extws/adapter-redis

The Redis adapter enables message synchronization between ExtWS server instances using Redis pub/sub functionality. When you send a message using ExtWS methods (`send`, `broadcast`, etc.`), here's what happens:

1. The adapter on the sending instance publishes the message to Redis
2. Redis distributes this message to all other connected server instances
3. Each receiving instance then delivers the message to its own connected clients

So, using the Redis adapter, you can easily scale your ExtWS server across multiple servers, each handling a subset of clients and messages.

## Installation

```bash
pnpm install @extws/adapter-redis
# or
bun install @extws/adapter-redis
# or
npm install @extws/adapter-redis
```

## Usage

To start, create a ExtWS server instance and pass it your instance Redis adapter instance along with a Redis client:

```typescript
import { ExtWSRedisAdapter } from '@extws/adapter-redis';
import { createClient } from 'redis';
import { ExtWSServer } from './my-server';

// Create Redis client
const redis_client = createClient({
  url: 'redis://localhost:6379',
});
await redis_client.connect();

// Create ExtWS server
const server = new ExtWSServer();

// Create Redis adapter
const adapter = new ExtWSRedisAdapter(server, redis_client);
```

That's it! Now all messages sent through this server will be automatically sent to other servers using the same Redis adapter.

### Write-only mode

In some scenarios, you may only need to send messages from workers without receiving any incoming WebSocket connections. For these cases, you can initialize an empty ExtWS server and connect it to the adapter in write-only mode, eliminating the need for a full WebSocket server setup:

```typescript
const server = new ExtWS(); // ExtWS server with no real WebSocket server
const adapter = new ExtWSRedisAdapter(server, redis_client, true);

server.broadcast('hello');
```

This configuration allows you to broadcast messages to other nodes that have active WebSocket servers, while your current worker operates more efficiently by:
- avoiding the overhead of running a WebSocket server;
- skipping the processing of incoming messages from the Redis adapter.

This approach is particularly useful for dedicated message-sending workers in a distributed system.
