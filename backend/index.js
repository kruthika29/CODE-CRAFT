const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const { generateFile } = require("./generateFile");
const { addJobToQueue } = require("./jobQueue");
const Job = require("./models/Job");

const app = express();

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

async function connectToMongoDB() {
  try {
    await mongoose.connect("mongodb://localhost/compilerdb");
    console.log("Successfully connected to MongoDB: compilerdb");
  } catch (err) {
    console.error("Error connecting to MongoDB", err);
    process.exit(1); // Exit the process with an error code
  }
}

connectToMongoDB();

app.post("/run", async (req, res) => {
  const { language = "cpp", code } = req.body;

  console.log(language, "Length:", code.length);

  if (code === undefined) {
    return res.status(400).json({ success: false, error: "Empty code body!" });
  }
  
  try {
    // need to generate a c++ file with content from the request
    const filepath = await generateFile(language, code);

    // write into DB
    const job = await new Job({ language, filepath }).save();
    const jobId = job["_id"];
    addJobToQueue(jobId);
    res.status(201).json({ jobId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

app.get("/status", async (req, res) => {
  const jobId = req.query.id;

  if (jobId === undefined) {
    return res
      .status(400)
      .json({ success: false, error: "Missing id query param" });
  }

  try {
    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(400).json({ success: false, error: "Couldn't find job" });
    }

    return res.status(200).json({ success: true, job });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

app.listen(5001, () => {
  console.log(`Listening on port 5001!`);
});
