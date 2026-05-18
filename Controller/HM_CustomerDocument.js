const { randomUUID } = require("crypto");
const {
  CommonReadCall,
  CommonCreateCall,
  CommonUpdateCall,
  CommonDeleteCall,
  CommonReadWithFilters
} = require("./CommonController");

async function getHM_CustomerDocument(req, res) {
  try {
    req.body.tableName = "HM_CustomerDocument";
    const commentData = await CommonReadCall(req, res, next);
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

async function postHM_CustomerDocument(req, res, next) {
  try {
    let data = req.body.data;
    data.DocumentID = randomUUID();
    req.body.tableName = "HM_CustomerDocument";
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
      message: "Document details saved successfully!",
      DocumentID: data.DocumentID,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message:
        error.message || "Technical error, please contact the administrator",
    });
  }
}

async function putHM_CustomerDocument(req, res, next) {
  try {
    req.body.tableName = "HM_CustomerDocument";
    if (req.body.data.File) {
      req.body.data.File = Buffer.from(req.body.data.File, 'base64');
    }
    await CommonUpdateCall(req, res, next);
    res.status(200).send({ success: true, message: "Customer document details updated!" });
  } catch (error) {
    res.status(500).send({
      success: false,
      message:
        error || "Technical error, please contact the administrator",
    });
  }
}

async function deleteHM_CustomerDocument(req, res, next) {
  try {
    req.body.tableName = "HM_CustomerDocument";
    var data = await CommonDeleteCall(req, res, next);
    res.send({ success: true, data ,message:"Customer document deleted successfully!"});
  } catch (error) {
    res.status(500).send({ success: false, message: error || "Technical error, please contact the administrator", });
  }
}

exports.HM_CustomerDocument = {
  getHM_CustomerDocument,
  postHM_CustomerDocument,
  putHM_CustomerDocument,
  deleteHM_CustomerDocument
};