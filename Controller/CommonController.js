const nodemailer = require("nodemailer");
var Stayvriksha = require("../sqlStayvriksha");
var DemoStayvriksha = require("../sqlDevstayvriksha");


async function CommonReadCall(req, res, next) {
	try {
		const origin = req.get("origin") || "";
		if (origin.split("//")[1] === "stayvriksha.in" || origin.split("//")[1] === "www.stayvriksha.in") {
			dbConnProd = Stayvriksha;
		} else {
			dbConnProd = DemoStayvriksha;
		}

		const { tableName, filters } = req.body;
		if (!tableName) {
			return res.status(400).send({ success: false, message: "Table name is required" });
		}

		let query = `SELECT * FROM ??`;
		const queryParams = [tableName];

		if (filters && Object.keys(filters).length > 0) {
			const filterClauses = [];
			for (const column in filters) {
				if (Array.isArray(filters[column])) {
					if (filters[column].length === 2 && filters[column][0] && filters[column][1]) {
						// BETWEEN condition
						filterClauses.push(`?? BETWEEN ? AND ?`);
						queryParams.push(column, filters[column][0], filters[column][1]);
					} else {
						// IN condition
						filterClauses.push(`?? IN (?)`);
						queryParams.push(column, filters[column]);
					}
				} else {
					// Normal =
					filterClauses.push(`?? = ?`);
					queryParams.push(column, filters[column]);
				}

			}
			query += ` WHERE ` + filterClauses.join(` AND `);
		}
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
	} catch (error) {
		throw new Error(
			error.message || "Technical error, please contact the administrator"
		);
	}
}

function CommonCreateCall(req, res, next) {
	return new Promise((resolve, reject) => {
		try {
			const origin = req.get("origin") || "";

			if (origin.split("//")[1] === "stayvriksha.in" || origin.split("//")[1] === "www.stayvriksha.in") {
				dbConnProd = Stayvriksha;
			} else {
				dbConnProd = DemoStayvriksha;
			}

			const {
				tableName,
				data
			} = req.body;

			if (!tableName) {
				return reject({
					status: 400,
					message: "Table name is required"
				});
			}

			if (
				!data ||
				(Array.isArray(data) && data.length === 0) ||
				(typeof data === "object" && Object.keys(data).length === 0)
			) {
				return reject({
					status: 400,
					message: "Data is required"
				});
			}

			let columns, values;

			if (Array.isArray(data) && typeof data[0] === "object" && !Array.isArray(data[0])) {
				columns = Object.keys(data[0]);

				// ✅ FIXED LINE
				values = data.map((record) => columns.map(col => record[col] !== undefined ? record[col] : null));
			} else if (typeof data === "object" && !Array.isArray(data)) {
				columns = Object.keys(data);
				values = [Object.values(data)];
			} else {
				return reject({
					status: 400,
					message: "Invalid data format"
				});
			}

			const placeholders = values
				.map(() => `(${columns.map(() => "?").join(", ")})`)
				.join(", ");
			const query = `INSERT INTO ?? (${columns.join(
				", "
			)}) VALUES ${placeholders}`;
			const queryParams = [tableName, ...values.flat()];

			dbConnProd.getConnection((err, connection) => {
				if (err) {
					return reject({
						status: 500,
						message: "Connection error, please contact the administrator",
						error: err.message,
					});
				}

				connection.query(query, queryParams, (err, results) => {
					connection.release();
					if (err) {
						return reject({
							status: 500,
							message: "Technical error, please contact the administrator",
							error: err.message,
						});
					}
					resolve({
						success: true,
						results
					});
				});
			});
		} catch (error) {
			reject({
				status: 500,
				message: error.message || "Technical error, please contact the administrator",
			});
		}
	});
}

function CommonUpdateCall(req) {
	return new Promise((resolve, reject) => {
		const origin = req.get("origin") || "";

		if (origin.split("//")[1] === "stayvriksha.in" || origin.split("//")[1] === "www.stayvriksha.in") {
			dbConnProd = Stayvriksha;
		} else {
			dbConnProd = DemoStayvriksha;
		}

		const {
			tableName,
			data,
			filters
		} = req.body;

		if (!tableName) {
			return reject(new Error("Table name is required"));
		}
		if (!data || Object.keys(data).length === 0) {
			return reject(new Error("Data is required"));
		}
		if (!filters || Object.keys(filters).length === 0) {
			return reject(new Error("Filters are required for updating"));
		}
		const columns = Object.keys(data);
		const values = Object.values(data);
		const setClause = columns.map((col) => `${col} = ?`).join(", ");
		const filterColumns = Object.keys(filters);
		const filterValues = Object.values(filters);
		const whereClause = filterColumns.map((col) => `${col} = ?`).join(" AND ");
		const query = `UPDATE ?? SET ${setClause} WHERE ${whereClause}`;
		const queryParams = [tableName, ...values, ...filterValues];

		dbConnProd.getConnection((err, connection) => {
			if (err) {
				return reject(new Error("Connection error: " + err.message));
			}
			connection.query(query, queryParams, (err, results) => {
				connection.release();
				if (err) {
					return reject(new Error("Query error: " + err.message));
				}
				resolve({
					success: true,
					results
				});
			});
		});
	});
}

