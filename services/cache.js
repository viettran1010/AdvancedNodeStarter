const mongoose = require('mongoose');
const redis = require('redis');
const util = require('util');
const keys = require('../config/keys');

const client = redis.createClient(keys.redisUrl);
client.hget = util.promisify(client.hget);
client.hset = util.promisify(client.hset); // Promisify hset for async/await usage
const exec = mongoose.Query.prototype.exec; // reference to the original exec function

mongoose.Query.prototype.cache = function(options = {}) {
    this.useCache = true;
    this.hashKey = JSON.stringify(options.key || '');

    return this; // TO MAKE THIS CHAINABLE
}

mongoose.Query.prototype.exec = async function() { // override the exec function
    if (!this.useCache) {
        return exec.apply(this, arguments);
    }

    const key = JSON.stringify({...this.getQuery(), collection: this.mongooseCollection.name});

    // Check for an existing entry in Redis using the "query_key"
    const cacheValue = await client.hget(this.hashKey, key);

    // If an existing entry is found, return that
    if (cacheValue) {
        const doc = JSON.parse(cacheValue);
        return Array.isArray(doc) 
            ? doc.map(d => new this.model(d))
            : new this.model(doc);
    }

    // Otherwise, issue the query and store the result in Redis
    const result = await exec.apply(this, arguments);

    // Serialize the "query_result" using JSON.stringify before storing it in Redis
    await client.hset(this.hashKey, key, JSON.stringify(result), 'EX', 10).catch(err => {
        console.error('Redis hset failed:', err);
    });

    return result;
}

module.exports = {
    clearHash(hashKey) {
        client.del(JSON.stringify(hashKey));
    }
}
