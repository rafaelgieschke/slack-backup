#!/bin/sh
//bin/sh -c :; exec deno run -A "$0" "@"

import token from "./token.json" assert { type: "json" };

const $$ = (v) => (
  console.dir(v, { depth: Infinity, strAbbreviateSize: Infinity }), v
);

Object.defineProperty(Object.prototype, "$$", {
  get() {
    return $$(this.valueOf());
  },
});

const stdout = async (cmd, ...args) =>
  new TextDecoder().decode(
    (await new Deno.Command(cmd, { args }).output()).stdout
  );

class Client {
  base = "https://slack.com/api/";
  constructor({ token, team_id }) {
    this.token = token;
    this.team_id = team_id;
  }
  async api(method, args) {
    const url = new URL(method.replace(/.*\//, ""), this.base);
    url.search = String(
      new URLSearchParams({
        team_id: this.team_id,
        ...args,
      })
    );
    return await (
      await fetch(url, {
        headers: {
          authorization: `Bearer ${this.token}`,
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

// console.log(await client.api("https://api.slack.com/methods/conversations.list", {}));

const cwd = Deno.cwd();
const writeText = async (path, text) => {
  await Deno.writeTextFile(path, text);
};

const client = new Client(token);

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
