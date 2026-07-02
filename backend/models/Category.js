import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      en: { type: String, required: true },
      bn: { type: String },
    },
    slug: { type: String, required: true, unique: true },
    isFixed: { type: Boolean, default: false }, // fixed categories cannot be deleted (US-08)
    sortOrder: { type: Number, default: 0 },
    image: { type: String },
  },
  { timestamps: true }
);

const Category = mongoose.model("Category", categorySchema);
export default Category;
