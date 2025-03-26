const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const { Schema } = mongoose;
require("dotenv").config();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new Schema({
  username: { type: String, required: true, unique: true },
});
const exerciseSchema = new Schema({
  username: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now },
});
const logSchema = new Schema({
  username: { type: String, required: true },
  count: { type: Number, default: 0 },
  log: [{ type: exerciseSchema }],
});

const User = mongoose.model("User", userSchema);
const Exercise = mongoose.model("Exercise", exerciseSchema);
const Log = mongoose.model("Log", logSchema);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.get("/api/users", async (req, res) => {
  const users = await User.find({}, { username: 1, _id: 1 });
  res.json(users);
});

app.post("/api/users", async (req, res) => {
  const { username } = req.body;
  User.create({ username })
    .then((user) => {
      res.json({ username: user.username, _id: user._id });
    })
    .catch((err) => {
      res.status(400).json({ error: "Username already taken" });
    });
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;
  const user = await User.findById(_id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  Exercise.create({
    username: user.username,
    description,
    duration,
    date: date ? new Date(date) : new Date(),
  })
    .then((exercise) => {
      res.json({
        _id: user._id,
        username: user.username,
        date: exercise.date.toISOString(),
        duration: exercise.duration,
        description: exercise.description,
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(400).json({ error: "Invalid data" });
    });
});

app.get("/api/users/:_id/logs", async (req, res) => {
  const userId = req.params._id;
  const from = req.query.from ? new Date(req.query.from) : null;
  const to = req.query.to ? new Date(req.query.to) : null;
  const limit = parseInt(req.query.limit) || null;
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  let exercises = await Exercise.find({ username: user.username });
  if (from) {
    exercises = exercises.filter((exercise) => exercise.date >= from);
  }
  if (to) {
    exercises = exercises.filter((exercise) => exercise.date <= to);
  }
  if (limit) {
    exercises = exercises.slice(0, limit);
  }
  const count = exercises.length;
  const log = exercises.map((exercise) => ({
    description: exercise.description,
    duration: exercise.duration,
    date: exercise.date.toDateString(),
  }));
  res.json({
    _id: user._id,
    username: user.username,
    count,
    log,
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
