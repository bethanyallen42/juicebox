const { client, getAllUsers, createUser } = require("./index");

async function dropTables() {
  try {
    console.log("Starting to drop tables...");
    await client.query("DROP TABLE IF EXISTS users;");
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
        password varchar(255) NOT NULL
        );
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
    const albert = await createUser({
      username: "albert",
      password: "bertie99",
    });

    const sandra = await createUser({
      username: "sandra",
      password: "glamgal",
    });

    console.log(albert, sandra);
    console.log("finished creating users!");
  } catch (error) {
    console.error("error creating users :(");
    throw error;
  }
}

async function rebuildDB() {
  try {
    client.connect();

    await dropTables();
    await createTables();
    await createInitialUsers();
  } catch (error) {
    console.error(error);
  }
}

async function testDB() {
  try {
    console.log("starting to test database...");
    const users = await getAllUsers();
    console.log("getAllUsers:", users);
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
