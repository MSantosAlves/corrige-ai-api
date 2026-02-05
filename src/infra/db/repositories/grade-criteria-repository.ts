import mongoose, { Schema } from 'mongoose';

import {
  type GradeCriteriaClassification,
  type GradeCriteriaEntity,
  type GradeCriteriaItem,
} from '@/domain/entities';

type GradeCriteriaDocument = mongoose.Document & {
  _id: mongoose.Types.ObjectId;
  user_id: string;
  name: string;
  description?: string;
  classification: GradeCriteriaClassification;
  is_public: boolean;
  max_score: number;
  items: GradeCriteriaItem[];
  tags?: string[];
  created_at: string;
  updated_at: string;
};

const gradeCriteriaItemSchema = new Schema<GradeCriteriaItem>(
  {
    label: { type: String, required: true },
    weight: { type: Number, required: true },
    description: { type: String, required: false },
  },
  { _id: false },
);

const gradeCriteriaSchema = new Schema<GradeCriteriaDocument>(
  {
    user_id: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String, required: false },
    classification: { type: String, required: true, index: true },
    is_public: { type: Boolean, required: true, index: true },
    max_score: { type: Number, required: true },
    items: { type: [gradeCriteriaItemSchema], required: true },
    tags: { type: [String], required: false, default: [] },
    created_at: { type: String, required: true },
    updated_at: { type: String, required: true },
  },
  { timestamps: false },
);

const GradeCriteriaModel =
  mongoose.models['grade-criteria'] ||
  mongoose.model<GradeCriteriaDocument>('grade-criteria', gradeCriteriaSchema);

export const GradeCriteriaRepository = {
  create: async (data: {
    userId: string;
    name: string;
    description?: string;
    classification: GradeCriteriaClassification;
    isPublic: boolean;
    maxScore: number;
    items: GradeCriteriaItem[];
    tags?: string[];
  }): Promise<GradeCriteriaEntity> => {
    const now = new Date().toISOString();
    const criteria = {
      user_id: data.userId,
      name: data.name,
      description: data.description,
      classification: data.classification,
      is_public: data.isPublic,
      max_score: data.maxScore,
      items: data.items,
      tags: data.tags ?? [],
      created_at: now,
      updated_at: now,
    };
    const created = await GradeCriteriaModel.create(criteria);
    const saved = created.toObject() as GradeCriteriaDocument;
    return {
      id: saved._id.toString(),
      userId: saved.user_id,
      name: saved.name,
      description: saved.description,
      classification: saved.classification,
      isPublic: saved.is_public,
      maxScore: saved.max_score,
      items: saved.items,
      tags: saved.tags,
      createdAt: saved.created_at,
      updatedAt: saved.updated_at,
    };
  },

  list: async (filters: {
    classification?: GradeCriteriaClassification;
    userId?: string;
    includePublic?: boolean;
  }): Promise<GradeCriteriaEntity[]> => {
    const query: Record<string, unknown> = {};
    if (filters.classification) {
      query.classification = filters.classification;
    }
    if (filters.userId) {
      query.$or = [
        { user_id: filters.userId },
        ...(filters.includePublic ? [{ is_public: true }] : []),
      ];
    } else if (filters.includePublic) {
      query.is_public = true;
    }

    const items = await GradeCriteriaModel.find(query)
      .sort({ created_at: -1 })
      .lean<GradeCriteriaDocument[]>()
      .exec();
    return items.map((criteria) => ({
      id: criteria._id.toString(),
      userId: criteria.user_id,
      name: criteria.name,
      description: criteria.description,
      classification: criteria.classification,
      isPublic: criteria.is_public,
      maxScore: criteria.max_score,
      items: criteria.items,
      tags: criteria.tags,
      createdAt: criteria.created_at,
      updatedAt: criteria.updated_at,
    }));
  },

  getById: async (id: string): Promise<GradeCriteriaEntity | null> => {
    if (!mongoose.isValidObjectId(id)) {
      return null;
    }
    const criteria = await GradeCriteriaModel.findById(id)
      .lean<GradeCriteriaDocument | null>()
      .exec();
    if (!criteria) {
      return null;
    }
    return {
      id: criteria._id.toString(),
      userId: criteria.user_id,
      name: criteria.name,
      description: criteria.description,
      classification: criteria.classification,
      isPublic: criteria.is_public,
      maxScore: criteria.max_score,
      items: criteria.items,
      tags: criteria.tags,
      createdAt: criteria.created_at,
      updatedAt: criteria.updated_at,
    };
  },
};

export const gradeCriteriaRepository = GradeCriteriaRepository;
