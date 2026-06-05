import React from 'react';

export const metadata = {
  title: 'Termos de Serviço | Leads Cia Super',
};

export default function TermsOfService() {
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
            Termos de Serviço
          </h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.9375rem' }}>
            Aplicativo: <strong style={{ color: '#3b82f6' }}>Leads Cia Super</strong> (acessível em <a href="https://leads.ciasuper.com.br" style={{ color: '#3b82f6', textDecoration: 'none' }}>leads.ciasuper.com.br</a>)
          </p>
          <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>
        </div>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#ffffff' }}>1. Aceitação dos Termos</h2>
          <p style={{ marginBottom: '1rem' }}>
            Ao acessar, cadastrar-se ou utilizar o aplicativo <strong>Leads Cia Super</strong> (disponibilizado através da URL <strong>leads.ciasuper.com.br</strong>, doravante denominado simplesmente "Leads Cia Super"), você declara estar ciente, compreender e concordar integralmente em cumprir estes Termos de Serviço. Se você não concordar com algum dos termos descritos neste documento, você não deve prosseguir com a utilização ou a integração de serviços externos.
          </p>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#ffffff' }}>2. Descrição Geral do Serviço</h2>
          <p style={{ marginBottom: '1rem' }}>
            O <strong>Leads Cia Super</strong> é uma plataforma de gestão de leads (CRM) e automação de marketing voltada para otimizar os fluxos de atendimento de empresas. A ferramenta possibilita centralizar a captação de clientes, organizar funis de vendas e conectar canais de comunicação por meio de integrações seguras de APIs de terceiros.
          </p>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#ffffff' }}>3. Conexão de Contas e Uso de APIs de Terceiros</h2>
          <p style={{ marginBottom: '1rem' }}>
            Para usufruir da sincronização de interações, o usuário poderá conceder autorizações de acesso às suas contas de redes sociais conectadas ao <strong>Leads Cia Super</strong>. Ao ativar essa funcionalidade:
          </p>
          <ul style={{ listStyleType: 'disc', paddingLeft: '1.75rem', marginBottom: '1rem', display: 'grid', gap: '0.75rem' }}>
            <li>Você concede ao <strong>Leads Cia Super</strong> autorização expressa para ler informações de perfil (user.info.basic) e listar publicações de vídeos (video.list), com a finalidade exclusiva de sincronizar comentários e respondê-los a partir da nossa caixa de entrada.</li>
            <li>Você atesta que possui direitos e permissões para administrar as contas sociais integradas ao CRM e assume total responsabilidade pelas ações executadas nelas.</li>
            <li>Você concorda em cumprir integralmente os Termos de Serviço e as Políticas para Desenvolvedores das respectivas plataformas parceiras.</li>
          </ul>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#ffffff' }}>4. Regras de Conduta e Uso Responsável</h2>
          <p style={{ marginBottom: '1rem' }}>
            Como usuário cadastrado no <strong>Leads Cia Super</strong> através do domínio <strong>leads.ciasuper.com.br</strong>, você assume o compromisso de:
          </p>
          <ul style={{ listStyleType: 'disc', paddingLeft: '1.75rem', marginBottom: '1rem', display: 'grid', gap: '0.5rem' }}>
            <li>Não utilizar a automação do sistema para enviar Spam, mensagens não solicitadas ou abusivas.</li>
            <li>Respeitar as leis vigentes de proteção ao consumidor e proteção de dados no envio de respostas a seus clientes.</li>
            <li>Manter a segurança e confidencialidade de suas credenciais de login administrativas.</li>
          </ul>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#ffffff' }}>5. Limitações de Responsabilidade</h2>
          <p style={{ marginBottom: '1rem' }}>
            O <strong>Leads Cia Super</strong> atua como um facilitador de integrações de CRM. Portanto, não nos responsabilizamos por instabilidades temporárias nas APIs de terceiros, por banimentos causados por mau uso da conta por parte do usuário ou por exclusão de dados realizada de forma imprudente. O serviço é disponibilizado no estado em que se encontra ("as is").
          </p>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#ffffff' }}>6. Lei Aplicável e Foro</h2>
          <p style={{ marginBottom: '1rem' }}>
            Estes Termos de Serviço são regidos pela legislação da República Federativa do Brasil. Fica eleito o foro da comarca da sede da empresa administradora do site <strong>leads.ciasuper.com.br</strong> para dirimir quaisquer dúvidas ou litígios decorrentes do uso da plataforma.
          </p>
        </section>

        <section style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '2rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', fontSize: '0.875rem', opacity: 0.7 }}>
          <span>© {new Date().getFullYear()} Leads Cia Super. Todos os direitos reservados.</span>
          <span>Suporte: leads.ciasuper.com.br</span>
        </section>
      </div>
    </div>
  );
}
