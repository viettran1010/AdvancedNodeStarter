const mongoose = require('mongoose');
const redis = require('redis');
const util = require('util');
const redisUrl = 'redis://127.0.0.1:6379';
const client = redis.createClient(redisUrl);
client.hget = util.promisify(client.hget);

const exec = mongoose.Query.prototype.exec; // reference to the original exec function

mongoose.Query.prototype.cache = function(options = {}) {
    this.useCache = true;
    this.hashKey = JSON.stringify(options.key || '');

    return this; // TO MAKE THIS CHAINABLE
}

mongoose.Query.prototype.exec = async function() { // override the exec function
    if (this.useCache === false) {
        return exec.apply(this, arguments)
    }

    // console.log('IM ABOUT TO RUN A QUERY');
    const key = JSON.stringify({...this.getQuery(), collection: this.mongooseCollection.name})
    // console.log(key)

    // See if we have a value for 'key' in redis
    const cacheValue = await client.hget(this.hashKey, key);

    // If we do, return that
    if (cacheValue) {
        console.log('cacheValue: ',cacheValue);
        const doc = JSON.parse(cacheValue)

        return Array.isArray(doc) 
        ? doc.map(d=>new this.model(d))
        : new this.model(doc);
    }

    // Otherwise, issue the query and store the result in reids

    const result = await exec.apply(this, arguments);
    client.hset(this.hashKey, key, JSON.stringify(result), 'EX', 10)
    
    return result;
}

module.exports = {
    clearHash(hashKey) {
        client.del(JSON.stringify(hashKey));
    }
}
