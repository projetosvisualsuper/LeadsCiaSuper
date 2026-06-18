import { sendOmnichannelMessageAction } from './src/app/actions/chat';

async function testSend() {
  console.log('Testing send...');
  try {
    const result = await sendOmnichannelMessageAction('5548935001794', 'whatsapp', 'Teste local via CLI');
    console.log('Result:', result);
  } catch (err) {
    console.error('Error:', err);
  }
}

testSend();
