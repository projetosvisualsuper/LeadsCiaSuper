import { d1Api } from './src/services/d1';

async function updateDB() {
  const conns = await d1Api.getWhatsappConnections();
  const evo = conns.find(c => c.evolutionInstanceName === 'atendimento_geral');
  if (evo) {
    await d1Api.updateWhatsappConnection(evo.id, { status: 'connected' });
    console.log('Successfully updated DB!');
  } else {
    console.log('Connection not found');
  }
}

updateDB();
