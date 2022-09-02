#!/usr/bin/env -S deno run -A --

const project = (await first(Deno.readDir("data/meta/"))).name;

const [dir] = Deno.args;

if (!dir) {
  throw new TypeError(
    `Usage: ${
      import.meta.url.split("/").at(-1)
    } data/messages/path/to/single/directory`,
  );
}

const fromAsync = async (a) => {
  const ret = [];
  for await (const v of a) ret.push(v);
  return ret;
};

async function first(asyncIterable) {
  for await (const value of await asyncIterable) return value;
}

const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const readJson = async (path) => JSON.parse(await Deno.readTextFile(path));

const filterUnique = (array, fn, seen = new Set()) =>
  array.filter((...a) => {
    const v2 = fn(...a);
    if (v2 == undefined) return true;
    if (seen.has(v2)) return false;
    seen.add(v2);
    return true;
  });

const getUser = async (user) => {
  if (!user) return "UNKNOWN";
  return (await readJson(`data/meta/${project}/users/${user}.json`)).results[0]
    .name;
};

Object.defineProperty(Object.prototype, "d", {
  get() {
    console.debug(this.valueOf());
    return this.valueOf();
  },
});

const msgs = await Promise.all(
  filterUnique(
    (
      await Promise.all(
        (
          await fromAsync(Deno.readDir(`${dir}`))
        )
          .map((v) => v.name)
          .sort()
          .map(async (name) => (await readJson(`${dir}/${name}`)).messages),
      )
    )
      .flat(1)
      .sort((a, b) => compare(Number(a.ts), Number(b.ts))),
    (v) => v.client_msg_id,
  ).map(
    async (v) =>
      `${new Date(Number(v.ts) * 1000).toJSON()}, ${await getUser(
        v?.user,
      )}: ${v.text}`,
  ),
);

console.log(msgs.join("\n"));
