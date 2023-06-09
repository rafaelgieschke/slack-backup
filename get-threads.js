#!/bin/sh
//bin/sh -c :; exec deno run -A "$0" "@"

const $$ = (v) => (
  console.dir(v, { depth: Infinity, strAbbreviateSize: Infinity }), v
);

Object.defineProperty(Object.prototype, "$$", {
  get(v = this.valueOf()) {
    return console.dir(v, { depth: Infinity, strAbbreviateSize: Infinity }), v;
  },
});

///////////////////////////////////////////////////////////////////////////////

const cwd = Deno.cwd();

const stdout = async (cmd, ...args) =>
  new TextDecoder().decode(
    (await new Deno.Command(cmd, { args }).output()).stdout
  );

const writeText = async (path, text) => {
  await Deno.writeTextFile(path, text);
};
const readText = async (path) => {
  await Deno.readTextFile(path);
};

///////////////////////////////////////////////////////////////////////////////

class Client {
  base = "https://slack.com/api/";
  constructor({ token, cookie, team_id }) {
    this.token = token;
    this.cookie = cookie;
    this.team_id = team_id;
  }
  async api(method, args) {
    const url = new URL(method.replace(/.*\//, ""), this.base);
    url.search = String(
      new URLSearchParams({
        team_id: this.team_id,
        limit: 1000,
        ...args,
      })
    );
    return await (
      await fetch(url, {
        headers: {
          authorization: `Bearer ${this.token}`,
          cookie: this.cookie,
        },
      })
    ).json();
  }
  async getThread(channel, ts) {
    return (
      await client.api("https://api.slack.com/methods/conversations.replies", {
        channel,
        ts,
        limit: 1000,
      })
    ).messages;
  }
}

///////////////////////////////////////////////////////////////////////////////

// Firefox > Web Developer Tools > Network > Filter URLs: "client.boot"
// > Save All As HAR: "client.boot.har"
import boot from "./client.boot.har.json" assert { type: "json" };

const team_name = JSON.parse(boot.log.entries[0].response.content.text).team
  .domain;
const team_id = JSON.parse(boot.log.entries[0].response.content.text).team.id;
const cookie = boot.log.entries[0].request.headers.find(
  (v) => v.name == "Cookie"
)?.value;
const token = boot.log.entries[0].request.postData.text
  .match(/xoxc-.+/)?.[0]
  .trim();

const client = new Client({ token, cookie, team_id });

/*
console.log(
  await client.api("https://api.slack.com/methods/conversations.list", {
    types: "public_channel,private_channel,mpim,im",
  })
);
*/

const threads = (await stdout("grep", "-hEro", '"thread_ts":"[^"]*"'))
  .split("\n")
  .filter((v) => v)
  .map((v) => JSON.parse(`{${v}}`));

const channel = cwd.replace(/.*\//, "");

await Deno.mkdir("threads");

for (const { thread_ts } of threads) {
  const thread = await client.getThread(channel, thread_ts);
  writeText(`threads/${thread_ts}.json`, JSON.stringify(thread));
}
