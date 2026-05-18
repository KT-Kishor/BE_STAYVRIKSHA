const { randomUUID } = require("crypto");
const {
  CommonCreateCall,
  CommonUpdateCall,
  CommonDeleteCall,
  CommonReadWithFilters
} = require("./CommonController");

async function getHM_ExtraFacilities(req, res, next) {
  try {
    req.body.filters = {};
    req.body.tableName = "HM_ExtraFacilities";

    if (req.query.ID) req.body.filters.ID = req.query.ID;
    if (req.query.FacilityName) req.body.filters.FacilityName = req.query.FacilityName;
    if (req.query.BranchCode) req.body.filters.BranchCode = req.query.BranchCode.split(",");
    if (req.query.BranchCode === "" && req.query.Role === "Admin") return res.status(200).send({ success: true, data: [] })
    delete req.query.Role;

    var data = {};
    var dataFact = [];
    var FactDeta = [];

    // ✅ Check if any filters exist
    if (Object.keys(req.body.filters).length > 0) {
      // Fetch main bed type data
      dataFact = await CommonReadWithFilters(req, res, next);

      // If specific ID filter, fetch bed details
      if (req.query.ID) {
        req.body.filters = { ID: req.query.ID };
        req.body.tableName = "HM_Facilities";

        FactDeta = await CommonReadWithFilters(req, res, next);

        // Convert buffer photos to base64
        FactDeta.forEach((doc) => {
          Object.keys(doc).forEach((key) => {
            if (
              typeof doc[key] !== "undefined" &&
              key.startsWith("Photo") &&
              !key.endsWith("Name") &&
              !key.endsWith("Type") &&
              Buffer.isBuffer(doc[key])
            ) {
              doc[key] = doc[key].toString("base64");
            }
          });
        });
      }

      data = { data: dataFact, FactDeta };
    } else {
      // No filters — fetch everything
      data = await CommonReadWithFilters(req, res, next);
    }

    res.send({ success: true, data });
  } catch (err) {
    res.status(500).send({
      success: false,
      message:
        err.message || "Technical error, please contact the administrator",
    });
  }
}

async function postHM_ExtraFacilities(req, res, next) {
  try {
    let data = req.body.data.data;
    var attachment = req.body.data.Attachment;
    delete req.body.data.Attachment;
    req.body.tableName = "HM_ExtraFacilities";
    var IDBed = randomUUID();
    req.body.data = {
      ...data,
      ID: IDBed,
    };
    await CommonCreateCall(req, res, next);

    req.body.tableName = "HM_Facilities";
    var data1 = attachment;
    Object.keys(data1).forEach((key) => {
      if (
        typeof data1[key] === "string" &&
        key.startsWith("Photo") &&
        !key.endsWith("Name") &&
        !key.endsWith("Type")
      ) {
        data1[key] = Buffer.from(data1[key], "base64");
      }
    });
    req.body.data = {
      ID: IDBed,
      ...data1,
    };
    await CommonCreateCall(req, res, next);
    res.status(200).send({
      success: true,
      message: "BedType saved successfully!",
      RoomID: data.ID,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message:
        error.message || "Technical error, please contact the administrator",
    });
  }
}

async function putHM_ExtraFacilities(req, res, next) {
  try {
    req.body.tableName = "HM_ExtraFacilities";
    var data = req.body.data.data;
    var attachment = req.body.data.Attachment;
    delete req.body.data.Attachment;
    req.body.data = { ...data };
    await CommonUpdateCall(req, res, next);

    req.body.tableName = "HM_Facilities";
    Object.keys(attachment).forEach((key) => {
      if (
        typeof attachment[key] === "string" &&
        key.startsWith("Photo") &&
        !key.endsWith("Name") &&
        !key.endsWith("Type")
      ) {
        attachment[key] = Buffer.from(attachment[key], "base64");
      }
    });
    req.body.data = { ...attachment };
    await CommonUpdateCall(req, res, next);

    res.send({ success: true, message: "Updated successfully" });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error || "Technical error, please contact the administrator",
    });
  }
}

async function deleteHM_ExtraFacilities(req, res, next) {
  try {
    req.body.tableName = "HM_ExtraFacilities";
    const data = await CommonDeleteCall(req, res, next);
    req.body.tableName = "HM_Facilities";
    await CommonDeleteCall(req, res, next);
    res.send({ success: true, data });
  } catch (error) {
    res.status(500).send({
      success: false,
      message:
        error.message || "Technical error, please contact the administrator",
    });
  }
}

async function getBookingFacilityItemsForDelete(req, res, next) {
  try {
    // 🔹 Step 1: Read Assigned Bookings
    req.body.filters = {};
    req.body.tableName = "HM_Booking";

    if (req.body.BranchCode) {
      req.body.filters.BranchCode = req.body.BranchCode.split(",");
    }

    req.body.filters.Status = "Assigned";

    const bookingData = await CommonReadWithFilters(req, res, next);

    // 🔹 Step 2: Extract BookingID list
    const bookingIds = bookingData.map(item => item.BookingID).filter(Boolean); // remove null / undefined

    // 🔹 Step 3: Read Facility Items using BookingIDs
    req.body.filters = {};
    req.body.filters.BookingID = bookingIds;
    req.body.tableName = "HM_BookingFacilityItems";

    const HM_BookingFacilityItems = await CommonReadWithFilters(req, res, next);
    // 🔹 Final Response
    res.send({ success: true, HM_BookingFacilityItems });
  } catch (error) {
    res.status(500).send({ success: false, message: error.message || "Technical error, please contact the administrator" });
  }
}


exports.HM_ExtraFacilities = {
  getHM_ExtraFacilities,
  postHM_ExtraFacilities,
  putHM_ExtraFacilities,
  deleteHM_ExtraFacilities,
  getBookingFacilityItemsForDelete
};
