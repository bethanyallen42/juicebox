const {
  client,
  createUser,
  createPost,
  createTags,
  createPostTag,
  updateUser,
  updatePost,
  getAllUsers,
  getAllPosts,
  getPostsByUser,
  getPostById,
  getUserById,
  addTagsToPost,
  getPostsByTagName,
} = require("./index");

async function dropTables() {
  try {
    console.log("Starting to drop tables...");
    await client.query(`
      DROP TABLE IF EXISTS post_tags;
      DROP TABLE IF EXISTS tags;
      DROP TABLE IF EXISTS posts; 
      DROP TABLE IF EXISTS users;
    `);
    console.log("Finished dropping tables");
  } catch (error) {
    console.error("error dropping tables");
    throw error;
  }
}

async function createTables() {
  try {
    console.log("starting to build tables...");
    await client.query(`
    CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        username varchar(255) UNIQUE NOT NULL,
        password varchar(255) NOT NULL,
        name varchar(255) NOT NULL,
        location varchar(255) NOT NULL,
        active BOOLEAN DEFAULT true
        );
    `);

    await client.query(`
    CREATE TABLE posts (
      id SERIAL PRIMARY KEY,
      "authorId" INTEGER REFERENCES users(id) NOT NULL,
      title varchar(255) NOT NULL,
      content TEXT NOT NULL,
      active BOOLEAN DEFAULT TRUE
    )
    `);

    await client.query(`
      CREATE TABLE tags (
        id SERIAL PRIMARY KEY,
        name varchar(255) UNIQUE NOT NULL
      )
    `);

    await client.query(`
        CREATE TABLE post_tags (
          "postId" INTEGER REFERENCES posts(id),
          "tagId" INTEGER REFERENCES tags(id),
          UNIQUE("postId", "tagId") 
        )
    `);

    console.log("finished building tables!");
  } catch (error) {
    console.error("Error building tables");
    throw error;
  }
}

async function createInitialUsers() {
  try {
    console.log("starting to create users...");
    await createUser({
      username: "albert",
      password: "bertie99",
      name: "albert",
      location: "America",
    });

    await createUser({
      username: "sandra",
      password: "2sandy4me",
      name: "sandra",
      location: "France",
    });

    await createUser({
      username: "glamgal",
      password: "soglam",
      name: "maggie",
      location: "Canada",
    });

    console.log("finished creating users!");
  } catch (error) {
    console.error("error creating users :(");
    throw error;
  }
}

async function createInitialPosts() {
  try {
    const [albert, sandra, glamgal] = await getAllUsers();
    await createPost({
      authorId: albert.id,
      title: "First Post",
      content: "This is my first post.  Will it work????",
      tags: ["#happy", "#youcandoanything"],
    });

    await createPost({
      authorId: albert.id,
      title: "Second Post",
      content: "I made a second post!",
      tags: ["#happy", "#worst-day-ever"],
    });

    await createPost({
      authorId: sandra.id,
      title: "Hello",
      content: "My name is Sandra",
      tags: ["#happy", "#youcandoanything", "#canmandoeverything"],
    });

    await createPost({
      authorId: glamgal.id,
      title: "Voila!",
      content: "My post is so glamorous",
    });
  } catch (error) {
    throw error;
  }
}

async function rebuildDB() {
  try {
    client.connect();

    await dropTables();
    await createTables();
    await createInitialUsers();
    await createInitialPosts();
  } catch (error) {
    console.error(error);
  }
}

async function testDB() {
  try {
    console.log("starting to test database...");
    const users = await getAllUsers();
    console.log("getAllUsers:", users);

    console.log("calling updateUser on users[0]");
    const updateUserResult = await updateUser(users[0].id, {
      name: "this is a new name!",
      location: "not America",
    });
    console.log("Updated result:", updateUserResult);

    console.log("Calling getAllPosts");
    const posts = await getAllPosts();
    console.log("getAllPosts", posts);

    console.log("calling updatePost on posts[0]");
    const updatePostResult = await updatePost(posts[0].id, {
      title: "New title!",
      content: "****Edited****",
    });
    console.log("Updating post result", updatePostResult);

    console.log("Calling updatePost on posts[1], only updating tags");
    const updatePostTagsResult = await updatePost(posts[1].id, {
      tags: ["#youcandoanything", "#redfish", "#bluefish"],
    });
    console.log("Result:", updatePostTagsResult);

    console.log("testing getPostsByUser");
    const myPosts = await getPostsByUser(1);
    console.log("myPosts", myPosts);

    console.log("Calling getUserById with 1");
    const albert = await getUserById(1);
    console.log("Albert:", albert);

    console.log("Calling getPostsByTagName with #happy");
    const postsWithHappy = await getPostsByTagName("#happy");
    console.log("Result:", postsWithHappy);

    console.log("Finished database tests!");
  } catch (error) {
    console.error("Error testing database :(");
    console.error(error);
  }
}

rebuildDB()
  .then(testDB)
  .catch(console.error)
  .finally(() => client.end());
