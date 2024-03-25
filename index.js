const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());
app.use(cors());

const connection = `mongodb+srv://${process.env.USER_NAME}:${process.env.PASSWORD}@${process.env.MONGODB_CLUSTER}/ImageFilterDB`;

mongoose
  .connect(connection)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

const ImageSchema = mongoose.Schema({
  id: Number,
  cocoUrl: String,
  flickrUrl: String,
  height: Number,
  width: Number,
  fileName: String,
  dateCaptured: String,
});

const CategorySchema = mongoose.Schema({
  id: Number,
  supercategory: String,
  name: String,
});

const annotationSchema = mongoose.Schema({
  imageId: Number,
  categoryId: Number,
  bbox: {
    x: Number,
    y: Number,
    w: Number,
    h: Number,
  },
});

const AnnotationModel = mongoose.model("Annotation", annotationSchema);

const CategoryModel = mongoose.model("Category", CategorySchema);

const ImageModel = mongoose.model("Image", ImageSchema);

app.get("/getCategories", async (req, res) => {
  try {
    const categories = await CategoryModel.find();

    if (!categories.length) {
      console.log("Categories not found");
    }

    res.send({ categories });
  } catch (err) {
    console.log(err)
  }
});

app.get("/getAllImages", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = 50;
  const skip = (page - 1) * pageSize;

  try {
    // Fetch data from MongoDB
    const results = await ImageModel.find().skip(skip).limit(pageSize);
    const totalCount = await ImageModel.countDocuments();

    res.json({
      page,
      totalPages: Math.ceil(totalCount / pageSize),
      results,
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/getFilteredImages", async (req, res) => {
  try {
    const { categories: filteredCategoriees } = req.body;
    const categoryNames = filteredCategoriees;
    const page = parseInt(req.query.page) || 1;
    const pageSize = 10;
    const skip = (page - 1) * pageSize;
    const categories = await CategoryModel.find({
      name: { $in: categoryNames },
    });
    if (!categories.length) {
      console.log("Categories not found");
    }

    const categoryIds = categories.map((category) => category.id);
    const annotations = await AnnotationModel.find({
      categoryId: { $in: categoryIds },
    });

    // Extract unique imageIds from annotations
    const imageIds = [
      ...new Set(annotations.map((annotation) => annotation.imageId)),
    ];

    const totalCount = imageIds.length;

    // Fetch images based on imageIds with pagination
    const results = await ImageModel.find({ id: { $in: imageIds } })
      .skip(skip)
      .limit(pageSize);

    res.json({
      page,
      totalPages: Math.ceil(totalCount / pageSize),
      results,
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log("App runninng on port 4000");
});
