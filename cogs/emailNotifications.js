const { EmbedBuilder } = require("@discordjs/builders");
const { ImapFlow } = require("imapflow");
const { simpleParser } = require("mailparser");
var cron = require('node-cron');
var db, updateLastEmailId, emailAcctFetcher;
var emailClients = [];
var emailAcctData = [];

module.exports = (client, logChannels, config, botContext)=>{
    
    async function onReady() {
        db = botContext.db;
        db.exec(`
            CREATE TABLE IF NOT EXISTS email_logins (
                username TEXT PRIMARY KEY,
                host TEXT NOT NULL,
                password TEXT NOT NULL,
                port INTEGER NOT NULL DEFAULT 993,
                tls BOOLEAN NOT NULL DEFAULT 1,
                channel_id TEXT NOT NULL,
                last_email_id INTEGER
            );
        `);
        emailAcctFetcher = db.prepare(`SELECT CAST(channel_id AS varchar) AS channel_id,* FROM email_logins`);
        updateLastEmailId = db.prepare(`UPDATE email_logins SET last_email_id=? WHERE username=?`);

        checkInbox();
        cron.schedule('*/15 * * * *', checkInbox);
    }

    async function checkInbox() {
        emailAcctData = emailAcctFetcher.all();
        emailClients = [];
        for(var email of emailAcctData) {
            try {
                emailClients.push({
                    channel: await client.channels.fetch(email.channel_id),
                    client: new ImapFlow({
                        host: email.host,
                        port: email.port,
                        secure: !!email.tls,
                        auth: {
                            user: email.username,
                            pass: email.password
                        },
                        logger: false
                    }),
                    lastId: email.last_email_id
                });
            } catch(err) {
                await logChannels.important.send(`Failed to create email client data for ${email.username} in channel <#${email.channel_id}> (does the channel exist?)`);
                continue;
            }
        }
        for(var email of emailClients) {
            let emailClient = email.client;
            let emailsData = [];
            await emailClient.connect();
            const lock = await emailClient.getMailboxLock("INBOX");
            try {
                const uids = await emailClient.search({ seen: false }, { uid: true });
                if(email.lastId) {
                    for (const uid of uids) {
                        if(uid<=email.lastId) continue;
                        const { content } = await emailClient.download(uid, undefined, { uid: true });
                        const parsed = await simpleParser(content);
                        emailsData.push(parsed);
                    }
                }
                updateLastEmailId.run(Math.max(...uids), emailClient.options.auth.user);
            } finally {
                lock.release();
                await emailClient.logout();
            }
            for(var emailData of emailsData) {
                let embed = new EmbedBuilder();
                embed.setAuthor({name: emailClient.options.auth.user});
                embed.setTitle(`Incoming Email!`);
                embed.setDescription(`**From:** ${emailData.from.text.slice(0,256)}\n**Subject:** ${emailData.subject.slice(0,256)}\n**Date:** <t:${emailData.date/1000}:F>\n\n${emailData.text.slice(0,3000)}`);
                embed.setColor(0x00ffff);
                await email.channel.send({embeds: [embed]});
            }
        }
        emailClients = [];
    }
    return {
        onReady
    };
}