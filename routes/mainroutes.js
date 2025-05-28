// routes/mainRoutes.js
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.send('Homepage served by Express Router!');
});

router.get('/about', (req, res) => {
  res.send('This is the About page.');
});

module.exports = router;