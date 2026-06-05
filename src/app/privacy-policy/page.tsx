import React from 'react';

export const metadata = {
  title: 'Política de Privacidade | Leads Cia Super',
};

export default function PrivacyPolicy() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '4rem 2rem', fontFamily: 'system-ui, -apple-system, sans-serif', lineHeight: 1.6, color: '#1e293b' }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem', color: '#0f172a' }}>Política de Privacidade</h1>
      <p style={{ opacity: 0.7, marginBottom: '2rem' }}>Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#0f172a' }}>1. Introdução</h2>
        <p style={{ marginBottom: '1rem' }}>
          O aplicativo <strong>Leads Cia Super</strong> (acessível através do site leads.ciasuper.com.br, doravante denominado "nós", "nosso" ou "Leads Cia Super") respeita a sua privacidade e está comprometido em proteger as suas informações pessoais. 
          Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e compartilhamos os seus dados quando você utiliza nossa plataforma 
          e nossas integrações, incluindo a integração com plataformas de terceiros, redes sociais e aplicativos de mensagens parceiros.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#0f172a' }}>2. Informações que Coletamos de Plataformas de Terceiros</h2>
        <p style={{ marginBottom: '1rem' }}>
          Ao conectar suas contas de redes sociais ou plataformas de mensagens ao Leads Cia Super, podemos solicitar acesso a informações específicas através das APIs destas plataformas para 
          fornecer nossos serviços de gestão de atendimento omnichannel. Os dados coletados incluem:
        </p>
        <ul style={{ listStyleType: 'disc', paddingLeft: '2rem', marginBottom: '1rem' }}>
          <li>Informações públicas do perfil (nome, foto de perfil, etc.).</li>
          <li>Conteúdo de mensagens diretas enviadas para suas contas conectadas, estritamente para o propósito de gerenciamento do atendimento via nossa caixa de entrada (Inbox).</li>
          <li>Tokens de autenticação seguros para manter a conexão entre a plataforma e suas contas sociais.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#0f172a' }}>3. Como Usamos as Informações</h2>
        <p style={{ marginBottom: '1rem' }}>Utilizamos as informações coletadas estritamente para:</p>
        <ul style={{ listStyleType: 'disc', paddingLeft: '2rem', marginBottom: '1rem' }}>
          <li>Permitir que você visualize e responda a mensagens de seus clientes (leads) diretamente pelo painel do Leads Cia Super.</li>
          <li>Fornecer métricas e relatórios gerenciais sobre o volume de atendimento.</li>
          <li>Garantir o funcionamento técnico e seguro da integração entre os nossos sistemas e os das plataformas parceiras.</li>
        </ul>
        <p style={{ marginBottom: '1rem' }}>
          <strong>Importante:</strong> Não usamos o conteúdo das mensagens dos seus clientes para fins de publicidade direcionada, nem o vendemos ou compartilhamos com terceiros para quaisquer outros fins não relacionados à prestação do nosso serviço de CRM.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#0f172a' }}>4. Armazenamento e Segurança dos Dados</h2>
        <p style={{ marginBottom: '1rem' }}>
          Adotamos medidas de segurança técnicas e organizacionais adequadas para proteger seus dados pessoais e as informações de seus clientes contra acesso, 
          alteração, divulgação ou destruição não autorizados. Os dados são processados de forma segura e armazenados apenas pelo tempo necessário para cumprir as finalidades do serviço.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#0f172a' }}>5. Compartilhamento de Dados</h2>
        <p style={{ marginBottom: '1rem' }}>
          Nós não compartilhamos, vendemos ou alugamos suas informações pessoais ou as mensagens dos seus clientes para terceiros, exceto quando exigido por lei 
          ou sob solicitação formal de autoridades judiciais competentes.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#0f172a' }}>6. Seus Direitos (Deleção de Dados)</h2>
        <p style={{ marginBottom: '1rem' }}>
          Conforme exigido pelas Políticas das plataformas parceiras e legislações de proteção de dados aplicáveis, você tem o direito de solicitar a remoção de seus dados.
          Se você desejar que removamos as suas integrações e apaguemos todos os dados associados a elas, você pode:
        </p>
        <ul style={{ listStyleType: 'disc', paddingLeft: '2rem', marginBottom: '1rem' }}>
          <li>Desconectar o aplicativo "Leads Cia Super" acessando as configurações de integrações e segurança na respectiva plataforma de terceiro conectada.</li>
          <li>Solicitar a exclusão total da sua conta e dos dados através do suporte direto na nossa plataforma.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#0f172a' }}>7. Contato</h2>
        <p style={{ marginBottom: '1rem' }}>
          Se você tiver alguma dúvida sobre esta Política de Privacidade ou sobre o tratamento dos seus dados, entre em contato conosco através do suporte oficial do sistema.
        </p>
      </section>
    </div>
  );
}
