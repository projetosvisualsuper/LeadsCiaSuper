import React from 'react';

export const metadata = {
  title: 'Política de Privacidade | Leads Cia Super',
};

export default function PrivacyPolicy() {
  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(to bottom, #0f172a, #1e293b)',
      color: '#cbd5e1',
      fontFamily: "'Outfit', 'Inter', system-ui, sans-serif",
      lineHeight: 1.7,
      padding: '4rem 1.5rem'
    }}>
      <div style={{ 
        maxWidth: '850px', 
        margin: '0 auto', 
        background: 'rgba(30, 41, 59, 0.7)',
        backdropFilter: 'blur(10px)',
        borderRadius: '24px',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        padding: '3.5rem 3rem',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '2rem', marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.75rem', letterSpacing: '-0.025em' }}>
            Política de Privacidade
          </h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.9375rem' }}>
            Aplicativo: <strong style={{ color: '#3b82f6' }}>Leads Cia Super</strong> (acessível em <a href="https://mkt.ciasuper.com.br" style={{ color: '#3b82f6', textDecoration: 'none' }}>mkt.ciasuper.com.br</a>)
          </p>
          <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>
        </div>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#ffffff' }}>1. Introdução</h2>
          <p style={{ marginBottom: '1rem' }}>
            O aplicativo <strong>Leads Cia Super</strong> (operado no domínio <strong>mkt.ciasuper.com.br</strong>) está totalmente comprometido com a segurança e a proteção da privacidade dos seus usuários.
            Esta Política de Privacidade esclarece de forma transparente como coletamos, tratamos, armazenamos e protegemos as informações fornecidas por você e os dados gerados através de integrações com redes sociais e plataformas de terceiros (como o TikTok).
          </p>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#ffffff' }}>2. Escopos de Acesso e Coleta de Dados</h2>
          <p style={{ marginBottom: '1.1rem' }}>
            Para habilitar os recursos de CRM de atendimento, sincronização e respostas em tempo real, o aplicativo <strong>Leads Cia Super</strong> solicita permissões específicas das plataformas parceiras. Especificamente em relação à sua conta de rede social conectada, coletamos:
          </p>
          <ul style={{ listStyleType: 'disc', paddingLeft: '1.75rem', marginBottom: '1rem', display: 'grid', gap: '0.75rem' }}>
            <li>
              <strong style={{ color: '#ffffff' }}>Informações Básicas do Perfil (escopo user.info.basic):</strong> Usamos o nome de usuário público, imagem de perfil e identificador único da conta para personalizar sua interface no painel administrativo do <strong>Leads Cia Super</strong> e identificar de qual conta os dados são provenientes.
            </li>
            <li>
              <strong style={{ color: '#ffffff' }}>Lista de Vídeos (escopo video.list):</strong> Acessamos a lista de publicações de vídeo da sua conta para obter os comentários postados pelos clientes e permitir que você responda a essas interações diretamente a partir da nossa caixa de entrada unificada do CRM.
            </li>
          </ul>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#ffffff' }}>3. Como Utilizamos os Dados</h2>
          <p style={{ marginBottom: '1rem' }}>
            Todas as informações obtidas são processadas exclusivamente para viabilizar as funcionalidades da plataforma de CRM do <strong>Leads Cia Super</strong>, que consistem em:
          </p>
          <ul style={{ listStyleType: 'disc', paddingLeft: '1.75rem', marginBottom: '1rem', display: 'grid', gap: '0.5rem' }}>
            <li>Exibição centralizada de contatos, interações e comentários recebidos em suas contas.</li>
            <li>Envio de respostas a comentários de forma automatizada ou manual a partir do painel administrativo do site <strong>mkt.ciasuper.com.br</strong>.</li>
            <li>Geração de relatórios de desempenho e volume de interações.</li>
          </ul>
          <p style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderLeft: '4px solid #3b82f6', borderRadius: '8px', color: '#93c5fd' }}>
            <strong>Garantia de Privacidade:</strong> O <strong>Leads Cia Super</strong> não comercializa, não aluga e não compartilha dados de usuários ou de leads com terceiros para fins publicitários ou lucrativos. Os dados são usados exclusivamente para a execução do serviço contratado.
          </p>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#ffffff' }}>4. Segurança e Retenção dos Dados</h2>
          <p style={{ marginBottom: '1rem' }}>
            Os tokens de autenticação concedidos pelo usuário e os dados coletados são salvos em nosso banco de dados utilizando criptografia e práticas rígidas de segurança da informação no ambiente do servidor de <strong>mkt.ciasuper.com.br</strong>.
            Esses dados permanecem armazenados apenas enquanto a conta do usuário estiver activa e a integração correspondente estiver autorizada.
          </p>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#ffffff' }}>5. Controle do Usuário e Exclusão de Dados</h2>
          <p style={{ marginBottom: '1rem' }}>
            Você possui controle total sobre suas conexões no <strong>Leads Cia Super</strong>. A qualquer momento, você pode:
          </p>
          <ul style={{ listStyleType: 'disc', paddingLeft: '1.75rem', marginBottom: '1rem', display: 'grid', gap: '0.5rem' }}>
            <li>Revogar as permissões de acesso diretamente nas configurações da sua conta na plataforma externa.</li>
            <li>Desconectar a conta no menu "Integrações" do painel de <strong>mkt.ciasuper.com.br</strong>, o que remove imediatamente todos os tokens de acesso de nossos servidores.</li>
            <li>Solicitar a exclusão definitiva de todos os dados históricos de integração armazenados enviando um e-mail para o suporte da nossa plataforma.</li>
          </ul>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#ffffff' }}>6. Atualizações desta Política</h2>
          <p style={{ marginBottom: '1rem' }}>
            Reservamos o direito de atualizar esta Política de Privacidade conforme necessário para refletir alterações no sistema ou nos requisitos regulamentares. Recomendamos que você a revise periodicamente no endereço <strong>mkt.ciasuper.com.br/privacy</strong>.
          </p>
        </section>

        <section style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '2rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', fontSize: '0.875rem', opacity: 0.7 }}>
          <span>© {new Date().getFullYear()} Leads Cia Super. Todos os direitos reservados.</span>
          <span>Suporte: mkt.ciasuper.com.br</span>
        </section>
      </div>
    </div>
  );
}
