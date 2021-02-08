const mongoose = require('mongoose');
const requireLogin = require('../middlewares/requireLogin');
const cleanCache = require('../middlewares/cleanCache');
const Blog = mongoose.model('Blog');

module.exports = app => {
  app.get('/api/blogs/:id', requireLogin, async (req, res) => {
    const blog = await Blog.findOne({
      _user: req.user.id,
      _id: req.params.id
    });

    res.send(blog);
  });

  app.get('/api/blogs', requireLogin, async (req, res) => {

    const blogs = await Blog.find({_user: req.user.id}).cache({
      key: req.user.id
    });
    res.send(blogs);

    // old logic of naive caching

    // const redis = require('redis');
    // const redisUrl = 'redis://127.0.0.1:6379';
    // const client = redis.createClient(redisUrl);
    // const util = require('util');
    // client.get = util.promisify(client.get);
    
    // // Do we have any cached data in redis related to this query?
    // // If yes, then respond the request right away and return
    // const cachedBlogs = await client.get(req.user.id);
    // if (cachedBlogs) {
    //   console.log('SERVING FROM CACHE');
    //   return res.send(JSON.parse(cachedBlogs));
    // }
    // // If no, we need to respond to request and update our cache to store the data     
    // console.log('SERVING FROM MONGO');
    // const blogs = await Blog.find({ _user: req.user.id });
    // res.send(blogs);
    // client.set(req.user.id, JSON.stringify(blogs));
  });

  app.post('/api/blogs', requireLogin, cleanCache, async (req, res) => {
    const { title, content } = req.body;

    const blog = new Blog({
      title,
      content,
      _user: req.user.id
    });

    try {
      await blog.save();
      res.send(blog);
    } catch (err) {
      res.send(400, err);
    }
  });
};
