const mongoose = require('mongoose');
const redis = require('redis');
const util = require('util');
const keys = require('../config/keys');

const client = redis.createClient(keys.redisUrl);
client.hget = util.promisify(client.hget);
client.hset = util.promisify(client.hset); // Promisify hset for async/await usage
client.hexists = util.promisify(client.hexists); // Promisify the hexists function from new code
client.hdel = util.promisify(client.hdel); // Promisify the hdel function from new code
const exec = mongoose.Query.prototype.exec; // reference to the original exec function

mongoose.Query.prototype.cache = function(options = {}) {
    this.useCache = true;
    this.hashKey = JSON.stringify(options.key || '');

    return this; // TO MAKE THIS CHAINABLE
};

mongoose.Query.prototype.exec = async function() { // override the exec function
    if (!this.useCache) {
        return exec.apply(this, arguments);
    }

    const key = JSON.stringify({...this.getQuery(), collection: this.mongooseCollection.name});

    // See if we have a value for 'key' in redis
    const cacheValue = await client.hget(this.hashKey, key);

    // If we do, return that
    if (cacheValue) {
        const doc = JSON.parse(cacheValue);

        return Array.isArray(doc) 
        ? doc.map(d => new this.model(d))
        : new this.model(doc);
    }

    // Otherwise, issue the query and store the result in redis
    const result = await exec.apply(this, arguments);
    await client.hset(this.hashKey, key, JSON.stringify(result), 'EX', 10).catch(err => {
        console.error('Redis hset failed:', err);
    });
    
    return result;
};

/**
 * Invalidates a cache entry identified by the query_key.
 * @param {string} query_key - The key of the query to invalidate.
 * @returns {Promise<string>} - A message indicating the outcome.
 */
async function invalidateCacheEntry(query_key) {
    try {
        const hashKey = JSON.stringify(query_key.hashKey);
        const key = JSON.stringify(query_key.key);

        // Check if the entry exists in the cache
        const exists = await client.hexists(hashKey, key);
        if (exists) {
            // If it exists, delete the entry
            await client.hdel(hashKey, key);
            return 'Cache entry has been successfully invalidated.';
        } else {
            // If it doesn't exist, return a message indicating nothing to invalidate
            return 'No matching cache entry found to invalidate.';
        }
    } catch (error) {
        console.error('Error invalidating cache entry:', error);
        throw new Error('Failed to invalidate cache entry.');
    }
}

module.exports = {
    clearHash(hashKey) {
        client.del(JSON.stringify(hashKey));
    },
    invalidateCacheEntry // Export the new invalidateCacheEntry function
};
