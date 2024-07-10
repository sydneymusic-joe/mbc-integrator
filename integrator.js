const axios = require('axios');
const cheerio = require('cheerio');
const urlencode = require('urlencode');
const moment = require('moment');

const searchUrls = 
[
  '4775'
];

const venues = 
[
	"The Chippo Hotel"
];

const sortByDate = (a, b) => {
    return a.Date - b.Date;
};

async function searchAndExport() {
  let results = [];

  for (var idx in searchUrls) {
    // Perform the initial search and retrieve the total number of pages
    let response = await axios.get('https://www.moshtix.com.au/v2/venues/venue/' + searchUrls[idx]);
    let $ = cheerio.load(response.data);

    $ = cheerio.load(response.data);
    $("script[type='application/ld+json']").each((i, element) => {
      let src = JSON.parse(element.children[0].data)[0];
      let result = {};
      result['Date'] = new Date(src.startDate);
      result['Venue'] = src.location.name;
      result['EventName'] = src.name;
      result['URL'] = src.url;
      results.push(result);
    });
  }

	for (const venue in venues) {
		let page = 0;
		let resultCount = 20;

		while (resultCount > 0) {
			console.log (venues[venue] + ' page ' + page);
			let response = await axios.post(
				"https://icgfyqwgtd-dsn.algolia.net/1/indexes/*/queries?x-algolia-agent=Algolia%20for%20JavaScript%20(4.11.0)%3B%20Browser%20(lite)%3B%20instantsearch.js%20(4.33.2)%3B%20Vue%20(3.2.22)%3B%20Vue%20InstantSearch%20(4.1.1)%3B%20JS%20Helper%20(3.6.2)&x-algolia-api-key=bc11adffff267d354ad0a04aedebb5b5&x-algolia-application-id=ICGFYQWGTD",
				`{
					"requests":
					[
						{
							"indexName":"prod_oztix_eventguide",
							"params":"maxValuesPerFacet=20&highlightPreTag=__ais-highlight__&highlightPostTag=__%2Fais-highlight__&page=${page}&query=&facets=%5B%22Venue.State%22%2C%22Categories%22%2C%22Bands%22%2C%22Venue.Name%22%5D&tagFilters=&facetFilters=%5B%5B%22Venue.Name%3A${urlencode.encode(venues[venue])}%22%5D%5D"
						}
					]
				}`,
				{
				"headers": {
					"accept": "*/*",
					"accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
					"content-type": "application/x-www-form-urlencoded",
					"sec-ch-ua": "\"Not_A Brand\";v=\"8\", \"Chromium\";v=\"120\", \"Google Chrome\";v=\"120\"",
					"sec-ch-ua-mobile": "?0",
					"sec-ch-ua-platform": "\"macOS\"",
					"sec-fetch-dest": "empty",
					"sec-fetch-mode": "cors",
					"sec-fetch-site": "cNo ross-site",
					"Referer": "https://www.oztix.com.au/",
					"Referrer-Policy": "strict-origin-when-cross-origin"
				},
				"method": "POST"
				}
			);

			let data = response.data.results[0];
			resultCount = data.hits.length;
			console.log(resultCount);

			data.hits.forEach((element, i) => {
				let src = element;
				let result = {};
				result['Date'] = new Date(src['DateStart'] + "+00:00");
				result['Venue'] = venues[venue];
				result['EventName'] = src['EventName'];
				result['Tagline'] = src['SpecialGuests'];
				result['URL'] = src['EventUrl'].replace('utm_medium=Website', 'utm_medium=EventFeed').replace('utm_source=Oztix', 'utm_source=MBC');
				results.push(result);
			});

			page++;
		}
	}

	results.sort(sortByDate);

	console.log(JSON.stringify(results));
}

searchAndExport();