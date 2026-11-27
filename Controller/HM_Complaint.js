const { randomUUID } = require("crypto");
const {
  CommonReadWithFilters,
  CommonCreateCall,
  CommonUpdateCall,
  CommonDeleteCall,
  CommonReadCall,
  CommonSendEmail
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
    let emailIds = req.body.data.emailIds;
    let BranchName = req.body.data.BranchName;
    let ccmailids = req.body.data.ccmailids;
    let sUpdated = req.body.data.Updated;



    if (req.body.data.File) {
      req.body.data.File = Buffer.from(req.body.data.File, 'base64');
    }

   delete req.body.data.emailIds
   delete req.body.data.BranchName
   delete req.body.data.ccmailids;
   delete req.body.data.Updated;



    // Step 4: Create main Allowance record
    await CommonCreateCall(req, res, next);

    req.body.data.emailIds = emailIds;
    req.body.data.BranchName = BranchName;
    req.body.data.ccmailids=ccmailids;
    req.body.data.Updated=sUpdated;


    await ComplaintSubmitEmail(req, res, next);
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

async function ComplaintSubmitEmail(req, res, next) {
  try {

    req.body.tableName = "EmailContent";
    if(req.body.data.Status === "Resolved") {
      req.body.filters = { Type: "HM_ResolveComplaint" };
    }else if(req.body.data.Status === "In Progress") {
      req.body.filters = { Type: "HM_AssignComplaint" };
    }else{
            req.body.filters = { Type: "HM_Complaint" };
    }

    var emailContentData = await CommonReadCall(req, res, next);
    if (!emailContentData || emailContentData.length === 0) {
      return res
        .status(404)
        .send({ success: false, message: "Email content not found" });
    }

    var emailContent = emailContentData[0];

    const from = emailContent.FormEmailId;
    const fromName = emailContent.FormName;


        const to = (req.body.data.emailIds || "")
      .split(",")
      .map(email => email.trim())
      .filter(email => email);

    const toName = req.body.data.UserName;
    let subject = emailContent.Subject;

    if(req.body.data.Status==="Pending" && req.body.data.Updated===true){
         subject = subject.replaceAll(
        "<Subject>",
        "Customer Complaint Updated Notification"
    );
    }else{
        subject = subject.replaceAll(
        "<Subject>",
        "Customer Complaint Notification"
    );
    }

 if (req.body.data.Status === "In Progress" && req.body.data.Updated === false) {
    subject = subject.replaceAll(
        "<Subject>",
        "Your Complaint Has Been Assigned"
    );
} else if (req.body.data.Status === "In Progress" && req.body.data.Updated === true) {
    subject = subject.replaceAll(
        "<Subject>",
        "Your Complaint Details Have Been Modified"
    );
}
    // Ensure replacements are applied
    let body= emailContent.Body;

    body = body
      .replaceAll("<BranchName>", req.body.data.BranchName)
      .replaceAll("<RoomNo>", req.body.data.RoomNo)
      .replaceAll("<CustomerName>", req.body.data.CustomerName)
      .replaceAll("<BookingID>", req.body.data.BookingID)
      .replaceAll("<ComplaintType>", req.body.data.ComplaintType)
      .replaceAll("<Description>", req.body.data.Description)
      .replaceAll("<ComplaintID>", req.body.data.ComplaintID)
      .replaceAll("<Status>", req.body.data.Status)
      .replaceAll("<Comment>", req.body.data.Comment)
      .replaceAll("<AssignedTo>", req.body.data.AssignedBy)
      .replaceAll("<EstimatDate>", formatDate(req.body.data.EstimatDate))

      if(req.body.data.Status==="Pending" && req.body.data.Updated===true){
         body = body.replaceAll(
        "<Message>",
        "updated"
    );
    }else{
        body = body.replaceAll(
        "<Message>",
        "Raised"
    );
    }



      const CC = (req.body.data.ccmailids  || "")
      .split(",")
      .map(email => email.trim())
      .filter(email => email);

    const replyTo = emailContent.ReplyToEmailId;

    await CommonSendEmail(req, from, fromName, to, toName, subject, body, CC, replyTo);
  } catch (error) {
    return res.status(500).send({ success: false, message: "Internal server error" });
  }
}
function formatDate(dateString) {
  const date = new Date(dateString);
  if (isNaN(date)) return ""; // return empty if invalid date

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

async function putHM_Complaint(req, res, next) {
  try {
    req.body.tableName = "HM_Complaint";
    if (req.body.data.File) {
      req.body.data.File = Buffer.from(req.body.data.File, 'base64');
    }



    let emailIds = req.body.data.emailIds;
    let BranchName = req.body.data.BranchName;
    let AdminName = req.body.data.AdminName;
    let ccemailIds = req.body.data.ccmailids;
    let sUpdated = req.body.data.Updated;




    delete req.body.data.emailIds
    delete req.body.data.BranchName
    delete req.body.data.AdminName
    delete req.body.data.ccmailids 
    delete req.body.data.Updated 


    await CommonUpdateCall(req, res, next);

     req.body.data.emailIds = emailIds;
    req.body.data.BranchName = BranchName;
    req.body.data.AdminName = AdminName;
    req.body.data.ccmailids = ccemailIds;
    req.body.data.Updated = sUpdated;


    
     await ComplaintSubmitEmail(req, res, next);


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