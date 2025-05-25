import { MailerOptions } from '@nestjs-modules/mailer';
import { config } from 'dotenv';
config()

export const mailConfig: MailerOptions = {
    transport: {
        service: 'gmail',
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS

        },
    },
    defaults: {
        from: '"FAKEBUG" <no-reply@yourdomain.com>',
    },

};
