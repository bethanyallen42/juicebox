const express = require("express");
const tagsRouter = express.Router();
const { getAllTags, getPostsByTagName } = require("../db");

tagsRouter.use((req, res, next) => {
  console.log("A request is being made to /tags");
  next();
});

tagsRouter.get("/", async (req, res) => {
  const tags = await getAllTags();
  res.send({ tags: tags });
});

tagsRouter.get("/:tagName/posts", async (req, res, next) => {
  const { tagName } = req.params;

  try {
    const allPosts = await getPostsByTagName(tagName);
    const posts = allPosts.filter((post) => {
      if (post.active) {
        return true;
      }

      if (req.user && post.author.id === req.user.id) {
        return true;
      }

      return false;
    });
    if (posts.length > 0) {
      res.send({ posts });
    } else {
      next({
        name: "NoPostsWithThisTagFound",
        message: "There are no posts with this tag",
      });
    }
  } catch ({ name, message }) {
    next({ name, message });
  }
});

module.exports = tagsRouter;
