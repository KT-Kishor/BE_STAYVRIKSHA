const { randomUUID } = require("crypto");
const {
  CommonReadWithFilters,
  CommonCreateCall,
  CommonUpdateCall,
  CommonDeleteCall
} = require("./CommonController");

async function getHM_Feedback(req, res, next) {
  try {
    req.body.filters = {};
    req.body.tableName = "HM_Feedback";
    if (req.query.BookingID) req.body.filters.BookingID = req.query.BookingID;
    if (req.query.CustomerName) req.body.filters.CustomerName = req.query.CustomerName;
    if (req.query.RoomNo) req.body.filters.RoomNo = req.query.RoomNo;
    if (req.query.BedType) req.body.filters.BedType = req.query.BedType;
    if (req.query.OverallRating) req.body.filters.OverallRating = req.query.OverallRating;
    if (req.query.StartDate && req.query.EndDate) req.body.filters.FeedbackDate = [req.query.StartDate, req.query.EndDate]
    if (req.query.BranchCode) req.body.filters.BranchCode = req.query.BranchCode.split(",");
    if (req.query.BranchCode === "" && req.query.Role === "Admin") return res.status(200).send({ success: true, data: [] })
    if (req.query.StartDate && req.query.EndDate) { req.body.filters.FeedbackDate = [req.query.StartDate, req.query.EndDate] }

    req.body.sort = {};
    switch (req.query.SortKey) {
      case "1":
        req.body.sort = { OverallRating: "DESC" };
        break;

      case "2":
        req.body.sort = { OverallRating: "ASC" };
        break;

      case "3":
        req.body.sort = { FeedbackDate: "DESC" }; // Latest
        break;

      case "4":
        req.body.sort = { FeedbackDate: "ASC" }; // Oldest
        break;
    }

    const commentData = await CommonReadWithFilters(req, res, next);
    commentData.sort((a, b) => {  // Sort by latest FeedbackDate + SubmissionTime
      const dateTimeA = new Date(`${a.FeedbackDate} ${a.SubmissionTime}`);
      const dateTimeB = new Date(`${b.FeedbackDate} ${b.SubmissionTime}`);
      return dateTimeB - dateTimeA;
    });
    res.send({ success: true, commentData });
  }
  catch (error) {
    res.status(500).send({ success: false, message: error || "Technical error, please contact the administrator", });
  }
}

async function postHM_Feedback(req, res, next) {
  try {
    let data = req.body.data;
    data.FeedbackID = randomUUID();
    req.body.tableName = "HM_Feedback";
    req.body.data = {
      ...data,
    };
    // Step 4: Create main Allowance record
    await CommonCreateCall(req, res, next);
    res.status(200).send({
      success: true,
      message: "Feedback details saved successfully!",
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message:
        error.message || "Technical error, please contact the administrator",
    });
  }
}

async function putHM_Feedback(req, res, next) {
  try {
    req.body.tableName = "HM_Feedback";
    await CommonUpdateCall(req, res, next);
    res.status(200).send({ success: true, message: "Payment details updated!" });
  } catch (error) {
    res.status(500).send({
      success: false,
      message:
        error || "Technical error, please contact the administrator",
    });
  }
}

async function deleteHM_Feedback(req, res, next) {
  try {
    req.body.tableName = "HM_Feedback";
    var data = await CommonDeleteCall(req, res, next);
    res.send({ success: true, data ,message:"Feedback details deleted successfully!"  });
  } catch (error) {
    res.status(500).send({ success: false, message: error || "Technical error, please contact the administrator", });
  }
}


exports.HM_Feedback = {
  getHM_Feedback,
  postHM_Feedback,
  putHM_Feedback,
  deleteHM_Feedback,
};
