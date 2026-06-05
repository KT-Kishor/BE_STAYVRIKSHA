const { randomUUID } = require("crypto");
const {
  CommonReadCall,
  CommonCreateCall,
  CommonUpdateCall,
  CommonDeleteCall,
  CommonReadWithFilters
} = require("./CommonController");

async function getHM_MemberDocument(req, res, next) {
    try {
        const { UserID } = req.query;

        if (!UserID) {
            return res.status(400).send({
                success: false,
                message: "UserID is required"
            });
        }

        req.body = {
            tableName: "HM_Members",
            filters: { UserID }
        };

        const memberData = await CommonReadWithFilters(req, res, next);

        req.body = {
            tableName: "HM_CustomerDocument",
            filters: { UserID }
        };

        const documentData = await CommonReadWithFilters(req, res, next);

        const userDocuments = (documentData || []).filter(
            doc => !doc.MemberID || doc.MemberID === "" // Primary/User docs
        );

        const memberDocuments = (documentData || []).filter(
            doc => doc.MemberID // Member-specific docs
        );

        // ================= MERGE MEMBER DATA =================
        const mergedData = (memberData || []).map(member => {
            const memberDocs = memberDocuments.filter(
                doc => doc.MemberID === member.MemberID
            );

            return {
                ...member,
                Documents: memberDocs
            };
        });

        // ================= RESPONSE =================
        return res.status(200).send({
            success: true,
            data: mergedData,
        });

    } catch (err) {
        return res.status(500).send({
            success: false,
            message: err.message || "Technical error, please contact administrator"
        });
    }
}

async function postHM_MemberDocument(req, res, next) {
  try {
    const payload = req.body.data;

    if (!Array.isArray(payload)) {
      return res.status(400).send({
        success: false,
        message: "Invalid data format. Expected array.",
      });
    }

    for (const entry of payload) {
      const members = entry.Members || [];

      for (const member of members) {
        const memberData = {
          MemberID: member.MemberID,
          Salutation: member.Salutation,
          Name: member.Name,
          DateOfBirth: member.DateOfBirth,
          Relation: member.Relation,
          Gender: member.Gender,
          UserID: member.UserID,
        };

        req.body.tableName = "HM_Members";
        req.body.data = memberData;

        await CommonCreateCall(req, res, next);

        const documents = member.Documents || [];

        for (const doc of documents) {
          const documentData = {
            DocumentID: randomUUID(),
            DocumentType: doc.DocumentType,
            FileName: doc.FileName,
            FileType: doc.FileType,
            MemberID: doc.MemberID,
            UserID: doc.UserID,
          };

          if (doc.File) {
            documentData.File = Buffer.from(doc.File, "base64");
          }

          req.body.tableName = "HM_CustomerDocument";
          req.body.data = documentData;

          await CommonCreateCall(req, res, next);
        }
      }
    }

    return res.status(200).send({
      success: true,
      message: "Members and Documents saved successfully!",
    });

  } catch (error) {
    return res.status(500).send({
      success: false,
      message:
        error.message || "Technical error, please contact the administrator",
    });
  }
}

async function putHM_MemberDocument(req, res, next) {
    try {
        const payload = req.body.data;

        if (!Array.isArray(payload)) {
            return res.status(400).send({
                success: false,
                message: "Invalid data format. Expected array."
            });
        }

        for (const entry of payload) {

            const members = entry.Members || [];

            for (const member of members) {

                const {
                    MemberID,
                    Salutation,
                    Name,
                    DateOfBirth,
                    Relation,
                    Gender,
                    UserID,
                    Documents = []
                } = member;

                if (!MemberID) {
                    return res.status(400).send({
                        success: false,
                        message: "MemberID is required"
                    });
                }

                req.body = {
                    tableName: "HM_Members",
                    data: {
                        Salutation,
                        Name,
                        DateOfBirth,
                        Relation,
                        Gender,
                        UserID
                    },
                    filters: {
                        MemberID
                    }
                };

                await CommonUpdateCall(req, res, next);

                for (const doc of Documents) {

                    const {
                        DocumentID,
                        DocumentType,
                        FileName,
                        FileType,
                        MemberID: DocMemberID,
                        UserID: DocUserID,
                        File
                    } = doc;

                    let documentData = {
                        DocumentType,
                        FileName,
                        FileType,
                        MemberID: DocMemberID,
                        UserID: DocUserID
                    };

                    if (File) {
                        documentData.File = Buffer.from(File, "base64");
                    }

                    if (DocumentID) {
                        req.body = {
                            tableName: "HM_CustomerDocument",
                            data: documentData,
                            filters: {
                                DocumentID
                            }
                        };

                        await CommonUpdateCall(req, res, next);
                    }

                    else {
                        req.body = {
                            tableName: "HM_CustomerDocument",
                            data: {
                                ...documentData,
                                DocumentID: randomUUID()
                            }
                        };

                        await CommonCreateCall(req, res, next);
                    }
                }
            }
        }

        return res.status(200).send({
            success: true,
            message: "Members Documents updated successfully!"
        });

    } catch (error) {
        console.error(error);
        return res.status(500).send({
            success: false,
            message: error.message || "Technical error"
        });
    }
}

async function deleteHM_MemberDocument(req, res, next) {
  try {
    req.body.tableName = "HM_Members";
    await CommonDeleteCall(req, res, next);

    req.body.tableName = "HM_CustomerDocument";
    var data = await CommonDeleteCall(req, res, next);
    res.send({ success: true, data });
  } catch (error) {
    res.status(500).send({
      success: false,
      message:
        error || "Technical error, please contact the administrator",
    });
  }
}

async function getHM_MemberDoc(req, res, next) {
    try {
        var MemberIDs;
        if(req.query.MemberIDs) MemberIDs = req.query.MemberIDs.split(",");

        // ================= MEMBER DATA =================
        req.body = {
            tableName: "HM_Members",
            filters: {
                MemberID: MemberIDs
            }
        };

        const memberData = await CommonReadWithFilters(req, res, next);

        // ================= MEMBER DOCUMENTS =================
        req.body = {
            tableName: "HM_CustomerDocument",
            filters: {
                MemberID: MemberIDs
            }
        };

        const documentData = await CommonReadWithFilters(req, res, next);

        // ================= MERGE DATA =================
        const mergedData = (memberData || []).map(member => {
            const memberDocs = (documentData || []).filter(
                doc => doc.MemberID === member.MemberID
            );

            return {
                ...member,
                Documents: memberDocs
            };
        });

        return res.status(200).send({
            success: true,
            data: mergedData
        });

    } catch (err) {
        return res.status(500).send({
            success: false,
            message: err.message || "Technical error, please contact administrator"
        });
    }
}

exports.HM_MemberDocument = {
  getHM_MemberDocument,
  postHM_MemberDocument,
  putHM_MemberDocument,
  deleteHM_MemberDocument,
  getHM_MemberDoc
};