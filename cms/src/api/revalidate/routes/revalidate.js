module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/revalidate',
      handler: 'revalidate.revalidate',
      config: { auth: false, policies: [] },
    },
  ],
};
