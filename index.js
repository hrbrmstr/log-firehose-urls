import sqlite3 from 'sqlite3';

import { Subscription } from '@atproto/xrpc-server';
import { cborToLexRecord, readCar } from '@atproto/repo';

const SERVICE = 'bsky.social';
const METHOD = 'com.atproto.sync.subscribeRepos';
const COLLECTION = 'app.bsky.feed.post';
const CREATE_ACTION = 'create';

const args = process.argv.slice(2);

const searchString = "https://"

// start subscription to the firehost
const subscription = new Subscription({
  service: `wss://${SERVICE}`,
  method: METHOD,
  getState: () => ({}),
  validate: (value) => value,
});

// Initialize the database
const db = new sqlite3.Database('./urls.db', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the urls database.');
});

// Create the table if it doesn't exist
db.run(`CREATE TABLE IF NOT EXISTS urls (
  url TEXT PRIMARY KEY,
  count INTEGER DEFAULT 1
);`);

const handleEvent = async (event) => {
  try {
    const car = await readCar(event.blocks);

    for (const op of event.ops) {
      if (op.action !== CREATE_ACTION) continue;

      const recBytes = car.blocks.get(op.cid)
      if (!recBytes) continue;

      const rec = cborToLexRecord(recBytes);

      const coll = op.path.split('/')[ 0 ];
      if (coll !== COLLECTION) continue;

      if ((args.length === 0) || (rec.text.toLowerCase().includes(searchString))) {

        // Extract URLs and store in the database
        const urlRegex = /https?:\/\/[^\s]+/g;
        let match;
        while ((match = urlRegex.exec(rec.text)) !== null) {
          const url = match[ 0 ];
          db.run(`
            INSERT INTO urls(url) VALUES(?)
            ON CONFLICT(url) DO UPDATE SET count=count+1;
          `, [ url ], function (err) {
            if (err) {
              return console.error(err.message);
            }
            console.info(`URL: ${url}, Rows inserted: ${this.changes}`);
          });
        }

      }
    }
  } catch {
    // Add error handling here
  }
};

for await (const event of subscription) {
  handleEvent(event);
}
