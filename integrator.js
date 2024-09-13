const axios = require('axios');
const urlencode = require('urlencode');
const nj = require('nunjucks');
const fs = require('fs/promises');

const searchUrls = 
[
  '9716',
  '6422'
];

const venues = 
[
	"Bootleggers",
	"The Chippo Hotel",
	"Vic on The Park Hotel",
	"The Royal Bondi",
	"Hollywood Hotel",
	"The Robin Hood Hotel"
];
const sortByDate = (a, b) => {
    return a.Date - b.Date;
};

async function searchAndExport() {
  let results = [];

  const endpoint = "https://api.moshtix.com/v1/graphql";

  const fromNow = new Date();

  for (var idx in searchUrls) {
	const headers = {
		"content-type": "application/json"
	};
	const graphqlQuery = {
		"operationName": "events",
		"query": `query {
      viewer {
    getEvents(venueIds: [${searchUrls.join(", ")}], eventStartDateFrom : "${fromNow.toISOString()}") {
      items {
        id
        name
        startDate
		eventUrl
		venue {
			name
		}
		artists {
			items {
				name
			}
		}
		images {
			items {
				url
			}
		}
      }
    }
  }
}
`,
		"variables": {}
	};
	
	const response = await axios({
	  url: endpoint,
	  method: 'post',
	  headers: headers,
	  data: graphqlQuery
	});
	
	// Perform the initial search and retrieve the total number of pages
	const items = response.data.data.viewer.getEvents.items;
	items.forEach((element, i) => {
		let src = element;
		let result = {};
		result['Date'] = new Date(src.startDate);
		result['Venue'] = src.venue.name;
		result['Image'] = src.images.items[0].url.replace('140x140','600x600');
		result['Tagline'] = src.artists.items.map((val, idx, arr) => { return val.name; }).join(" + ");
		result['EventName'] = src.name;
		result['URL'] = src.eventUrl;
		results.push(result);
	  });
  }

	for (const venue in venues) {
		let page = 0;
		let resultCount = 20;

		while (resultCount > 0) {
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

			data.hits.forEach((element, i) => {
				let src = element;
				if (src['IsPostponed']) {
					return;
				}
				let result = {};
				result['Date'] = new Date(src['DateStart']);
				result['Venue'] = venues[venue];
				result['EventName'] = src['EventName'];
				result['Tagline'] = src['SpecialGuests'];
				result['Image'] = src['HomepageImage'];
				result['URL'] = src['EventUrl'].replace('utm_medium=Website', 'utm_medium=EventFeed').replace('utm_source=Oztix', 'utm_source=MBC');
				results.push(result);
			});

			page++;
		}
	}

	results.sort(sortByDate);

	nj.configure('views', {autoescape:true});
	fs.writeFile("src/gig-guide.html", nj.render('gigs.html', {gigs : results}));
}

searchAndExport();