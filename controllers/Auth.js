const express = require('express');
const { model } = require('../database');
const router = express.Router();
const ClientOAuth2 = require('client-oauth2');
const url = require('url');
const fetchEtu = require('../helpers/fetchEtu');

// Loading app credentials from environment file vars

const etuAuth = new ClientOAuth2({
    clientId: process.env.ETU_CLIENT_ID,
    clientSecret: process.env.ETU_CLIENT_SECRET,
    accessTokenUri: 'https://etu.utt.fr/api/oauth/token',
    authorizationUri: 'https://etu.utt.fr/api/oauth/authorize',
    redirectUri: 'localhost:8080/api/auth/redirect',
    scopes: ['public', 'private_user_account', 'private_user_schedule', 'private_user_organizations'],  
})

/**
 * ENDPOINT ----> /api/auth?sender_id=<sender_id>
 * Redirects user to etu.utt.fr authentication page
 * sender_id is used to remember if user is authenticated or not.
 */
router.get('/', (req, res) => {
    // This variable is would eventually be their Facebook id
    const senderId = req.query.sender_id || req.get('sender-id');

    if (!senderId) {
        return res.status(401).json({ error: 'sender_id is missing'});
    }

    const authUri = new url.URL(etuAuth.code.getUri({
        state: senderId,
    }));

    // We have to add a 'scopes' queryString because etu
    // accepts 'scopes' instead of 'scope'
    authUri.searchParams.set('scopes',  authUri.searchParams.get('scope'));

    console.log(`Authentication called with id '${senderId}'`),

    res.redirect(authUri.toString());
});

/**
 * ENDPOINT -----> /api/auth/redirect
 * Callback url after user has given permission to app or not
 * The tokens are then stored in the database
 */
router.get('/redirect', async (req, res) => {
    if (req.query.error) {
        console.log(req.query.error);
        return res.status(401).json({ error : 'Authentication cancelled' });
    }
    
    try {
        // This is etu's user tokens object
        const rawUserTokens = await etuAuth.code.getToken(req.originalUrl)
            .then(user => user.data);
        
        const senderId = req.query.state;

        // This is our model's user tokens object
        const user = await model.UsersTokens.newUser({
            username: 'Unknown',
            sender_id: senderId,
            refresh_token: rawUserTokens.refresh_token,
            access_token: rawUserTokens.access_token,
        }).then(user => user.getPrivateEtuUserInfo('account'));

        console.log(`User ${user.login} authenticated`);
        res.render('authentication/authenticated.ejs', { user });
        // res.send(`Bonjour ${user.fullName} ! Vous êtes maintenant authentifiés.`);
    } catch (err) {
        console.log(`Authentication failed :`);
        console.log(err);
        res.status(401)
        res.render('authentication/failed.ejs');
        // res.json({ error : 'Authentification échouée' });
    }
});

module.exports = router;
module.exports.etuAuth = etuAuth;