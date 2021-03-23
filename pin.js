/**
 * if you are running an IPFS node, 
 * you can pin the collection/creations of any tz address like so
 * 
 * node pin.js tz1iyFi4WjSttoja7Vi1EJYMEKKSebQyMkF9
 */

const util = require('util');
const exec = util.promisify(require('child_process').exec);
const conseilUtil = require('./conseilUtil');

const pin = async(hash)=>{
    const { stdout, stderr } = await exec(`ipfs pin add ${hash}`);
    if(stderr) console.error(`error pinnng ${hash}`, stderr);
    console.log(stdout);
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

})();