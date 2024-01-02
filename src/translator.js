const axios = require("axios").default;
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

const TRANSLATION_API_KEY = process.env.TRANSLATION_API_KEY;
const TRANSLATION_API_ENDPOINT = process.env.TRANSLATION_API_ENDPOINT;
const TRANSLATION_API_LOCATION = process.env.TRANSLATION_API_LOCATION;
const DEFAULT_LANG = process.env.DEFAULT_LANG;

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

module.exports = { translate };