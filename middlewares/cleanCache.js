const {clearHash} = require('../services/cache');

module.exports = async (req,res,next) => {
    await next(); // WAIT FOR ROUTE HANDLER TO FININSH

    clearHash(req.user.id); // Only after all is done, we clear the cache
}
