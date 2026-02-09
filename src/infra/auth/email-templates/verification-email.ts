const buttonStyle = [
  'display:inline-block',
  'background:#1e6a5c',
  'color:#ffffff',
  'text-decoration:none',
  "font-family:'Instrument Sans','Helvetica Neue',Arial,sans-serif",
  'padding:12px 20px',
  'border-radius:999px',
  'font-size:14px',
  'font-weight:600',
].join(';');

export const buildVerificationEmailHtml = (url: string): string => `
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f7f8fa;padding:32px 0;">
  <tr>
    <td align="center">
      <table width="560" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border:1px solid #cfd6dd;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="padding:28px 32px 8px 32px;">
            <div style="font-family:Georgia, 'Times New Roman', serif;font-size:18px;letter-spacing:0.12em;color:#1e6a5c;text-transform:uppercase;">
              PLATAFORMA
            </div>
            <div style="font-family:Georgia, 'Times New Roman', serif;font-size:26px;color:#201b16;margin-top:4px;">
              RevisaFácil
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 32px 0 32px;">
            <div style="height:1px;background:#e9edf2;"></div>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px 0 32px;font-family:'Instrument Sans','Helvetica Neue',Arial,sans-serif;color:#201b16;">
            <h1 style="margin:0 0 8px 0;font-size:22px;font-weight:600;font-family:Georgia, 'Times New Roman', serif;">
              Confirme seu e-mail
            </h1>
            <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#5f564c;">
              Para ativar sua conta e continuar na plataforma, confirme seu e-mail clicando no botão abaixo.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:4px 32px 24px 32px;">
            <a href="${url}" style="${buttonStyle}">
              Confirmar e-mail
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 24px 32px;font-family:'Instrument Sans','Helvetica Neue',Arial,sans-serif;">
            <p style="margin:0 0 8px 0;font-size:12px;line-height:1.6;color:#5f564c;">
              Se o botao nao funcionar, copie e cole este link no navegador:
            </p>
            <p style="margin:0;font-size:12px;line-height:1.6;color:#1e6a5c;word-break:break-all;">
              ${url}
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 28px 32px;background:#eef1f4;font-family:'Instrument Sans','Helvetica Neue',Arial,sans-serif;color:#5f564c;font-size:12px;">
            Se voce nao solicitou esta conta, ignore este e-mail.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
`;
