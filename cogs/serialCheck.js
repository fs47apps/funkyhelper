const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require("discord.js");

module.exports = (client, logChannels, config, botContext)=>{
    var serialData;
    var outputs = {
        mariko: `seems to be a "mariko" Switch, Switch Lite, or Switch OLED.\nThese are currently not hackable via software, only hardware modifications that involve soldering modchips.\n\nYou can find a list of hardmodders trusted by the community [here](<https://nintendohomebrew.com/hardmodders>). When requesting their services, please make sure to specify your console model (Switch v2, Switch OLED, Switch Lite) after reviewing [this diagram](<https://assets.funkyscott47.com/nxmodeldiagram/index.html>).`,
        switch2: `seems to be a Switch 2. This tool cannot determine if they are hackable.`,
        maybe: `*might* be patched. The only way you can know this for sure is by pushing the payload manually. You can find instructions to do so [here](<https://switch.hacks.guide/user_guide/rcm/sending_payload.html>).\nIf you find out the console is patched, then that means the console is not hackable with software, only hardware modifications that involve soldering modchips.\n\nYou can find a list of hardmodders trusted by the community [here](<https://nintendohomebrew.com/hardmodders>). When requesting their services, please make sure to specify that your console model is a patched Erista (v1) Switch.`,
        patched: `is patched. It is not hackable via software, only hardware modifications that involve soldering modchips.\n\nYou can find a list of hardmodders trusted by the community [here](<https://nintendohomebrew.com/hardmodders>). When requesting their services, please make sure to specify that your console model is a patched Erista (v1) Switch.`,
        unpatched: `is not patched. [Continue to the written guide](<https://switch.hacks.guide/user_guide/rcm/sending_payload.html>).`
    };
    var colors = {
        mariko: "Red",
        switch2: "Red",
        maybe: "Yellow",
        patched: "Red",
        unpatched: "Green"
    };
    var titles = {
        mariko: "Patched (Mariko)",
        switch2: "Invalid (Switch 2)",
        maybe: "Potentially Patched",
        patched: "Patched",
        unpatched: "Unpatched!"
    }
    async function onReady() {
        try {
            serialData = await (await fetch("https://nintendohomebrew.com/assets/switch_serial_data.json")).json();
        } catch(err) {
            // don't bother handling this now, we'll do it if someone actually uses the command
        }
    }

    async function serialCheckCmdHandler(isSlash, params, ctx) {
        var reply = ctxReplier(ctx, isSlash);
        if(!serialData) {
            await reply("Serial data could not be loaded! Please try again. If this error continues to appear, please contact a Bot Maintainer.");
            onReady();
            return;
        }
        var result = checkSerial(params.serial);
        if(!result || result == "invalid" || !outputs[result]) {
            return await reply("The serial you entered was invalid.");
        }
        return await reply({flags:MessageFlags.Ephemeral, embeds: [
            (new EmbedBuilder())
            .setTitle(titles[result])
            .setDescription(`Serial **${params.serial.slice(0, 10).padEnd(14, "X")}** ${outputs[result]}`)
            .setColor(colors[result])
            .setFooter({text: "This data is kept up-to-date by fetching the data from Nintendo Homebrew regularly."})
        ]});
    }

    function checkSerial(serial) {
        if(serial.length != 14) return "invalid";
        if(!serial.match(serialData.regex.valid)) {
            if(serial.match(serialData.regex.mariko)) {
                return "mariko";
            } else if(serial.match(serialData.regex.switch2)) {
                return "switch2";
            }
            return "invalid";
        }
        var checkingValue = parseInt(serial.slice(3,10));
        for(var prefix in serialData.prefixes) {
            if(serial.startsWith(prefix)) {
                if(checkingValue < serialData.prefixes[prefix].unpatched) {
                    return "unpatched";
                } else if(checkingValue < serialData.prefixes[prefix].maybe) {
                    return "maybe";
                } else {
                    return "patched";
                }
            }
        }
    }

    // custom one cuz we want to keep a secret shhh
    function ctxReplier(ctx, isSlash) {
        return async(msg)=>{
            if(!isSlash) {
                await ctx.channel.send(msg);
                return await ctx.delete();
            }
            if(isSlash) {
                if(ctx.replied || ctx.deferred) {
                    return await ctx.followUp(typeof(msg)=="string"?{content:msg,flags:MessageFlags.Ephemeral}:msg);
                } else {
                    return await ctx.reply(typeof(msg)=="string"?{content:msg,flags:MessageFlags.Ephemeral}:msg);
                }
            }
        }
    }

    return {
        onReady,
        commands: {
            serialcheck: {
                prefix: {
                    name: 'serialcheck',
                    aliases: ['ssnc'],
                    params: [
                        {
                            name: "serial",
                            type: "text"
                        }
                    ]
                },
                slash: {
                    data: new SlashCommandBuilder()
                    .setName("serialcheck")
                    .setDescription("Checks Switch serial numbers to see if they are vulnerable, aka ssnc")
                    .addStringOption(option=>option.setName("serial").setDescription("Serial Number (ex. XAW10000000000)").setRequired(true))
                },
                handler: serialCheckCmdHandler
            }
        }
    };
}