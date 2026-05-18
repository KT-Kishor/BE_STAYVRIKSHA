const { randomUUID } = require("crypto");
const {
  CommonCreateCall,
  CommonUpdateCall,
  CommonDeleteCall,
  CommonReadWithFilters
} = require("./CommonController");

async function getHM_Rooms(req, res, next) {
  try {
    req.body.filters = {};
    req.body.tableName = "HM_Rooms";

    if(req.query.top) req.body.top = req.query.top ? parseInt(req.query.top, 10) : undefined;
    if(req.query.skip) req.body.skip = req.query.skip ? parseInt(req.query.skip, 10) : undefined;

    if (req.query.RoomNo) req.body.filters.RoomNo = req.query.RoomNo;
    if (req.query.BedTypeName) req.body.filters.BedTypeName = req.query.BedTypeName;
    if (req.query.Price) req.body.filters.Price = req.query.Price
    if (req.query.BranchCode) req.body.filters.BranchCode = req.query.BranchCode.split(",");
    if (req.query.BranchCode === "" && req.query.Role === "Admin") return res.status(200).send({ success: true, commentData: [] })
    delete req.query.Role;
    const commentData = await CommonReadWithFilters(req, res, next);
    res.send({ success: true, commentData });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error || "Technical error, please contact the administrator",
    });
  }
}

async function postHM_Rooms(req, res, next) {
  try {
    let data = req.body.data;
    req.body.tableName = "HM_Rooms";
    req.body.data = {
      ...data,
    };
    // Step 4: Create main Allowance record
    await CommonCreateCall(req, res, next);
    res.status(200).send({
      success: true,
      message: "Room details saved successfully!",
      RoomID: data.RoomID,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message:
        error.message || "Technical error, please contact the administrator",
    });
  }
}

async function putHM_Rooms(req, res, next) {
  try {
    req.body.tableName = "HM_Rooms";
    await CommonUpdateCall(req, res, next);
    res.status(200).send({ success: true, message: "Room details updated!" });
  } catch (error) {
    res.status(500).send({
      success: false,
      message:
        error || "Technical error, please contact the administrator",
    });
  }
}

async function deleteHM_Rooms(req, res, next) {
  try {
    req.body.tableName = "HM_Rooms";
    var data = await CommonDeleteCall(req, res, next);
    res.send({ success: true, data });
  } catch (error) {
    res.status(500).send({ success: false, message: error || "Technical error, please contact the administrator", });
  }
}

exports.HM_Rooms = {
  getHM_Rooms,
  postHM_Rooms,
  putHM_Rooms,
  deleteHM_Rooms,
};
