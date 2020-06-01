const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
const tabletojson = require('tabletojson').Tabletojson;

const config = require("./config");

const token = fs.readFileSync('token.txt');
const bot = new TelegramBot(token, {polling: true});

const dorms = Object.keys(config.koleje);

var data = {}

bot.onText(/\/start/, (msg) => {
	var keyboard = []
	for (let i = 0; i < dorms.length; i+=2){
		if (i + 1 == dorms.length)
			keyboard.push([dorms[i]]);
		else
			keyboard.push([dorms[i], dorms[i + 1]]);
	}

	bot.sendMessage(msg.chat.id, "Hi! Select a dorm", {
		"reply_markup": {
			keyboard
		}
	});
});

bot.on('message', (msg) => {
	var link = config.koleje[msg.text];
  if (link) {
		tabletojson.convertUrl(link, (tables) => {
			var table = tables[0];
			var cached = true;

			if (!data[msg.text]) {
				data[msg.text] = {};
				cached = false;
			}
			
			var text = `<b><a href="${link}">${msg.text}</a></b>\n`;

			for (let i = 0; i < table.length; i++) {
				let pokoj = table[i];
				let menChange = 0, womenChange = 0, anyChange = 0;
				
				if (cached) {
					menChange = pokoj["Muži"] - data[msg.text][pokoj.Popis].men;
					womenChange = pokoj["Ženy"] - data[msg.text][pokoj.Popis].women;
					anyChange = pokoj["Neurčeno"] - data[msg.text][pokoj.Popis].any;
				}

				menChange = menChange == 0 ? '' : ' (' + menChange + ')';
				womenChange = womenChange == 0 ? '' : ' (' + womenChange + ')';
				anyChange = anyChange == 0 ? '' : ' (' + anyChange + ')';

				data[msg.text][pokoj.Popis] = {
					men: pokoj["Muži"],
					women: pokoj["Ženy"],
					any: pokoj["Neurčeno"]
				};

				text += `\n<i>${pokoj.Popis}</i>\n<pre>M: ${pokoj["Muži"] + menChange}\t\tŽ: ${pokoj["Ženy"] + womenChange}\t\tN: ${pokoj["Neurčeno"] + anyChange}</pre>\n`;
			}
			bot.sendMessage(msg.chat.id, text, {parse_mode : "HTML"});
		});
	}
});

bot.on("polling_error", (err) => console.log(err));