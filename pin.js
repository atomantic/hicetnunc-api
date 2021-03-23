/**
 * Start running an IPFS node: https://ipfs.io/#install
 * 
 * you can pin the collection/creations of any tz address like so:
 * 
 * node pin.js tz1iyFi4WjSttoja7Vi1EJYMEKKSebQyMkF9
 */

const axios = require('axios');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const conseilUtil = require('./conseilUtil');

const pin = async(hash)=>{
    const { stdout, stderr } = await exec(`ipfs pin add ${hash}`);
    if(stderr) console.error(`error pinnng ${hash}`, stderr);
    console.log(stdout);
}

const getIpfsHash = async (ipfsHash) => {
    return await axios.get('https://cloudflare-ipfs.com/ipfs/' + ipfsHash).then(res => res.data);
}


const tz = process.argv[2];

console.log(`fetching content for address ${tz}`);

(async () => {

    const collection = await conseilUtil.getCollectionForAddress(tz)
    const creations = await conseilUtil.getArtisticOutputForAddress(tz)

    const hashes = [...collection.map(i=>i.ipfsHash), ...creations.map(i=>i.ipfsHash)];

    console.log(`hashes`, hashes);

    for(let i=0;i<hashes.length;i++){
        await pin(hashes[i]);
    }

    const tokenInfos = await Promise.all(hashes.map(i=>getIpfsHash(i)))
    const contentHashes = tokenInfos.map(i=>i.artifactUri.replace('ipfs://', ''))
    console.log(`contentHashes`, contentHashes)
    for(let i=0;i<contentHashes.length;i++){
        await pin(contentHashes[i]);
    }

})();