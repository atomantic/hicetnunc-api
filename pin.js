/**
 * if you are running an IPFS node,
 * you can pin the collection/creations of any tz address like so
 *
 * node pin.js tz1iyFi4WjSttoja7Vi1EJYMEKKSebQyMkF9
 */

const util = require("util");
const exec = util.promisify(require("child_process").exec);
const conseilUtil = require("./conseilUtil");
const axios = require("axios");

function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}

const getIpfsHash = async (ipfsHash) => {
  return await axios
    .get("https://cloudflare-ipfs.com/ipfs/" + ipfsHash)
    .then((res) => res.data);
};

const pin = async (hash, method = "add") => {
  const { stdout, stderr } = await exec(`ipfs pin ${method} ${hash}`).catch(
    (e) => e
  );
  // not pinned is a valid state when rm is used
  if (stderr && !stderr.includes("not pinned"))
    console.error(`🚨 error with ${hash}`, stderr);
  if (stdout)
    console.log(method === "add" ? `✅` : `🗑️ `, stdout.replace("\n", ""));
};

const tz = process.argv[2];

const SanitiseOBJKT = (objkt) => {
  return objkt.filter((o) => {
    if (Object.keys(o).length === 0) {
      // if empty object ignore
      return true;
    } else if (!o.token_info) {
      // if missing token_info flag as corrupt
      console.warn("objkt flagged as corrupt", objkt);
      return false;
    }
    return true;
  });
};

console.log(`⚡ fetching content for address ${tz}`);

(async () => {
  blocklists = await Promise.all([
    axios
      .get(
        "https://raw.githubusercontent.com/hicetnunc2000/hicetnunc/main/filters/o.json"
      )
      .catch(() => {
        return { data: [] };
      }),
    axios
      .get(
        "https://raw.githubusercontent.com/hicetnunc2000/hicetnunc/main/filters/w.json"
      )
      .catch(() => {
        return { data: [] };
      }),
  ]);
  const oblock = blocklists[0].data;
  const wblock = blocklists[1].data;
  const collection = await conseilUtil.getCollectionForAddress(tz);
  const creations = await conseilUtil.getArtisticOutputForAddress(tz);
  const arr = await Promise.all(
    [...collection, ...creations].map(async (e) => {
      e.token_info = await getIpfsHash(e.ipfsHash);

      if (e.piece != undefined) {
        e.token_id = parseInt(e.piece);
      } else {
        e.token_id = parseInt(e.objectId);
      }
      return e;
    })
  );

  const sanitizedList = SanitiseOBJKT(arr).filter(onlyUnique);

  const filtered = sanitizedList.filter(
    (i) =>
      // filter flagged objkts &&
      // filter flagged wallets
      !oblock.includes(i.token_id) && !wblock.includes(i.token_info.creators[0])
  );

  const contentHashes = filtered
    .map((i) => i.token_info.artifactUri.replace("ipfs://", ""))
    .filter(onlyUnique);
  const thumbnailHashes = filtered
    .map((i) => i.token_info.thumbnailUri.replace("ipfs://", ""))
    .filter(onlyUnique);
  console.log(`⚡ pinning ${filtered.length} meta hashes`);
  for (let i = 0; i < filtered.length; i++) {
    await pin(filtered[i].ipfsHash);
  }
  console.log(`⚡ pinning ${contentHashes.length} content hashes`);
  for (let i = 0; i < contentHashes.length; i++) {
    await pin(contentHashes[i]);
  }
  console.log(`⚡ pinning ${thumbnailHashes.length} thumb hashes`);
  for (let i = 0; i < thumbnailHashes.length; i++) {
    await pin(thumbnailHashes[i]);
  }

  const blocked = sanitizedList
    .filter(
      (i) =>
        oblock.includes(i.token_id) || wblock.includes(i.token_info.creators[0])
    )
    .filter(onlyUnique);
  const blockedContentHashes = blocked
    .map((i) => i.token_info.artifactUri.replace("ipfs://", ""))
    .filter(onlyUnique);
  const blockedThumbnailHashes = blocked
    .map((i) => i.token_info.thumbnailUri.replace("ipfs://", ""))
    .filter(onlyUnique);

  console.log(`⚡ unpinning ${blocked.length} meta hashes`);
  for (let i = 0; i < blocked.length; i++) {
    await pin(blocked[i].ipfsHash, "rm");
  }
  console.log(`⚡ unpinning ${blockedContentHashes.length} content hashes`);
  for (let i = 0; i < blockedContentHashes.length; i++) {
    await pin(blockedContentHashes[i], "rm");
  }
  console.log(`⚡ unpinning ${blockedThumbnailHashes.length} thumb hashes`);
  for (let i = 0; i < blockedThumbnailHashes.length; i++) {
    await pin(blockedThumbnailHashes[i], "rm");
  }
})();
