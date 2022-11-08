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
		"CREATE TABLE IF NOT EXISTS blog(id SERIAL PRIMARY KEY, title TEXT NOT NULL, writerId TEXT NOT NULL, writeDate TEXT NOT NULL, content TEXT NOT NULL, likeIDArray TEXT[] DEFAULT '{}', dislikeIDArray TEXT[] DEFAULT '{}')",
		checkError
	);
	db.query("CREATE TABLE IF NOT EXISTS account(id TEXT PRIMARY KEY, password TEXT NOT NULL)", checkError);
	db.query(
		"CREATE TABLE IF NOT EXISTS comment(id SERIAL PRIMARY KEY, blogID INTEGER NOT NULL, content TEXT NOT NULL, writeDate TEXT NOT NULL, writerId TEXT NOT NULL)",
		checkError
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
			}

			res.redirect("/logout");
		});
	}
});
app.get("/getid", (req, res) => res.send(req.session.user));
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

app.post("/deleteBlog", (req, res) => {
	const { blogID } = req.body;

	if (req.session.user) {
		db.query(`SELECT * FROM blog WHERE id = $1`, [blogID], (err, result) => {
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

			db.query("DELETE FROM blog WHERE id = $1", [blogID], (err) => {
				if (err) {
					console.log(err.message);
					res.sendStatus(500);
					return;
				}

				res.send(JSON.stringify({ result: "SUCCESS" }));
			});
		});
	}
});
app.post("/idcheck", (req, res) => {
	const { id } = req.body;

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

	db.query(
		"INSERT INTO blog(title, content, writerId, writeDate) VALUES($1, $2, $3, $4)",
		[title, content, id, date],
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
app.post("/comment", (req, res) => {
	const { content, blogID } = req.body;
	const id = req.session.user;
	const date = getDate();

	db.query(
		"INSERT INTO comment(blogID, content, writeDate, writerId) VALUES($1, $2, $3, $4)",
		[blogID, content, date, id],
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
app.post("/deleteComment", (req, res) => {
	const { id } = req.body;

	db.query("DELETE FROM comment WHERE id = $1", [id], (err) => {
		if (err) {
			console.error(err.message);
			res.sendStatus(500);
		} else {
			res.sendStatus(200);
		}
	});
});
app.post("/update", (req, res) => {
	const { title, content, id } = req.body;
	const date = getDate();

	db.query("UPDATE blog SET title = $1, content = $2, writeDate = $3 WHERE id = $4", [title, content, date, id], (err) => {
		if (err) {
			console.error(err.message);
			res.sendStatus(500);
		} else {
			res.sendStatus(200);
		}
	});
});
app.post("/read", (req, res) => {
	const { blogID } = req.body;

	db.query("SELECT * FROM blog WHERE id = $1", [blogID], (err, result) => {
		if (err) {
			console.error(err.message);
			res.sendStatus(500);
			return;
		}

		const blog = result.rows[0];

		if (blog) {
			db.query("SELECT * FROM comment WHERE blogID = $1 ORDER BY writeDate DESC", [blogID], (err, result) => {
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

	db.query("SELECT * FROM blog ORDER BY writedate DESC, id DESC LIMIT $1 OFFSET $2", [count, offset], (err, result) => {
		if (err) {
			console.error(err.message);
			res.sendStatus(500);
			return;
		}

		res.send(JSON.stringify({ result: result.rows }));
	});
});

function getDate() {
	return new Date().toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });
}

app.use(express.static("src"));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log("Server started. PORT: " + PORT));
