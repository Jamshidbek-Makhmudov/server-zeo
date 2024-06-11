import * as nodemailer from "nodemailer";
// TODO: Switch to Sendgrid, Mailchimp, or SES to avoid
// gmail issues https://nodemailer.com/usage/using-gmail/
const mailTransporter = nodemailer.createTransport(<any>{
  pool: true,
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  secure: process.env.MAIL_ENCRYPTION === "tls",
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD,
  },
});

export async function sendMail(
  to: string,
  subject: string,
  html: string,
  attachments?: any
) {
  await mailTransporter.sendMail({
    to,
    subject,
    html,
    from: "Zeoos <no-reply@zeoos.com>",
    attachments,
  });
}
