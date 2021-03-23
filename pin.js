/**
 * if you are running an IPFS node, 
 * you can pin the collection/creations of any tz address like so
 * 
 * node pin.js tz1iyFi4WjSttoja7Vi1EJYMEKKSebQyMkF9
 */

 const util = require('util')
 const exec = util.promisify(require('child_process').exec)
 const conseilUtil = require('./conseilUtil')
 const axios = require('axios')
 
 const getIpfsHash = async (ipfsHash) => {
 
     return await axios.get('https://cloudflare-ipfs.com/ipfs/' + ipfsHash).then(res => res.data)
     /*    const nftDetailJson = await nftDetails.json();
    
        const nftName = nftDetailJson.name;
        const nftDescription = nftDetailJson.description;
        const nftCreators = nftDetailJson.creators.join(', ');
        const nftArtifact = `https://cloudflare-ipfs.com/ipfs/${nftDetailJson.formats[0].uri.toString().slice(7)}`;
        const nftArtifactType = nftDetailJson.formats[0].mimeType.toString();
    
        return { name: nftName, description: nftDescription, creators: nftCreators, artifactUrl: nftArtifact, artifactType: nftArtifactType }; */
 }
 
 const pin = async(hash)=>{
     const { stdout, stderr } = await exec(`ipfs pin add ${hash}`);
     if(stderr) console.error(`error pinnng ${hash}`, stderr);
     console.log(stdout);
 }
 
 const tz = process.argv[2];
 
 const SanitiseOBJKT = (objkt) => {
     return objkt.filter((o) => {
       if (Object.keys(o).length === 0) {
         // if empty object ignore
         return true
       } else if (!o.token_info) {
         // if missing token_info flag as corrupt
         console.warn('objkt flagged as corrupt', objkt)
         return false
       }
       return true
     })
   }
 
 console.log(`fetching content for address ${tz}`);
 
 (async () => {
     blocklists = await Promise.all([
     axios.get("https://raw.githubusercontent.com/hicetnunc2000/hicetnunc/main/filters/o.json").catch(() => {
         return { data: [] }
       }),
     axios.get("https://raw.githubusercontent.com/hicetnunc2000/hicetnunc/main/filters/w.json").catch(() => {
         return { data: [] }
     })])
     oblock = blocklists[0].data
     wblock = blocklists[1].data
     const collection = await conseilUtil.getCollectionForAddress(tz)
     const creations = await conseilUtil.getArtisticOutputForAddress(tz)
     var arr = [...collection, ...creations]
     var arr = await Promise.all(arr.map(async e => {
         e.token_info = await getIpfsHash(e.ipfsHash)
 
         if (e.piece != undefined) {
             e.token_id = parseInt(e.piece)
         } else {
             e.token_id = parseInt(e.objectId)
 
         }
         return e
     }))
 
     console.log('prefilt', arr.length)
 
     const filtered = SanitiseOBJKT(arr)
         // filters objkt's out if they are flagges
         .filter((i) => !oblock.includes(i.token_id))
         // filter objkt's out if they're from flagged wallets
         .filter((i) => !wblock.includes(i.token_info.creators[0]))
     console.log('postfilt', filtered.length)
     for(let i=0;i<arr.length;i++){
         await pin(arr[i].ipfsHash);
     }
     const contentHashes = arr.map(i=>i.token_info.artifactUri.replace('ipfs://', ''))
     const thumbnailHashes = arr.map(i=>i.token_info.thumbnailUri.replace('ipfs://', ''))
     for(let i=0;i<contentHashes.length;i++){
         await pin(contentHashes[i]);
     }
     for(let i=0;i<thumbnailHashes.length;i++){
         await pin(thumbnailHashes[i]);
     }
 
 })();