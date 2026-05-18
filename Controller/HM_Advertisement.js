const { randomUUID } = require("crypto");
const {
  CommonReadCall,
  CommonCreateCall,
  CommonUpdateCall,
  CommonDeleteCall,
  CommonReadWithFilters
} = require("./CommonController");

async function getHM_Advertisement(req, res, next) {
  try {
    req.body.filters = {};
    req.body.tableName = "HM_Advertisement";
    if (req.query.URL) req.body.filters.URL = req.query.URL;
    if (req.query.BranchCode) req.body.filters.BranchCode = req.query.BranchCode.split(",");
    if (req.query.BranchCode === "" && req.query.Role === "Admin") return res.status(200).send({ success: true, data: [] })
    delete req.query.Role;
    const data = await CommonReadWithFilters(req, res, next);
    data.forEach((doc) => {
      Object.keys(doc).forEach((key) => {
        if (key.startsWith("Photo") && Buffer.isBuffer(doc[key])) {
          doc[key] = doc[key].toString("base64");
        }
      });
    });
    res.send({ success: true, data });
  } catch (err) {
    res.status(500).send({
      success: false,
      message: err || "Technical error, please contact the administrator",
    });
  }
}

async function postHM_Advertisement(req, res, next) {
  try {
    let data = req.body.data;
    req.body.tableName = "HM_Advertisement";
    Object.keys(data).forEach((key) => {
      if (
        typeof data[key] === "string" &&
        key.startsWith("Photo") &&
        !key.endsWith("Name") &&
        !key.endsWith("Type")
      ) {
        data[key] = Buffer.from(data[key], "base64");
      }
    });
    req.body.data = { ...data };
    const createResult = await CommonCreateCall(req, res, next);
    res.status(200).send({
      success: true,
      message: "Advertisement saved successfully!",
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message:
        error.message || "Technical error, please contact the administrator",
    });
  }
}

async function putHM_Advertisement(req, res, next) {
  try {
    req.body.tableName = "HM_Advertisement";
    Object.keys(req.body.data).forEach((key) => {
      if (
        key.startsWith("Photo") &&
        typeof req.body.data[key] === "string" &&
        !key.endsWith("Name") &&
        !key.endsWith("Type")
      ) {
        req.body.data[key] = Buffer.from(req.body.data[key], "base64");
      }
    });
    await CommonUpdateCall(req, res, next);
    res.send({ success: true, message: "Updated successfully" });
  } catch (error) {
    res.status(500).send({
      success: false,
      message:
        error.message || "Technical error, please contact the administrator",
    });
  }
}

async function deleteHM_Advertisement(req, res, next) {
  try {
    req.body.tableName = "HM_Advertisement";
    const data = await CommonDeleteCall(req, res, next);
    res.send({ success: true, data });
  } catch (error) {
    res.status(500).send({
      success: false,
      message:
        error.message || "Technical error, please contact the administrator",
    });
  }
}

exports.HM_Advertisement = {
  getHM_Advertisement,
  postHM_Advertisement,
  putHM_Advertisement,
  deleteHM_Advertisement
};