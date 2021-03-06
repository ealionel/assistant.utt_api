////////////////////////////////
//    INITIALIZATION FILE     //
////////////////////////////////

require('dotenv').config();

const { sequelize, model } = require('./index.js');
const jsonUE = require('./guideUE.json');


async function initListUE() {
  jsonUE.forEach((ue) => {
    // We are stringifying program and goals because we can't
    // use JSON datatype in mariadb 10.1
    const mutatedUE = {
      ...ue,
      programme: JSON.stringify(ue.programme),
      objectif: JSON.stringify(ue.objectif),
    };

    model.ListUE.create(mutatedUE)
      .then(addedUE => console.log(`${addedUE.code} added.`))
      .catch(err => Promise.reject(err));
  });

  return Promise.resolve();
}

// Async function to initialize database models automatically
async function init() {
  await sequelize.authenticate();
  console.log('Connection established.');

  console.log('Syncing models to database.');
  try {
    await sequelize.sync({ force: true });
  } catch (err) {
    console.log(`Error syncing models : ${err}`);
  }

  if (process.argv[2] === 'initUE') {
    try {
      await initListUE();
    } catch (err) {
      console.log(`Error initializing ListUE : ${err}`);
    }
  }
}

init().catch(err => {
  throw new Error(err)
});
