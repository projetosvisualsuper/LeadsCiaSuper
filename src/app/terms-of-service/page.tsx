import React from 'react';

export const metadata = {
  title: 'Termos de Serviço | Leads Cia Super',
};

export default function TermsOfService() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '4rem 2rem', fontFamily: 'system-ui, -apple-system, sans-serif', lineHeight: 1.6, color: '#1e293b' }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem', color: '#0f172a' }}>Termos de Serviço</h1>
      <p style={{ opacity: 0.7, marginBottom: '2rem' }}>Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#0f172a' }}>1. Aceitação dos Termos</h2>
        <p style={{ marginBottom: '1rem' }}>
          Ao acessar e utilizar o aplicativo <strong>Leads Cia Super</strong> (acessível através do site leads.ciasuper.com.br), você concorda em cumprir e ficar vinculado aos seguintes Termos de Serviço. 
          Se você não concordar com qualquer parte destes termos, você não deve usar nossa plataforma.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#0f172a' }}>2. Descrição do Serviço</h2>
        <p style={{ marginBottom: '1rem' }}>
          O Leads Cia Super é uma plataforma de CRM e automação de marketing que fornece ferramentas para captura de leads, disparo de campanhas, 
          páginas de captura e atendimento omnichannel (integrando mensagens de redes sociais e plataformas de comunicação de terceiros).
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#0f172a' }}>3. Uso das Integrações de Terceiros</h2>
        <p style={{ marginBottom: '1rem' }}>
          Para oferecer os recursos de caixa de entrada unificada (Inbox), nosso serviço permite a integração com APIs de redes sociais e plataformas parceiras. Ao ativar estas integrações:
        </p>
        <ul style={{ listStyleType: 'disc', paddingLeft: '2rem', marginBottom: '1rem' }}>
          <li>Você nos concede permissão para ler, gerenciar e enviar mensagens em nome das suas contas conectadas, estritamente dentro dos limites operacionais do Leads Cia Super.</li>
          <li>Você declara ser o administrador ou ter autorização legal para conectar tais contas ao nosso sistema.</li>
          <li>Você concorda em cumprir todas as Políticas de Desenvolvedor e Termos de Serviço das respectivas plataformas parceiras ao interagir com seus clientes.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#0f172a' }}>4. Responsabilidades do Usuário</h2>
        <p style={{ marginBottom: '1rem' }}>Como usuário do Leads Cia Super, você concorda que:</p>
        <ul style={{ listStyleType: 'disc', paddingLeft: '2rem', marginBottom: '1rem' }}>
          <li>É o único responsável por todo o conteúdo enviado aos seus leads e clientes através da plataforma.</li>
          <li>Não usará o sistema para enviar SPAM, conteúdo ilegal, abusivo, difamatório ou que viole direitos de terceiros.</li>
          <li>É responsável por manter a confidencialidade de suas credenciais de acesso ao sistema.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#0f172a' }}>5. Modificações do Serviço</h2>
        <p style={{ marginBottom: '1rem' }}>
          Reservamo-nos o direito de modificar, suspender ou descontinuar, temporária ou permanentemente, o serviço (ou qualquer parte dele) a qualquer momento, 
          com ou sem aviso prévio. Não seremos responsáveis perante você ou terceiros por qualquer modificação, suspensão ou descontinuação do serviço.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#0f172a' }}>6. Limitação de Responsabilidade</h2>
        <p style={{ marginBottom: '1rem' }}>
          Em nenhuma circunstância o Leads Cia Super será responsável por danos indiretos, incidentais, especiais, consequenciais ou punitivos, incluindo, sem limitação, 
          perda de lucros, dados, uso, boa vontade ou outras perdas intangíveis, resultantes do seu acesso ou uso ou incapacidade de acessar ou usar o serviço.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#0f172a' }}>7. Lei Aplicável</h2>
        <p style={{ marginBottom: '1rem' }}>
          Estes Termos serão regidos e interpretados de acordo com as leis do Brasil. Qualquer disputa decorrente destes Termos será submetida à jurisdição 
          exclusiva dos tribunais localizados no Brasil.
        </p>
      </section>
    </div>
  );
}
