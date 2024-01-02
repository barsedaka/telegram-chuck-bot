const cheerio = require("cheerio");

// Fetch jokes from a specified URL
async function fetchJokes(JOKES_URL) {
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

module.exports = { fetchJokes };