function CommounMultipalUpdate(req, res, next) {
	return new Promise((resolve, reject) => {
		try {
			const origin = req.get("origin") || "";

			if (origin.split("//")[1] === "stayvriksha.in" || origin.split("//")[1] === "www.stayvriksha.in") {
				dbConnProd = Stayvriksha;
			} else {
				dbConnProd = DemoStayvriksha;
			}

			const {
				tableName,
				data
			} = req.body;
			if (!tableName) {
				return reject({
					status: 400,
					message: "Table name is required"
				});
			}

			if (!data || !Array.isArray(data) || data.length === 0) {
				return reject({
					status: 400,
					message: "Invalid data format, 'data' and 'filters' are required for each item",
				});
			}
			const updatePromises = data.map((update) => {
				const {
					data: rowData,
					filters
				} = update;

				const setColumns = Object.keys(rowData);
				const setValues = Object.values(rowData);
				if (setColumns.length === 0 || setValues.length === 0) {
					return Promise.reject({
						status: 400,
						message: "'data' must contain properties to update",
					});
				}

				const whereColumns = Object.keys(filters);
				const whereValues = Object.values(filters);
				if (whereColumns.length === 0 || whereValues.length === 0) {
					return Promise.reject({
						status: 400,
						message: "'filters' must contain conditions to match",
					});
				}

				// Build the SQL query for update
				const setClause = setColumns.map((col) => `${col} = ?`).join(", ");
				const whereClause = whereColumns
					.map((col) => `${col} = ?`)
					.join(" AND ");

				const query = `UPDATE ?? SET ${setClause} WHERE ${whereClause}`;
				const queryParams = [tableName, ...setValues, ...whereValues];

				// Return a promise for each query execution
				return new Promise((resolveQuery, rejectQuery) => {
					dbConnProd.getConnection((err, connection) => {
						if (err) {
							return rejectQuery({
								status: 500,
								message: "Connection error, please contact the administrator",
								error: err.message,
							});
						}

						// Execute the query
						connection.query(query, queryParams, (err, results) => {
							connection.release();
							if (err) {
								return rejectQuery({
									status: 500,
									message: "Query error, please contact the administrator",
									error: err.message,
								});
							}
							resolveQuery(results);
						});
					});
				});
			});

			Promise.all(updatePromises)
				.then((results) => {
					resolve({
						success: true,
						results
					});
				})
				.catch((error) => {
					reject(error);
				});
		} catch (error) {
			reject({
				status: 500,
				message: error.message || "Technical error, please contact the administrator",
			});
		}
	});
}

async function CommonDeleteCall(req, res, next) {
	try {
		const origin = req.get("origin") || "";

		if (origin.split("//")[1] === "stayvriksha.in" || origin.split("//")[1] === "www.stayvriksha.in") {
			dbConnProd = Stayvriksha;
		} else {
			dbConnProd = DemoStayvriksha;
		}

		const {
			tableName,
			filters
		} = req.body;
		if (!tableName) {
			return res
				.status(400)
				.send({
					success: false,
					message: "Table name is required"
				});
		}

		let query = `DELETE FROM ??`;
		const queryParams = [tableName];

		if (filters && Object.keys(filters).length > 0) {
			const filterClauses = [];
			for (const column in filters) {
				if (Array.isArray(filters[column]) && filters[column].length === 2) {
					filterClauses.push(`?? BETWEEN ? AND ?`);
					queryParams.push(column, filters[column][0], filters[column][1]);
				} else {
					filterClauses.push(`?? = ?`);
					queryParams.push(column, filters[column]);
				}
			}
			query += ` WHERE ` + filterClauses.join(` AND `);
		}

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
	} catch (error) {
		throw new Error(
			error.message || "Technical error, please contact the administrator"
		);
	}
}

