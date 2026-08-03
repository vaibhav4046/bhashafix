import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import next from "next";

const hostname = "127.0.0.1";
const port = 3100;

/**
 * Start the already-built Next application without a shell or child-process
 * wrapper. Returning the teardown lets Playwright await both the HTTP server
 * and Next's own resources instead of relying on platform-specific process
 * tree termination.
 */
export default async function globalSetup() {
  const app = next({ dev: false, dir: process.cwd(), hostname, port });
  await app.prepare();
  const handle = app.getRequestHandler();
  const server = createServer((request, response) => {
    void handle(request, response).catch((error: unknown) => {
      response.statusCode = 500;
      response.end("Internal Server Error");
      console.error(error);
    });
  });

  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => reject(error);
    server.once("error", onError);
    server.listen(port, hostname, () => {
      server.off("error", onError);
      const address = server.address() as AddressInfo | null;
      if (!address || address.port !== port) {
        reject(new Error(`Playwright server did not bind to ${hostname}:${port}.`));
        return;
      }
      resolve();
    });
  }).catch(async (error: unknown) => {
    await app.close();
    throw error;
  });
  return async () => {
    // Stop accepting work, then sever idle and persistent browser connections
    // so server.close cannot wait forever on Windows keep-alive sockets.
    const closed = new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    server.closeIdleConnections();
    server.closeAllConnections();
    await Promise.all([closed, app.close()]);
  };
}
