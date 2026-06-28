import Category from "../models/Category.js";

// GET /api/categories
export const getCategories = async (req, res) => {
  const categories = await Category.find().sort({ sortOrder: 1 });
  res.json(categories);
};

// POST /api/categories  (admin only)
export const createCategory = async (req, res) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// PUT /api/categories/:id  (admin only)
export const updateCategory = async (req, res) => {
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!category) return res.status(404).json({ message: "Category not found" });
  res.json(category);
};

// DELETE /api/categories/:id  (admin only)
export const deleteCategory = async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) return res.status(404).json({ message: "Category not found" });

  if (category.isFixed) {
    return res.status(400).json({ message: "Fixed categories cannot be deleted." });
  }

  await category.deleteOne();
  res.json({ message: "Category deleted" });
};