async function CommonDeleteCallWithMutiple(req, res, next) {
	try {
		const origin = req.get("origin") || "";

		if (origin.split("//")[1] === "stayvriksha.in" || origin.split("//")[1] === "www.stayvriksha.in") {
			dbConnProd = Stayvriksha;
		} else {
			dbConnProd = DemoStayvriksha;
		}

		const {
			tableName,
			filters
		} = req.body;
		if (!tableName) {
			return res
				.status(400)
				.send({
					success: false,
					message: "Table name is required"
				});
		}

		let query = `DELETE FROM ??`;
		const queryParams = [tableName];

		if (filters && Object.keys(filters).length > 0) {
			const filterClauses = [];
			for (const column in filters) {
				const value = filters[column];
				if (Array.isArray(value)) {
					// IN clause for multiple values
					const placeholders = value.map(() => "?").join(", ");
					filterClauses.push(`?? IN (${placeholders})`);
					queryParams.push(column, ...value);
				} else {
					filterClauses.push(`?? = ?`);
					queryParams.push(column, value);
				}
			}
			query += ` WHERE ` + filterClauses.join(` AND `);
		}

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
	} catch (error) {
		throw new Error(
			error.message || "Technical error, please contact the administrator"
		);
	}
}


async function CommonTabledataReadCall(req) {
	const origin = req.get("origin") || "";

	if (origin.split("//")[1] === "stayvriksha.in" || origin.split("//")[1] === "www.stayvriksha.in") {
		dbConnProd = Stayvriksha;
	} else {
		dbConnProd = DemoStayvriksha;
	}

	const {
		tableName,
		fields = [],
		filters = {}
	} = req.body;

	if (!tableName) {
		throw new Error("Table name is required");
	}

	// SELECT clause
	let query = `SELECT ${fields.length > 0 ? fields.map(() => "??").join(", ") : "*"
		} FROM ??`;
	let queryParams = [...fields, tableName];

	// WHERE clause
	const filterKeys = Object.keys(filters);
	if (filterKeys.length > 0) {
		const whereClauses = [];
		const whereParams = [];

		filterKeys.forEach((key) => {
			const value = filters[key];
			if (Array.isArray(value)) {
				whereClauses.push("?? BETWEEN ? AND ?");
				whereParams.push(key, value[0], value[1]);
			} else {
				whereClauses.push("?? = ?");
				whereParams.push(key, value);
			}
		});

		query += " WHERE " + whereClauses.join(" AND ");
		queryParams.push(...whereParams);
	}

	return new Promise((resolve, reject) => {
		dbConnProd.getConnection((err, connection) => {
			if (err) {
				return reject(new Error("Connection error: " + err.message));
			}

			connection.query(query, queryParams, (err, results) => {
				connection.release();
				if (err) {
					return reject(new Error("Query error: " + err.message));
				}
				resolve(results);
			});
		});
	});
}

async function CommonReadWithFilters(req, res, next) {
	try {
		let dbConnProd;

		const origin = req.get("origin") || "";

		if (origin.split("//")[1] === "stayvriksha.in" || origin.split("//")[1] === "www.stayvriksha.in") {
			dbConnProd = Stayvriksha;
		} else {
			dbConnProd = DemoStayvriksha;
		}

		const { tableName, top, skip, selectedFields } = req.body;
		const filters = req.body.filters || {};
		const sort = req.body.sort || {};

		if (!tableName) {
			return res.status(400).send({
				success: false,
				message: "Table name is required"
			});
		}

		// -----------------------------
		// Build SELECT fields
		// -----------------------------
		let selectClause = "*";
		const queryParams = [];

		if (Array.isArray(selectedFields) && selectedFields.length > 0) {
			selectClause = selectedFields.map(() => "??").join(", ");
			queryParams.push(...selectedFields);
		}

		// -----------------------------
		// Build SQL query
		// -----------------------------
		let query = `SELECT ${selectClause} FROM ??`;
		queryParams.push(tableName);

		const filterClauses = [];

		const isDateTime = (v) =>
			typeof v === "string" &&
			(
				/^\d{4}-\d{2}-\d{2}$/.test(v) ||
				/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(v) ||
				/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v)
			);

		for (const column in filters) {
			let value = filters[column];
			if (!Array.isArray(value)) value = [value];

			// Date range
			if (value.length === 2 && isDateTime(value[0]) && isDateTime(value[1])) {
				filterClauses.push(`?? BETWEEN ? AND ?`);
				queryParams.push(column, value[0], value[1]);
			}
			// Single value
			else if (value.length === 1) {
				filterClauses.push(`?? = ?`);
				queryParams.push(column, value[0]);
			}
			// Multiple values
			else if (value.length > 1) {
				if (column === "BranchCode" || column === "Status") {
					const findClauses = value.map(() => `FIND_IN_SET(?, ??)`);
					filterClauses.push(`(${findClauses.join(" OR ")})`);

					value.forEach(v => {
						queryParams.push(v, column);
					});
				} else {
					const placeholders = value.map(() => "?").join(", ");
					filterClauses.push(`?? IN (${placeholders})`);
					queryParams.push(column, ...value);
				}
			}
		}

		if (filterClauses.length > 0) {
			query += " WHERE " + filterClauses.join(" AND ");
		}

		// -----------------------------
		// Sorting
		// -----------------------------
		if (Object.keys(sort).length > 0) {
			const sortClauses = [];
			for (const col in sort) {
				const dir = sort[col].toUpperCase() === "DESC" ? "DESC" : "ASC";
				sortClauses.push(`?? ${dir}`);
				queryParams.push(col);
			}
			query += " ORDER BY " + sortClauses.join(", ");
		}

		// -----------------------------
		// Pagination
		// -----------------------------
		if (!isNaN(top)) {
			query += " LIMIT ?";
			queryParams.push(parseInt(top, 10));
		}

		if (!isNaN(skip)) {
			query += " OFFSET ?";
			queryParams.push(parseInt(skip, 10));
		}

		// -----------------------------
		// Execute query
		// -----------------------------
		const results = await new Promise((resolve, reject) => {
			dbConnProd.getConnection((err, connection) => {
				if (err) return reject(err);

				connection.query(query, queryParams, (err, results) => {
					connection.release();
					if (err) return reject(err);
					resolve(results);
				});
			});
		});

		return results;

	} catch (error) {
		res.status(500).send({
			success: false,
			message: error.message || "Technical error, please contact the administrator"
		});
	}
}

