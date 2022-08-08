const { Client } = require("pg");
require("dotenv").config();

const client = new Client(
  process.env.DATABASE_URL || "postgres://localhost:5432/juicebox-dev"
);

//-------------------User Functions---------------------

async function createUser({ username, password, name, location }) {
  try {
    const {
      rows: [user],
    } = await client.query(
      /*sql*/ `
      INSERT INTO users(username, password, name, location)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (username) DO NOTHING
      RETURNING *;
    `,
      [username, password, name, location]
    );

    return user;
  } catch (error) {
    throw error;
  }
}

async function updateUser(id, fields = {}) {
  const setString = Object.keys(fields)
    .map((key, index) => `"${key}"=$${index + 2}`)
    .join(", ");

  if (setString.length === 0) {
    return;
  }

  const values = [id].concat(...Object.values(fields));
  try {
    const {
      rows: [user],
    } = await client.query(
      /*sql*/ `
        UPDATE users
        SET ${setString}
        WHERE id = $1
        returning *;
        `,
      values
    );

    return user;
  } catch (error) {
    throw error;
  }
}

async function getAllUsers() {
  try {
    const { rows } = await client.query(
      /*sql*/ `SELECT id, username, name, location, active FROM users;`
    );

    return rows;
  } catch (error) {
    throw error;
  }
}

async function getUserById(userId) {
  try {
    const {
      rows: [user],
    } = await client.query(
      /*sql*/ `
    SELECT * FROM users 
    WHERE id = $1
    `,
      [userId]
    );

    if (user) {
      delete user.password;
      user.posts = await getPostsByUser(userId);

      return user;
    } else {
      return null;
    }
  } catch (error) {
    throw error;
  }
}

async function getUserByUsername(username) {
  try {
    const {
      rows: [user],
    } = await client.query(
      `
      SELECT *
      FROM users
      WHERE username=$1;
    `,
      [username]
    );

    return user;
  } catch (error) {
    throw error;
  }
}

//-------------------Post Functions---------------------

async function createPost({ authorId, title, content, tags = [] }) {
  try {
    const {
      rows: [post],
    } = await client.query(
      /*sql*/ `
      INSERT INTO posts("authorId", title, content)
      VALUES ($1, $2, $3)
      RETURNING *;
    `,
      [authorId, title, content]
    );

    const tagList = await createTags(tags);

    return await addTagsToPost(post.id, tagList);
  } catch (error) {
    throw error;
  }
}

async function updatePost(id, fields = {}) {
  const { tags } = fields;
  delete fields.tags;

  const setString = Object.keys(fields)
    .map((key, index) => `"${key}"=$${index + 2}`)
    .join(", ");

  try {
    if (setString.length > 0) {
      const values = [id].concat(...Object.values(fields));
      await client.query(
        /*sql*/ `
        UPDATE posts
        SET ${setString}
        WHERE id = $1
        returning *;
        `,
        values
      );
    }

    if (tags === undefined) {
      return await getPostById(id);
    }

    const tagList = await createTags(tags);
    const tagListIdString = tagList.map((tag) => `${tag.id}`).join(", ");

    await client.query(
      /*sql*/ `
      DELETE FROM post_tags
      WHERE "tagId"
      NOT IN (${tagListIdString})
      AND "postId"=$1
    `,
      [id]
    );

    await addTagsToPost(id, tagList);

    return getPostById(id);
  } catch (error) {
    throw error;
  }
}

async function getAllPosts() {
  try {
    const { rows: postIds } = await client.query(/*sql*/ `
    SELECT id 
    FROM posts
    `);

    const posts = await Promise.all(
      postIds.map((post) => getPostById(post.id))
    );

    return posts;
  } catch (error) {
    throw error;
  }
}

async function getPostsByUser(userId) {
  try {
    const { rows: postIds } = await client.query(
      /*sql*/ `
      SELECT id 
      FROM posts
      WHERE "authorId" = $1
    `,
      [userId]
    );

    const posts = await Promise.all(
      postIds.map((post) => getPostById(post.id))
    );

    return posts;
  } catch (error) {
    throw error;
  }
}

async function getPostById(postId) {
  try {
    const {
      rows: [post],
    } = await client.query(
      /*sql*/ `
      SELECT * 
      FROM posts 
      WHERE id=$1
    `,
      [postId]
    );

    if (!post) {
      throw {
        name: "PostNotFoundError",
        message: "Could not find a post with that postId",
      };
    }

    const { rows: tags } = await client.query(
      /*sql*/ `
      SELECT tags.*
      FROM tags
      JOIN post_tags ON tags.id=post_tags."tagId"
      WHERE post_tags."postId"=$1;
    `,
      [postId]
    );

    const {
      rows: [author],
    } = await client.query(
      /*sql*/ `
      SELECT id, username, name, location
      FROM users
      WHERE id=$1
    `,
      [post.authorId]
    );

    post.tags = tags;
    post.author = author;

    delete post.authorId;

    return post;
  } catch (error) {
    throw error;
  }
}

//-------------------Tag Functions---------------------

async function createTags(tagList) {
  if (tagList.length === 0) {
    return;
  }

  const insertValues = tagList.map((_, index) => `$${index + 1}`).join("), (");
  const selectValues = tagList.map((_, index) => `$${index + 1}`).join(", ");

  try {
    await client.query(
      /*sql*/ `
      INSERT INTO tags(name)
      VALUES (${insertValues})
      ON CONFLICT (name) DO NOTHING;
    `,
      tagList
    );

    const { rows } = await client.query(
      /*sql*/ `
      SELECT * FROM tags
      WHERE name
      IN (${selectValues})
    `,
      tagList
    );

    return rows;
  } catch (error) {
    throw error;
  }
}

async function createPostTag(postId, tagId) {
  try {
    await client.query(
      /*sql*/ `
      INSERT INTO post_tags("postId", "tagId")
      VALUES ($1, $2)
      ON CONFLICT ("postId", "tagId") DO NOTHING;
    `,
      [postId, tagId]
    );
  } catch (error) {
    throw error;
  }
}

async function addTagsToPost(postId, tagList = []) {
  try {
    const createPostTagPromises = tagList.map((tag) => {
      createPostTag(postId, tag.id);
    });

    await Promise.all(createPostTagPromises);
    const post = await getPostById(postId);

    return post;
  } catch (error) {
    throw error;
  }
}

async function getPostsByTagName(tagName) {
  try {
    const { rows: postIds } = await client.query(
      /*sql*/ `
      SELECT posts.id
      FROM posts
      JOIN post_tags ON posts.id=post_tags."postId"
      JOIN tags ON tags.id=post_tags."tagId"
      WHERE tags.name=$1
    `,
      [tagName]
    );

    return await Promise.all(postIds.map((post) => getPostById(post.id)));
  } catch (error) {
    throw error;
  }
}

async function getAllTags() {
  try {
    const { rows } = await client.query(/*sql*/ `SELECT * FROM tags;`);

    return rows;
  } catch (error) {
    throw error;
  }
}

module.exports = {
  client,
  createUser,
  createPost,
  updateUser,
  updatePost,
  getUserByUsername,
  getAllUsers,
  getAllPosts,
  getAllTags,
  getPostById,
  getPostsByUser,
  getPostsByTagName,
  getUserById,
  getPostsByTagName,
};
