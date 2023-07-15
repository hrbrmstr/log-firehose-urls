# Log URLs posted to the bsky firehose to a local db

```bash
$ npm install --no-fund
$ node index.js
```

## Count the # of logged urls:

```bash
$ sqlite3 urls.db -cmd "SELECT COUNT(*) FROM urls;" .exit
```