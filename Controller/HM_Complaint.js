const { randomUUID } = require("crypto");
const {
  CommonReadWithFilters,
  CommonCreateCall,
  CommonUpdateCall,
  CommonDeleteCall
} = require("./CommonController");

async function getHM_Complaint(req, res, next) {
  try {
    req.body.filters = {};
    req.body.tableName = "HM_Complaint";
    if (req.query.Status) req.body.filters.Status = req.query.Status;
    if (req.query.StartDate && req.query.EndDate) req.body.filters.ResolutionDate = [req.query.StartDate, req.query.EndDate]
    if (req.query.ComplaintType) req.body.filters.ComplaintType = req.query.ComplaintType;
    if (req.query.RoomNo) req.body.filters.RoomNo = req.query.RoomNo;
    if (req.query.UserID) req.body.filters.UserID = req.query.UserID;
    if (req.query.BranchCode) req.body.filters.BranchCode = req.query.BranchCode.split(",");
    if (req.query.BranchCode === "" && req.query.Role === "Admin") return res.status(200).send({
            success: true,
            data: []
    })
    delete req.query.Role;
    const commentData = await CommonReadWithFilters(req, res, next);
    commentData.forEach(item => {
      if (item.File && Buffer.isBuffer(item.File)) {
        item.File = item.File.toString('base64');
      }
    });
    res.send({ success: true, commentData });
  }
  catch (error) {
    res.status(500).send({ success: false, message: error || "Technical error, please contact the administrator", });
  }
}

async function postHM_Complaint(req, res, next) {
  try {
    let data = req.body.data;
    data.ComplaintID = randomUUID();
    req.body.tableName = "HM_Complaint";
    req.body.data = {
      ...data,
    };
    if (req.body.data.File) {
      req.body.data.File = Buffer.from(req.body.data.File, 'base64');
    }
    // Step 4: Create main Allowance record
    await CommonCreateCall(req, res, next);
    res.status(200).send({
      success: true,
      message: "Complaint details saved successfully!",
      ComplaintID: data.ComplaintID,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message:
        error.message || "Technical error, please contact the administrator",
    });
  }
}

async function putHM_Complaint(req, res, next) {
  try {
    req.body.tableName = "HM_Complaint";
    if (req.body.data.File) {
      req.body.data.File = Buffer.from(req.body.data.File, 'base64');
    }
    await CommonUpdateCall(req, res, next);
    res.status(200).send({ success: true, message: "Complaint details updated!" });
  } catch (error) {
    res.status(500).send({
      success: false,
      message:
        error || "Technical error, please contact the administrator",
    });
  }
}

async function deleteHM_Complaint(req, res, next) {
  try {
    req.body.tableName = "HM_Complaint";
    var data = await CommonDeleteCall(req, res, next);
    res.send({ success: true, data ,message:"Complaint deleted successfully!"});
  } catch (error) {
    res.status(500).send({ success: false, message: error || "Technical error, please contact the administrator", });
  }
}

exports.HM_Complaint = {
  getHM_Complaint,
  postHM_Complaint,
  putHM_Complaint,
  deleteHM_Complaint
};