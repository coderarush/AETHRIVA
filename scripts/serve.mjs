import {createLocalServer} from '../server/http-server.mjs';

const server = createLocalServer();
server.listen(4173, '127.0.0.1', () => console.log('AETHRIVA Local: http://127.0.0.1:4173'));
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE' ? 'Port 4173 is already in use. Close the previous AETHRIVA preview before starting this server.' : 'The local AETHRIVA server could not start.');
  process.exitCode = 1;
});
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close());
