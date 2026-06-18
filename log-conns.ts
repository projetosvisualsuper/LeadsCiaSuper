import { d1Api } from './src/services/d1';

async function logConnections() {
  const conns = await d1Api.getWhatsappConnections();
  console.log(JSON.stringify(conns, null, 2));
}

logConnections();
