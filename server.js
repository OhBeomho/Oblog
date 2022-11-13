require("dotenv").config();
const { DB_URL, COOKIE_SECRET } = process.env;

const express = require("express");
const app = express();

const expressSession = require("express-session");
const cookieParser = require("cookie-parser");

const http = require("http");
const server = http.createServer(app);

const path = require("path");

const { Client } = require("pg");
const db = new Client(DB_URL);
db.connect((err) => {
	const checkError = (err) => {
		if (err) {
			console.error(err.message);
			process.exit(1);
		}
	};

	checkError(err);
	console.log("Connected to database.");

	db.query(
		"CREATE TABLE IF NOT EXISTS blog(id SERIAL PRIMARY KEY, title TEXT NOT NULL, writerid TEXT NOT NULL, writedate TEXT NOT NULL, content TEXT NOT NULL, likeidArray TEXT[] DEFAULT '{}', dislikeidArray TEXT[] DEFAULT '{}', mod BOOLEAN DEFAULT FALSE)",
		checkError
	);
	db.query(
		"CREATE TABLE IF NOT EXISTS account(id TEXT PRIMARY KEY, password TEXT NOT NULL, mod BOOLEAN DEFAULT FALSE)",
		checkError
	);
	db.query(
		"CREATE TABLE IF NOT EXISTS comment(id SERIAL PRIMARY KEY, blogid INTEGER NOT NULL, content TEXT NOT NULL, writeDate TEXT NOT NULL, writerid TEXT NOT NULL, mod BOOLEAN DEFAULT FALSE)",
		checkError
	);
	db.query(
		"CREATE TABLE IF NOT EXISTS report(id SERIAL PRIMARY KEY, userid TEXT NOT NULL, reporterid TEXT NOT NULL, reason TEXT NOT NULL)"
	);

	console.log("Initialized database.");
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(
	expressSession({
		secret: COOKIE_SECRET,
		resave: true,
		saveUninitialized: true
	})
);

app.get("/", (req, res) => {
	if (req.session.user) {
		res.sendFile(path.join(__dirname, "src", "index.html"));
	} else {
		res.redirect("/login");
	}
});
app.get("/login", (_req, res) => res.sendFile(path.join(__dirname, "src", "login.html")));
app.get("/signup", (_req, res) => res.sendFile(path.join(__dirname, "src", "signup.html")));
app.get("/write", (req, res) => {
	if (req.session.user) {
		res.sendFile(path.join(__dirname, "src", "write.html"));
	} else {
		res.redirect("/login");
	}
});
app.get("/read", (req, res) => {
	if (req.session.user) {
		res.sendFile(path.join(__dirname, "src", "read.html"));
	} else {
		res.redirect("/login");
	}
});
app.get("/report", (req, res) => {
	if (req.session.user) {
		res.sendFile(path.join(__dirname, "src", "report.html"));
	} else {
		res.redirect("/login");
	}
});
app.get("/reports", (req, res) => {
	if (req.session.user) {
		checkMod(req.session.user).then((mod) => {
			if (mod) {
				res.sendFile(path.join(__dirname, "src", "reports.html"));
			} else {
				res.sendStatus(423);
			}
		});
	} else {
		res.redirect("/login");
	}
});
app.get("/logout", (req, res) => {
	if (req.session.user) {
		req.session.destroy((err) => {
			if (err) {
				console.error(err.message);
				res.sendStatus(500);
				return;
			} else {
				res.sendStatus(200);
			}
		});
	}
});
app.get("/delete", (req, res) => {
	if (req.session.user) {
		db.query("DELETE FROM account WHERE id = $1", [req.session.user], (err) => {
			if (err) {
				console.error(err.message);
				res.sendStatus(500);
				return;
			}

			res.redirect("/logout");
		});
	}
});
app.get("/getid", (req, res) =>
	checkMod(req.session.user).then((mod) => res.send(JSON.stringify({ id: req.session.user, mod })))
);
app.get("/likes", (req, res) => {
	if (req.session.user) {
		const type = req.query.type;
		const id = req.query.id;
		const arrayName =
			type === "like" || type === "likeCancel"
				? "likeIDArray"
				: type === "dislike" || type === "dislikeCancel"
				? "dislikeIDArray"
				: "NONE";
		const functionName = type.includes("Cancel") ? "ARRAY_REMOVE" : "ARRAY_APPEND";

		if (arrayName === "NONE") {
			return;
		}

		db.query(
			`UPDATE blog SET ${arrayName} = ${functionName}(${arrayName}, $1) WHERE id = $2`,
			[req.session.user, id],
			(err) => {
				if (err) {
					console.error(err.message);
					res.sendStatus(500);
					return;
				} else {
					res.sendStatus(200);
				}
			}
		);
	}
});
app.get("/deleteComment", (req, res) => {
	const { id } = req.query;

	db.query("DELETE FROM comment WHERE id = $1", [id], (err) => {
		if (err) {
			console.error(err.message);
			res.sendStatus(500);
		} else {
			res.sendStatus(200);
		}
	});
});
app.get("/deleteBlog", (req, res) => {
	const { id } = req.query;

	if (req.session.user) {
		db.query(`SELECT * FROM blog WHERE id = $1`, [id], (err, result) => {
			if (err) {
				console.log(err.message);
				res.sendStatus(500);
				return;
			}

			if (!result.rows[0]) {
				res.send(JSON.stringify({ result: "NOT_FOUND" }));
				return;
			} else if (result.rows[0].writerid !== req.session.user) {
				res.send(JSON.stringify({ result: "NOT_OP" }));
				return;
			}

			db.query("DELETE FROM blog WHERE id = $1", [id], (err) => {
				if (err) {
					console.log(err.message);
					res.sendStatus(500);
					return;
				}

				db.query("DELETE FROM comment WHERE blogID = $1", [id], (err) => {
					if (err) {
						console.log(err.message);
						res.sendStatus(500);
						return;
					}

					res.send(JSON.stringify({ result: "SUCCESS" }));
				});
			});
		});
	}
});
app.get("/deleteReport", (req, res) => {
	if (req.session.user) {
		const { id } = req.query;

		checkMod(req.session.user).then((mod) => {
			if (!mod) {
				res.sendStatus(423);
				return;
			}

			db.query("DELETE FROM report WHERE id = $1", [id], (err) => {
				if (err) {
					console.error(err.message);
					res.sendStatus(500);
				} else {
					res.sendStatus(200);
				}
			});
		});
	}
});
app.get("/idcheck", (req, res) => {
	const { id } = req.query;

	db.query("SELECT * FROM account WHERE id = $1", [id], (err, result) => {
		if (err) {
			console.error(err.message);
			res.sendStatus(500);
			return;
		}

		const user = result.rows[0];

		if (user) {
			res.send(JSON.stringify({ result: "NOT_UNIQUE" }));
		} else {
			res.send(JSON.stringify({ result: "UNIQUE" }));
		}
	});
});

app.post("/signup", (req, res) => {
	const { id, password } = req.body;

	db.query("INSERT INTO account(id, password) VALUES($1, $2)", [id, password], (err) => {
		if (err) {
			console.error(err.message);
			res.sendStatus(500);
		} else {
			res.sendStatus(200);
		}
	});
});
app.post("/login", (req, res) => {
	const { id, password } = req.body;

	db.query("SELECT * FROM account WHERE id = $1", [id], (err, result) => {
		if (err) {
			console.error(err.message);
			res.sendStatus(500);
			return;
		}

		const user = result.rows[0];

		if (!user) {
			res.send(JSON.stringify({ result: "ID_NOT_FOUND" }));
			return;
		} else if (password !== user.password) {
			res.send(JSON.stringify({ result: "PASSWORD_INCORRECT" }));
			return;
		}

		req.session.user = id;

		res.send(JSON.stringify({ result: "SUCCESS" }));
	});
});
app.post("/write", (req, res) => {
	const { title, content } = req.body;
	const id = req.session.user;
	const date = getDate();

	checkMod(id).then((mod) =>
		db.query(
			"INSERT INTO blog(title, content, writerId, writeDate, mod) VALUES($1, $2, $3, $4, $5)",
			[title, content, id, date, mod],
			(err) => {
				if (err) {
					console.error(err.message);
					res.sendStatus(500);
				} else {
					res.sendStatus(200);
				}
			}
		)
	);
});
app.post("/comment", (req, res) => {
	const { content, blogID } = req.body;
	const id = req.session.user;
	const date = getDate();

	checkMod(id).then((mod) =>
		db.query(
			"INSERT INTO comment(blogID, content, writeDate, writerId, mod) VALUES($1, $2, $3, $4, $5)",
			[blogID, content, date, id, mod],
			(err) => {
				if (err) {
					console.error(err.message);
					res.sendStatus(500);
				} else {
					res.sendStatus(200);
				}
			}
		)
	);
});
app.post("/update", (req, res) => {
	const { title, content, id } = req.body;

	db.query("UPDATE blog SET title = $1, content = $2 WHERE id = $3", [title, content, id], (err) => {
		if (err) {
			console.error(err.message);
			res.sendStatus(500);
		} else {
			res.sendStatus(200);
		}
	});
});
app.post("/read", (req, res) => {
	const { id } = req.body;

	db.query("SELECT * FROM blog WHERE id = $1", [id], (err, result) => {
		if (err) {
			console.error(err.message);
			res.sendStatus(500);
			return;
		}

		const blog = result.rows[0];

		if (blog) {
			db.query("SELECT * FROM comment WHERE blogID = $1 ORDER BY writeDate DESC", [id], (err, result) => {
				if (err) {
					console.error(err.message);
					res.sendStatus(500);
					return;
				}

				const comments = result.rows;
				res.send(JSON.stringify({ result: [blog, comments] }));
			});
		} else {
			res.send(JSON.stringify({ result: "NOT_FOUND" }));
		}
	});
});
app.post("/blogs", (req, res) => {
	const { offset, count } = req.body;

	db.query("SELECT * FROM blog ORDER BY id DESC LIMIT $1 OFFSET $2", [count, offset], (err, result) => {
		if (err) {
			console.error(err.message);
			res.sendStatus(500);
			return;
		}

		res.send(JSON.stringify({ result: result.rows }));
	});
});
app.post("/reports", (req, res) => {
	if (req.session.user) {
		const { offset, count } = req.body;

		checkMod(req.session.user).then((mod) => {
			if (!mod) {
				res.sendStatus(423);
				return;
			}

			db.query("SELECT * FROM report ORDER BY id DESC LIMIT $1 OFFSET $2", [count, offset], (err, result) => {
				if (err) {
					console.error(err.message);
					res.sendStatus(500);
					return;
				}

				res.send(JSON.stringify({ result: result.rows }));
			});
		});
	}
});
app.post("/report", (req, res) => {
	const { userid, reason } = req.body;
	const reporterid = req.session.user;

	db.query(
		"INSERT INTO report(userid, reporterid, reason) VALUES($1, $2, $3)",
		[userid, reporterid, reason],
		(err) => {
			if (err) {
				console.error(err.message);
				res.sendStatus(500);
			} else {
				res.sendStatus(200);
			}
		}
	);
});

function getDate() {
	return new Date().toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });
}

async function checkMod(id) {
	const result = await db.query("SELECT mod FROM account WHERE id = $1", [id]);
	return result.rows[0].mod;
}

app.use(express.static("src"));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log("Server started. PORT: " + PORT));
