module.exports = ({ env }) => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET', 'pleaseChangeMe_adminJwt'),
  },
  apiToken: {
    salt: env('API_TOKEN_SALT', 'pleaseChangeMe_apiTokenSalt'),
  },
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT', 'pleaseChangeMe_transferToken'),
    },
  },
  flags: {
    nps: false,
    promoteEE: false,
  },
});
