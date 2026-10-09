"use strict";

const express = require("express");
const router  = express.Router();
const { submitInquiry } = require("../controllers/inquiryController");

router.post("/", submitInquiry);

module.exports = router;
