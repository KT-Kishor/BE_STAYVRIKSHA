const { randomUUID } = require("crypto");
const {
    CommonReadCall,
    CommonCreateCall,
    CommonUpdateCall,
    CommonDeleteCall,
    CommonReadWithFilters
} = require("./CommonController");

var dbKalTecProduction = require("../sqlKalTecProduction");
var dbKvrTecProduction = require("../sqlKvrTecProduction");
var dbDevelopment = require("../sqlDevelopment");
var Stayvriksha = require("../sqlStayvriksha");
var DemoStayvriksha = require("../sqlDevstayvriksha");


async function getHM_Facilities(req, res, next) {
  try {
    const origin = req.get("origin") || "";

		if (origin.split("//")[1] === "kvrikshatechnologies.com" || origin.split("//")[1] === "www.kvrikshatechnologies.com") {
			dbConnProd = dbKvrTecProduction;
		} else if (origin.split("//")[1] === "kt.kvrikshatechnologies.com" || origin.split("//")[1] === "www.kt.kvrikshatechnologies.com" || origin.split("//")[1] === "www.kalpavrikshatechnologies.com" || origin.split("//")[1] === "kalpavrikshatechnologies.com") {
			dbConnProd = dbKalTecProduction;
		} else if (origin.split("//")[1] === "stayvriksha.in" || origin.split("//")[1] === "www.stayvriksha.in") {
			dbConnProd = Stayvriksha;
		} else if (origin.split("//")[1] === "demo.stayvriksha.in" || origin.split("//")[1] === "www.demo.stayvriksha.in") {
			dbConnProd = DemoStayvriksha;
		} else {
			dbConnProd = dbDevelopment;
		}

    // Step 1: Read from HM_ExtraFacilities
    req.body.filters = {};
    req.body.tableName = "HM_ExtraFacilities";

    if (req.query.FacilityName) req.body.filters.FacilityName = req.query.FacilityName;
    if (req.query.Type)         req.body.filters.Type = req.query.Type;
    if (req.query.SelectionMode) req.body.filters.SelectionMode = req.query.SelectionMode;
    if (req.query.BranchCode)   req.body.filters.BranchCode = req.query.BranchCode.split(",");

    const data = await CommonReadWithFilters(req, res, next);

    if (!data || data.length === 0) {
      return res.send({ success: true, data: [] });
    }

    // Step 2: Get Facility details using IDs
    const IDs = data.map((c) => `'${c.ID}'`).join(",");
    const FaciltySQL = `SELECT * FROM HM_Facilities WHERE ID IN (${IDs})`;
    const [Facility] = await Promise.all([executeQuery(FaciltySQL, dbConnProd)]);

    // Step 3: Convert buffer photos in Facility records
    Facility.forEach((doc) => {
      Object.keys(doc).forEach((key) => {
        if (key.startsWith("Photo") && Buffer.isBuffer(doc[key])) {
          doc[key] = doc[key].toString("base64");
        }
      });
    });

    // Step 4: Merge both datasets where IDs match
    const mergedData = data.map((extra) => {
      const match = Facility.find((fac) => fac.ID === extra.ID);
      return match ? { ...extra, ...match } : extra;
    });

    // Step 5: Send merged result
    res.send({
      success: true,
      data: mergedData,
    });
  } catch (err) {
    res.status(500).send({
      success: false,
      message: err.message || "Technical error, please contact the administrator",
    });
  }
}

async function executeQuery(query, dbConnProd, queryParams = []) {
  return new Promise((resolve, reject) => {
    dbConnProd.getConnection((err, connection) => {
      if (err) {
        return reject({
          message: "Connection error, please contact the administrator",
          error: err.message,
        });
      }

      connection.query(query, queryParams, (err, results) => {
        connection.release();

        if (err) {
          return reject({
            message: "Technical error, please contact the administrator",
            error: err.message,
          });
        }

        resolve(results);
      });
    });
  });
}

async function postHM_Facilities(req, res, next) {
  try {
    let data = req.body.data;
    req.body.tableName = "HM_Facilities";

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

    await CommonCreateCall(req, res, next);
    res.status(200).send({
      success: true,
      message: "Facility saved successfully!",
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message:
        error.message || "Technical error, please contact the administrator",
    });
  }
}

async function putHM_Facilities(req, res, next) {
  try {
    req.body.tableName = "HM_Facilities";
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

async function deleteHM_Facilities(req, res, next) {
  try {
    req.body.tableName = "HM_Facilities";

    if (!req.query.ID) {
      return res.status(400).send({
        success: false,
        message: "ID is required to delete image details.",
      });
    }

    if (!req.query.PhotoName) {
      return res.status(400).send({
        success: false,
        message: "PhotoName is required.",
      });
    }

    // Step 1: Read existing data
    req.body.filters = { ID: req.query.ID };
    const readResult = await CommonReadCall(req, res, next);

    if (!readResult || readResult.length === 0) {
      return res.status(404).send({
        success: false,
        message: "No record found with the given ID.",
      });
    }

    let record = readResult[0];
    const photoNameToDelete = req.query.PhotoName;

    // Step 2: Find which PhotoName matches and clear its related fields
    for (let i = 1; i <= 3; i++) { // assuming up to Photo5 fields exist
      const nameKey = `Photo${i}Name`;
      const fileKey = `Photo${i}`;
      const typeKey = `Photo${i}Type`;

      if (record[nameKey] && record[nameKey] === photoNameToDelete) {
        record[nameKey] = "";
        record[fileKey] = "";
        record[typeKey] = "";
      }
    }

    // Step 3: Prepare the update payload
    req.body.data = record;

    // Step 4: Update the record
    const updatedData = await CommonUpdateCall(req, res, next);

    res.send({
      success: true,
      message: "Photo details removed successfully.",
      data: updatedData,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message || "Technical error, please contact the administrator.",
    });
  }
}

async function getHM_FacilityType(req, res, next) {
  try {
    req.body.tableName = "HM_FacilityType";
    const data = await CommonReadCall(req, res, next);
    res.send({ success: true, data });
  } catch (error) {
    res.status(500).send({ success: false, message: "Internal Server Error" });
  }
}

async function getHM_AmenitiName(req, res, next) {
  try {
    req.body.tableName = "HM_AmenitiName";
    const data = await CommonReadCall(req, res, next);
    res.send({ success: true, data });
  } catch (error) {
    res.status(500).send({ success: false, message: "Internal Server Error" });
  }
}

exports.HM_Facilities = {
  getHM_Facilities,
  postHM_Facilities,
  putHM_Facilities,
  deleteHM_Facilities,
  getHM_FacilityType,
  getHM_AmenitiName
};