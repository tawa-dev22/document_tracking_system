import Department from '../models/Department.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listDepartments = asyncHandler(async (_req, res) => {
  const departments = await Department.find().sort({ name: 1 });
  res.json({ success: true, data: departments });
});

export const getDepartmentStats = asyncHandler(async (_req, res) => {
  const stats = await Department.find().sort({ documentCount: -1 });
  res.json({ success: true, data: stats });
});

export async function ensureDepartment(name) {
  const normalized = name.trim();
  let dept = await Department.findOne({ name: normalized });
  if (!dept) {
    dept = await Department.create({ name: normalized });
  }
  return dept;
}

export async function incrementDepartmentCount(name) {
  await Department.updateOne({ name: name.trim() }, { $inc: { documentCount: 1 } });
}
