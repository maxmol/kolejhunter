const fs = require('fs');
const tabletojson = require('tabletojson').Tabletojson;

// config 
const config = require("./config");

// bot
const TelegramBot = require('node-telegram-bot-api');
const token = fs.readFileSync('token.txt');
const bot = new TelegramBot(token, {polling: true});

// parse
var data = {}

function parseDormitory(kolej) {
	var link = config.koleje[kolej];

	return new Promise((resolve, reject) => {
		tabletojson.convertUrl(link, (tables) => {
			var table = tables[0];
			var cached = true;
			var changed = false;

			if (!data[kolej]) {
				data[kolej] = {};
				cached = false;
			}
			
			var text = `<b><a href="${link}">${kolej}</a></b>\n`;

			for (let i = 0; i < table.length; i++) {
				let pokoj = table[i];
				let menChange = '', womenChange = '', anyChange = '';
				
				if (cached) {
					let m = pokoj["Muži"] - data[kolej][pokoj.Popis].men;
					if (m != 0) {
						menChange = ' (' + menChange + ')';
						changed = true;
					}
					
					let w = pokoj["Ženy"] - data[kolej][pokoj.Popis].women
					if (w != 0) {
						womenChange = ' (' + womenChange + ')';
						changed = true;
					}
					
					let a = pokoj["Neurčeno"] - data[kolej][pokoj.Popis].any;
					if (a != 0) {
						anyChange = ' (' + anyChange + ')';
						changed = true;
					}
				}

				data[kolej][pokoj.Popis] = {
					men: pokoj["Muži"],
					women: pokoj["Ženy"],
					any: pokoj["Neurčeno"]
				};

				text += `\n<i>${pokoj.Popis}</i>\n<pre>M: ${pokoj["Muži"] + menChange}\t\tŽ: ${pokoj["Ženy"] + womenChange}\t\tN: ${pokoj["Neurčeno"] + anyChange}</pre>\n`;
			}

			resolve(text, changed);
		});
	});
}

// start
const dorms = Object.keys(config.koleje);

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

// hunt
var hunters = {}
bot.onText(/\/hunt (.+)/, (msg, match) => { 
  const chatId = msg.chat.id;
  const kolej = match[1];
 
  if (config.koleje[kolej]) {
		hunters[chatId] = kolej;
		bot.sendMessage(chatId, "Hunt for a room in " + kolej + " has started...");
	} else {
		bot.sendMessage(chatId, "Wrong dorm name!");
	}
});

setInterval(() => {
	for (let chatId in hunters) { // this should be the other way around, key = kolej and value = chatIds array, but i'm the only user so whatever
		let kolej = hunters[chatId];
		console.log('hunt check: ' + kolej);
		parseDormitory(kolej).then((text, changed) => {
			if (changed) 
				bot.sendMessage(chatId, text, {parse_mode : "HTML"})
		});
	}
}, 300000);

bot.on('message', (msg) => {
	var chatId = msg.chat.id;
	var kolej = msg.text;
	
	if (config.koleje[kolej]) {
		parseDormitory(kolej).then((text, changed) => 
			bot.sendMessage(chatId, text, {parse_mode : "HTML"})
		);
	}
});

bot.on("polling_error", (err) => console.log(err));