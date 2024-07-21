#!/usr/bin/env -S deno run -A --

const project = (await first(Deno.readDir("data/meta/"))).name;

const [dir] = Deno.args;

if (!dir) {
  throw new TypeError(
    `Usage: ${
      import.meta.url
        .split("/")
        .at(-1)
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
  try {
    return (await readJson(`data/meta/${project}/users/${user}.json`))
      .results[0].name;
  } catch {
    return `NOT FOUND (${user})`;
  }
};

Object.defineProperty(Object.prototype, "d", {
  get() {
    console.debug(this.valueOf());
    return this.valueOf();
  },
});

const tryOr = async (fn, defaultVal) => {
  try {
    return await fn();
  } catch {
    return defaultVal;
  }
};

const getMessages = (object) => object.messages ?? object;

const formatMessage = (msg) =>
  msg
    ? `${msg.text}${msg.files?.length > 0 ? " " : ""}${
      msg.files?.map((v) => v.url_private || `file:///.../${v.id}/`).join(
        " ",
      ) ?? ""
    }`
    : "";

const msgs = await Promise.all(
  filterUnique(
    (
      await Promise.all(
        (
          await fromAsync(Deno.readDir(`${dir}`))
        )
          .map((v) => v.name)
          .filter((v) => v !== "threads")
          .sort()
          .map(async (name) => getMessages(await readJson(`${dir}/${name}`))),
      )
    )
      .flat(1)
      .sort(
        (a, b) =>
          (a.thread_ts &&
            b.thread_ts &&
            compare(Number(a?.thread_ts), Number(b?.thread_ts))) ||
          compare(Number(a?.ts), Number(b?.ts)),
      ),
    (v) => v?.client_msg_id,
  ).map(
    async (v) =>
      `${
        v?.thread_ts
          ? `[${new Date(Number(v.thread_ts) * 1000).toJSON()}] `
          : ""
      }${new Date(Number(v?.ts) * 1000).toJSON()}, ${await getUser(
        v?.user,
      )}: ${formatMessage(v)}`,
  ),
);

console.log(msgs.join("\n"));