async function CommonReadWithJoins(req) {
	try {
		let dbConnProd;

		const origin = req.get("origin") || "";

		if (origin.split("//")[1] === "stayvriksha.in" || origin.split("//")[1] === "www.stayvriksha.in") {
			dbConnProd = Stayvriksha;
		} else {
			dbConnProd = DemoStayvriksha;
		}

		// -----------------------------
		// Request body
		// -----------------------------
		const { tableName, joins, top, skip, selectedFields, filters = {}, sort = {} } = req.body;

		if (!tableName) {
			throw new Error("Table name is required");
		}

		const queryParams = [];

		// -----------------------------
		// SELECT FIX (IMPORTANT)
		// -----------------------------
		let selectClause = "*";

		if (Array.isArray(selectedFields) && selectedFields.length > 0) {
			selectClause = selectedFields.join(", ");
		}

		// -----------------------------
		// FROM
		// -----------------------------
		let query = `SELECT ${selectClause} FROM ??`;
		queryParams.push(tableName);

		// -----------------------------
		// JOINS
		// -----------------------------
		if (Array.isArray(joins)) {
			joins.forEach(j => {
				if (j.table && j.on) {
					query += ` INNER JOIN ?? ON ${j.on}`;
					queryParams.push(j.table);
				}
			});
		}

		// -----------------------------
		// FILTERS
		// -----------------------------
		const filterClauses = [];

		for (const column in filters) {
			let value = filters[column];

			if (typeof value === "object" && !Array.isArray(value)) {
				const { operator, value: val } = value;

				filterClauses.push(`?? ${operator} ?`);
				queryParams.push(column, val);
				continue;
			}

			if (!Array.isArray(value)) value = [value];

			// range
			if (value.length === 2) {
				filterClauses.push(`?? BETWEEN ? AND ?`);
				queryParams.push(column, value[0], value[1]);
			}
			// single
			else if (value.length === 1) {
				filterClauses.push(`?? = ?`);
				queryParams.push(column, value[0]);
			}
			// multiple
			else if (value.length > 1) {
				const placeholders = value.map(() => "?").join(", ");
				filterClauses.push(`?? IN (${placeholders})`);
				queryParams.push(column, ...value);
			}
		}

		if (filterClauses.length > 0) {
			query += " WHERE " + filterClauses.join(" AND ");
		}

		// -----------------------------
		// SORTING
		// -----------------------------
		if (Object.keys(sort).length > 0) {
			const sortClauses = [];

			for (const col in sort) {
				const dir = sort[col].toUpperCase() === "DESC" ? "DESC" : "ASC";
				sortClauses.push(`?? ${dir}`);
				queryParams.push(col);
			}

			query += " ORDER BY " + sortClauses.join(", ");
		}

		// -----------------------------
		// PAGINATION
		// -----------------------------
		if (!isNaN(top)) {
			query += " LIMIT ?";
			queryParams.push(parseInt(top));
		}

		if (!isNaN(skip)) {
			query += " OFFSET ?";
			queryParams.push(parseInt(skip));
		}

		// -----------------------------
		// EXECUTE QUERY (PROMISE)
		// -----------------------------
		return new Promise((resolve, reject) => {
			dbConnProd.getConnection((err, connection) => {
				if (err) return reject(err);

				connection.query(query, queryParams, (err, results) => {
					connection.release();

					if (err) return reject(err);

					resolve(results);
				});
			});
		});

	} catch (error) {
		throw error;
	}
}

