import { NextResponse } from 'next/server';
import { d1Api } from '@/services/d1';
import { generateToken } from '@/lib/auth';
import { sendEmailBrevoAction } from '@/app/actions/brevo';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ message: 'O e-mail é obrigatório.' }, { status: 400 });
    }

    // 1. Buscar o usuário pelo e-mail
    const { results } = await d1Api.runQuery(`SELECT * FROM users WHERE email = ? LIMIT 1`, [email]);
    if (!results || results.length === 0) {
      // Retorna uma mensagem de sucesso mesmo que não encontre o usuário para evitar enumeração de e-mails
      return NextResponse.json({ 
        success: true, 
        message: 'Se este e-mail estiver cadastrado, um link de recuperação será enviado.' 
      });
    }

    const user = results[0];

    // 2. Buscar configurações para obter a API Key do Brevo
    const settings = await d1Api.getSettings();
    if (!settings.brevoApiKey) {
      return NextResponse.json({ 
        message: 'A recuperação de senha por e-mail não está configurada no painel de configurações (chave da API Brevo ausente).' 
      }, { status: 500 });
    }

    // 3. Gerar o token JWT de redefinição de senha com validade de 1 hora (3600s)
    const tokenPayload = {
      uid: user.uid,
      email: user.email,
      purpose: 'reset-password',
      exp: Math.floor(Date.now() / 1000) + 3600
    };
    const token = await generateToken(tokenPayload);

    // 4. Construir o link de redefinição de senha
    const origin = new URL(request.url).origin;
    const resetUrl = `${origin}/login?token=${token}`;

    // 5. Enviar o e-mail estilizado usando Brevo
    const sender = {
      name: settings.remetenteNome || 'Leads Cia Super',
      email: settings.remetenteEmail || 'contato@ciasuperleads.com'
    };

    const logoUrl = settings.landingPage?.logoUrl && settings.landingPage.logoUrl !== 'none'
      ? settings.landingPage.logoUrl
      : 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=120&h=120&q=80';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recuperação de Senha - Leads Cia Super</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f8fafc;
            color: #1e293b;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            border: 1px solid #e2e8f0;
          }
          .header {
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            padding: 40px 20px;
            text-align: center;
          }
          .header img {
            max-height: 48px;
            border-radius: 8px;
            margin-bottom: 12px;
          }
          .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 24px;
            font-weight: 800;
          }
          .content {
            padding: 40px 32px;
            line-height: 1.6;
          }
          .content h2 {
            font-size: 20px;
            font-weight: 700;
            color: #0f172a;
            margin-top: 0;
          }
          .button-container {
            text-align: center;
            margin: 32px 0;
          }
          .button {
            display: inline-block;
            background-color: #3b82f6;
            color: #ffffff !important;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 8px;
            font-weight: 700;
            font-size: 16px;
            box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.3);
            transition: all 0.2s;
          }
          .button:hover {
            background-color: #2563eb;
          }
          .footer {
            background-color: #f1f5f9;
            padding: 24px;
            text-align: center;
            font-size: 12px;
            color: #64748b;
            border-top: 1px solid #e2e8f0;
          }
          .footer a {
            color: #3b82f6;
            text-decoration: none;
          }
          .warning {
            font-size: 13px;
            color: #64748b;
            margin-top: 24px;
            padding-top: 16px;
            border-top: 1px solid #f1f5f9;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            ${logoUrl ? `<img src="${logoUrl}" alt="Logo" />` : ''}
            <h1>Leads Cia Super</h1>
          </div>
          <div class="content">
            <h2>Olá, ${user.name || 'Usuário'}!</h2>
            <p>Recebemos uma solicitação para redefinir a senha da sua conta de acesso.</p>
            <p>Para prosseguir com a redefinição de senha, por favor clique no botão abaixo:</p>
            
            <div class="button-container">
              <a href="${resetUrl}" class="button" target="_blank">Redefinir Minha Senha</a>
            </div>

            <p>Se você não solicitou essa alteração, pode desconsiderar este e-mail com segurança. Sua senha atual permanecerá inalterada.</p>
            
            <div class="warning">
              <strong>Importante:</strong> Este link é temporário e irá expirar em 1 hora por motivos de segurança.
            </div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Leads Cia Super. Todos os direitos reservados.</p>
            <p>Desenvolvido por <a href="https://www.visualsuper.com.br" target="_blank">Visual Super</a>.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailResult = await sendEmailBrevoAction({
      apiKey: settings.brevoApiKey,
      sender,
      to: [{ email: user.email, name: user.name || 'Usuário' }],
      subject: 'Recuperação de Senha - Leads Cia Super',
      htmlContent
    });

    if (!emailResult.success) {
      return NextResponse.json({ 
        message: 'Erro ao enviar o e-mail de recuperação: ' + emailResult.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Se este e-mail estiver cadastrado, um link de recuperação será enviado.' 
    });

  } catch (error: any) {
    console.error('Forgot Password Error:', error);
    return NextResponse.json({ message: 'Erro interno no servidor: ' + error.message }, { status: 500 });
  }
}
