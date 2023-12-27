const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios").default;
const { v4: uuidv4 } = require("uuid");
const cheerio = require("cheerio");
const iso6391 = require("iso-639-1");

require("dotenv").config();

const JOKES_URL = process.env.JOKES_URL;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TRANSLATION_API_KEY = process.env.TRANSLATION_API_KEY;
const TRANSLATION_API_ENDPOINT = process.env.TRANSLATION_API_ENDPOINT;
const TRANSLATION_API_LOCATION = process.env.TRANSLATION_API_LOCATION;
const DEFAULT_LANG = process.env.DEFAULT_LANG;

const supportedCommands = [/\/start/, /set language .+/, /^\d+$/];
const supportedCommandsMessage = `
To set your language, type: set language <Your Language>
To get a joke, enter a number between 1 and 101.
To restart, type: /start`;

// Function to translate text
async function translate(to, text) {
  try {
    const response = await axios({
      baseURL: TRANSLATION_API_ENDPOINT,
      url: "/translate",
      method: "post",
      headers: {
        "Ocp-Apim-Subscription-Key": TRANSLATION_API_KEY,
        "Ocp-Apim-Subscription-Region": TRANSLATION_API_LOCATION,
        "Content-type": "application/json",
        "X-ClientTraceId": uuidv4().toString(),
      },
      params: {
        "api-version": "3.0",
        from: DEFAULT_LANG,
        to: to,
      },
      data: [
        {
          text: text,
        },
      ],
      responseType: "json",
    });

    const translatedText = response.data[0].translations[0].text;
    return translatedText;
  } catch (error) {
    console.error(error);
    return "Error in translation";
  }
}

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
let userLanguage = DEFAULT_LANG;

/* Handle the set language command
 * Extract the requested language from the command,
 * and set it as the user's language preference */
bot.onText(/set language (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  try {
    const requestedLanguage = match[1].toLowerCase();
    const isoCode = iso6391.getCode(requestedLanguage);

    if (isoCode) {
      userLanguage = isoCode;
      const response = await translate(userLanguage, "No problem");
      bot.sendMessage(chatId, response);
    } else {
      bot.sendMessage(
        chatId,
        "Unsupported language. Please choose a valid language."
      );
    }
  } catch (error) {
    bot.sendMessage(chatId, "An error occurred. Please try again.");
  }
});

// Function to fetch jokes from a specified URL
const getJokes = async () => {
  try {
    const jokes = [];
    const response = await fetch(JOKES_URL, { method: "GET" });
    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract jokes from the HTML using Cheerio
    $("div.m-detail--body ol li").each((index, element) => {
      jokeText = $(element).text();
      jokes.push(`${index + 1}. ${jokeText}`);
    });

    return jokes;
  } catch (error) {
    console.error("Error fetching jokes:", error);
    return [];
  }
};

// Handle numeric input (joke requests)
bot.onText(/^\d+$/, async (msg) => {
  const chatId = msg.chat.id;
  const jokeNumber = parseInt(msg.text);
  let jokes = [];

  try {
    jokes = await getJokes();

    if (jokeNumber < 1 || jokeNumber > 101) {
      bot.sendMessage(chatId, "Please enter a valid number between 1 and 101");
      return;
    }

    if (jokes.length < jokeNumber) {
      bot.sendMessage(chatId, "Error fetching jokes. Please try again");
      return;
    }

    const translatedJoke = await translate(userLanguage, jokes[jokeNumber - 1]);
    bot.sendMessage(chatId, translatedJoke);
  } catch (error) {
    bot.sendMessage(chatId, "Error translating joke. Please try again");
  }
});

// Handle the /start command
bot.onText(/start/, async (msg) => {
  userLanguage = DEFAULT_LANG;
  const startMessage = `
Welcome to ChuckBot!

Here's how you can use me:
${supportedCommandsMessage}

The default language is English, but you can change it anytime.

Now, let's have some laughs! 😄
`;
  bot.sendMessage(msg.chat.id, startMessage);
});

// Catch-all callback for unsupported commands
bot.onText(/(.+)/, (msg) => {
  const isSupportedCommand = supportedCommands.some((command) =>
    command.test(msg.text)
  );

  if (!isSupportedCommand) {
    bot.sendMessage(
      msg.chat.id,
      `Sorry, I didn't understand that command. 
      ${supportedCommandsMessage}`
    );
  }
});