function CommonBulkUpdateWithIn(req) {
	return new Promise((resolve, reject) => {

		const origin = req.get("origin") || "";

		if (origin.split("//")[1] === "stayvriksha.in" || origin.split("//")[1] === "www.stayvriksha.in") {
			dbConnProd = Stayvriksha;
		} else {
			dbConnProd = DemoStayvriksha;
		}

		const { tableName, data, filters } = req.body;

		if (!tableName) {
			return reject(new Error("Table name is required"));
		}

		if (!data || Object.keys(data).length === 0) {
			return reject(new Error("Data is required"));
		}

		if (!filters || Object.keys(filters).length === 0) {
			return reject(new Error("Filters are required"));
		}

		// SET clause
		const setColumns = Object.keys(data);
		const setValues = Object.values(data);
		const setClause = setColumns.map(col => `${col} = ?`).join(", ");

		// WHERE clause with IN support
		const filterValues = [];

		const whereClause = Object.keys(filters).map(col => {
			if (Array.isArray(filters[col])) {

				if (filters[col].length === 0) {
					throw new Error(`Filter array for ${col} cannot be empty`);
				}

				const placeholders = filters[col].map(() => "?").join(", ");
				filterValues.push(...filters[col]);

				return `${col} IN (${placeholders})`;
			} else {
				filterValues.push(filters[col]);
				return `${col} = ?`;
			}
		}).join(" AND ");

		const query = `UPDATE ?? SET ${setClause} WHERE ${whereClause}`;
		const queryParams = [tableName, ...setValues, ...filterValues];

		dbConnProd.getConnection((err, connection) => {
			if (err) {
				return reject(new Error("Connection error: " + err.message));
			}

			connection.query(query, queryParams, (err, results) => {
				connection.release();

				if (err) {
					return reject(new Error("Query error: " + err.message));
				}

				resolve({
					success: true,
					affectedRows: results.affectedRows,
					results
				});
			});
		});
	});
}

// Email transporter configurations for different domains

const StayvrikshaEmail = nodemailer.createTransport({
	host: "smtp.hostinger.com",
	port: 465,
	secure: true,
	auth: {
		user: "admin@stayvriksha.in",
		pass: "Admin@KT@1008",
	},
});

const CommonSendEmail = async (req, from, fromName, to, toName, subject, body, CC, replyTo, attachments, BCC) => {
	try {
		// Use req directly
		req.body.tableName = "CompanyCodeDetails";
		req.body.filters = {
			branchCode: process.env.BranchCode
		};
		const CompanyDetails = await CommonReadCall(req);

		const logoBuffer = CompanyDetails?.[0]?.emailLogo;

		if (logoBuffer) {
			if (!attachments) attachments = [];

			attachments.push({
				filename: "company-logo.png",
				content: logoBuffer,
				cid: "companylogo@cid",
			});

			const companyWebsite = CompanyDetails[0].website;

			body += `<div style="text-align: left;">
						<a href="${companyWebsite}" target="_blank" style="text-decoration: none;">
							<img src="cid:companylogo@cid" alt="Kalpavriksha Technologies" style="max-width: 200px; display: block; border: 0;" />
						</a>
					</div>`;
		}

		const mailOptions = {
			from: `${fromName} <${from}>`,
			to: to.map((email) => `<${email}>`),
			subject: subject,
			html: body,
			bcc: BCC ? BCC.map((email) => `<${email}>`) : undefined,
			cc: CC ? CC.map((email) => `<${email}>`) : undefined,
			replyTo: replyTo,
			attachments: attachments || [],
		};

		const origin = req.get("origin") || "";

		transporter = StayvrikshaEmail;

		var emaildata = await transporter.sendMail(mailOptions);
		return { success: true, message: emaildata };
	} catch (error) {
		return { success: false, error: error };
	}
};




module.exports = {
	CommonReadCall,
	CommonCreateCall,
	CommonUpdateCall,
	CommonSendEmail,
	CommonDeleteCall,
	CommonDeleteCallWithMutiple,
	CommounMultipalUpdate,
	CommonTabledataReadCall,
	CommonReadWithFilters,
	CommonReadWithJoins,
	CommonBulkUpdateWithIn
};